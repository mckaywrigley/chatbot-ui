--------------- FILES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS files_custom (
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
    file_path TEXT NOT NULL CHECK (char_length(file_path) <= 1000),
    name TEXT NOT NULL CHECK (char_length(name) <= 100),
    size INT NOT NULL,
    tokens INT NOT NULL,
    type TEXT NOT NULL CHECK (char_length(type) <= 100)
);

-- INDEXES --

CREATE INDEX files_custom_user_id_idx ON files_custom(user_id);

-- RLS --

ALTER TABLE files_custom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own files"
    ON files_custom
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to non-private files"
    ON files_custom
    FOR SELECT
    USING (sharing <> 'private');

-- FUNCTIONS --

CREATE OR REPLACE FUNCTION delete_old_file()
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
      FROM public.delete_storage_object_from_bucket('files_custom', OLD.file_path) AS result;
    IF status <> 200 THEN
      RAISE WARNING 'Could not delete file: % %', status, content;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- TRIGGERS --

CREATE TRIGGER update_files_custom_updated_at
BEFORE UPDATE ON files_custom
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER delete_old_file
BEFORE DELETE ON files_custom
FOR EACH ROW
EXECUTE PROCEDURE delete_old_file();

-- STORAGE --

INSERT INTO storage.buckets (id, name, public) VALUES ('files_custom', 'files_custom', false);

CREATE OR REPLACE FUNCTION public.non_private_file_exists(p_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM files_custom
        WHERE (id::text = (storage.foldername(p_name))[2]) AND sharing <> 'private'
    );
$$;

CREATE POLICY "Allow public read access on non-private files"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'files_custom' AND public.non_private_file_exists(name));

CREATE POLICY "Allow authenticated insert access to own file"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'files_custom' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow authenticated update access to own file"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'files_custom' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow authenticated delete access to own file"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'files_custom' AND (storage.foldername(name))[1] = auth.uid()::text);

--------------- FILE WORKSPACES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS file_workspaces_custom (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files_custom(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    PRIMARY KEY(file_id, workspace_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX file_workspaces_custom_user_id_idx ON file_workspaces_custom(user_id);
CREATE INDEX file_workspaces_custom_file_id_idx ON file_workspaces_custom(file_id);
CREATE INDEX file_workspaces_custom_workspace_id_idx ON file_workspaces_custom(workspace_id);

-- RLS --

ALTER TABLE file_workspaces_custom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own file_workspaces"
    ON file_workspaces_custom
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_file_workspaces_custom_updated_at
BEFORE UPDATE ON file_workspaces_custom
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();