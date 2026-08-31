import { generateLocalEmbedding } from "@/lib/generate-local-embedding"
import {
  processCSV,
  processJSON,
  processMarkdown,
  processPdf,
  processTxt
} from "@/lib/retrieval/processing"
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
import { enforceSize, sniffAndValidate } from "@/lib/server/file-validation"

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profile = await getServerProfile()

    const formData = await req.formData()

    const file_id = formData.get("file_id") as string
    const embeddingsProvider = formData.get("embeddingsProvider") as string

    const { data: fileMetadata, error: metadataError } = await supabaseAdmin
      .from("files")
      .select("*")
      .eq("id", file_id)
      .single()

    if (metadataError) {
      throw new Error(
        `Failed to retrieve file metadata: ${metadataError.message}`
      )
    }

    if (!fileMetadata) {
      throw new Error("File not found")
    }

    if (fileMetadata.user_id !== profile.user_id) {
      throw new Error("Unauthorized")
    }

    const { data: file, error: fileError } = await supabaseAdmin.storage
      .from("files")
      .download(fileMetadata.file_path)

    if (fileError)
      throw new Error(`Failed to retrieve file: ${fileError.message}`)

    const fileBuffer = Buffer.from(await file.arrayBuffer()) as Buffer

    const sizeError = enforceSize(fileBuffer.byteLength, "document")
    if (sizeError) return sizeError

    const mimeError = await sniffAndValidate(
      fileBuffer,
      "document",
      fileMetadata.type ?? undefined,
      fileMetadata.name
    )
    if (mimeError) return mimeError

    const blob = new Blob([fileBuffer as BlobPart])
    const fileExtension = fileMetadata.name.split(".").pop()?.toLowerCase()

    let chunks: FileItemChunk[] = []

    switch (fileExtension) {
      case "csv":
        chunks = await processCSV(blob)
        break
      case "json":
        chunks = await processJSON(blob)
        break
      case "md":
        chunks = await processMarkdown(blob)
        break
      case "pdf":
        chunks = await processPdf(blob)
        break
      case "txt":
        chunks = await processTxt(blob)
        break
      default:
        return new NextResponse("Unsupported file type", {
          status: 400
        })
    }

    let embeddings: any = []

    if (embeddingsProvider === "openai") {
      // Prefer per-user profile setting; fallback to env-based embeddings deployment.
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
        input: chunks.map(chunk => chunk.content),
        dimensions: 1536
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
      file_id,
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
      .eq("id", file_id)

    return new NextResponse("Embed Successful", {
      status: 200
    })
  } catch (error: any) {
    console.log(`Error in retrieval/process: ${error.stack}`)
    const errorMessage = error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
