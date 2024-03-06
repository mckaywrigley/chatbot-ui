import { SupabaseClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { generateLocalEmbedding } from "../generate-local-embedding"

export const retriever = async (
  supabaseAdmin: SupabaseClient<any, any>,
  openai: OpenAI,
  embeddingsProvider: "openai" | "local",
  input: string,
  sourceCount: number,
  uniqueFileIds: string[]
) => {
  let chunks: any[] = []

  if (embeddingsProvider === "openai") {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: input
    })

    const openaiEmbedding = response.data.map(item => item.embedding)[0]

    const { data: openaiFileItems, error: openaiError } =
      await supabaseAdmin.rpc("match_file_items_openai", {
        query_embedding: openaiEmbedding as any,
        match_count: sourceCount,
        file_ids: uniqueFileIds
      })

    if (openaiError) {
      throw openaiError
    }

    chunks = openaiFileItems
  } else if (embeddingsProvider === "local") {
    const localEmbedding = await generateLocalEmbedding(input)

    const { data: localFileItems, error: localFileItemsError } =
      await supabaseAdmin.rpc("match_file_items_local", {
        query_embedding: localEmbedding as any,
        match_count: sourceCount,
        file_ids: uniqueFileIds
      })

    if (localFileItemsError) {
      throw localFileItemsError
    }

    chunks = localFileItems
  }

  const mostSimilarChunks = chunks?.sort((a, b) => b.similarity - a.similarity)

  return mostSimilarChunks
}
