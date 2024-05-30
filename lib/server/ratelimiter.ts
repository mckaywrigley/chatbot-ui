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
      process.env.RATELIMITER_ENABLED.toLowerCase() === "true"
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
  let timeWindowMinutes
  if (model === "plugins") {
    timeWindowMinutes = Number(
      process.env.RATELIMITER_TIME_PLUGINS_WINDOW_MINUTES
    )
  } else {
    timeWindowMinutes = Number(process.env.RATELIMITER_TIME_WINDOW_MINUTES)
  }
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
    const oldestTimestamp = timestamps[0]
    const timeRemaining = oldestTimestamp - now + timeWindow
    return [0, timeRemaining]
  }
  return [remaining, null]
}

function _getLimit(model: string, isPremium: boolean): number {
  let limit
  if (model === "plugins" || model === "pluginDetector") {
    const limitKey = `RATELIMITER_LIMIT_${model.toUpperCase()}_${isPremium ? "PREMIUM" : "FREE"}`
    limit = Number(process.env[limitKey])
  } else if (model === "tts-1") {
    const limitKey = `RATELIMITER_LIMIT_TTS_1_${isPremium ? "PREMIUM" : "FREE"}`
    limit = Number(process.env[limitKey]) || (isPremium ? 30 : 15)
  } else if (model === "stt-1") {
    const limitKey = `RATELIMITER_LIMIT_STT_1_${isPremium ? "PREMIUM" : "FREE"}`
    limit = Number(process.env[limitKey]) || (isPremium ? 60 : 30)
  } else if (model === "gpt-4") {
    const limitKey = `RATELIMITER_LIMIT_GPT_4_${isPremium ? "PREMIUM" : "FREE"}`
    limit = Number(process.env[limitKey]) || (isPremium ? 40 : 0)
  } else {
    const fixedModelName = _getFixedModelName(model)
    const limitKey = `RATELIMITER_LIMIT_${fixedModelName}_${isPremium ? "PREMIUM" : "FREE"}`
    limit = Number(process.env[limitKey])
  }
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
  premium: boolean,
  model: string
): string {
  const remainingText = epochTimeToNaturalLanguage(timeRemaining)

  if (model === "plugins") {
    let message = `
  ⚠️ You've reached the rate limit for plugins.
⏰ Access will be restored in ${remainingText}.`

    if (!premium) {
      message += `
🚀 Consider upgrading for higher limits and more features.`
    }

    return message.trim()
  } else if (model === "pluginDetector") {
    let message = `
  ⚠️ You've reached the rate limit for the plugin detector.
⏰ Access will be restored in ${remainingText}.`

    if (!premium) {
      message += `
🚀 Consider upgrading for higher limits and more features.`
    }

    return message.trim()
  } else if (model === "tts-1") {
    let message = `
  ⚠️ You've reached the rate limit for text-to-speech.
⏰ Access will be restored in ${remainingText}.`

    if (!premium) {
      message += `
🚀 Consider upgrading for higher limits and more features.`
    }

    return message.trim()
  } else if (model === "stt-1") {
    let message = `
  ⚠️ You've reached the rate limit for speech-to-text.
⏰ Access will be restored in ${remainingText}.`

    if (!premium) {
      message += `
🚀 Consider upgrading for higher limits and more features.`
    }

    return message.trim()
  }

  let message = `
⚠️ Hold On! You've Hit Your Usage Cap.
⏰ Don't worry—you'll be back in ${remainingText}.
  `.trim()

  if (!premium) {
    message += `

🔓 Want more? Upgrade to Pro and unlock a world of features:
- Enjoy unlimited usage,
- Get exclusive access to HackerGPT Pro AND GPT-4o,
- Experience faster response speed.
- Plus, get access to advanced hacking tools like Katana, HTTPX, Naabu, and more.`
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
  const message = getRateLimitErrorMessage(
    result.timeRemaining!,
    premium,
    model
  )
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
