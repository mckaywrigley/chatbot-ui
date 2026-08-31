-- Influencer affiliate / referral program.
--
-- Two tables + one atomic RPC, layered on top of the billing schema
-- (20260605_create_billing.sql):
--
--   affiliates  – one row per influencer. Holds their unique referral CODE,
--                 the commission rate we pay them, and the bonus credits a
--                 referred viewer receives on their first subscription.
--   referrals   – attribution + commission ledger. One row per referred user
--                 (UNIQUE on referred_user_id), created at signup when a ref
--                 code is present, then flipped to 'converted' by the
--                 RevenueCat webhook on the viewer's first paid purchase.
--   record_referral_conversion() – atomic, idempotent: on the first paid
--                 purchase it books the commission, grants the viewer's bonus
--                 credits (into billing_accounts.custom_credit_tokens), and
--                 marks the referral converted. Renewals are no-ops.
--
-- Influencer "explore" access is granted out-of-band by an admin (a comp Max
-- plan - see billing_accounts.is_comp below and app/api/admin/*). Viewer
-- discounts are delivered as granted bonus credits, NOT a price cut, so this
-- layer has no dependency on RevenueCat/Stripe promo-code support.

-- ---------------------------------------------------------------------------
-- billing_accounts.is_comp - distinguishes an admin-comped plan (e.g. an
-- influencer on Max for free) from a genuinely paid subscription, so reporting
-- and the webhook can tell them apart. Comp plans have no RevenueCat
-- subscription, so no EXPIRATION webhook ever downgrades them.
-- ---------------------------------------------------------------------------
ALTER TABLE billing_accounts
  ADD COLUMN IF NOT EXISTS is_comp BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- affiliates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS affiliates (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The shareable referral code (stored normalized: uppercase, no spaces).
  code TEXT NOT NULL UNIQUE
    CHECK (char_length(code) BETWEEN 3 AND 32),

  -- Human label for the influencer (handle / name) shown on their dashboard.
  display_name TEXT,

  -- Fraction of the subscription price paid as commission (0.20 = 20%).
  commission_rate NUMERIC NOT NULL DEFAULT 0.20
    CHECK (commission_rate >= 0 AND commission_rate <= 1),

  -- Bonus credits (raw tokens) granted to a referred viewer on their first
  -- paid subscription. Default 5,000 credits (5,000,000 tokens).
  viewer_bonus_tokens BIGINT NOT NULL DEFAULT 5000000
    CHECK (viewer_bonus_tokens >= 0),

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive lookup by code (codes are stored normalized; this guards
-- against any stray casing on read).
CREATE INDEX IF NOT EXISTS affiliates_code_lower_idx
  ON affiliates (lower(code));

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

-- An influencer may read their own affiliate row. Minting/editing is
-- service-role only (admin tooling).
CREATE POLICY "Owner can read own affiliate row"
  ON affiliates
  FOR SELECT
  USING (user_id = auth.uid());

CREATE TRIGGER update_affiliates_updated_at
BEFORE UPDATE ON affiliates
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ---------------------------------------------------------------------------
-- referrals (attribution + commission ledger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- The influencer who gets the commission.
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Snapshot of the code used (the affiliate row may change later).
  code TEXT NOT NULL,
  -- The referred viewer. A user can be attributed to at most one affiliate.
  referred_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'signed_up'
    CHECK (status IN ('signed_up', 'converted', 'reversed')),

  -- Set at conversion.
  plan TEXT,
  commission_cents INT NOT NULL DEFAULT 0 CHECK (commission_cents >= 0),
  bonus_granted BOOLEAN NOT NULL DEFAULT false,

  -- Manual-payout bookkeeping.
  payout_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'paid')),

  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dashboard reads everything for one affiliate.
CREATE INDEX IF NOT EXISTS referrals_affiliate_idx
  ON referrals (affiliate_user_id, created_at DESC);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- An influencer may read the referrals attributed to them. (Note: this exposes
-- referred_user_id; the dashboard API aggregates and never returns raw ids.)
CREATE POLICY "Affiliate can read own referrals"
  ON referrals
  FOR SELECT
  USING (affiliate_user_id = auth.uid());

CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON referrals
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ---------------------------------------------------------------------------
-- record_referral_conversion(): atomic + idempotent conversion.
--
-- Called by the RevenueCat webhook on a paid purchase. Only acts on a referral
-- still in 'signed_up' state, so renewals / duplicate deliveries are no-ops
-- and commission is booked exactly once per referred user. On first conversion
-- it: books the commission, grants the viewer's bonus credits into their
-- billing_accounts.custom_credit_tokens, and flips status to 'converted'.
--
-- Returns the affected referral row, or NULL when there's nothing to convert.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_referral_conversion(
  p_referred_user_id UUID,
  p_plan TEXT,
  p_commission_cents INT,
  p_bonus_tokens BIGINT
)
RETURNS referrals
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ref referrals;
BEGIN
  -- Lock the referral row (if any) for this viewer.
  SELECT * INTO ref
  FROM referrals
  WHERE referred_user_id = p_referred_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL; -- not a referred user
  END IF;

  IF ref.status <> 'signed_up' THEN
    RETURN NULL; -- already converted/reversed - idempotent no-op
  END IF;

  -- Grant the viewer's bonus credits (persistent top-up balance). Ensure a
  -- billing account exists first.
  IF GREATEST(0, p_bonus_tokens) > 0 THEN
    INSERT INTO billing_accounts (user_id) VALUES (p_referred_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    UPDATE billing_accounts
    SET custom_credit_tokens = custom_credit_tokens + GREATEST(0, p_bonus_tokens),
        updated_at = now()
    WHERE user_id = p_referred_user_id;
  END IF;

  UPDATE referrals
  SET status = 'converted',
      plan = p_plan,
      commission_cents = GREATEST(0, p_commission_cents),
      bonus_granted = (GREATEST(0, p_bonus_tokens) > 0),
      converted_at = now(),
      updated_at = now()
  WHERE id = ref.id
  RETURNING * INTO ref;

  RETURN ref;
END;
$$;
