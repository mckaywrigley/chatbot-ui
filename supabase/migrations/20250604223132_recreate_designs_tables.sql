--------------- DESIGNS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS designs (
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
    name TEXT NOT NULL CHECK (char_length(name) <= 100),
    description TEXT NOT NULL CHECK (char_length(description) <= 500)
);

-- INDEXES --

CREATE INDEX designs_user_id_idx ON designs(user_id);

-- RLS --

ALTER TABLE designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own designs"
    ON designs
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to non-private designs"
    ON designs
    FOR SELECT
    USING (sharing <> 'private');

-- TRIGGERS --

CREATE TRIGGER update_designs_updated_at
BEFORE UPDATE ON designs
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();


--------------- DESIGN WORKSPACES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS design_workspaces (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    PRIMARY KEY(design_id, workspace_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX design_workspaces_user_id_idx ON design_workspaces(user_id);
CREATE INDEX design_workspaces_design_id_idx ON design_workspaces(design_id);
CREATE INDEX design_workspaces_workspace_id_idx ON design_workspaces(workspace_id);

-- RLS --

ALTER TABLE design_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own design_workspaces"
    ON design_workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_design_workspaces_updated_at
BEFORE UPDATE ON design_workspaces 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();
