-- Files (legacy `files` table) can belong to multiple workspaces via the
-- `file_workspaces` join - when we backfill them into `rag_items` we
-- emit one row per (file_id, workspace_id) pair so each workspace sees
-- the chunks under its own tenancy filter.
--
-- The original unique constraint (source_type, source_id, chunk_index,
-- index_version) blocks this. Relax to include workspace_id.
--
-- Single-workspace sources (designs, reports, paper_library, etc.)
-- already have a 1:1 mapping so the wider key is harmless for them.

ALTER TABLE rag_items
  DROP CONSTRAINT IF EXISTS rag_items_source_chunk_unique;

ALTER TABLE rag_items
  ADD CONSTRAINT rag_items_source_chunk_unique
  UNIQUE (source_type, source_id, workspace_id, chunk_index, index_version);
