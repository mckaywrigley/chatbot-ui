-- Hybrid retrieval RPC. Returns BOTH a dense similarity score and a BM25
-- rank - RRF fusion + recency boost + chat-content multiplier are computed
-- in TypeScript (lib/rag/retrieve.ts) so they can be tweaked without a
-- migration.
--
-- Filters fold into a single WHERE clause, so tier 1 / tier 2 / tier 3
-- (RAG-fallback) all use the same RPC, just different `p_workspace_id`,
-- `p_project_id`, `p_source_types` arguments.

CREATE OR REPLACE FUNCTION match_rag_items(
  query_embedding      vector(1536),
  query_text           TEXT,
  match_count          INT DEFAULT 40,
  p_workspace_id       UUID DEFAULT NULL,
  p_project_id         UUID DEFAULT NULL,
  p_source_types       rag_source_type[] DEFAULT NULL,
  p_exclude_source_ids TEXT[] DEFAULT NULL,
  p_only_source_ids    TEXT[] DEFAULT NULL
) RETURNS TABLE (
  id                UUID,
  source_type       rag_source_type,
  source_id         TEXT,
  content           TEXT,
  source_title      TEXT,
  source_url        TEXT,
  source_section    TEXT,
  metadata          JSONB,
  source_updated_at TIMESTAMPTZ,
  similarity        FLOAT,
  bm25_rank         FLOAT,
  age_days          INT
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  q tsquery := plainto_tsquery('english', coalesce(query_text, ''));
BEGIN
  RETURN QUERY
  WITH dense AS (
    SELECT r.id, 1 - (r.openai_embedding <=> query_embedding) AS sim
    FROM rag_items r
    WHERE (p_workspace_id    IS NULL OR r.workspace_id = p_workspace_id)
      AND (p_project_id      IS NULL OR r.project_id   = p_project_id)
      AND (p_source_types    IS NULL OR r.source_type  = ANY(p_source_types))
      AND (p_exclude_source_ids IS NULL OR NOT (r.source_id = ANY(p_exclude_source_ids)))
      AND (p_only_source_ids    IS NULL OR (r.source_id = ANY(p_only_source_ids)))
      AND r.openai_embedding IS NOT NULL
    ORDER BY r.openai_embedding <=> query_embedding
    LIMIT match_count * 4
  ),
  sparse AS (
    SELECT r.id, ts_rank_cd(r.tsvector_content, q) AS bm
    FROM rag_items r
    WHERE (p_workspace_id    IS NULL OR r.workspace_id = p_workspace_id)
      AND (p_project_id      IS NULL OR r.project_id   = p_project_id)
      AND (p_source_types    IS NULL OR r.source_type  = ANY(p_source_types))
      AND (p_exclude_source_ids IS NULL OR NOT (r.source_id = ANY(p_exclude_source_ids)))
      AND (p_only_source_ids    IS NULL OR (r.source_id = ANY(p_only_source_ids)))
      AND r.tsvector_content @@ q
    ORDER BY ts_rank_cd(r.tsvector_content, q) DESC
    LIMIT match_count * 4
  ),
  union_ids AS (
    SELECT id FROM dense
    UNION
    SELECT id FROM sparse
  )
  SELECT
    r.id,
    r.source_type,
    r.source_id,
    r.content,
    r.source_title,
    r.source_url,
    r.source_section,
    r.metadata,
    r.source_updated_at,
    COALESCE((SELECT sim FROM dense  d WHERE d.id = r.id), 0)::float AS similarity,
    COALESCE((SELECT bm  FROM sparse s WHERE s.id = r.id), 0)::float AS bm25_rank,
    GREATEST(
      0,
      EXTRACT(DAY FROM now() - COALESCE(r.source_updated_at, r.updated_at))
    )::int AS age_days
  FROM rag_items r
  JOIN union_ids u ON u.id = r.id;
END;
$$;
