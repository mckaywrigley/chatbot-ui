-- Drop the FK from `chats.project_id` to the Postgres `projects` table.
--
-- Projects were migrated to Firestore (see lib/project/server.ts -
-- collection "projects" lives in adminDb). The Postgres `projects`
-- table is empty/legacy, so any chat created with a Firestore project
-- id was getting rejected by the FK constraint.
--
-- We keep the column itself (existing chat data uses it as a plain
-- string reference; the studio-canvas project-chat lookup matches by
-- value, not via FK).
--
-- Idempotent.

ALTER TABLE chats
  DROP CONSTRAINT IF EXISTS chats_project_id_fkey;
