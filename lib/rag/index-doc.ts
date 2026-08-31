/**
 * Indexing orchestrator. For one (sourceType, sourceId), fetches the
 * source, extracts chunks, contextualizes, embeds, and writes to
 * `rag_items` using the replace-by-source pattern (DELETE old + INSERT
 * new in one transaction).
 *
 * Called from:
 *   - Inngest `rag.doc.changed` handler (debounced 60s)
 *   - Inngest `rag.backfill.workspace` worker
 *   - `app/api/rag/reindex/route.ts` admin endpoint
 *
 * Does NOT do auth - callers must already have verified the request can
 * touch this source (admin route + Inngest events both run server-side).
 */
import { adminDb } from "@/lib/firebase/admin"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/types"

import { contextualizeAll } from "@/lib/rag/contextualize"
import {
  extractChatMessage,
  extractDataCollection,
  extractDesign,
  extractFile,
  extractPaperLibrary,
  extractProjectFile,
  extractReport,
  type ChatMessageDoc,
  type DataCollectionDoc,
  type DesignDoc,
  type FileDoc,
  type PaperLibraryDoc,
  type ProjectFileDoc,
  type ReportDoc
} from "@/lib/rag/chunking"
import { embedBatch } from "@/lib/rag/embed"
import type { ExtractorResult, IndexStatus, SourceType } from "@/lib/rag/types"

const MAX_CHUNKS_PER_DOC = 500

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface IndexDocInput {
  sourceType: SourceType
  sourceId: string
  /**
   * Optional - when supplied skips the source-fetch step (used by file
   * ingest where the text was just extracted in-process).
   */
  precomputed?: ExtractorResult
}

export interface IndexDocResult {
  sourceType: SourceType
  sourceId: string
  chunksWritten: number
  status: IndexStatus
}

/**
 * Fetch the source doc + run the matching extractor. Returns null if the
 * source no longer exists (caller should treat as "indexed" with 0 rows
 * and clear any stale `rag_items` rows).
 */
async function fetchAndExtract(
  sourceType: SourceType,
  sourceId: string
): Promise<ExtractorResult | null> {
  switch (sourceType) {
    case "design": {
      const snap = await adminDb.collection("designs").doc(sourceId).get()
      if (!snap.exists) return null
      return extractDesign({
        id: snap.id,
        ...(snap.data() as any)
      } as DesignDoc)
    }
    case "report": {
      const snap = await adminDb.collection("reports").doc(sourceId).get()
      if (!snap.exists) return null
      return extractReport({
        id: snap.id,
        ...(snap.data() as any)
      } as ReportDoc)
    }
    case "paper_library": {
      const snap = await adminDb.collection("paper_library").doc(sourceId).get()
      if (!snap.exists) return null
      return extractPaperLibrary({
        id: snap.id,
        ...(snap.data() as any)
      } as PaperLibraryDoc)
    }
    case "data_collection": {
      const snap = await adminDb
        .collection("data_collections")
        .doc(sourceId)
        .get()
      if (!snap.exists) return null
      return extractDataCollection({
        id: snap.id,
        ...(snap.data() as any)
      } as DataCollectionDoc)
    }
    case "project_file": {
      // Project files: metadata in Postgres `project_files` table; the
      // bytes live in Supabase storage. Text extraction (PDF/CSV) happens
      // upstream in the per-file processor - this branch expects a
      // precomputed ExtractorResult and shouldn't reach the fetch path
      // unless a future refactor adds inline extraction here.
      throw new Error(
        "indexDoc(project_file) requires a precomputed ExtractorResult"
      )
    }
    case "file": {
      throw new Error(
        "indexDoc(file) requires a precomputed ExtractorResult - call from /api/retrieval/process"
      )
    }
    case "chat_message": {
      const supabase = getSupabaseAdmin()
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, chat_id, user_id, content, role, created_at, chats!inner(workspace_id, name, project_id)"
        )
        .eq("id", sourceId)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const chat = (data as any).chats
      const result = await extractChatMessage({
        id: data.id,
        chat_id: data.chat_id,
        user_id: data.user_id,
        workspace_id: chat?.workspace_id,
        project_id: chat?.project_id ?? null,
        role: data.role,
        content: data.content,
        created_at: data.created_at,
        chat_name: chat?.name ?? null
      } as ChatMessageDoc)
      return result
    }
  }
}

/**
 * Replace all `rag_items` for a source with a fresh chunk set.
 * Marks the per-doc index_status accordingly.
 */
