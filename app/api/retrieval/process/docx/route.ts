import { generateLocalEmbedding } from "@/lib/generate-local-embedding"
import { processDocX } from "@/lib/retrieval/processing"
import {
  getAzureOpenAIEmbeddingsClient,
  getAzureOpenAIEmbeddingsDeployment
} from "@/lib/azure-openai"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { recordCompletionUsage } from "@/lib/billing/account"
import { Database } from "@/supabase/types"
import { FileItemChunk } from "@/types"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { enforceSize } from "@/lib/server/file-validation"

export async function POST(req: Request) {
  const json = await req.json()
  const { text, fileId, embeddingsProvider, fileExtension } = json as {
    text: string
    fileId: string
    embeddingsProvider: "openai" | "local"
    fileExtension: string
  }

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profile = await getServerProfile()

    // Verify fileId belongs to the authenticated user before embedding /
    // writing file_items scoped to it.
    const { data: ownedFile, error: ownedError } = await supabaseAdmin
      .from("files")
      .select("id")
      .eq("id", fileId)
      .eq("user_id", profile.user_id)
      .maybeSingle()

    if (ownedError) throw ownedError
    if (!ownedFile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sizeError = enforceSize(Buffer.byteLength(text || "", "utf8"), "text")
    if (sizeError) return sizeError

    let chunks: FileItemChunk[] = []

    switch (fileExtension) {
      case "docx":
        chunks = await processDocX(text)
        break
      default:
        return new NextResponse("Unsupported file type", {
          status: 400
        })
    }

    let embeddings: any = []

    if (embeddingsProvider === "openai") {
      const embeddingsDeployment =
        profile.azure_openai_embeddings_id ||
        getAzureOpenAIEmbeddingsDeployment()
      if (!embeddingsDeployment) {
        throw new Error(
          "Azure embeddings deployment not configured. Set AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT or configure azure_openai_embeddings_id, or use local embeddings."
        )
      }

      const openai = getAzureOpenAIEmbeddingsClient()
      const response = await openai.embeddings.create({
        model: embeddingsDeployment,
        input: chunks.map(chunk => chunk.content)
      })

      await recordCompletionUsage(
        {
          userId: profile.user_id,
          feature: "embeddings",
          model: embeddingsDeployment
        },
        response
      )

      embeddings = response.data.map((item: any) => {
        return item.embedding
      })
    } else if (embeddingsProvider === "local") {
      const embeddingPromises = chunks.map(async chunk => {
        try {
          return await generateLocalEmbedding(chunk.content)
        } catch (error) {
          console.error(`Error generating embedding for chunk: ${chunk}`, error)
          return null
        }
      })

      embeddings = await Promise.all(embeddingPromises)
    }

    const file_items = chunks.map((chunk, index) => ({
      file_id: fileId,
      user_id: profile.user_id,
      content: chunk.content,
      tokens: chunk.tokens,
      openai_embedding:
        embeddingsProvider === "openai"
          ? ((embeddings[index] || null) as any)
          : null,
      local_embedding:
        embeddingsProvider === "local"
          ? ((embeddings[index] || null) as any)
          : null
    }))

    await supabaseAdmin.from("file_items").upsert(file_items)

    const totalTokens = file_items.reduce((acc, item) => acc + item.tokens, 0)

    await supabaseAdmin
      .from("files")
      .update({ tokens: totalTokens })
      .eq("id", fileId)

    return new NextResponse("Embed Successful", {
      status: 200
    })
  } catch (error: any) {
    console.error(error)
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
