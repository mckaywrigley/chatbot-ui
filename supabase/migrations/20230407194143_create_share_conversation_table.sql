CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE share_conversations (
  id SERIAL PRIMARY KEY,
  accessible_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  prompts JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
