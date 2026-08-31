-- Persist citations across re-indexing.
--
-- Today `message_file_items.file_item_id` FKs to `file_items` (the legacy
-- table). When a design/report is re-saved we DELETE+INSERT all its
-- `rag_items` rows (replace-by-source). Without snapshot fields a chat
-- thread loses its citation chips on the next re-index.
--
-- This migration is purely additive - `file_item_id` keeps working for
-- legacy rows. New citations (PR-6 onward) write `rag_item_id` + the
-- denormalized snapshot fields. Renderer falls back to the snapshot when
-- the FK is null/dangling and shows a "(source updated)" badge.
--
-- We deliberately DO NOT drop the existing PK `(message_id, file_item_id)`
-- in this PR - the table only stores legacy rows. PR-6 will introduce a
-- synthetic id PK + `(message_id, file_item_id)` partial unique once we
-- start inserting rag-only rows where `file_item_id IS NULL`.

ALTER TABLE message_file_items
  ADD COLUMN IF NOT EXISTS rag_item_id UUID
    REFERENCES rag_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_title     TEXT,
  ADD COLUMN IF NOT EXISTS source_url       TEXT,
  ADD COLUMN IF NOT EXISTS content_snapshot TEXT;

CREATE INDEX IF NOT EXISTS message_file_items_rag_item_id_idx
  ON message_file_items (rag_item_id);
