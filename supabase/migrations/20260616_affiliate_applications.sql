-- Self-serve creator-program applications.
--
-- A logged-in user applies to become an affiliate; an operator approves or
-- rejects from /api/admin/affiliate/applications. Approval mints the affiliate
-- row (see 20260615_create_affiliates.sql) and optionally comps the user.
--
-- One row per user (re-apply = update back to 'pending'). Writes go through the
-- service role in the API; the RLS policies below also let a user read/insert/
-- update their own application directly.

CREATE TABLE IF NOT EXISTS affiliate_applications (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What the applicant tells us.
  handle TEXT NOT NULL,        -- creator name / handle
  platform TEXT,               -- youtube / tiktok / instagram / x / ... (free text)
  audience TEXT,               -- audience size / description
  pitch TEXT,                  -- links + why they're a fit

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note TEXT,            -- operator's note (e.g. rejection reason)
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin queue reads by status.
CREATE INDEX IF NOT EXISTS affiliate_applications_status_idx
  ON affiliate_applications (status, created_at DESC);

ALTER TABLE affiliate_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own application"
  ON affiliate_applications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owner can submit own application"
  ON affiliate_applications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can update own application"
  ON affiliate_applications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_affiliate_applications_updated_at
BEFORE UPDATE ON affiliate_applications
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
