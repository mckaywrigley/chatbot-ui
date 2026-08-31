/**
 * Shared types + zod schemas for the unified RAG corpus.
 *
 * The SQL `rag_source_type` enum + `rag_items` table (see
 * supabase/migrations/20260501_create_rag_items.sql) is the source of truth
 * for the storage shape. This file mirrors it for use by the chunking,
 * contextualization, embedding, indexing, and retrieval modules.
 */
import { z } from "zod"

export const SOURCE_TYPES = [
  "file",
  "design",
  "report",
  "project_file",
  "paper_library",
  "data_collection",
  "chat_message"
] as const
export const SourceTypeSchema = z.enum(SOURCE_TYPES)
export type SourceType = z.infer<typeof SourceTypeSchema>

export const INDEX_STATUSES = ["pending", "ready", "failed", "stale"] as const
export type IndexStatus = (typeof INDEX_STATUSES)[number]

/**
 * Output of a per-source-type extractor. `chunks[i].content` is the raw
 * text we eventually show the LLM. `sectionTitle` becomes
 * `rag_items.source_section` for citation metadata.
 *
 * `denormalizedMetadata` populates the source_title / source_url /
 * source_updated_at / metadata columns and is reused for every chunk of
 * the same source.
 */
export interface ChunkInput {
  content: string
  sectionTitle?: string
  /** Per-chunk metadata override (merged on top of source-level). */
  metadataOverride?: Record<string, unknown>
}

export interface SourceMeta {
  source_type: SourceType
  source_id: string
  workspace_id: string
  project_id: string | null
  user_id: string
  source_title: string | null
  source_url: string | null
  source_updated_at: string | null
  /** Free-form per-source-type extras. */
  metadata: Record<string, unknown>
}

export interface ExtractorResult {
  /**
   * Full document text - used by the contextualizer as the prompt-cached
   * prefix ("Here is the document …"). Keep this concatenated, ungated by
   * chunk boundaries.
   */
  fullDocText: string
  chunks: ChunkInput[]
  denormalizedMetadata: SourceMeta
}

/**
 * Row shape returned by the `match_rag_items` RPC. Matches the SQL
 * RETURNS TABLE (...) in migrations/20260503_match_rag_items_rpc.sql.
 */
export interface MatchRagItemRow {
  id: string
  source_type: SourceType
  source_id: string
  content: string
  source_title: string | null
  source_url: string | null
  source_section: string | null
  metadata: Record<string, unknown>
  source_updated_at: string | null
  similarity: number
  bm25_rank: number
  age_days: number
}

/**
 * Final shape returned by `lib/rag/retrieve.ts:retrieve()` after RRF +
 * recency + chat multiplier. `score` is the post-fusion score the chat
 * uses for ordering; it has no absolute meaning, only relative.
 */
export interface RagItem extends MatchRagItemRow {
  score: number
}

/**
 * Minimal shape consumed downstream of retrieval (build-prompt + chat
 * persistence). Both legacy `Tables<"file_items">` rows AND new
 * `RagItem`s satisfy this - the build-prompt path only ever reads the
 * fields below, so widening to a structural type lets the chat handler
 * stop caring about the underlying corpus shape.
 */
export interface RetrievedItem {
  id: string
  content: string
  source_title?: string | null
  source_url?: string | null
  source_section?: string | null
  source_type?: SourceType
  source_id?: string
}

export interface RetrieveQuery {
  query: string
  workspaceId: string
  /** Mirrors `chats.scope`. NULL ⇒ workspace-wide. */
  scope: "project" | "design" | "report" | null
  scopeId?: string | null
  sourceCount?: number
  /**
   * When present, restricts retrieval to file-type rows whose source_id is
   * in this list - preserves chat-attached-files behavior post-cutover.
   */
  fileIds?: string[]
}
