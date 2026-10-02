import { TypeSafeClient } from "@typesafe-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildLivingCorpus } from "@/lib/living-corpus/buildLivingCorpus";
import {
  buildAuthoredWhatBroke,
  buildFailureCandidates,
  buildWhatBrokeQuestions,
  buildWhatBrokeState,
  resolveWhatBroke,
  type WhatBrokeAnswers,
} from "@/lib/living-corpus/whatBroke";
import type { WhatBrokeResponse } from "@/lib/living-corpus/types";
import { getClientIdentifier } from "@/utils/rateLimit";

export const dynamic = "force-dynamic";

const REQUEST_WINDOW_MS = 60 * 1000;
const REQUEST_LIMIT = 16;
const responseCache = new Map<
  string,
  { expiresAt: number; promise: Promise<WhatBrokeResponse> }
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

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().slice(0, maxLength);
  return clean || null;
}

function cleanRecentPath(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item, 220))
    .filter((item): item is string => Boolean(item))
    .slice(-12);
}

async function selectExcerpts(
  recentPath: readonly string[],
  activeCategory: string | null,
): Promise<WhatBrokeResponse> {
  const candidates = buildFailureCandidates(buildLivingCorpus());
  const fallback = buildAuthoredWhatBroke(candidates);
  const apiKey = process.env.TYPESAFE_API_KEY?.trim();
  if (!apiKey || candidates.length < 3) {
    return {
      excerpts: fallback,
      confidence: 0,
      selectionMode: "authored",
    };
  }

  try {
    const client = new TypeSafeClient({
      apiKey,
      logLevel: "off",
      timeout: 7_000,
      retry: { maxRetries: 1 },
    });
    const result = await client.systemOne({
      state: buildWhatBrokeState(candidates, recentPath, activeCategory),
      questions: buildWhatBrokeQuestions(candidates),
    });
    const resolved = resolveWhatBroke(
      candidates,
      result.answers as WhatBrokeAnswers,
    );
    return {
      excerpts: resolved.excerpts,
      confidence: resolved.confidence,
      selectionMode: "typesafe",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown failure";
    console.warn("[living-corpus/what-broke] TypeSafe fallback:", message);
    return {
      excerpts: fallback,
      confidence: 0,
      selectionMode: "authored",
    };
  }
}

export async function POST(req: NextRequest) {
  if (isRateLimited(getClientIdentifier(req))) {
    return NextResponse.json(
      { error: "Too many weather requests" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const body = (await req.json()) as {
      recentPath?: unknown;
      activeCategory?: unknown;
      sessionId?: unknown;
    };
    const recentPath = cleanRecentPath(body.recentPath);
    const activeCategory = cleanString(body.activeCategory, 40);
    const sessionId = cleanString(body.sessionId, 100) ?? "anonymous";
    const cacheKey = `${sessionId}|${activeCategory ?? "all"}|${recentPath.join(",")}`;
    const now = Date.now();
    let cached = responseCache.get(cacheKey);
    if (!cached || cached.expiresAt <= now) {
      cached = {
        expiresAt: now + 10 * 60 * 1000,
        promise: selectExcerpts(recentPath, activeCategory),
      };
      responseCache.set(cacheKey, cached);
    }

    return NextResponse.json(await cached.promise, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown failure";
    console.error("[living-corpus/what-broke] Failed:", message);
    return NextResponse.json(
      { error: "Could not surface the failure notes" },
      { status: 502 },
    );
  }
}
