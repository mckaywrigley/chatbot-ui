/**
 * Azure OpenAI embeddings batcher.
 *
 * Single provider for the new RAG corpus (decision locked during planning -
 * legacy `file_items.local_embedding` stays put for back-compat until the
 * `file_items` table is dropped in PR-9). 1536-dim, batch size 100.
 */
import {
  getAzureOpenAIEmbeddingsClient,
  getAzureOpenAIEmbeddingsDeployment
} from "@/lib/azure-openai"

const EMBED_BATCH_SIZE = 100
const EMBED_DIMENSIONS = 1536

/**
 * Embed an array of texts. Returns embeddings in the same order as input.
 * Splits into batches of 100 internally.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const client = getAzureOpenAIEmbeddingsClient()
  const model = getAzureOpenAIEmbeddingsDeployment()

  const out: number[][] = new Array(texts.length)
  for (let start = 0; start < texts.length; start += EMBED_BATCH_SIZE) {
    const slice = texts.slice(start, start + EMBED_BATCH_SIZE)
    const response = await client.embeddings.create({
      model,
      input: slice,
      dimensions: EMBED_DIMENSIONS
    })
    response.data.forEach((row, i) => {
      out[start + i] = row.embedding as number[]
    })
  }
  return out
}

export const RAG_EMBED_DIMENSIONS = EMBED_DIMENSIONS
