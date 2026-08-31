-- Widen `message_file_items` so RAG citations (rows pointing at
-- `rag_items`, not `file_items`) can persist alongside legacy
-- file-attachment rows. PR-9a in /Users/piyush/.claude/plans/rosy-rolling-flute.md.
--
-- Pre-PR-6: every row had `file_item_id NOT NULL` FK to `file_items`,
-- with PK `(message_id, file_item_id)`. Post-cutover, retrieved chunks
-- live in `rag_items` instead - we already added `rag_item_id` (PR-1's
-- migration 20260504) but couldn't make `file_item_id` nullable
-- without dropping the PK.
--
-- This migration:
--   1. Drop the existing PK
--   2. Add a synthetic UUID `id` PK
--   3. Drop NOT NULL on `file_item_id`
--   4. Add CHECK: at least one of file_item_id / rag_item_id must be set
--   5. Re-create uniqueness as partial UNIQUEs per non-null FK
--
-- Idempotent: each step uses IF EXISTS / IF NOT EXISTS where the
-- syntax allows.

-- 1. Drop the composite PK if it still exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'message_file_items_pkey'
      AND conrelid = 'message_file_items'::regclass
  ) THEN
    ALTER TABLE message_file_items DROP CONSTRAINT message_file_items_pkey;
  END IF;
END$$;

-- 2. Add synthetic id column + PK (only if not present).
ALTER TABLE message_file_items
  ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT uuid_generate_v4();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'message_file_items_pkey'
      AND conrelid = 'message_file_items'::regclass
  ) THEN
    ALTER TABLE message_file_items ADD PRIMARY KEY (id);
  END IF;
END$$;

-- 3. Make file_item_id nullable.
ALTER TABLE message_file_items
  ALTER COLUMN file_item_id DROP NOT NULL;

-- 4. Require at least one citation pointer.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'message_file_items_one_fk_set'
      AND conrelid = 'message_file_items'::regclass
  ) THEN
    ALTER TABLE message_file_items
      ADD CONSTRAINT message_file_items_one_fk_set
      CHECK (file_item_id IS NOT NULL OR rag_item_id IS NOT NULL);
  END IF;
END$$;

-- 5. Partial UNIQUEs replace the dropped composite PK.
CREATE UNIQUE INDEX IF NOT EXISTS
  message_file_items_msg_file_unique
  ON message_file_items (message_id, file_item_id)
  WHERE file_item_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS
  message_file_items_msg_rag_unique
  ON message_file_items (message_id, rag_item_id)
  WHERE rag_item_id IS NOT NULL;
