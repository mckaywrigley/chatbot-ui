-- Create user_conversations table
CREATE TABLE user_conversations (
  id SERIAL PRIMARY KEY,
  uid UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  conversations JSONB NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE user_conversations ENABLE ROW LEVEL SECURITY;

-- Owner policy
CREATE POLICY user_conversations_owner_policy
  ON user_conversations
  FOR ALL
  USING (
    uid = auth.uid()
  );

-- Apply the policy
ALTER TABLE user_conversations FORCE ROW LEVEL SECURITY;
