-- Payment & token metering (RevenueCat Web Billing).
--
-- Two tables + one atomic RPC:
--   billing_accounts  – per-user plan, current-period usage, persistent
--                       custom-credit balance, and RevenueCat linkage.
--   usage_events      – append-only consumption log (analytics / audit).
--   consume_tokens()  – atomic period-roll + usage increment + custom-credit
--                       drawdown. Called by the metering layer after every
--                       AI op. Plan allowance is passed in by the app so
--                       lib/billing/plans.ts stays the single source of truth.
--
-- Enforcement (hard block at the cap) is pre-flight in app code; the DB just
-- records truth. Limits are intentionally NOT stored here so they can be
-- retuned in plans.ts without a migration.
--
-- Plan: /Users/piyush/.claude/plans/quiet-tumbling-flame.md

-- ---------------------------------------------------------------------------
-- billing_accounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription plan id. Mirrors keys in lib/billing/plans.ts.
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'max')),

  -- Current billing period. Rolls forward (in 1-month steps) lazily inside
  -- consume_tokens() once period_end has passed.
  period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_end   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 month'),

  -- Raw model tokens (prompt + completion + reasoning) consumed this period.
  tokens_used_period BIGINT NOT NULL DEFAULT 0
    CHECK (tokens_used_period >= 0),

  -- Persistent one-time top-up balance (raw tokens). Never resets monthly;
  -- only drawn down once the plan allowance for the period is exhausted.
  custom_credit_tokens BIGINT NOT NULL DEFAULT 0
    CHECK (custom_credit_tokens >= 0),

  subscription_status TEXT NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'expired')),

  -- RevenueCat linkage (set by the webhook).
  rc_app_user_id TEXT,
  rc_entitlement TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RevenueCat webhook looks accounts up by app_user_id.
CREATE INDEX IF NOT EXISTS billing_accounts_rc_app_user_id_idx
  ON billing_accounts (rc_app_user_id);

-- RLS: owners may read their own row. No client writes - all mutations go
-- through the service role (metering layer + webhook), which bypasses RLS.
ALTER TABLE billing_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own billing account"
  ON billing_accounts
  FOR SELECT
  USING (user_id = auth.uid());

CREATE TRIGGER update_billing_accounts_updated_at
BEFORE UPDATE ON billing_accounts
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ---------------------------------------------------------------------------
-- usage_events (append-only log)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Coarse feature bucket for the per-feature breakdown in the UI.
  feature TEXT NOT NULL DEFAULT 'other'
    CHECK (feature IN (
      'design', 'lit_search', 'chat', 'report',
      'data_collection', 'embeddings', 'title', 'tools', 'jarvis', 'other'
    )),

  model TEXT,
  prompt_tokens     INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens      INT NOT NULL DEFAULT 0,

  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_events_user_created_idx
  ON usage_events (user_id, created_at DESC);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own usage events"
  ON usage_events
  FOR SELECT
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- consume_tokens(): atomic period-roll + usage increment + credit drawdown.
-- Returns the updated billing_accounts row.
--
-- p_monthly_allowance is the plan's per-period token allowance, supplied by
-- the caller from lib/billing/plans.ts. Tokens beyond the allowance draw down
-- custom_credit_tokens (clamped at 0 - the pre-flight check is what actually
-- blocks; this never goes negative).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION consume_tokens(
  p_user_id UUID,
  p_tokens BIGINT,
  p_monthly_allowance BIGINT
)
RETURNS billing_accounts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  acct billing_accounts;
  prev_overflow BIGINT;
  new_used BIGINT;
  new_overflow BIGINT;
  delta_overflow BIGINT;
BEGIN
  -- Lock (or lazily create) the row so concurrent parallel agent calls
  -- serialize correctly.
  SELECT * INTO acct FROM billing_accounts WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO billing_accounts (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO acct FROM billing_accounts WHERE user_id = p_user_id FOR UPDATE;
  END IF;

  -- Roll the period forward in whole-month steps until period_end is in the
  -- future (handles months of inactivity). Each roll zeroes period usage.
  WHILE now() >= acct.period_end LOOP
    acct.period_start := acct.period_end;
    acct.period_end := acct.period_end + INTERVAL '1 month';
    acct.tokens_used_period := 0;
  END LOOP;

  -- Overflow already charged to custom credits this period (before this call).
  prev_overflow := GREATEST(0, acct.tokens_used_period - p_monthly_allowance);
  new_used := acct.tokens_used_period + GREATEST(0, p_tokens);
  new_overflow := GREATEST(0, new_used - p_monthly_allowance);
  delta_overflow := new_overflow - prev_overflow;

  UPDATE billing_accounts
  SET tokens_used_period = new_used,
      period_start = acct.period_start,
      period_end = acct.period_end,
      custom_credit_tokens = GREATEST(0, custom_credit_tokens - delta_overflow),
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO acct;

  RETURN acct;
END;
$$;

-- ---------------------------------------------------------------------------
-- add_custom_credits(): atomic top-up of the persistent credit balance.
-- Called by the RevenueCat webhook on a NON_RENEWING_PURCHASE (credit pack).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_custom_credits(
  p_user_id UUID,
  p_tokens BIGINT
)
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
  SET custom_credit_tokens = custom_credit_tokens + GREATEST(0, p_tokens),
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO acct;

  RETURN acct;
END;
$$;

-- ---------------------------------------------------------------------------
-- Auto-provision a billing account whenever a profile is created, and
-- backfill every existing user. (Profiles are themselves created by a trigger
-- on auth.users - see 20240108234541_add_profiles.sql.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_billing_account_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO billing_accounts (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_billing_account_on_profile_insert ON profiles;
CREATE TRIGGER create_billing_account_on_profile_insert
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE PROCEDURE create_billing_account_for_profile();

-- Backfill existing users.
INSERT INTO billing_accounts (user_id)
SELECT user_id FROM profiles
ON CONFLICT (user_id) DO NOTHING;
