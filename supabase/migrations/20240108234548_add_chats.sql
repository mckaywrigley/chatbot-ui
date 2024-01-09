--------------- CHATS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS chats (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- OPTIONAL RELATIONSHIPS
    assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

    -- SHARING
    sharing TEXT NOT NULL DEFAULT 'private',

    -- REQUIRED
    context_length INT NOT NULL,
    embeddings_provider TEXT NOT NULL CHECK (char_length(embeddings_provider) <= 1000),
    include_profile_context BOOLEAN NOT NULL,
    include_workspace_instructions BOOLEAN NOT NULL,
    model TEXT NOT NULL CHECK (char_length(model) <= 1000),
    name TEXT NOT NULL CHECK (char_length(name) <= 200),
    prompt TEXT NOT NULL CHECK (char_length(prompt) <= 100000),
    temperature REAL NOT NULL
);

-- INDEXES --

CREATE INDEX idx_chats_user_id ON chats (user_id);
CREATE INDEX idx_chats_workspace_id ON chats (workspace_id);

-- RLS --

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own chats"
    ON chats
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to non-private chats"
    ON chats
    FOR SELECT
    USING (sharing <> 'private');

-- TRIGGERS --

CREATE TRIGGER update_chats_updated_at
BEFORE UPDATE ON chats 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();

--------------- CHAT FILES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS chat_files (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,

    PRIMARY KEY(chat_id, file_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX idx_chat_files_chat_id ON chat_files (chat_id);

-- RLS --

ALTER TABLE chat_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own chat_files"
    ON chat_files
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_chat_files_updated_at
BEFORE UPDATE ON chat_files 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();