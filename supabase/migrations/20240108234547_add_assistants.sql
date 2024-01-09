--------------- ASSISTANTS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS assistants (
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
    context_length INT NOT NULL,
    description TEXT NOT NULL CHECK (char_length(description) <= 500),
    embeddings_provider TEXT NOT NULL CHECK (char_length(embeddings_provider) <= 1000),
    include_profile_context BOOLEAN NOT NULL,
    include_workspace_instructions BOOLEAN NOT NULL,
    model TEXT NOT NULL CHECK (char_length(model) <= 1000),
    name TEXT NOT NULL CHECK (char_length(name) <= 100),
    image_path TEXT NOT NULL CHECK (char_length(image_path) <= 1000), -- file path in assistant_images bucket
    prompt TEXT NOT NULL CHECK (char_length(prompt) <= 100000),
    temperature REAL NOT NULL
);

-- INDEXES --

CREATE INDEX assistants_user_id_idx ON assistants(user_id);

-- RLS --

ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own assistants"
    ON assistants
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to non-private assistants"
    ON assistants
    FOR SELECT
    USING (sharing <> 'private');

-- FUNCTIONS --

CREATE OR REPLACE FUNCTION delete_old_assistant_image()
RETURNS TRIGGER
LANGUAGE 'plpgsql'
SECURITY DEFINER
AS $$
DECLARE
  status INT;
  content TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT
      INTO status, content
      result.status, result.content
      FROM public.delete_storage_object_from_bucket('assistant_images', OLD.image_path) AS result;
    IF status <> 200 THEN
      RAISE WARNING 'Could not delete assistant image: % %', status, content;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- TRIGGERS --

CREATE TRIGGER update_assistants_updated_at
BEFORE UPDATE ON assistants
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER delete_old_assistant_image
AFTER DELETE ON assistants
FOR EACH ROW
EXECUTE PROCEDURE delete_old_assistant_image();

-- STORAGE --

INSERT INTO storage.buckets (id, name, public) VALUES ('assistant_images', 'assistant_images', false);

CREATE OR REPLACE FUNCTION public.non_private_assistant_exists(p_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM assistants
        WHERE (id::text = (storage.filename(p_name))) AND sharing <> 'private'
    );
$$;

CREATE POLICY "Allow public read access on non-private assistant images"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'assistant_images' AND public.non_private_assistant_exists(name));

CREATE POLICY "Allow insert access to own assistant images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'assistant_images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow update access to own assistant images"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'assistant_images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow delete access to own assistant images"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'assistant_images' AND (storage.foldername(name))[1] = auth.uid()::text);

--------------- ASSISTANT WORKSPACES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS assistant_workspaces (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    PRIMARY KEY(assistant_id, workspace_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX assistant_workspaces_user_id_idx ON assistant_workspaces(user_id);
CREATE INDEX assistant_workspaces_assistant_id_idx ON assistant_workspaces(assistant_id);
CREATE INDEX assistant_workspaces_workspace_id_idx ON assistant_workspaces(workspace_id);

-- RLS --

ALTER TABLE assistant_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own assistant_workspaces"
    ON assistant_workspaces
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_assistant_workspaces_updated_at
BEFORE UPDATE ON assistant_workspaces 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();
