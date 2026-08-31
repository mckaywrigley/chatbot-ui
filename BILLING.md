# Billing & Token Metering

Shadow AI meters every AI action (experiment design, literature search, knowledge
chat, reports, …) against a per-user monthly credit allowance, with three plans
backed by **RevenueCat Web Billing**.

| Plan | Price   | Monthly credits | Raw tokens  |
| ---- | ------- | --------------- | ----------- |
| Free | $0      | 2,000           | 2,000,000   |
| Pro  | $20/mo  | 20,000          | 20,000,000  |
| Max  | $100/mo | 200,000         | 200,000,000 |

**Unit:** `1 credit = 1,000 raw model tokens` (prompt + completion + reasoning).
Free is calibrated to comfortably cover **≥5 full experiments** plus chat/lit-search.
All limits live in **`lib/billing/plans.ts`** - the single source of truth. Retune
there (no migration needed); the DB takes the allowance as a parameter.

---

## How it works

- **Capture (non-streaming):** `lib/azure-openai.ts`'s Proxy reads `usage.total_tokens`
  off every `create`/`parse` response and pushes it into a per-request
  `AsyncLocalStorage` accumulator (`lib/billing/usage-context.ts`). Routes wrap their
  AI work in `meterRun(...)` (`lib/billing/with-meter.ts`), which flushes the total once
  the request finishes. This auto-meters the whole design/report pipeline with no
  per-call edits.
- **Capture (single-call routes):** call `recordCompletionUsage(ctx, completion)` directly.
- **Capture (streaming):** exact where the route reads raw chunks (`include_usage`, e.g.
  jarvis); otherwise estimated with `gpt-tokenizer` (`lib/billing/stream-meter.ts`, e.g.
  knowledge chat) - estimates are within ~10–15%.
- **Background pipeline:** the Inngest research worker (`lib/inngest/functions.ts`) meters
  each LLM step against the plan owner.
- **Persistence:** `recordUsage` calls the atomic `consume_tokens` RPC (rolls the period,
  increments usage, draws down custom credits once the allowance is spent) and appends a
  `usage_events` row for the per-feature breakdown.
- **Enforcement (hard block):** routes call `assertBudget(userId)` before starting work.
  Over-limit → HTTP **402** `{ code: "TOKEN_LIMIT" }`. In-flight work always finishes.
  The client (`lib/billing/handle-budget-error.ts`) shows an "Upgrade" toast that deep-links
  to Settings → Usage. `assertBudget` **fails open** on infra errors (a DB hiccup must not
  lock everyone out).

### What is and isn't metered

Metered (our Azure cost): design, literature search, knowledge chat (Azure), reports,
data-collection, embeddings/indexing, chat titles, tools, jarvis assistant.

**Not metered** - bring-your-own-key / external providers run on the user's own key:
`/api/chat/openai`, `/api/chat/groq`, `/api/chat/perplexity`, `/api/chat/openrouter`,
`/api/chat/custom`, `/api/chat/mistral`, and `/api/command`. Whisper transcription
(`/api/data-collection/transcribe`) is billed by audio duration, not tokens, so it's
excluded.

> Known minor undercount: the secondary literature-synthesis call inside
> `/api/design/regenerate` (a helper without the user id in scope) isn't metered; the
> dominant regeneration call is.

---

## Database

Migration: `supabase/migrations/20260605_create_billing.sql` - creates `billing_accounts`,
`usage_events`, the `consume_tokens` / `add_custom_credits` RPCs, an auto-provision trigger,
and a backfill of existing users.

Apply it (and regenerate types) yourself:

```bash
supabase db push
npm run db-types   # regenerates supabase/types.ts from the live schema
```

---

## RevenueCat setup (your part)

1. In the RevenueCat dashboard, create **entitlements** `pro` and `max`.
2. Create the subscription **products** ($20/mo, $100/mo) and attach them to the matching
   entitlements. Optionally create a one-time **credit pack** product.
3. Enable **Web Billing** and build an **offering** whose packages you'll reference by id
   from the env vars below.
4. Add a **webhook**: URL `https://<your-app>/api/billing/webhook/revenuecat`, and set its
   Authorization header to a secret you also put in `REVENUECAT_WEBHOOK_AUTH`.
5. The client identifies the RevenueCat app user with the Supabase user id, so webhook
   `app_user_id` maps straight onto `billing_accounts.user_id`.

### Env vars

Server:

```
SUPABASE_SERVICE_ROLE_KEY=...            # already used elsewhere; required for billing writes
REVENUECAT_WEBHOOK_AUTH=...              # shared secret for the webhook Authorization header
REVENUECAT_CREDIT_PRODUCTS={"credits_10k":10000000}   # optional: product_id → tokens for credit packs
```

Client (public):

```
NEXT_PUBLIC_REVENUECAT_WEB_PUBLIC_KEY=...   # RevenueCat Web Billing public API key
NEXT_PUBLIC_REVENUECAT_PRO_PACKAGE=...      # offering package identifier for Pro
NEXT_PUBLIC_REVENUECAT_MAX_PACKAGE=...      # offering package identifier for Max
NEXT_PUBLIC_REVENUECAT_CREDITS_PACKAGE=...  # optional: credit-pack package identifier
NEXT_PUBLIC_REVENUECAT_PORTAL_URL=...       # optional: hosted manage-subscription URL
```

Until `NEXT_PUBLIC_REVENUECAT_WEB_PUBLIC_KEY` is set, the Usage & Billing tab renders the
plans read-only ("Coming soon") and everyone stays on Free - metering still works.

---

## Verify

1. `npm run dev` → Settings → **Usage** shows the plan, a usage bar, and per-feature breakdown.
2. Run a design/chat → a `usage_events` row appears and `billing_accounts.tokens_used_period` climbs.
3. Force over-limit (`update billing_accounts set tokens_used_period = 9e9 where user_id = '...'`)
   → design/chat return 402 with the upgrade toast; an in-flight op still completes.
4. `curl` the webhook with a sample `INITIAL_PURCHASE` (+ the auth header) → plan flips to pro/max.
5. A `NON_RENEWING_PURCHASE` for a configured credit product → `custom_credit_tokens` increases.
