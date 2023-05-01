CREATE TABLE IF NOT EXISTS api_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  api_type TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE api_usages
  ADD FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Enable RLS and set default access
ALTER TABLE api_usages FORCE ROW LEVEL SECURITY;
ALTER TABLE api_usages ENABLE ROW LEVEL SECURITY;

-- Restrict access to the table
REVOKE ALL ON api_usages FROM public;
REVOKE ALL ON api_usages FROM authenticated;