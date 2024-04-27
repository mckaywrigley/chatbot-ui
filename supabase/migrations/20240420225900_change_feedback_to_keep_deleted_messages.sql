ALTER TABLE feedback DROP CONSTRAINT feedback_pkey;
ALTER TABLE feedback ADD COLUMN id UUID PRIMARY KEY DEFAULT uuid_generate_v4();
ALTER TABLE feedback ALTER COLUMN message_id DROP NOT NULL;
ALTER TABLE feedback DROP CONSTRAINT fk_message;
ALTER TABLE feedback ADD CONSTRAINT fk_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE feedback ALTER COLUMN chat_id DROP NOT NULL;
ALTER TABLE feedback ADD CONSTRAINT fk_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE SET NULL;
ALTER TABLE feedback ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE feedback DROP CONSTRAINT feedback_user_id_fkey;
ALTER TABLE feedback ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE feedback ADD CONSTRAINT message_id_unique UNIQUE (user_id,chat_id,message_id);

