import { generateLocalEmbedding } from "@/lib/generate-local-embedding"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { Database } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

export async function POST(request: Request) {
  const json = await request.json()
  const { userInput, fileIds, embeddingsProvider, sourceCount } = json as {
    userInput: string
    fileIds: string[]
    embeddingsProvider: "openai" | "local" | "azure"
    sourceCount: number
  }

  const uniqueFileIds = [...new Set(fileIds)]

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profile = await getServerProfile()

    if (embeddingsProvider === "openai") {
      checkApiKey(profile.openai_api_key, "OpenAI")
    } else if (embeddingsProvider === "azure") {
      checkApiKey(profile.azure_openai_api_key, "Azure")
    }

    const ENDPOINT = profile.azure_openai_endpoint
    const KEY = profile.azure_openai_api_key
    const DEPLOYMENT_ID = "text-embedding-ada-002"

    let chunks: any[] = []

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
          match_count: sourceCount,
          file_ids: uniqueFileIds
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
          match_count: sourceCount,
          file_ids: uniqueFileIds
        })

      if (localFileItemsError) {
        throw localFileItemsError
      }

      chunks = localFileItems
    } else if (embeddingsProvider === "azure") {
      const azureOpenai = new OpenAI({
        apiKey: KEY || "",
        baseURL: `${ENDPOINT}/openai/deployments/${DEPLOYMENT_ID}`,
        defaultQuery: { "api-version": "2023-05-15" },
        defaultHeaders: { "api-key": KEY }
      })

      const response = await azureOpenai.embeddings.create({
        model: "text-embedding-ada-002",
        input: userInput
      })

      const azureEmbedding = response.data.map(item => item.embedding)[0]

      const { data: azureFileItems, error: azureFileItemsError } =
        await supabaseAdmin.rpc("match_file_items_azure", {
          query_embedding: azureEmbedding as any,
          match_count: sourceCount,
          file_ids: uniqueFileIds
        })

      if (azureFileItemsError) {
        throw azureFileItemsError
      }

      chunks = azureFileItems
    }

    const mostSimilarChunks = chunks?.sort(
      (a, b) => b.similarity - a.similarity
    )

    return new Response(JSON.stringify({ results: mostSimilarChunks }), {
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
