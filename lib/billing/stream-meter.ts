import { recordUsage } from "./account"
import { estimateMessagesTokens, estimateTextTokens } from "./estimate"
import type { UsageFeature } from "./types"

type MessageLike = { role?: string; content?: unknown }

/**
 * OpenAIStream callbacks that meter a streamed completion. Streaming responses
 * don't carry exact `usage` through the `ai` library, so tokens are ESTIMATED:
 * prompt from the input messages, completion from the final assembled text.
 * Fires in `onFinal`, which runs while the function is still alive serving the
 * stream. Best-effort - recordUsage never throws.
 */
export function streamMeterCallbacks(ctx: {
  userId: string
  feature: UsageFeature
  model?: string | null
  messages: MessageLike[]
}) {
  const promptTokens = estimateMessagesTokens(ctx.messages)
  return {
    onFinal: async (completion: string) => {
      const completionTokens = estimateTextTokens(completion)
      await recordUsage({
        userId: ctx.userId,
        feature: ctx.feature,
        model: ctx.model ?? null,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens
      })
    }
  }
}
