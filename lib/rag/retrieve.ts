/**
 * High-level retrieval entry point.
 *
 * Pipeline:
 *   1. Resolve scope → RPC filter args.
 *   2. Embed the query.
 *   3. Call `match_rag_items` (hybrid: dense + BM25).
 *   4. RRF-fuse dense rank + BM25 rank (k=60).
 *   5. Recency boost: score *= exp(-age_days / 90).
 *   6. Chat multiplier: chat_message rows × 0.7.
 *   7. Sort, slice top sourceCount.
 */
import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/supabase/types"
import { embedBatch } from "@/lib/rag/embed"
import type {
  MatchRagItemRow,
  RagItem,
  RetrieveQuery,
  SourceType
} from "@/lib/rag/types"

const RRF_K = 60
const RECENCY_HALF_LIFE_DAYS = 90
const CHAT_MESSAGE_MULTIPLIER = 0.7
const RPC_MATCH_COUNT_MULTIPLIER = 5 // pull a wider pool than we return
/**
 * When the caller hands us an explicit set of attached files (the
 * "Files" chat scope), we know the user has already picked the
 * universe to search - the only thing that matters is topical match
 * inside that pool. Two adjustments fall out:
 *
 *  1. Skip the recency decay entirely. The reason the scientist saw
 *     "it looks in non-relevant files more, finally lands in the one
 *     with the info" was a 2-year-old PDF (the actually-relevant one)
 *     getting hammered by exp(-ageDays/90) ≈ 0.0003 while a 2-week
 *     irrelevant scratch note kept its full weight.
 *
 *  2. Add a direct dense-similarity bonus so the chunk whose embedding
 *     is closest to the query wins, instead of the chunk that merely
 *     ranks high on BM25 keyword density. RRF on ranks alone treats a
 *     near-perfect semantic hit identically to a barely-matching one
 *     when they're rank-adjacent.
 */
const FILE_SCOPE_SIMILARITY_BONUS = 1.5

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface RpcFilters {
  p_workspace_id: string | null
  p_project_id: string | null
  p_source_types: SourceType[] | null
  p_only_source_ids: string[] | null
  // Always present - PostgREST resolves RPC overloads by exact named-arg
  // set, so we send every param the function declares (defaulting to
  // null) rather than relying on Postgres defaults.
  p_exclude_source_ids: string[] | null
}

/**
 * Map a chat scope into RPC filter arguments.
 *   - null               → workspace-wide
 *   - "project"          → workspace + scopeId as project filter
 *   - "design"/"report"  → tier-3 RAG fallback only; restrict to that one doc
 */
function resolveScope(q: RetrieveQuery): RpcFilters {
  const filters: RpcFilters = {
    p_workspace_id: q.workspaceId,
    p_project_id: null,
    p_source_types: null,
    p_only_source_ids: null,
    p_exclude_source_ids: null
  }

  // scope_id is CSV-encoded for multi-pick (StartChatModal can attach
  // 1+ ids per non-Workspace tab). Split here so the RPC's
  // `p_only_source_ids` filter fans out across all picked sources.
  const scopeIdList = (q.scopeId ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)

  if (q.scope === "project" && scopeIdList.length > 0) {
    // For projects we filter by `project_id` column on rag_items, not
    // by source_id. Multi-project means OR across project_ids - but
    // the RPC takes a single p_project_id; v1 limitation = first picked
    // project wins for filtering. Multi-project filter would need a new
    // RPC param; tracked as a follow-up.
    filters.p_project_id = scopeIdList[0]
  } else if (q.scope === "design") {
    // scope='design' with NO scope_id means "all designs in workspace"
    // (issue #2 - "Start chat" from /designs lands here). With ids,
    // it restricts to the picked designs.
    filters.p_source_types = ["design"]
    if (scopeIdList.length > 0) filters.p_only_source_ids = scopeIdList
  } else if (q.scope === "report") {
    // Same convention as design - empty scope_id = "all reports".
    filters.p_source_types = ["report"]
    if (scopeIdList.length > 0) filters.p_only_source_ids = scopeIdList
  }

  // Caller-restricted attached files take precedence over scope (when
  // present, they're the only thing the caller wants searched).
  if (q.fileIds && q.fileIds.length > 0) {
    filters.p_source_types = ["file"]
    filters.p_only_source_ids = q.fileIds
  }

  return filters
}

/**
 * Compute the post-fusion score for a single chunk given its dense + BM25
 * ranks (1-based; lower is better) and metadata. Pure function - exported
 * for unit tests.
 */
