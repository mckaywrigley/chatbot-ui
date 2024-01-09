--------------- MESSAGES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS messages (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELATIONSHIPS
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

    -- REQUIRED
    content TEXT NOT NULL CHECK (char_length(content) <= 1000000),
    image_paths TEXT[] NOT NULL, -- file paths in message_images bucket
    model TEXT NOT NULL CHECK (char_length(model) <= 1000),
    role TEXT NOT NULL CHECK (char_length(role) <= 1000),
    sequence_number INT NOT NULL,

    -- CONSTRAINTS
    CONSTRAINT check_image_paths_length CHECK (array_length(image_paths, 1) <= 16)
);

-- INDEXES --

CREATE INDEX idx_messages_chat_id ON messages (chat_id);

-- RLS --

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own messages"
    ON messages
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to messages for non-private chats"
    ON messages
    FOR SELECT
    USING (chat_id IN (
        SELECT id FROM chats WHERE sharing <> 'private'
    ));

-- FUNCTIONS --

CREATE OR REPLACE FUNCTION delete_old_message_images()
RETURNS TRIGGER
LANGUAGE 'plpgsql'
SECURITY DEFINER
AS $$
DECLARE
  status INT;
  content TEXT;
  image_path TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    FOREACH image_path IN ARRAY OLD.image_paths
    LOOP
      SELECT
        INTO status, content
        result.status, result.content
        FROM public.delete_storage_object_from_bucket('message_images', image_path) AS result;
      IF status <> 200 THEN
        RAISE WARNING 'Could not delete message image: % %', status, content;
      END IF;
    END LOOP;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION delete_messages_including_and_after(
    p_user_id UUID, 
    p_chat_id UUID, 
    p_sequence_number INT
)
RETURNS VOID AS $$
BEGIN
    DELETE FROM messages 
    WHERE user_id = p_user_id AND chat_id = p_chat_id AND sequence_number >= p_sequence_number;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS --

CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER delete_old_message_images
AFTER DELETE ON messages
FOR EACH ROW
EXECUTE PROCEDURE delete_old_message_images();

-- STORAGE --

-- MESSAGE IMAGES

INSERT INTO storage.buckets (id, name, public) VALUES ('message_images', 'message_images', false);

CREATE POLICY "Allow read access to own message images"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'message_images' AND 
        (
            (storage.foldername(name))[1] = auth.uid()::text OR
            (
                EXISTS (
                    SELECT 1 FROM chats 
                    WHERE id = (
                        SELECT chat_id FROM messages WHERE id = (storage.foldername(name))[2]::uuid
                    ) AND sharing <> 'private'
                )
            )
        )
    );

CREATE POLICY "Allow insert access to own message images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'message_images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow update access to own message images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'message_images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow delete access to own message images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'message_images' AND (storage.foldername(name))[1] = auth.uid()::text);

--------------- MESSAGE FILE ITEMS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS message_file_items (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_item_id UUID NOT NULL REFERENCES file_items(id) ON DELETE CASCADE,

    PRIMARY KEY(message_id, file_item_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX idx_message_file_items_message_id ON message_file_items (message_id);

-- RLS --

ALTER TABLE message_file_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own message_file_items"
    ON message_file_items
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- TRIGGERS --

CREATE TRIGGER update_message_file_items_updated_at
BEFORE UPDATE ON message_file_items 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();