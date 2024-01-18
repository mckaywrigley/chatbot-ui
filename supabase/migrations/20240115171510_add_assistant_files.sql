--------------- ASSISTANT FILES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS assistant_files (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,

    PRIMARY KEY(assistant_id, file_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX assistant_files_user_id_idx ON assistant_files(user_id);
CREATE INDEX assistant_files_assistant_id_idx ON assistant_files(assistant_id);
CREATE INDEX assistant_files_file_id_idx ON assistant_files(file_id);

-- RLS --

ALTER TABLE assistant_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own assistant_files"
    ON assistant_files
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_assistant_files_updated_at
BEFORE UPDATE ON assistant_files 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();

--------------- ASSISTANT COLLECTIONS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS assistant_collections (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,

    PRIMARY KEY(assistant_id, collection_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX assistant_collections_user_id_idx ON assistant_collections(user_id);
CREATE INDEX assistant_collections_assistant_id_idx ON assistant_collections(assistant_id);
CREATE INDEX assistant_collections_collection_id_idx ON assistant_collections(collection_id);

-- RLS --

ALTER TABLE assistant_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own assistant_collections"
    ON assistant_collections
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_assistant_collections_updated_at
BEFORE UPDATE ON assistant_collections 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();