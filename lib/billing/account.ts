import type { Database } from "@/supabase/types"
import { getBillingAdminClient } from "./service-client"
import { BudgetExceededError, ExperimentLimitError } from "./errors"
import {
  creditsFromTokens,
  FREE_EXPERIMENT_LIMIT,
  getPlan,
  TOKENS_PER_CREDIT,
  type Plan,
  type PlanId
} from "./plans"
import type { UsageFeature } from "./types"

/** designs_generated isn't in the generated Database types yet (20260624). */
const designsGeneratedOf = (acct: BillingAccount): number =>
  Math.max(0, Number((acct as any).designs_generated) || 0)
const isComp = (acct: BillingAccount): boolean => Boolean((acct as any).is_comp)

export type BillingAccount =
  Database["public"]["Tables"]["billing_accounts"]["Row"]

/**
 * Fetch the user's billing account, creating a default (free) row if missing.
 * The DB trigger normally creates it on signup; this is a safety net for
 * pre-existing users or any gap.
 */
export async function getOrCreateAccount(
  userId: string
): Promise<BillingAccount> {
  const admin = getBillingAdminClient()

  const existing = await admin
    .from("billing_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (existing.error) throw existing.error
  if (existing.data) return existing.data

  const created = await admin
    .from("billing_accounts")
    .insert({ user_id: userId })
    .select("*")
    .single()

  if (created.error) {
    // Lost an insert race - re-read.
    const again = await admin
      .from("billing_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
    if (again.data) return again.data
    throw created.error
  }

  return created.data
}

/**
 * Tokens treated as consumed this period - 0 if the stored period has already
 * elapsed (the DB rolls it lazily on the next consume_tokens call; reads just
 * compute the effective value so users aren't blocked at the start of a month).
 */
function effectiveUsedTokens(acct: BillingAccount): number {
  if (new Date(acct.period_end).getTime() <= Date.now()) return 0
  return acct.tokens_used_period || 0
}

/** Remaining = unused plan allowance + persistent custom credits. */
function computeRemainingTokens(acct: BillingAccount, plan: Plan): number {
  const used = effectiveUsedTokens(acct)
  return (
    Math.max(0, plan.monthlyTokens - used) + (acct.custom_credit_tokens || 0)
  )
}

export interface UsageSummary {
  plan: PlanId
  planName: string
  priceUsd: number
  status: string
  periodEnd: string
  tokensPerCredit: number
  // raw tokens
  limitTokens: number
  usedTokens: number
  remainingTokens: number
  customCreditTokens: number
  // display credits
  limitCredits: number
  usedCredits: number
  remainingCredits: number
  customCredits: number
  percentUsed: number
  breakdown: { feature: string; tokens: number; credits: number }[]
  // Free-experiment paywall (free plan only).
  experimentsUsed: number
  experimentLimit: number
  experimentsLeft: number
}

/** Everything the Settings → Usage & Billing view needs, in one read. */
export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const admin = getBillingAdminClient()
  const acct = await getOrCreateAccount(userId)
  const plan = getPlan(acct.plan)

  const usedTokens = effectiveUsedTokens(acct)
  const remainingTokens = computeRemainingTokens(acct, plan)
  const percentUsed =
    plan.monthlyTokens > 0
      ? Math.min(100, Math.round((usedTokens / plan.monthlyTokens) * 100))
      : 0

  // Per-feature breakdown for the current period. Aggregated in JS - fine for
  // an infrequently-opened settings panel; capped to bound the read.
  const breakdownMap = new Map<string, number>()
  try {
    const periodStart =
      new Date(acct.period_end).getTime() <= Date.now()
        ? new Date().toISOString() // rolled period → effectively empty
        : acct.period_start
    const { data: events } = await admin
      .from("usage_events")
      .select("feature,total_tokens")
      .eq("user_id", userId)
      .gte("created_at", periodStart)
      .order("created_at", { ascending: false })
      .limit(5000)
    for (const e of events ?? []) {
      breakdownMap.set(
        e.feature,
        (breakdownMap.get(e.feature) || 0) + (e.total_tokens || 0)
      )
    }
  } catch (e) {
    console.error("[billing] breakdown query failed", e)
  }

  const breakdown = Array.from(breakdownMap.entries())
    .map(([feature, tokens]) => ({
      feature,
      tokens,
      credits: creditsFromTokens(tokens)
    }))
    .sort((a, b) => b.tokens - a.tokens)

  return {
    plan: plan.id,
    planName: plan.name,
    priceUsd: plan.priceUsd,
    status: acct.subscription_status,
    periodEnd: acct.period_end,
    tokensPerCredit: TOKENS_PER_CREDIT,
    limitTokens: plan.monthlyTokens,
    usedTokens,
    remainingTokens,
    customCreditTokens: acct.custom_credit_tokens || 0,
    limitCredits: creditsFromTokens(plan.monthlyTokens),
    usedCredits: creditsFromTokens(usedTokens),
    remainingCredits: creditsFromTokens(remainingTokens),
    customCredits: creditsFromTokens(acct.custom_credit_tokens || 0),
    percentUsed,
    breakdown,
    experimentsUsed: designsGeneratedOf(acct),
    experimentLimit: FREE_EXPERIMENT_LIMIT,
    experimentsLeft: Math.max(
      0,
      FREE_EXPERIMENT_LIMIT - designsGeneratedOf(acct)
    )
  }
}

/**
 * Whether the over-budget HARD BLOCK (402) is enforced. Metering/recording
 * always runs; this gate only controls whether running out of credits actually
 * blocks a request. Default OFF so we can launch metering-only, validate the
 * credit calibration against real usage_events, then flip enforcement on with a
 * single env change (BILLING_ENFORCE=true) - no redeploy. Accepts 1/true/on/yes.
 */
export function isBillingEnforced(): boolean {
  return /^(1|true|on|yes)$/i.test((process.env.BILLING_ENFORCE ?? "").trim())
}

/**
 * Pre-flight gate. Throws BudgetExceededError if the user has no credits left
 * AND enforcement is enabled. Fails OPEN on infra errors - a billing/DB hiccup
 * must not lock everyone out.
 */
export async function assertBudget(userId: string): Promise<void> {
  if (!userId) return // no identifiable user → can't meter; don't block
  try {
    const acct = await getOrCreateAccount(userId)
    const plan = getPlan(acct.plan)
    if (computeRemainingTokens(acct, plan) <= 0) {
      if (isBillingEnforced()) {
        throw new BudgetExceededError(plan.id)
      }
      // Metering-only mode: record that they're over, but don't block.
      console.warn(
        `[billing] user ${userId} is over budget (plan=${plan.id}) but ` +
          `BILLING_ENFORCE is off - allowing the request (metering-only mode).`
      )
    }
  } catch (e) {
    if (e instanceof BudgetExceededError) throw e
    console.error("[billing] assertBudget check failed (failing open)", e)
  }
}

/**
 * Whether the free-experiment paywall HARD BLOCK is enforced. Default OFF
 * (count-only) so we can ship the counter, watch real conversion, then flip it
 * on for launch with EXPERIMENT_PAYWALL=true - no redeploy. Accepts 1/true/on/yes.
 */
export function isExperimentPaywallEnabled(): boolean {
  return /^(1|true|on|yes)$/i.test(
    (process.env.EXPERIMENT_PAYWALL ?? "").trim()
  )
}

/**
 * How many free experiments a free user has left (clamped ≥ 0). Paid plans +
 * comps return Infinity (not gated). Best-effort; returns Infinity on error so
 * an infra hiccup never blocks design generation.
 */
export async function experimentsRemaining(userId: string): Promise<number> {
  if (!userId) return Number.POSITIVE_INFINITY
  try {
    const acct = await getOrCreateAccount(userId)
    if (acct.plan !== "free" || isComp(acct)) return Number.POSITIVE_INFINITY
    return Math.max(0, FREE_EXPERIMENT_LIMIT - designsGeneratedOf(acct))
  } catch (e) {
    console.error("[billing] experimentsRemaining failed (failing open)", e)
    return Number.POSITIVE_INFINITY
  }
}

/**
 * Pre-flight gate for DESIGN GENERATION. Throws ExperimentLimitError when a free
 * user has used their free experiments AND the paywall is enforced. Paid plans
 * + comps pass. Fails OPEN on infra errors.
 */
export async function assertExperimentQuota(userId: string): Promise<void> {
  if (!userId) return
  try {
    const acct = await getOrCreateAccount(userId)
    if (acct.plan !== "free" || isComp(acct)) return
    const used = designsGeneratedOf(acct)
    if (used >= FREE_EXPERIMENT_LIMIT) {
      if (isExperimentPaywallEnabled()) {
        throw new ExperimentLimitError(used, FREE_EXPERIMENT_LIMIT)
      }
      console.warn(
        `[billing] user ${userId} over free-experiment limit ` +
          `(${used}/${FREE_EXPERIMENT_LIMIT}) but EXPERIMENT_PAYWALL is off - allowing.`
      )
    }
  } catch (e) {
    if (e instanceof ExperimentLimitError) throw e
    console.error("[billing] assertExperimentQuota failed (failing open)", e)
  }
}

/**
 * +1 to the user's lifetime generated-design count. Called once when a design
 * generation completes (Inngest worker). Best-effort - never throws.
 */
export async function incrementDesignsGenerated(userId: string): Promise<void> {
  if (!userId) return
  try {
    const admin = getBillingAdminClient()
    const { error } = await admin.rpc(
      "increment_designs_generated" as any,
      {
        p_user_id: userId
      } as any
    )
    if (error)
      console.error("[billing] increment_designs_generated failed", error)
  } catch (e) {
    console.error("[billing] incrementDesignsGenerated failed", e)
  }
}

/**
 * Record consumed tokens: atomic balance update (consume_tokens RPC) + an
 * append-only usage_events row. Best-effort - never throws into the caller, so
 * metering can't break a feature.
 */
export async function recordUsage(params: {
  userId: string
  feature: UsageFeature
  totalTokens: number
  promptTokens?: number
  completionTokens?: number
  model?: string | null
}): Promise<void> {
  const { userId, feature } = params
  if (!userId) return
  const totalTokens = Math.max(0, Math.round(params.totalTokens || 0))
  if (totalTokens <= 0) return

  try {
    const admin = getBillingAdminClient()

    // Allowance comes from plans.ts (single source of truth) - read the plan,
    // default to free if anything goes wrong.
    let allowance = getPlan("free").monthlyTokens
    try {
      const acct = await getOrCreateAccount(userId)
      allowance = getPlan(acct.plan).monthlyTokens
    } catch (e) {
      console.error("[billing] could not resolve plan for recordUsage", e)
    }

    const { error: rpcErr } = await admin.rpc("consume_tokens", {
      p_user_id: userId,
      p_tokens: totalTokens,
      p_monthly_allowance: allowance
    })
    if (rpcErr) console.error("[billing] consume_tokens failed", rpcErr)

    const { error: logErr } = await admin.from("usage_events").insert({
      user_id: userId,
      feature,
      model: params.model ?? null,
      prompt_tokens: Math.max(0, Math.round(params.promptTokens || 0)),
      completion_tokens: Math.max(0, Math.round(params.completionTokens || 0)),
      total_tokens: totalTokens
    })
    if (logErr) console.error("[billing] usage_events insert failed", logErr)
  } catch (e) {
    console.error("[billing] recordUsage failed", e)
  }
}

/**
 * Convenience for non-streaming routes that hold the response directly: record
 * an OpenAI completion's `usage` against a feature. Best-effort; safe to call
 * fire-and-forget or await. Use this (NOT meterRun) on routes that read the
 * completion themselves - the two mechanisms must not both run on one route.
 */
export function recordCompletionUsage(
  ctx: { userId: string; feature: UsageFeature; model?: string | null },
  completion:
    | {
        usage?: {
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
        } | null
      }
    | null
    | undefined
): Promise<void> {
  const u = completion?.usage
  return recordUsage({
    userId: ctx.userId,
    feature: ctx.feature,
    model: ctx.model ?? null,
    totalTokens: u?.total_tokens ?? 0,
    promptTokens: u?.prompt_tokens,
    completionTokens: u?.completion_tokens
  })
}
