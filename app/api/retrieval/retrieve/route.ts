import { generateLocalEmbedding } from "@/lib/generate-local-embedding"
import { checkApiKey, getServerProfile } from "@/lib/server-chat-helpers"
import { Database } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

export async function POST(request: Request) {
  const json = await request.json()
  const { userInput, fileIds, embeddingsProvider } = json as {
    userInput: string
    fileIds: string[]
    embeddingsProvider: "openai" | "local"
  }

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profile = await getServerProfile()

    if (embeddingsProvider === "openai") {
      checkApiKey(profile.openai_api_key, "OpenAI")
    }

    let chunks: any[] = []

    const MATCH_COUNT = 100

    if (embeddingsProvider === "openai") {
      const openai = new OpenAI({
        apiKey: profile.openai_api_key || "",
        organization: profile.openai_organization_id
      })

      const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: userInput
      })

      const openaiEmbedding = response.data.map(item => item.embedding)[0]

      const { data: openaiFileItems, error: openaiError } =
        await supabaseAdmin.rpc("match_file_items_openai", {
          query_embedding: openaiEmbedding as any,
          match_count: MATCH_COUNT,
          file_ids: fileIds
        })

      if (openaiError) {
        throw openaiError
      }

      chunks = openaiFileItems
    } else if (embeddingsProvider === "local") {
      const localEmbedding = await generateLocalEmbedding(userInput)

      const { data: localFileItems, error: localFileItemsError } =
        await supabaseAdmin.rpc("match_file_items_local", {
          query_embedding: localEmbedding as any,
          match_count: MATCH_COUNT,
          file_ids: fileIds
        })

      if (localFileItemsError) {
        throw localFileItemsError
      }

      chunks = localFileItems
    }

    const totalTokenCount = chunks?.reduce(
      (total, chunk) => total + chunk.tokens,
      0
    )

    const topThreeSimilar = chunks
      ?.sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)

    const tokenCountTopThree = topThreeSimilar?.reduce(
      (total, chunk) => total + chunk.tokens,
      0
    )

    return new Response(JSON.stringify({ results: topThreeSimilar }), {
      status: 200
    })
  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
