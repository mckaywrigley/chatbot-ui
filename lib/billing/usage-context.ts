import { AsyncLocalStorage } from "node:async_hooks"
import type { UsageFeature } from "./types"

/**
 * Per-request token accumulator carried via AsyncLocalStorage. The azure-openai
 * Proxy (lib/azure-openai.ts) pushes each call's `usage` into the active store;
 * `meterRun` reads the total when the handler finishes and flushes it to the DB.
 *
 * AsyncLocalStorage is available in the Next.js Edge runtime too, but no store
 * is set there (chat meters explicitly), so `addTokensToActiveContext` is a
 * safe no-op when called outside a `runWithUsage` scope.
 */
export interface UsageStore {
  userId: string
  feature: UsageFeature
  tokens: { prompt: number; completion: number; total: number }
}

const storage = new AsyncLocalStorage<UsageStore>()

export function runWithUsage<T>(
  ctx: { userId: string; feature: UsageFeature },
  fn: () => Promise<T>
): Promise<T> {
  return storage.run(
    {
      userId: ctx.userId,
      feature: ctx.feature,
      tokens: { prompt: 0, completion: 0, total: 0 }
    },
    fn
  )
}

export function getUsageStore(): UsageStore | undefined {
  return storage.getStore()
}

interface OpenAIUsageShape {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

/** Add one AI call's usage to the active accumulator. No-op outside a scope. */
export function addTokensToActiveContext(
  usage: OpenAIUsageShape | null | undefined
): void {
  if (!usage) return
  const store = storage.getStore()
  if (!store) return
  const prompt = usage.prompt_tokens || 0
  const completion = usage.completion_tokens || 0
  const total = usage.total_tokens || prompt + completion
  store.tokens.prompt += prompt
  store.tokens.completion += completion
  store.tokens.total += total
}
