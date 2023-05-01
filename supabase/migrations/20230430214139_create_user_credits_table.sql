CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_type TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, api_type)
);

ALTER TABLE user_credits
  ADD FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Enable RLS and set default access
ALTER TABLE user_credits FORCE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Restrict access to the table
REVOKE ALL ON user_credits FROM public;
REVOKE ALL ON user_credits FROM authenticated;

-- Create a policy to allow users to read their own row
CREATE POLICY user_credits_select_self
  ON user_credits
  FOR SELECT
  USING (user_id = auth.uid());
  
-- Grant select access to authenticated users according to the policy
GRANT SELECT ON user_credits TO authenticated;
