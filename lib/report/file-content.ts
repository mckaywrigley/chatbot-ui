import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/types"
import type { FileItemChunk } from "@/types"
import mammoth from "mammoth"
import {
  processCSV,
  processJSON,
  processMarkdown,
  processPdf,
  processTxt,
  processDocX
} from "@/lib/retrieval/processing"
import { generateLocalEmbedding } from "@/lib/generate-local-embedding"

export type ResolvedFileContentSource = "file_items" | "raw"

export type ResolvedFileContent = {
  fileId: string
  fileName?: string
  content: string
  source: ResolvedFileContentSource
  warnings?: string[]
  // Present only when `source === "raw"` so callers can optionally backfill.
  chunks?: FileItemChunk[]
}

type SupabaseFileMeta = {
  id: string
  name: string
  file_path: string
  type: string
}

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function clampText(text: string, maxChars: number) {
  if (text.length <= maxChars) return { text, truncated: false }
  return {
    text: text.slice(0, maxChars) + "\n\n[Truncated]\n",
    truncated: true
  }
}

function inferExtension(fileName?: string) {
  const ext = fileName?.split(".").pop()?.toLowerCase()
  return ext || ""
}

async function parseFileToChunks(
  fileMeta: SupabaseFileMeta
): Promise<FileItemChunk[]> {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
    .from("files")
    .download(fileMeta.file_path)

  if (downloadError || !fileBlob) {
    throw new Error(downloadError?.message || "Failed to download file")
  }

  const ext = inferExtension(fileMeta.name)

  // `fileBlob` is a Blob in Next runtimes.
  switch (ext) {
    case "csv":
      return await processCSV(fileBlob)
    case "json":
      return await processJSON(fileBlob)
    case "md":
      return await processMarkdown(fileBlob)
    case "pdf":
      return await processPdf(fileBlob)
    case "txt":
      return await processTxt(fileBlob)
    case "docx": {
      const arrayBuffer = await fileBlob.arrayBuffer()
      const { value } = await mammoth.extractRawText({ arrayBuffer })
      return await processDocX(value)
    }
    default:
      throw new Error(`Unsupported file type: ${ext || "unknown"}`)
  }
}

function chunksToText(chunks: FileItemChunk[]) {
  return chunks.map(chunk => chunk.content).join("\n")
}

/**
 * Resolve a list of Supabase `files.id` to text.
 *
 * Behavior:
 * - Prefer existing `file_items` (fast path)
 * - If missing, download from Supabase Storage and parse (fallback)
 *
 * Notes:
 * - This does NOT require the user session; it uses service role.
 * - Optionally returns `chunks` for fallback results so callers can backfill `file_items`.
 */
export async function resolveSupabaseFilesToText(
  fileIds: string[],
  opts?: {
    maxCharsPerFile?: number
  }
): Promise<ResolvedFileContent[]> {
  const uniqueFileIds = [...new Set(fileIds)].filter(Boolean)
  if (uniqueFileIds.length === 0) return []

  const maxCharsPerFile = opts?.maxCharsPerFile ?? 40_000
  const supabaseAdmin = getSupabaseAdmin()

  // Load file metadata (for fallback parsing).
  const { data: filesMeta, error: filesMetaError } = await supabaseAdmin
    .from("files")
    .select("id,name,file_path,type")
    .in("id", uniqueFileIds)

  if (filesMetaError) {
    throw new Error(filesMetaError.message)
  }

  const metaById = new Map<string, SupabaseFileMeta>()
  ;(filesMeta || []).forEach(meta => {
    metaById.set(meta.id, meta as SupabaseFileMeta)
  })

  // Load file_items (fast path).
  const { data: fileItems, error: fileItemsError } = await supabaseAdmin
    .from("file_items")
    .select("file_id,content,tokens,local_embedding,openai_embedding")
    .in("file_id", uniqueFileIds)

  if (fileItemsError) {
    throw new Error(fileItemsError.message)
  }

  const itemsByFileId = new Map<string, any[]>()
  ;(fileItems || []).forEach(item => {
    const key = item.file_id as string
    const arr = itemsByFileId.get(key) || []
    arr.push(item)
    itemsByFileId.set(key, arr)
  })

  const results: ResolvedFileContent[] = []

  for (const fileId of uniqueFileIds) {
    const meta = metaById.get(fileId)
    const items = itemsByFileId.get(fileId) || []

    if (items.length > 0) {
      const combined = items.map(i => i.content).join("\n")
      const { text, truncated } = clampText(combined, maxCharsPerFile)
      results.push({
        fileId,
        fileName: meta?.name,
        content: text,
        source: "file_items",
        warnings: truncated
          ? [`Content truncated to ${maxCharsPerFile} chars`]
          : []
      })
      continue
    }

    // Fallback to raw file download + parse.
    if (!meta) {
      results.push({
        fileId,
        content: "",
        source: "raw",
        warnings: ["File metadata not found in Supabase `files` table"]
      })
      continue
    }

    try {
      const chunks = await parseFileToChunks(meta)
      const combined = chunksToText(chunks)
      const { text, truncated } = clampText(combined, maxCharsPerFile)

      results.push({
        fileId,
        fileName: meta.name,
        content: text,
        source: "raw",
        chunks,
        warnings: truncated
          ? [`Content truncated to ${maxCharsPerFile} chars`]
          : []
      })
    } catch (e: any) {
      results.push({
        fileId,
        fileName: meta.name,
        content: "",
        source: "raw",
        warnings: [e?.message || "Failed to parse file content"]
      })
    }
  }

  return results
}

/**
 * Optional backfill: upsert `file_items` for files that were resolved via raw parsing.
 *
 * This uses **local embeddings** so it works without external services.
 */
export async function backfillFileItemsLocal(
  userId: string,
  resolved: ResolvedFileContent[]
): Promise<{ backfilledFileIds: string[]; skippedFileIds: string[] }> {
  const supabaseAdmin = getSupabaseAdmin()

  const toBackfill = resolved.filter(
    r => r.source === "raw" && r.chunks?.length
  )
  const backfilledFileIds: string[] = []
  const skippedFileIds: string[] = []

  for (const item of toBackfill) {
    const chunks = item.chunks || []
    if (!chunks.length) {
      skippedFileIds.push(item.fileId)
      continue
    }

    const embeddings = await Promise.all(
      chunks.map(async chunk => {
        try {
          return await generateLocalEmbedding(chunk.content)
        } catch {
          return null
        }
      })
    )

    const file_items = chunks.map((chunk, index) => ({
      file_id: item.fileId,
      user_id: userId,
      content: chunk.content,
      tokens: chunk.tokens,
      openai_embedding: null,
      local_embedding: (embeddings[index] || null) as any
    }))

    const { error: upsertError } = await supabaseAdmin
      .from("file_items")
      .upsert(file_items)

    if (upsertError) {
      skippedFileIds.push(item.fileId)
      continue
    }

    const totalTokens = file_items.reduce(
      (acc, fi) => acc + (fi.tokens || 0),
      0
    )
    await supabaseAdmin
      .from("files")
      .update({ tokens: totalTokens })
      .eq("id", item.fileId)

    backfilledFileIds.push(item.fileId)
  }

  return { backfilledFileIds, skippedFileIds }
}
