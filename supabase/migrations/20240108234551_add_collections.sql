--------------- COLLECTIONS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS collections (
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
    description TEXT NOT NULL CHECK (char_length(description) <= 500),
    name TEXT NOT NULL CHECK (char_length(name) <= 100)
);

-- INDEXES --

CREATE INDEX collections_user_id_idx ON collections(user_id);

-- RLS --

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own collections"
    ON collections
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to non-private collections"
    ON collections
    FOR SELECT
    USING (sharing <> 'private');

-- TRIGGERS --

CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON collections
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--------------- COLLECTION WORKSPACES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS collection_workspaces (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    PRIMARY KEY(collection_id, workspace_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX collection_workspaces_user_id_idx ON collection_workspaces(user_id);
CREATE INDEX collection_workspaces_collection_id_idx ON collection_workspaces(collection_id);
CREATE INDEX collection_workspaces_workspace_id_idx ON collection_workspaces(workspace_id);

-- RLS --

ALTER TABLE collection_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own collection_workspaces"
    ON collection_workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_collection_workspaces_updated_at
BEFORE UPDATE ON collection_workspaces 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();

--------------- COLLECTION FILES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS collection_files (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,

    PRIMARY KEY(collection_id, file_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX idx_collection_files_collection_id ON collection_files (collection_id);
CREATE INDEX idx_collection_files_file_id ON collection_files (file_id);

-- RLS --

ALTER TABLE collection_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own collection_files"
    ON collection_files
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to collection files for non-private collections"
    ON collection_files
    FOR SELECT
    USING (collection_id IN (
        SELECT id FROM collections WHERE sharing <> 'private'
    ));

-- TRIGGERS --

CREATE TRIGGER update_collection_files_updated_at
BEFORE UPDATE ON collection_files 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();

--------------- REFERS BACK TO FILES ---------------

CREATE POLICY "Allow view access to files for non-private collections"
    ON files
    FOR SELECT
    USING (id IN (
        SELECT file_id FROM collection_files WHERE collection_id IN (
            SELECT id FROM collections WHERE sharing <> 'private'
        )
    ));