-- Per-doc indexing status for the cron sweep + observability. Lets the
-- hourly `rag.cron.sweep` Inngest function find docs whose `updated_at`
-- moved past `last_indexed_at` and re-fire `rag.doc.changed`.
--
-- Firestore-resident sources (designs, reports, paper_library,
-- data_collections, project_files) carry the same fields as plain doc
-- properties - written lazily by lib/rag/index-doc.ts. No Firestore
-- "schema migration" exists; the contract lives in lib/rag/types.ts.

ALTER TABLE files
  ADD COLUMN IF NOT EXISTS last_indexed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS index_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (index_status IN ('pending','ready','failed','stale')),
  ADD COLUMN IF NOT EXISTS index_version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS index_error TEXT;

CREATE INDEX IF NOT EXISTS files_index_status_idx
  ON files (index_status, updated_at);
