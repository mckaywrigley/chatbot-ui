// must not describe 'use server' here to avoid security issues.
import { epochTimeToNaturalLanguage } from "../utils"
import { getRedis } from "./redis"
import { isPremiumUser } from "./subscription-utils"

export type RateLimitResult =
  | {
      allowed: true
      remaining: number
      timeRemaining: null
    }
  | {
      allowed: false
      remaining: 0
      timeRemaining: number
    }

/**
 * rate limiting by sliding window algorithm.
 *
 * check if the user is allowed to make a request.
 * if the user is allowed, decrease the remaining count by 1.
 */
export async function ratelimit(
  userId: string,
  model: string
): Promise<RateLimitResult> {
  const enable = Boolean(
    process.env.RATELIMITER_ENABLED &&
      process.env.RATELIMITER_ENABLED === "true"
  )
  if (!enable) {
    return { allowed: true, remaining: -1, timeRemaining: null }
  }
  const isPremium = await isPremiumUser(userId)
  return _ratelimit(model, userId, isPremium)
}

export async function _ratelimit(
  model: string,
  userId: string,
  isPremium: boolean
): Promise<RateLimitResult> {
  const storageKey = _makeStorageKey(userId, model)
  const [remaining, timeRemaining] = await getRemaining(
    userId,
    model,
    isPremium
  )
  if (remaining === 0) {
    return { allowed: false, remaining, timeRemaining: timeRemaining! }
  }
  await _addRequest(storageKey)
  return { allowed: true, remaining: remaining - 1, timeRemaining: null }
}

export async function getRemaining(
  userId: string,
  model: string,
  isPremium: boolean
): Promise<[number, number | null]> {
  const storageKey = _makeStorageKey(userId, model)
  const timeWindowMinutes = Number(process.env.RATELIMITER_TIME_WINDOW_MINUTES)
  const timeWindow = timeWindowMinutes * 60 * 1000
  const now = Date.now()
  const timestamps: number[] = await getRedis().zrange(
    storageKey,
    now - timeWindow,
    now,
    {
      byScore: true
    }
  )
  const limit = _getLimit(model, isPremium)
  const remaining = limit - timestamps.length
  if (remaining <= 0) {
    // Calculate timeRemaining based on the first message in the window
    const oldestTimestamp = timestamps[0] // Get the oldest message timestamp
    const timeRemaining = oldestTimestamp - now + timeWindow // Adjust calculation here
    return [0, timeRemaining]
  }
  return [remaining, null]
}

function _getLimit(model: string, isPremium: boolean): number {
  const fixedModelName = _getFixedModelName(model)
  const limitKey =
    "RATELIMITER_LIMIT_" +
    fixedModelName +
    "_" +
    (isPremium ? "PREMIUM" : "FREE")
  const limit = Number(process.env[limitKey])
  if (isNaN(limit) || limit < 0) {
    throw new Error("Invalid limit configuration")
  }
  return limit
}

async function _addRequest(key: string) {
  const timestamp = Date.now()
  const timeWindowMinutes = Number(process.env.RATELIMITER_TIME_WINDOW_MINUTES)
  const timeWindow = timeWindowMinutes * 60 * 1000
  const windowStart = timestamp - timeWindow

  // Add the new request timestamp
  await getRedis().zadd(key, { score: timestamp, member: timestamp })

  // Remove timestamps outside the time window
  await getRedis().zremrangebyscore(key, 0, windowStart)

  // Set an expiration time to clean up old keys automatically
  // This is a safety measure in case the zremrangebyscore operation misses some entries
  await getRedis().expire(key, 60 * timeWindowMinutes)
}

function _getFixedModelName(model: string): string {
  return (model.startsWith("gpt-4") ? "gpt-4" : model)
    .replace(/-/g, "_")
    .toUpperCase()
}

function _makeStorageKey(userId: string, model: string): string {
  const fixedModelName = _getFixedModelName(model)
  return "ratelimit:" + userId + ":" + fixedModelName
}

export function resetRateLimit(model: string, userId: string) {
  const storageKey = _makeStorageKey(userId, model)
  return getRedis().del(storageKey)
}

export function getRateLimitErrorMessage(
  timeRemaining: number,
  premium: boolean
): string {
  const remainingText = epochTimeToNaturalLanguage(timeRemaining)

  const errorMessageForFree = `
      ⚠️ Hold On! You've Hit Your Usage Cap.
⏰ Don't worry—you'll be back in ${remainingText}.
🔓 Want more? Upgrade to Plus and unlock a world of features:
- Enjoy unlimited usage,
- Get exclusive access to GPT-4 Turbo,
- Experience faster response speed.
${
  /*- Explore the web with our Web Browsing plugin,
- Plus, get access to advanced hacking tools like Katana, HttpX, Naabu, and more.*/ ""
}
      `.trim()

  const errorMessageForPlus = `
⚠️ Hold On! You've Hit Your Usage Cap.
⏰ Don't worry—you'll be back in ${remainingText}.
      `.trim()

  let message = errorMessageForFree
  if (premium) {
    message = errorMessageForPlus
  }
  return message
}

export async function checkRatelimitOnApi(
  userId: string,
  model: string
): Promise<{ response: Response; result: RateLimitResult } | null> {
  const result = await ratelimit(userId, model)
  if (result.allowed) {
    return null
  }
  const premium = await isPremiumUser(userId)
  const message = getRateLimitErrorMessage(result.timeRemaining!, premium)
  const response = new Response(
    JSON.stringify({
      message: message,
      remaining: result.remaining,
      timeRemaining: result.timeRemaining
    }),
    {
      status: 429
    }
  )
  return { response, result }
}
