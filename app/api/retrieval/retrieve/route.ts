import { generateLocalEmbedding } from "@/lib/generate-local-embedding"
import { rephraser } from "@/lib/retrieve/rephraser"
import { retriever } from "@/lib/retrieve/retriever"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { Database } from "@/supabase/types"
import { ChatMessage } from "@/types"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

export async function POST(request: Request) {
  const json = await request.json()
  const {
    messageContent,
    prompt,
    chatMessages,
    fileIds,
    embeddingsProvider,
    sourceCount
  } = json as {
    messageContent: string
    prompt: string
    chatMessages: ChatMessage[]
    fileIds: string[]
    embeddingsProvider: "openai" | "local"
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
      if (profile.use_azure_openai) {
        checkApiKey(profile.azure_openai_api_key, "Azure OpenAI")
      } else {
        checkApiKey(profile.openai_api_key, "OpenAI")
      }
    }

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

    let rephrasedUserInput: string | null | undefined = null
    if (process.env.REPHRASER_ENABLED === "true") {
      try {
        rephrasedUserInput = await rephraser(
          openai,
          process.env.REPHRASER_MODEL_ID || "gpt-3.5-turbo-0125",
          messageContent,
          prompt,
          process.env.RAPHRASER_MODE as any,
          chatMessages,
          parseInt(process.env.REPHRASER_MAX_HISTORY_MESSAGES || "3"),
          parseInt(process.env.REPHRASER_MAX_HISTORY_TOKENS || "2048")
        )
      } catch (error: any) {
        console.error("Error rephrasing user input", error)
      }
    }

    const mostSimilarChunks = await retriever(
      supabaseAdmin,
      openai,
      embeddingsProvider,
      rephrasedUserInput || messageContent,
      sourceCount,
      uniqueFileIds
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
