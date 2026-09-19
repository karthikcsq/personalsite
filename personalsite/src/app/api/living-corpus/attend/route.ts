import { TypeSafeClient } from "@typesafe-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildLivingCorpus } from "@/lib/living-corpus/buildLivingCorpus";
import {
  buildAttentiveQuestion,
  buildAttentiveState,
  resolveAttentiveQuote,
} from "@/lib/living-corpus/attentive";
import type { AttentiveReveal } from "@/lib/living-corpus/types";
import { getClientIdentifier } from "@/utils/rateLimit";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 20 * 60 * 1000;
const REQUEST_WINDOW_MS = 60 * 1000;
const REQUEST_LIMIT = 30;

const revealCache = new Map<
  string,
  { expiresAt: number; promise: Promise<AttentiveReveal> }
>();
const requestWindows = new Map<string, { startedAt: number; count: number }>();

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const window = requestWindows.get(identifier);
  if (!window || now - window.startedAt >= REQUEST_WINDOW_MS) {
    requestWindows.set(identifier, { startedAt: now, count: 1 });
    return false;
  }
  window.count += 1;
  return window.count > REQUEST_LIMIT;
}

function cleanTrail(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.slice(0, 160))
    .slice(-3);
}

async function chooseReveal(
  artifactId: string,
  trailIds: string[],
): Promise<AttentiveReveal> {
  const corpus = buildLivingCorpus();
  const artifact = corpus.artifacts.find((item) => item.id === artifactId);
  if (!artifact) throw new Error("Unknown artifact");
  if (artifact.quotes.length === 0) {
    return { artifactId, quote: null, confidence: 1 };
  }

  const artifactsById = new Map(corpus.artifacts.map((item) => [item.id, item]));
  const trail = trailIds
    .map((id) => artifactsById.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const apiKey = process.env.TYPESAFE_API_KEY?.trim();
  if (!apiKey) throw new Error("TypeSafe is not configured");

  const client = new TypeSafeClient({
    apiKey,
    logLevel: "off",
    timeout: 5_000,
    retry: { maxRetries: 1 },
  });
  const quoteToReveal = buildAttentiveQuestion(artifact);
  const result = await client.systemOne({
    state: buildAttentiveState(artifact, trail),
    questions: { quote_to_reveal: quoteToReveal },
  });
  const selected = resolveAttentiveQuote(
    artifact,
    result.answers.quote_to_reveal,
  );

  return {
    artifactId,
    quote: selected.quote,
    confidence: selected.confidence,
  };
}

export async function POST(req: NextRequest) {
  try {
    if (isRateLimited(getClientIdentifier(req))) {
      return NextResponse.json(
        { error: "Too many attentive-list requests" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const body = (await req.json()) as { artifactId?: unknown; trail?: unknown };
    if (typeof body.artifactId !== "string" || body.artifactId.length > 160) {
      return NextResponse.json({ error: "Invalid artifact" }, { status: 400 });
    }

    const trail = cleanTrail(body.trail);
    const corpus = buildLivingCorpus();
    if (!corpus.artifacts.some((item) => item.id === body.artifactId)) {
      return NextResponse.json({ error: "Unknown artifact" }, { status: 404 });
    }

    const cacheKey = `${body.artifactId}|${trail.join(",")}`;
    const now = Date.now();
    let cached = revealCache.get(cacheKey);
    if (!cached || cached.expiresAt <= now) {
      const promise = chooseReveal(body.artifactId, trail).catch((error) => {
        revealCache.delete(cacheKey);
        throw error;
      });
      cached = { expiresAt: now + CACHE_TTL_MS, promise };
      revealCache.set(cacheKey, cached);
    }

    return NextResponse.json(await cached.promise, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown failure";
    const unavailable = message === "TypeSafe is not configured";
    console.error("[living-corpus/attend] TypeSafe selection failed:", message);
    return NextResponse.json(
      { error: unavailable ? message : "Could not choose a passage" },
      { status: unavailable ? 503 : 502 },
    );
  }
}
