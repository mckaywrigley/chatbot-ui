import { generateLocalEmbedding } from "@/lib/generate-local-embedding"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { Database } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { QdrantClient } from "@qdrant/js-client-rest"

export async function POST(request: Request) {
  const json = await request.json()
  const { userInput, fileIds, embeddingsProvider, sourceCount } = json as {
    userInput: string
    fileIds: string[]
    embeddingsProvider: "openai" | "local"
    sourceCount: number
  }

  const uniqueFileIds = [...new Set(fileIds)]

  try {
    const qclient = new QdrantClient({ url: "http://10.34.224.59:6333" })
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profile = await getServerProfile()

    if (embeddingsProvider === "openai") {
      if (profile.use_azure_openai) {
        checkApiKey(profile.azure_openai_api_key, "Azure OpenAI")
      } else {
        checkApiKey(profile.openai_api_key, "OpenAI")
      }
    }

    let chunks: any[] = []

    let openai
    if (profile.use_azure_openai) {
      openai = new OpenAI({
        apiKey: profile.azure_openai_api_key || "",
        baseURL: `${profile.azure_openai_endpoint}/openai/deployments/${profile.azure_openai_embeddings_id}`,
        defaultQuery: { "api-version": "2023-12-01-preview" },
        defaultHeaders: { "api-key": profile.azure_openai_api_key }
      })
    } else {
      openai = new OpenAI({
        apiKey: profile.openai_api_key || "",
        organization: profile.openai_organization_id
      })
    }

    if (embeddingsProvider === "openai") {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
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

      // const { data: localFileItems, error: localFileItemsError } =
      //   await supabaseAdmin.rpc("match_file_items_local", {
      //     query_embedding: localEmbedding as any,
      //     match_count: sourceCount,
      //     file_ids: uniqueFileIds
      //   })

      // if (localFileItemsError) {
      //   throw localFileItemsError
      // }
      const searchResult = []
      for (const file_id of uniqueFileIds) {
        const result = await qclient.search(profile.user_id, {
          vector: localEmbedding,
          filter: {
            must: [{ key: "file_id", match: { value: file_id } }]
          },
          with_payload: true
        })
        for (const tmpDct of result) {
          searchResult.push({
            id: tmpDct.id,
            file_id: tmpDct?.payload?.file_id,
            content: tmpDct?.payload?.content,
            tokens: tmpDct?.payload?.tokens,
            similarity: tmpDct.score
          })
        }
      }
      chunks = searchResult
    }

    const mostSimilarChunks = chunks?.sort(
      (a, b) => b.similarity - a.similarity
    )
    console.log(mostSimilarChunks)
    return new Response(JSON.stringify({ results: mostSimilarChunks }), {
      status: 200
    })
  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    console.log(errorMessage + " - " + JSON.stringify(error))
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
