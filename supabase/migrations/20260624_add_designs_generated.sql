-- Free-tier experiment paywall: count generated designs per user so the free
-- plan can be gated at N free experiments (see lib/billing/plans.ts
-- FREE_EXPERIMENT_LIMIT). Lifetime counter - never resets. Paid plans + comps
-- are not gated by this (they're metered by credits).

ALTER TABLE billing_accounts
  ADD COLUMN IF NOT EXISTS designs_generated INT NOT NULL DEFAULT 0
    CHECK (designs_generated >= 0);

-- Atomic +1, called once when a design generation completes (Inngest worker).
CREATE OR REPLACE FUNCTION increment_designs_generated(p_user_id UUID)
RETURNS billing_accounts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  acct billing_accounts;
BEGIN
  INSERT INTO billing_accounts (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE billing_accounts
  SET designs_generated = designs_generated + 1,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO acct;

  RETURN acct;
END;
$$;
