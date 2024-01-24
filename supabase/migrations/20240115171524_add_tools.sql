--------------- TOOLS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS tools (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- OPTIONAL RELATIONSHIPS
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

     --SHARING
    sharing TEXT NOT NULL DEFAULT 'private',

    -- REQUIRED
    description TEXT NOT NULL CHECK (char_length(description) <= 500),
    name TEXT NOT NULL CHECK (char_length(name) <= 100),
    schema JSONB NOT NULL,
    url TEXT NOT NULL CHECK (char_length(url) <= 1000)
);

-- INDEXES --

CREATE INDEX tools_user_id_idx ON tools(user_id);

-- RLS --

ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own tools"
    ON tools
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to non-private tools"
    ON tools
    FOR SELECT
    USING (sharing <> 'private');

-- TRIGGERS --

CREATE TRIGGER update_tools_updated_at
BEFORE UPDATE ON tools
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--------------- TOOL WORKSPACES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS tool_workspaces (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    PRIMARY KEY(tool_id, workspace_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX tool_workspaces_user_id_idx ON tool_workspaces(user_id);
CREATE INDEX tool_workspaces_tool_id_idx ON tool_workspaces(tool_id);
CREATE INDEX tool_workspaces_workspace_id_idx ON tool_workspaces(workspace_id);

-- RLS --

ALTER TABLE tool_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own tool_workspaces"
    ON tool_workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_tool_workspaces_updated_at
BEFORE UPDATE ON tool_workspaces 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();