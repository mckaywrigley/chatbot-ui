import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

const redis: Redis | null = url && token ? new Redis({ url, token }) : null

const limiterCache = new Map<string, Ratelimit>()

type Window = `${number} ${"ms" | "s" | "m" | "h" | "d"}`

function getLimiter(name: string, requests: number, window: Window) {
  if (!redis) return null
  const key = `${name}:${requests}:${window}`
  let limiter = limiterCache.get(key)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      prefix: `ratelimit:${name}`,
      analytics: false
    })
    limiterCache.set(key, limiter)
  }
  return limiter
}

export function getClientIp(): string {
  const h = headers()
  const forwarded = h.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  return h.get("x-real-ip") || "unknown"
}

export interface RateLimitOptions {
  name: string
  identifier: string
  requests: number
  window: Window
}

export async function checkRateLimit(
  opts: RateLimitOptions
): Promise<NextResponse | null> {
  const limiter = getLimiter(opts.name, opts.requests, opts.window)
  // Fail open when Upstash isn't configured (dev / early deploys). A warning
  // is emitted once so prod deployments notice a missing configuration.
  if (!limiter) {
    if (!hasWarnedMissingRedis && process.env.NODE_ENV === "production") {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set; rate limiting disabled"
      )
      hasWarnedMissingRedis = true
    }
    return null
  }

  const { success, limit, remaining, reset } = await limiter.limit(
    opts.identifier
  )
  if (success) return null

  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(reset),
        "Retry-After": String(
          Math.max(1, Math.ceil((reset - Date.now()) / 1000))
        )
      }
    }
  )
}

let hasWarnedMissingRedis = false
