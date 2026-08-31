import { PLAN_ORDER, planFromEntitlement, type PlanId } from "./plans"

/**
 * RevenueCat (Web Billing) integration glue.
 *
 * The user configures the RevenueCat dashboard + env vars (see BILLING.md).
 * Everything here degrades gracefully when unconfigured: the UI shows a
 * "billing not configured" state and the webhook rejects unauthenticated calls.
 *
 * Purchases run client-side via @revenuecat/purchases-js (see
 * components/billing/usage-billing-panel.tsx). The server's job is the webhook
 * that syncs entitlements → our billing_accounts table.
 */

export interface RevenueCatPublicConfig {
  configured: boolean
  publicApiKey: string | null
  /** Package/product identifiers the web SDK purchases for each tier. */
  proPackageId: string | null
  maxPackageId: string | null
  creditsPackageId: string | null
  /** Optional hosted customer-portal/manage-subscription URL. */
  customerPortalUrl: string | null
}

/** Public (client-safe) config, sourced from NEXT_PUBLIC_* env. */
export function getRevenueCatPublicConfig(): RevenueCatPublicConfig {
  const publicApiKey =
    process.env.NEXT_PUBLIC_REVENUECAT_WEB_PUBLIC_KEY?.trim() || null
  return {
    configured: Boolean(publicApiKey),
    publicApiKey,
    proPackageId:
      process.env.NEXT_PUBLIC_REVENUECAT_PRO_PACKAGE?.trim() || null,
    maxPackageId:
      process.env.NEXT_PUBLIC_REVENUECAT_MAX_PACKAGE?.trim() || null,
    creditsPackageId:
      process.env.NEXT_PUBLIC_REVENUECAT_CREDITS_PACKAGE?.trim() || null,
    customerPortalUrl:
      process.env.NEXT_PUBLIC_REVENUECAT_PORTAL_URL?.trim() || null
  }
}

/**
 * Verify the shared secret RevenueCat sends in the Authorization header of
 * webhook requests. Returns false (reject) when the secret isn't configured -
 * fail closed, since an unauthenticated webhook could grant paid plans.
 */
export function verifyRevenueCatWebhookAuth(header: string | null): boolean {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH
  if (!expected || !header) return false
  return header === expected
}

export type RcAction =
  | {
      kind: "set_plan"
      plan: PlanId
      status: string
      periodEndMs: number | null
      appUserId: string
    }
  | { kind: "downgrade"; status: string; appUserId: string }
  | { kind: "status_only"; status: string; appUserId: string }
  | { kind: "add_credits"; tokens: number; appUserId: string }
  | { kind: "ignore" }

interface RcEvent {
  type?: string
  app_user_id?: string
  original_app_user_id?: string
  product_id?: string
  entitlement_id?: string | null
  entitlement_ids?: string[] | null
  expiration_at_ms?: number | null
}

/** product_id → token grant, for one-time credit packs. Configured via env JSON. */
function creditTokensForProduct(productId: string | undefined): number {
  if (!productId) return 0
  try {
    const map = JSON.parse(
      process.env.REVENUECAT_CREDIT_PRODUCTS || "{}"
    ) as Record<string, number>
    return Number(map[productId]) || 0
  } catch {
    return 0
  }
}

/** Highest plan granted by an event's entitlements. */
function planFromEntitlements(ids: string[]): PlanId {
  let best: PlanId = "free"
  for (const e of ids) {
    const p = planFromEntitlement(e)
    if (PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(best)) best = p
  }
  return best
}

/**
 * Translate a RevenueCat webhook event into a billing_accounts mutation.
 * https://www.revenuecat.com/docs/webhooks for the event taxonomy.
 */
export function interpretRevenueCatEvent(event: RcEvent): RcAction {
  const type = event?.type
  const appUserId = event?.app_user_id || event?.original_app_user_id || ""
  if (!appUserId) return { kind: "ignore" }

  const entitlementIds: string[] = Array.isArray(event?.entitlement_ids)
    ? event.entitlement_ids
    : event?.entitlement_id
      ? [event.entitlement_id]
      : []
  const periodEndMs =
    typeof event?.expiration_at_ms === "number" ? event.expiration_at_ms : null

  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
      return {
        kind: "set_plan",
        plan: planFromEntitlements(entitlementIds),
        status: "active",
        periodEndMs,
        appUserId
      }
    case "CANCELLATION":
      // User keeps access until expiration - flag status, keep the plan.
      return { kind: "status_only", status: "canceled", appUserId }
    case "BILLING_ISSUE":
      return { kind: "status_only", status: "past_due", appUserId }
    case "EXPIRATION":
      return { kind: "downgrade", status: "expired", appUserId }
    case "NON_RENEWING_PURCHASE": {
      const tokens = creditTokensForProduct(event?.product_id)
      if (tokens > 0) return { kind: "add_credits", tokens, appUserId }
      const plan = planFromEntitlements(entitlementIds)
      if (plan !== "free")
        return {
          kind: "set_plan",
          plan,
          status: "active",
          periodEndMs,
          appUserId
        }
      return { kind: "ignore" }
    }
    default:
      return { kind: "ignore" }
  }
}
