import { Redis } from "@upstash/redis";
import {
  isHostSuggestedQuestion,
  normalizeSuggestedQuestion,
} from "../data/chatSuggestions.ts";

type CachedArtifact = {
  kind: string;
  id: string;
  annotation?: string;
  data: Record<string, unknown>;
};

export type CachedSuggestedReply = {
  reply: string;
  artifacts: CachedArtifact[];
};

type MemoryEntry = {
  expiresAt: number;
  value: unknown;
};

const REWRITE_TTL_SECONDS = 7 * 24 * 60 * 60;
const SUGGESTED_REPLY_TTL_SECONDS = 30 * 24 * 60 * 60;
const MEMORY_CACHE_LIMIT = 250;
// Keep local development from serving an old answer after the retrieval or
// display contract changes. Production still adds the deploy SHA separately.
const REWRITE_CACHE_SCHEMA = "v3";
const SUGGESTED_REPLY_CACHE_SCHEMA = "v3";
const memoryCache = new Map<string, MemoryEntry>();

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  if (process.env.NODE_ENV !== "production") {
    redis = null;
    return redis;
  }
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

function contentVersion(): string {
  return (
    process.env.CHAT_CACHE_VERSION?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    "local"
  ).slice(0, 48);
}

function compactKey(value: string): string {
  return encodeURIComponent(value).slice(0, 180);
}

function rewriteKey(query: string): string {
  return `chat:rewrite:${REWRITE_CACHE_SCHEMA}:${compactKey(
    normalizeSuggestedQuestion(query),
  )}`;
}

function suggestedReplyKey(query: string): string {
  return `chat:suggested:${SUGGESTED_REPLY_CACHE_SCHEMA}:${contentVersion()}:${compactKey(
    normalizeSuggestedQuestion(query),
  )}`;
}

function pruneMemoryCache() {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt <= now) memoryCache.delete(key);
  }
  while (memoryCache.size >= MEMORY_CACHE_LIMIT) {
    const oldest = memoryCache.keys().next().value;
    if (typeof oldest !== "string") break;
    memoryCache.delete(oldest);
  }
}

async function getValue<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (client) {
    try {
      return (await client.get<T>(key)) ?? null;
    } catch (error) {
      console.warn(`[chatCache] Redis read failed for ${key}:`, error);
    }
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

async function setValue(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const client = getRedis();
  if (client) {
    try {
      await client.set(key, value, { ex: ttlSeconds });
      return;
    } catch (error) {
      console.warn(`[chatCache] Redis write failed for ${key}:`, error);
    }
  }
  pruneMemoryCache();
  memoryCache.set(key, {
    expiresAt: Date.now() + ttlSeconds * 1000,
    value,
  });
}

function validRewriteQueries(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((query) => typeof query === "string" && query.trim().length > 0)
  );
}

function validSuggestedReply(value: unknown): value is CachedSuggestedReply {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CachedSuggestedReply>;
  return (
    typeof candidate.reply === "string" &&
    candidate.reply.trim().length > 0 &&
    Array.isArray(candidate.artifacts) &&
    candidate.artifacts.every(
      (artifact) =>
        artifact &&
        typeof artifact === "object" &&
        typeof artifact.id === "string" &&
        typeof artifact.kind === "string" &&
        artifact.data &&
        typeof artifact.data === "object",
    )
  );
}

export async function getRewriteCache(
  query: string,
): Promise<string[] | null> {
  const value = await getValue<unknown>(rewriteKey(query));
  return validRewriteQueries(value) ? value : null;
}

export async function setRewriteCache(
  query: string,
  rewrites: string[],
): Promise<void> {
  if (!validRewriteQueries(rewrites)) return;
  await setValue(rewriteKey(query), rewrites, REWRITE_TTL_SECONDS);
}

export async function getSuggestedReplyCache(
  query: string,
): Promise<CachedSuggestedReply | null> {
  if (!isHostSuggestedQuestion(query)) return null;
  const value = await getValue<unknown>(suggestedReplyKey(query));
  return validSuggestedReply(value) ? value : null;
}

export async function setSuggestedReplyCache(
  query: string,
  value: CachedSuggestedReply,
): Promise<void> {
  if (!isHostSuggestedQuestion(query) || !validSuggestedReply(value)) return;
  await setValue(
    suggestedReplyKey(query),
    value,
    SUGGESTED_REPLY_TTL_SECONDS,
  );
}
