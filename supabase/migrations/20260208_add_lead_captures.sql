-- Lead captures table for tracking exit intent, playbook, and other lead forms
CREATE TABLE IF NOT EXISTS lead_captures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'unknown',
  coupon_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_lead_captures_created_at ON lead_captures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_captures_source ON lead_captures(source);

-- Allow service role full access (no RLS needed - admin only reads via service role)
ALTER TABLE lead_captures ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (bypasses RLS by default)
-- No user-facing policies needed since we only insert/read via service role
