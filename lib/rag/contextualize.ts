/**
 * Anthropic Contextual Retrieval - generate a 50-100 token context blurb
 * per chunk, prepended before embedding. Uses Haiku 4.5 with prompt
 * caching on the full-document prefix so an N-chunk doc costs roughly
 * 1 full-doc read + N short chunk reads.
 *
 * https://www.anthropic.com/news/contextual-retrieval
 */
import Anthropic from "@anthropic-ai/sdk"

const HAIKU_MODEL = "claude-haiku-4-5-20251001"
const MAX_CONTEXT_TOKENS = 120
const SYSTEM_PROMPT = `You are a retrieval-augmented-generation indexer. Given a document and one chunk of it, write a short (50-100 token) plain-text context blurb that orients the chunk inside the document. Mention the document type, the relevant section, and any entities the chunk references that are NOT in its own text. Output ONLY the blurb - no preamble, no quotes.`

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (_client) return _client
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY - required for contextual retrieval (lib/rag/contextualize.ts)"
    )
  }
  _client = new Anthropic({ apiKey: key })
  return _client
}

/**
 * Produce a contextualization blurb for a single chunk. Caller composes
 * `contextualized_content = blurb + "\n\n" + chunk` before embedding.
 *
 * Prompt caching: the `fullDoc` block carries a `cache_control` breakpoint
 * so subsequent chunks of the same doc reuse the cache (5-min TTL). Caller
 * is responsible for processing all chunks of one doc within a single
 * batch to actually hit cache.
 */
export async function contextualize(
  fullDoc: string,
  chunk: string
): Promise<string> {
  const client = getClient()

  // `cache_control` is the prompt-caching field. The pinned SDK version
  // (0.18) predates the typed support; the cast keeps the runtime payload
  // shape exact (Anthropic ignores unknown fields gracefully) until we
  // bump the dep.
  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: MAX_CONTEXT_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `<document>\n${fullDoc}\n</document>`,
            cache_control: { type: "ephemeral" }
          } as any,
          {
            type: "text",
            text: `<chunk>\n${chunk}\n</chunk>\n\nGive the context blurb for this chunk.`
          }
        ]
      }
    ]
  })

  const block = response.content.find(b => b.type === "text")
  if (!block || block.type !== "text") return ""
  return block.text.trim()
}

/**
 * Convenience: contextualize all chunks of one doc in series so prompt
 * caching kicks in. Returns the contextualized strings (blurb + chunk),
 * NOT just the blurbs.
 */
export async function contextualizeAll(
  fullDoc: string,
  chunks: string[]
): Promise<string[]> {
  const out: string[] = []
  for (const chunk of chunks) {
    let blurb = ""
    try {
      blurb = await contextualize(fullDoc, chunk)
    } catch (err) {
      // Contextualization is best-effort; on failure we fall back to the
      // raw chunk so retrieval still works (just at lower recall).
      console.warn("[rag/contextualize] failed, using raw chunk:", err)
    }
    out.push(blurb ? `${blurb}\n\n${chunk}` : chunk)
  }
  return out
}
