import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

type LimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  scope: "minute" | "hour" | "disabled";
};

let warned = false;
let minuteLimiter: Ratelimit | null = null;
let hourLimiter: Ratelimit | null = null;
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;
  // Accept either Upstash's native names or Vercel's KV_* aliases (the
  // Vercel/Upstash marketplace integration injects KV_REST_API_*).
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    if (!warned) {
      console.warn(
        "[rateLimit] Upstash env vars not set (UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN) — rate limiting disabled.",
      );
      warned = true;
    }
    return;
  }
  const redis = new Redis({ url, token });
  minuteLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "rl:chat:m",
    analytics: false,
  });
  hourLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 h"),
    prefix: "rl:chat:h",
    analytics: false,
  });
}

export function getClientIdentifier(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anonymous";
}

export async function checkChatRateLimit(
  identifier: string,
): Promise<LimitResult> {
  init();
  if (!minuteLimiter || !hourLimiter) {
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      scope: "disabled",
    };
  }

  const [m, h] = await Promise.all([
    minuteLimiter.limit(identifier),
    hourLimiter.limit(identifier),
  ]);

  if (!m.success) {
    return {
      success: false,
      limit: m.limit,
      remaining: m.remaining,
      reset: m.reset,
      scope: "minute",
    };
  }
  if (!h.success) {
    return {
      success: false,
      limit: h.limit,
      remaining: h.remaining,
      reset: h.reset,
      scope: "hour",
    };
  }

  // Return whichever is tighter so headers reflect the real budget.
  const tighter = m.remaining <= h.remaining ? m : h;
  return {
    success: true,
    limit: tighter.limit,
    remaining: tighter.remaining,
    reset: tighter.reset,
    scope: tighter === m ? "minute" : "hour",
  };
}
