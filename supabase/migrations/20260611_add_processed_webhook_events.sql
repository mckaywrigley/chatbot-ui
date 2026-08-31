-- Idempotency ledger for inbound payment-provider webhooks (RevenueCat).
--
-- RevenueCat retries a webhook on any non-2xx response and can also deliver the
-- same event more than once. Subscription events (set_plan/downgrade) are
-- naturally idempotent, but additive operations - credit top-ups via
-- add_custom_credits - would DOUBLE-APPLY on a duplicate delivery. The webhook
-- claims each provider event id here exactly once; a re-delivery of an already
-- claimed id is skipped. On a processing failure the webhook releases the claim
-- so a legitimate retry can re-process.
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id     TEXT PRIMARY KEY,
  provider     TEXT NOT NULL DEFAULT 'revenuecat',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server-only: written exclusively by the webhook via the service-role client,
-- which bypasses RLS. Enabling RLS with no policies blocks all anon/authenticated
-- access (defense in depth - this table is never touched from the client).
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;
