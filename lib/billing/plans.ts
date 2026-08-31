/**
 * Subscription plans + the credit/token unit math. THE single source of truth
 * for limits - the DB (`consume_tokens`) takes the allowance as a parameter so
 * these numbers can be retuned here without a migration.
 *
 * Unit: internally we meter raw model tokens (prompt + completion + reasoning,
 * i.e. `usage.total_tokens`). Users see friendlier "credits".
 *   1 credit = TOKENS_PER_CREDIT raw tokens.
 *
 * Calibration: a full experiment (design) ≈ 20–25 LLM calls ≈ ~150k tokens
 * (~150 credits, mid-estimate). Free = 2,000 credits comfortably covers the
 * required ≥5 experiments plus chat/lit-search headroom. Pro = 10× Free,
 * Max = 10× Pro (as specified). Retune after observing real metered usage.
 */

export const TOKENS_PER_CREDIT = 1_000

/**
 * Free-tier experiment limit: a free user can GENERATE this many designs
 * (lifetime) before they must upgrade. Enforced server-side at design
 * generation when the EXPERIMENT_PAYWALL env flag is on (default off →
 * count-only, no block - mirrors BILLING_ENFORCE). Paid plans + comps are
 * never gated by this; they're metered by credits.
 */
export const FREE_EXPERIMENT_LIMIT = 3

export type PlanId = "free" | "pro" | "max"

export interface Plan {
  id: PlanId
  name: string
  /** Monthly price in USD (0 for free). */
  priceUsd: number
  /** Per-period token allowance (raw tokens). */
  monthlyTokens: number
  /** RevenueCat entitlement identifier that grants this plan. */
  rcEntitlement: string | null
  /** Short marketing blurb. */
  tagline: string
  /** Bullet features shown on the plan card. */
  features: string[]
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    monthlyTokens: 2_000_000, // 2,000 credits
    rcEntitlement: null,
    tagline: "Everything, with a generous monthly allowance.",
    features: [
      "All features unlocked",
      "~5+ full experiments / month",
      "Literature search & knowledge chat",
      "2,000 credits / month"
    ]
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 20,
    monthlyTokens: 20_000_000, // 20,000 credits
    rcEntitlement: "pro",
    tagline: "10× the allowance for active researchers.",
    features: [
      "Everything in Free",
      "10× the monthly credits",
      "~50+ full experiments / month",
      "20,000 credits / month"
    ]
  },
  max: {
    id: "max",
    name: "Max",
    priceUsd: 100,
    monthlyTokens: 200_000_000, // 200,000 credits
    rcEntitlement: "max",
    tagline: "10× Pro for heavy, team-scale work.",
    features: [
      "Everything in Pro",
      "10× the Pro allowance",
      "~500+ full experiments / month",
      "200,000 credits / month",
      "Priority support"
    ]
  }
}

export const PLAN_ORDER: PlanId[] = ["free", "pro", "max"]

export const DEFAULT_PLAN: PlanId = "free"

/** Normalize an arbitrary string to a known plan id, falling back to free. */
export function getPlan(planId: string | null | undefined): Plan {
  if (planId && planId in PLANS) return PLANS[planId as PlanId]
  return PLANS[DEFAULT_PLAN]
}

/** Map a RevenueCat entitlement id to a plan id (null → free). */
export function planFromEntitlement(
  entitlement: string | null | undefined
): PlanId {
  if (!entitlement) return "free"
  const match = PLAN_ORDER.find(id => PLANS[id].rcEntitlement === entitlement)
  return match ?? "free"
}

/** Raw tokens → display credits (rounded). */
export function creditsFromTokens(tokens: number): number {
  return Math.round((tokens || 0) / TOKENS_PER_CREDIT)
}

/** Display credits → raw tokens. */
export function tokensFromCredits(credits: number): number {
  return Math.round((credits || 0) * TOKENS_PER_CREDIT)
}
