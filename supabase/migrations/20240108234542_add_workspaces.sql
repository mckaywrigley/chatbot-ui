--------------- WORKSPACES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS workspaces (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

    -- SHARING
    sharing TEXT NOT NULL DEFAULT 'private',

    -- REQUIRED
    default_context_length INTEGER NOT NULL,
    default_model TEXT NOT NULL CHECK (char_length(default_model) <= 1000),
    default_prompt TEXT NOT NULL CHECK (char_length(default_prompt) <= 100000),
    default_temperature REAL NOT NULL,
    description TEXT NOT NULL CHECK (char_length(description) <= 500),
    embeddings_provider TEXT NOT NULL CHECK (char_length(embeddings_provider) <= 1000),
    include_profile_context BOOLEAN NOT NULL,
    include_workspace_instructions BOOLEAN NOT NULL,
    instructions TEXT NOT NULL CHECK (char_length(instructions) <= 1500),
    is_home BOOLEAN NOT NULL DEFAULT FALSE,
    name TEXT NOT NULL CHECK (char_length(name) <= 100)
);

-- INDEXES --

CREATE INDEX idx_workspaces_user_id ON workspaces (user_id);

-- RLS --

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own workspaces"
    ON workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to non-private workspaces"
    ON workspaces
    FOR SELECT
    USING (sharing <> 'private');

-- FUNCTIONS --

CREATE OR REPLACE FUNCTION prevent_home_field_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_home IS DISTINCT FROM OLD.is_home THEN
    RAISE EXCEPTION 'Updating the home field of workspace is not allowed.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS --

CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE FUNCTION prevent_home_workspace_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_home THEN
    RAISE EXCEPTION 'Home workspace deletion is not allowed.';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_update_of_home_field
BEFORE UPDATE ON workspaces
FOR EACH ROW
EXECUTE PROCEDURE prevent_home_field_update();

-- INDEXES --

CREATE UNIQUE INDEX idx_unique_home_workspace_per_user 
ON workspaces(user_id) 
WHERE is_home;