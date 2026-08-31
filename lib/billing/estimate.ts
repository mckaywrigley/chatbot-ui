import { encode } from "gpt-tokenizer"

/**
 * Token estimation for STREAMING responses, which don't surface exact `usage`
 * through the `ai` library's OpenAIStream. gpt-tokenizer uses cl100k_base;
 * gpt-5.x uses a different vocabulary, so these are approximations (good to
 * within ~10-15%) - fine for usage metering, not for exact billing reconciliation.
 */
export function estimateTextTokens(text: string | null | undefined): number {
  if (!text) return 0
  try {
    return encode(text).length
  } catch {
    // Fallback heuristic: ~4 chars per token.
    return Math.ceil(text.length / 4)
  }
}

type MessageLike = { role?: string; content?: unknown }

/** Estimate prompt tokens from a chat messages array (handles string + parts). */
export function estimateMessagesTokens(messages: MessageLike[]): number {
  let total = 0
  for (const m of messages || []) {
    total += 4 // per-message structural overhead (role, separators)
    const c = m?.content
    if (typeof c === "string") {
      total += estimateTextTokens(c)
    } else if (Array.isArray(c)) {
      for (const part of c) {
        const text = (part as { text?: string })?.text
        if (typeof text === "string") total += estimateTextTokens(text)
      }
    }
  }
  return total + 2
}