export async function indexDoc(input: IndexDocInput): Promise<IndexDocResult> {
  const { sourceType, sourceId } = input
  const supabase = getSupabaseAdmin()

  let extracted: ExtractorResult | null = null
  try {
    extracted =
      input.precomputed ?? (await fetchAndExtract(sourceType, sourceId))
  } catch (err) {
    await markStatus({ sourceType, sourceId }, "failed", String(err))
    throw err
  }

  // Source disappeared (deleted between event + processing). Clear stale
  // rows and bail.
  if (!extracted) {
    await supabase
      .from("rag_items" as any)
      .delete()
      .eq("source_type", sourceType)
      .eq("source_id", sourceId)
    return { sourceType, sourceId, chunksWritten: 0, status: "ready" }
  }

  const meta = extracted.denormalizedMetadata
  const allChunks = extracted.chunks.slice(0, MAX_CHUNKS_PER_DOC)
  if (extracted.chunks.length > MAX_CHUNKS_PER_DOC) {
    console.warn(
      `[rag/index-doc] ${sourceType}:${sourceId} has ${extracted.chunks.length} chunks; capping at ${MAX_CHUNKS_PER_DOC}`
    )
  }

  // Files have natural context (filename, page headers) - skip the Haiku
  // call per locked plan. Everything else gets contextualized.
  const skipContextualization = sourceType === "file"
  const contextualized = skipContextualization
    ? allChunks.map(c => c.content)
    : await contextualizeAll(
        extracted.fullDocText,
        allChunks.map(c => c.content)
      )

  const embeddings =
    contextualized.length > 0 ? await embedBatch(contextualized) : []

  const rows = allChunks.map((chunk, i) => ({
    source_type: sourceType,
    source_id: sourceId,
    workspace_id: meta.workspace_id,
    project_id: meta.project_id,
    user_id: meta.user_id,
    chunk_index: i,
    content: chunk.content,
    contextualized_content: contextualized[i] ?? chunk.content,
    openai_embedding: embeddings[i] ?? null,
    source_title: meta.source_title,
    source_url: meta.source_url,
    source_section: chunk.sectionTitle ?? null,
    source_updated_at: meta.source_updated_at,
    metadata: { ...meta.metadata, ...(chunk.metadataOverride ?? {}) },
    index_version: 1
  }))

  // Replace-by-source. Two statements; service-role client bypasses RLS.
  // Not wrapped in a SQL transaction - Supabase JS client lacks first-class
  // transactions. Race window: if a second indexDoc fires for the same
  // source between the DELETE and INSERT, we'd lose the second one's rows.
  // The Inngest debounce key (sourceType + sourceId) makes this collision
  // extremely unlikely; if it ever bites we'll move to a stored procedure.
  const del = await supabase
    .from("rag_items" as any)
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
  if (del.error) {
    await markStatus({ sourceType, sourceId }, "failed", del.error.message)
    throw del.error
  }

  if (rows.length > 0) {
    const ins = await supabase.from("rag_items" as any).insert(rows)
    if (ins.error) {
      await markStatus({ sourceType, sourceId }, "failed", ins.error.message)
      throw ins.error
    }
  }

  await markStatus({ sourceType, sourceId }, "ready", null)
  return {
    sourceType,
    sourceId,
    chunksWritten: rows.length,
    status: "ready"
  }
}

/**
 * Update per-doc index status. Postgres for files, Firestore for the rest.
 * Best-effort - failures here log but don't throw.
 */
async function markStatus(
  ref: { sourceType: SourceType; sourceId: string },
  status: IndexStatus,
  error: string | null
): Promise<void> {
  const updates = {
    index_status: status,
    last_indexed_at: new Date().toISOString(),
    index_error: error
  }
  try {
    if (ref.sourceType === "file") {
      const supabase = getSupabaseAdmin()
      // Cast: `last_indexed_at`/`index_status`/`index_error`/`index_version`
      // were added by 20260502_add_rag_index_status.sql but the generated
      // Database types lag until `npm run db-types` runs. Safe at runtime.
      await supabase
        .from("files")
        .update(updates as any)
        .eq("id", ref.sourceId)
    } else if (ref.sourceType === "chat_message") {
      // chat_message rows have no per-doc status field - skip.
    } else {
      const collection = firestoreCollectionFor(ref.sourceType)
      if (!collection) return
      await adminDb.collection(collection).doc(ref.sourceId).update(updates)
    }
  } catch (err) {
    console.warn(
      `[rag/index-doc] failed to mark ${ref.sourceType}:${ref.sourceId} as ${status}:`,
      err
    )
  }
}

function firestoreCollectionFor(sourceType: SourceType): string | null {
  switch (sourceType) {
    case "design":
      return "designs"
    case "report":
      return "reports"
    case "paper_library":
      return "paper_library"
    case "data_collection":
      return "data_collections"
    case "project_file":
      return "project_files"
    default:
      return null
  }
}
