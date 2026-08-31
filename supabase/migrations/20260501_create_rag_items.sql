-- Unified RAG corpus across all source types - replaces `file_items` after
-- PR-9 soak completes. Single table + single RPC keeps tier-1/2/3 retrieval
-- scope changes to a WHERE-clause edit (see lib/rag/retrieve.ts).
--
-- Plan: docs/adr-equivalent at /Users/piyush/.claude/plans/rosy-rolling-flute.md
-- Source-of-truth: lib/rag/types.ts (TS schema + zod), this file (SQL).

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- Source identity. TEXT not UUID because Firestore docs (designs, reports,
-- paper_library, data_collections) use string ids, not Postgres UUIDs.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rag_source_type') THEN
    CREATE TYPE rag_source_type AS ENUM (
      'file',
      'design',
      'report',
      'project_file',
      'paper_library',
      'data_collection',
      'chat_message'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS rag_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity / tenancy
  source_type  rag_source_type NOT NULL,
  source_id    TEXT NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index  INT  NOT NULL,

  -- Content. `content` is what we show the LLM; `contextualized_content` is
  -- what we embed (Anthropic-style chunk context blurb prepended). For
  -- `source_type='file'` v1 we set contextualized_content := content (skip
  -- Haiku - files have natural context like filenames + page headers).
  content                TEXT NOT NULL,
  contextualized_content TEXT NOT NULL,
  openai_embedding       vector(1536),
  tsvector_content       tsvector
                         GENERATED ALWAYS AS
                         (to_tsvector('english', coalesce(contextualized_content,''))) STORED,

  -- Denormalized for inline citation rendering - avoids N follow-up
  -- Firestore reads when the chat UI builds reference chips. Re-index on
  -- save (PR-4) keeps these fresh.
  source_title       TEXT,
  source_url         TEXT,
  source_section     TEXT,
  source_updated_at  TIMESTAMPTZ,

  -- Free-form per-source-type details (e.g. message role, paper authors)
  metadata      JSONB NOT NULL DEFAULT '{}',
  index_version INT   NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT rag_items_source_chunk_unique
    UNIQUE (source_type, source_id, chunk_index, index_version)
);

-- HNSW for dense ANN; GIN for BM25 sparse. Tenancy btrees make
-- (workspace,project) and (workspace,source_type,source_id) lookups cheap.
CREATE INDEX IF NOT EXISTS rag_items_embedding_hnsw_idx ON rag_items
  USING hnsw (openai_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS rag_items_tsv_gin_idx
  ON rag_items USING gin (tsvector_content);

CREATE INDEX IF NOT EXISTS rag_items_workspace_idx
  ON rag_items (workspace_id);

CREATE INDEX IF NOT EXISTS rag_items_workspace_proj_idx
  ON rag_items (workspace_id, project_id);

CREATE INDEX IF NOT EXISTS rag_items_workspace_src_idx
  ON rag_items (workspace_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS rag_items_source_idx
  ON rag_items (source_type, source_id);

-- RLS. Mirrors file_items pattern - workspace owner has full access; service
-- role bypasses RLS automatically. Sharing across workspace members is a
-- separate future feature (workspaces are single-owner today).
ALTER TABLE rag_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own rag items"
  ON rag_items
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_rag_items_updated_at
BEFORE UPDATE ON rag_items
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
