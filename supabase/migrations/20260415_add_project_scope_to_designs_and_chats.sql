-- Slice 2 of UI v2 refactor:
-- 1. Link designs to projects (mirror of what reports already has)
-- 2. Generalize chat scope: a chat can be pinned to a project, design, or report
--    so the right-rail chat rail can resolve a single thread per (scope, scope_id).

-- ── Designs ─────────────────────────────────────────────────────────────
ALTER TABLE designs
ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX designs_project_id_idx ON designs(project_id);

-- ── Chats ───────────────────────────────────────────────────────────────
-- scope is one of: 'project' | 'design' | 'report' | NULL (legacy / standalone)
-- scope_id references the parent entity in the corresponding table.
-- We keep project_id on chats for backwards-compat convenience, but new code
-- should prefer (scope, scope_id).
ALTER TABLE chats
ADD COLUMN scope TEXT,
ADD COLUMN scope_id UUID;

ALTER TABLE chats
ADD CONSTRAINT chats_scope_check
CHECK (scope IS NULL OR scope IN ('project', 'design', 'report'));

ALTER TABLE chats
ADD CONSTRAINT chats_scope_consistency
CHECK ((scope IS NULL AND scope_id IS NULL) OR (scope IS NOT NULL AND scope_id IS NOT NULL));

CREATE INDEX chats_scope_scope_id_idx ON chats(scope, scope_id);
