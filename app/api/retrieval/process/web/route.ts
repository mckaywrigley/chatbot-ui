import { generateLocalEmbedding } from "@/lib/generate-local-embedding"
import { webscrapper as webscraper } from "@/lib/platformTools/library/webscrapperTool"
import { processMarkdown } from "@/lib/retrieval/processing"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { Database, Tables } from "@/supabase/types"
import { FileItemChunk } from "@/types"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(req: Request) {
  const json = await req.json()
  const { embeddingsProvider, workspace_id, url } = json as {
    url: string
    workspace_id: string
    embeddingsProvider: "openai" | "local"
  }

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

    const filePath = `${profile.user_id}/${Buffer.from(url).toString("base64")}`

    const { data: existingFiles, error: existingFilesError } =
      await supabaseAdmin
        .from("files")
        .select("*")
        .eq("file_path", filePath)
        .single()

    if (existingFiles) {
      const currentTime = new Date().getTime()
      const fileCreationTime = new Date(existingFiles.created_at).getTime()
      const fileUpdateTime = existingFiles.updated_at
        ? new Date(existingFiles.updated_at).getTime()
        : null
      const timeDifference = Math.max(
        currentTime - fileCreationTime,
        fileUpdateTime ? currentTime - fileUpdateTime : 0
      )

      if (timeDifference <= 3600 * 1000) {
        // File already exists and was created or updated recently.
        return new NextResponse(
          JSON.stringify({
            message: "Embed Successful",
            fileId: existingFiles.id
          }),
          {
            status: 200
          }
        )
      }
    }

    let chunks: FileItemChunk[] = []

    const markdown = await webscraper({ parameters: { url } })
    const markdownBlob = new Blob([markdown.mdDoc], {
      type: "text/markdown"
    })
    chunks = await processMarkdown(
      markdownBlob,
      "// Data extracted from " + url
    )

    let urlObj = new URL(markdown.url)
    let hostname = urlObj.hostname
    let pathnameSections = urlObj.pathname.split("/").filter(Boolean)
    let lastSection = pathnameSections.pop() || "Untitled"
    const filename = (hostname + "_" + lastSection).substring(0, 97) + ".md"

    const fileRecord = {
      user_id: profile.user_id,
      type: "markdown",
      tokens: chunks.reduce((acc, chunk) => acc + chunk.tokens, 0),
      description: markdown.url,
      name: filename,
      file_path: filePath,
      folder_id: null,
      sharing: "private",
      size: markdownBlob.size,
      updated_at: null
    } as Tables<"files">

    let fileUpsertResponse: any
    let fileUpsertError: any

    if (existingFiles) {
      fileRecord.id = existingFiles.id
      fileRecord.updated_at = new Date().toISOString()
      const { data, error: fileUpdateError } = await supabaseAdmin
        .from("files")
        .update(fileRecord)
        .eq("id", existingFiles.id)
        .select("*")
        .single()
      fileUpsertResponse = data
      fileUpsertError = fileUpdateError
    } else {
      fileRecord.created_at = new Date().toISOString()
      const { data, error: fileInsertError } = await supabaseAdmin
        .from("files")
        .insert([fileRecord])
        .select("*")
        .single()
      fileUpsertResponse = data
      fileUpsertError = fileInsertError

      if (!fileUpsertError) {
        await supabaseAdmin.from("file_workspaces").insert({
          user_id: profile.user_id,
          file_id: fileUpsertResponse.id,
          workspace_id,
          created_at: new Date().toISOString()
        })
      }
    }

    if (fileUpsertError) {
      throw new Error(
        `Failed to insert file record: ${fileUpsertError.message}`
      )
    }

    const { data: uploadResponse, error: uploadError } =
      await supabaseAdmin.storage.from("files").upload(filePath, markdownBlob, {
        cacheControl: "3600",
        upsert: true
      })

    if (uploadError) {
      throw new Error(`Failed to upload markdown file: ${uploadError.message}`)
    }

    let embeddings: any = []

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
        input: chunks.map(chunk => chunk.content)
      })

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
      file_id: fileUpsertResponse.id,
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

    return new NextResponse(
      JSON.stringify({
        message: "Embed Successful",
        fileId: fileUpsertResponse.id
      }),
      {
        status: 200
      }
    )
  } catch (error: any) {
    console.error(error)
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
