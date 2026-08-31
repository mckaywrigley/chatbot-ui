-- Relax the chats scope-consistency constraint.
--
-- The original constraint (migration 20260415) required `scope` and
-- `scope_id` to be BOTH null or BOTH set:
--
--   CHECK ((scope IS NULL AND scope_id IS NULL)
--       OR (scope IS NOT NULL AND scope_id IS NOT NULL))
--
-- But the product intentionally creates chats with a scope and NO scope_id to
-- mean "all of that scope type" - specifically the "Start chat" button on the
-- Designs page creates a chat with scope='design', scope_id=NULL, which
-- retrieve.ts (lib/rag/retrieve.ts) treats as "every design in the workspace".
-- The old constraint rejected that INSERT with a CHECK violation, so the
-- all-designs chat never started.
--
-- New rule: a scope_id may not exist WITHOUT a scope, but a scope MAY exist
-- without a scope_id (= the whole scope). This keeps the data sane while
-- allowing the all-designs / all-reports chats.

ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_scope_consistency;

ALTER TABLE chats
  ADD CONSTRAINT chats_scope_consistency
  CHECK (scope_id IS NULL OR scope IS NOT NULL);
