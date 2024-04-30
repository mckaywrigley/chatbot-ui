ALTER TABLE profiles
ALTER COLUMN voice SET DEFAULT 'echo';

ALTER TABLE assistants
ALTER COLUMN voice SET DEFAULT 'echo';

ALTER TABLE chats
ALTER COLUMN voice SET DEFAULT 'echo';