--------------- PROMPTS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS prompts (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- OPTIONAL RELATIONSHIPS
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

    -- SHARING
    sharing TEXT NOT NULL DEFAULT 'private',

    -- REQUIRED
    content TEXT NOT NULL CHECK (char_length(content) <= 100000),
    name TEXT NOT NULL CHECK (char_length(name) <= 100)
);

-- INDEXES --

CREATE INDEX prompts_user_id_idx ON prompts(user_id);

-- RLS --

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own prompts"
    ON prompts
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to non-private prompts"
    ON prompts
    FOR SELECT
    USING (sharing <> 'private');

-- TRIGGERS --

CREATE TRIGGER update_prompts_updated_at
BEFORE UPDATE ON prompts
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--------------- PROMPT WORKSPACES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS prompt_workspaces (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    PRIMARY KEY(prompt_id, workspace_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX prompt_workspaces_user_id_idx ON prompt_workspaces(user_id);
CREATE INDEX prompt_workspaces_prompt_id_idx ON prompt_workspaces(prompt_id);
CREATE INDEX prompt_workspaces_workspace_id_idx ON prompt_workspaces(workspace_id);

-- RLS --

ALTER TABLE prompt_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own prompt_workspaces"
    ON prompt_workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_prompt_workspaces_updated_at
BEFORE UPDATE ON prompt_workspaces 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();
