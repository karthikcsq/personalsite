import { TypeSafeClient } from "@typesafe-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildLivingCorpus } from "@/lib/living-corpus/buildLivingCorpus";
import {
  assertJourneyCoverage,
  buildAuthoredJourneyOptions,
  buildJourneyCandidatePool,
  buildJourneyNodes,
} from "@/lib/living-corpus/journeyData";
import {
  buildJourneyQuestions,
  buildJourneyState,
  resolveJourneySelection,
  type JourneyAnswers,
} from "@/lib/living-corpus/journeySelection";
import type { JourneyNextResponse, JourneyNode } from "@/lib/living-corpus/types";
import { loadGalleryIndex } from "@/utils/galleryIndex";
import { getClientIdentifier } from "@/utils/rateLimit";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 20 * 60 * 1000;
const REQUEST_WINDOW_MS = 60 * 1000;
const REQUEST_LIMIT = 40;
const MAX_TRAIL = 8;

const responseCache = new Map<
  string,
  { expiresAt: number; promise: Promise<JourneyNextResponse> }
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

function cleanId(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().slice(0, maxLength);
  return clean || null;
}

function cleanTrail(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanId(item, 220))
    .filter((item): item is string => Boolean(item))
    .slice(-MAX_TRAIL);
}

function trailNodes(
  ids: readonly string[],
  nodesById: ReadonlyMap<string, JourneyNode>,
  current: JourneyNode,
): JourneyNode[] {
  const resolved = ids
    .map((id) => nodesById.get(id))
    .filter((node): node is JourneyNode => Boolean(node));
  if (resolved.at(-1)?.id !== current.id) resolved.push(current);
  return resolved.slice(-MAX_TRAIL);
}

async function chooseNext(
  currentNodeId: string,
  trailIds: readonly string[],
  sessionId: string,
): Promise<JourneyNextResponse> {
  const gallery = await loadGalleryIndex().catch(() => ({}));
  const corpus = buildLivingCorpus(gallery);
  assertJourneyCoverage(corpus);
  const nodes = buildJourneyNodes(corpus);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const current = nodesById.get(currentNodeId);
  if (!current) throw new Error("Unknown journey chapter");

  const trail = trailNodes(trailIds, nodesById, current);
  const authoredOptions = buildAuthoredJourneyOptions(
    nodes,
    current,
    trail,
    sessionId,
  );

  if (trail.length >= 6) {
    return {
      currentNodeId,
      options: [],
      complete: true,
      confidence: 1,
      selectionMode: "authored",
    };
  }

  const apiKey = process.env.TYPESAFE_API_KEY?.trim();
  if (!apiKey) {
    const complete = trail.length >= 5 || authoredOptions.length === 0;
    return {
      currentNodeId,
      options: complete ? [] : authoredOptions,
      complete,
      confidence: 0,
      selectionMode: "authored",
    };
  }

  const candidates = buildJourneyCandidatePool(
    nodes,
    current,
    trail,
    sessionId,
  );
  if (candidates.length < 3) {
    const sourceVariety = new Set(
      trail.map((node) => node.href.split("#", 1)[0] || node.artifactId),
    ).size;
    const complete =
      (trail.length >= 4 && sourceVariety >= 2) || authoredOptions.length === 0;
    return {
      currentNodeId,
      options: complete ? [] : authoredOptions,
      complete,
      confidence: 1,
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
      state: buildJourneyState(current, trail, candidates),
      questions: buildJourneyQuestions(candidates),
    });
    const selected = resolveJourneySelection(
      candidates,
      trail,
      sessionId,
      result.answers as JourneyAnswers,
    );
    return {
      currentNodeId,
      options: selected.options.length ? selected.options : authoredOptions,
      complete: selected.complete,
      confidence: selected.confidence,
      selectionMode: "typesafe",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown failure";
    console.warn("[living-corpus/journey] TypeSafe fallback:", message);
    const complete = trail.length >= 5 || authoredOptions.length === 0;
    return {
      currentNodeId,
      options: complete ? [] : authoredOptions,
      complete,
      confidence: 0,
      selectionMode: "authored",
    };
  }
}

export async function POST(req: NextRequest) {
  if (isRateLimited(getClientIdentifier(req))) {
    return NextResponse.json(
      { error: "Too many journey requests" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const body = (await req.json()) as {
      currentNodeId?: unknown;
      trail?: unknown;
      sessionId?: unknown;
    };
    const currentNodeId = cleanId(body.currentNodeId, 220);
    const sessionId = cleanId(body.sessionId, 100);
    if (!currentNodeId || !sessionId) {
      return NextResponse.json({ error: "Invalid journey state" }, { status: 400 });
    }

    const trail = cleanTrail(body.trail);
    const cacheKey = `${sessionId}|${currentNodeId}|${trail.join(",")}`;
    const now = Date.now();
    let cached = responseCache.get(cacheKey);
    if (!cached || cached.expiresAt <= now) {
      const promise = chooseNext(currentNodeId, trail, sessionId).catch((error) => {
        responseCache.delete(cacheKey);
        throw error;
      });
      cached = { expiresAt: now + CACHE_TTL_MS, promise };
      responseCache.set(cacheKey, cached);
    }

    return NextResponse.json(await cached.promise, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown failure";
    const unknownNode = message === "Unknown journey chapter";
    console.error("[living-corpus/journey] Failed:", message);
    return NextResponse.json(
      { error: unknownNode ? message : "Could not continue this path" },
      { status: unknownNode ? 404 : 502 },
    );
  }
}
