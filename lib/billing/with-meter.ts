import { assertBudget, recordUsage } from "./account"
import { getUsageStore, runWithUsage } from "./usage-context"
import type { UsageFeature } from "./types"

export interface MeterContext {
  userId: string
  feature: UsageFeature
}

/**
 * Run `fn` inside a usage-accumulator scope and flush the captured tokens to the
 * DB afterwards. Does NOT pre-check the budget - use when the caller has already
 * asserted (e.g. streaming routes that must gate before opening the stream).
 *
 * The flush is awaited so it persists within the function's lifetime (Vercel
 * may not run detached promises after the response). It's best-effort and never
 * throws into the caller.
 */
export async function meterRun<T>(
  ctx: MeterContext,
  fn: () => Promise<T>
): Promise<T> {
  return runWithUsage(ctx, async () => {
    try {
      return await fn()
    } finally {
      const store = getUsageStore()
      if (store && store.tokens.total > 0) {
        await recordUsage({
          userId: ctx.userId,
          feature: ctx.feature,
          promptTokens: store.tokens.prompt,
          completionTokens: store.tokens.completion,
          totalTokens: store.tokens.total
        })
      }
    }
  })
}

/**
 * Pre-flight budget check + metered run, for simple non-streaming routes.
 * Throws BudgetExceededError before `fn` runs if the user is out of credits;
 * map that to `budgetErrorResponse()` at the route boundary.
 */
export async function withMeter<T>(
  ctx: MeterContext,
  fn: () => Promise<T>
): Promise<T> {
  await assertBudget(ctx.userId)
  return meterRun(ctx, fn)
}