export function computeScore(opts: {
  denseRank: number | null
  bm25Rank: number | null
  ageDays: number
  sourceType: SourceType
  /** Raw cosine similarity 0..1 from the dense ANN. */
  similarity?: number
  /** Set when the caller restricted retrieval to attached files. */
  fileScope?: boolean
}): number {
  const denseTerm = opts.denseRank == null ? 0 : 1 / (RRF_K + opts.denseRank)
  const sparseTerm = opts.bm25Rank == null ? 0 : 1 / (RRF_K + opts.bm25Rank)
  let score = denseTerm + sparseTerm

  if (opts.fileScope) {
    // Direct similarity bonus when the user has explicitly attached
    // files - relevance matters far more than recency or BM25 here, so
    // the embedding distance is the right tiebreaker.
    score += (opts.similarity ?? 0) * FILE_SCOPE_SIMILARITY_BONUS
  } else {
    // Recency decay only applies for workspace / project / scoped
    // retrieval. Skipping it in file-scope mode was the fix for the
    // "wrong file ranked first" regression scientist flagged (#30).
    score *= Math.exp(-Math.max(0, opts.ageDays) / RECENCY_HALF_LIFE_DAYS)
  }
  if (opts.sourceType === "chat_message") {
    score *= CHAT_MESSAGE_MULTIPLIER
  }
  return score
}

/**
 * Convert RPC rows to ranked RagItems. Exported for unit tests so the
 * fusion logic can be exercised without hitting Postgres.
 */
export function fuseAndScore(
  rows: MatchRagItemRow[],
  sourceCount: number,
  opts?: { fileScope?: boolean }
): RagItem[] {
  // Build dense + sparse rank tables. Lower rank = better. Rank only
  // considers rows that actually scored on that signal.
  const byDense = [...rows]
    .filter(r => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
  const bySparse = [...rows]
    .filter(r => r.bm25_rank > 0)
    .sort((a, b) => b.bm25_rank - a.bm25_rank)

  const denseRank = new Map<string, number>()
  byDense.forEach((r, i) => denseRank.set(r.id, i + 1))
  const sparseRank = new Map<string, number>()
  bySparse.forEach((r, i) => sparseRank.set(r.id, i + 1))

  const scored: RagItem[] = rows.map(row => ({
    ...row,
    score: computeScore({
      denseRank: denseRank.get(row.id) ?? null,
      bm25Rank: sparseRank.get(row.id) ?? null,
      ageDays: row.age_days,
      sourceType: row.source_type,
      similarity: row.similarity,
      fileScope: opts?.fileScope
    })
  }))

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, sourceCount)
}

export async function retrieve(q: RetrieveQuery): Promise<RagItem[]> {
  const sourceCount = Math.max(1, q.sourceCount ?? 8)
  const filters = resolveScope(q)

  const [embedding] = await embedBatch([q.query])
  if (!embedding) return []

  const supabase = getSupabaseAdmin()
  const matchCount = sourceCount * RPC_MATCH_COUNT_MULTIPLIER

  const runRpc = async (f: RpcFilters) => {
    const { data, error } = await supabase.rpc("match_rag_items" as any, {
      query_embedding: embedding as any,
      query_text: q.query,
      match_count: matchCount,
      ...f
    })
    if (error) {
      console.error("[rag/retrieve] match_rag_items failed:", error)
      throw error
    }
    return (data ?? []) as unknown as MatchRagItemRow[]
  }

  const rows = await runRpc(filters)

  /**
   * Second pass over FILE content for design/report scopes.
   *
   * The RPC ANDs `p_source_types` with `p_only_source_ids`, so a single call
   * can search "this design's document" or "files", never both. Scoping to the
   * document alone meant a design or report chat could never see what was
   * inside an uploaded file: the chunker deliberately indexes only filenames
   * and descriptions for attachments and embeds their contents separately
   * under source_type='file'. Asking "what's in my data file?" therefore
   * retrieved a list of filenames, and the model answered - accurately for
   * what it had been given - that it had no access to the file.
   *
   * Skipped when the caller already restricted to specific files (those ARE
   * the file pass), and when the scope has no document filter to complement.
   */
  const needsFilePass =
    (q.scope === "design" || q.scope === "report") &&
    !(q.fileIds && q.fileIds.length > 0)

  let allRows = rows
  if (needsFilePass) {
    try {
      const fileRows = await runRpc({
        p_workspace_id: q.workspaceId,
        p_project_id: null,
        p_source_types: ["file", "project_file"],
        p_only_source_ids: null,
        p_exclude_source_ids: null
      })
      // De-duplicate defensively; the two filters are disjoint by source_type,
      // but a future filter change shouldn't be able to double-count a chunk.
      const seen = new Set(rows.map(r => r.id))
      allRows = [...rows, ...fileRows.filter(r => !seen.has(r.id))]
    } catch (err) {
      // A failed file pass must not take down the whole answer - the document
      // chunks from the first pass are still worth returning.
      console.warn("[rag/retrieve] file pass failed, continuing:", err)
    }
  }

  if (allRows.length === 0) return []

  const fileScope = !!(q.fileIds && q.fileIds.length > 0)
  return fuseAndScore(allRows, sourceCount, { fileScope })
}
