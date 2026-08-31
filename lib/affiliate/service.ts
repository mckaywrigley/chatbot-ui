import { getBillingAdminClient } from "@/lib/billing/service-client"
import { getPlan, type PlanId } from "@/lib/billing/plans"
import { normalizeCode } from "./codes"
import {
  DEFAULT_COMMISSION_RATE,
  DEFAULT_VIEWER_BONUS_CREDITS
} from "./constants"
import type { AffiliateDashboard, AffiliateRow, ReferralRow } from "./types"

const TOKENS_PER_CREDIT = 1000

/**
 * Commission (in cents) for one conversion: a share of the plan's list price.
 * Pure so the math is unit-testable. Pro $20 @ 20% → 400¢.
 */
export function commissionCentsFor(
  plan: string | null | undefined,
  rate: number
): number {
  const priceUsd = getPlan(plan).priceUsd
  const r = Number.isFinite(rate) ? Math.max(0, Math.min(1, rate)) : 0
  return Math.round(priceUsd * 100 * r)
}

/** Aggregate a set of an affiliate's referral rows into dashboard stats. Pure. */
export function aggregateReferrals(referrals: ReferralRow[]): {
  signups: number
  conversions: number
  commissionTotalUsd: number
  commissionPendingUsd: number
} {
  let conversions = 0
  let totalCents = 0
  let pendingCents = 0
  for (const r of referrals) {
    if (r.status === "converted") {
      conversions++
      totalCents += r.commission_cents || 0
      if (r.payout_status !== "paid") pendingCents += r.commission_cents || 0
    }
  }
  return {
    signups: referrals.length,
    conversions,
    commissionTotalUsd: totalCents / 100,
    commissionPendingUsd: pendingCents / 100
  }
}

/** Active affiliate matching a (raw, un-normalized) code, or null. */
export async function getAffiliateByCode(
  rawCode: string
): Promise<AffiliateRow | null> {
  const code = normalizeCode(rawCode)
  if (!code) return null
  const admin = getBillingAdminClient()
  const { data, error } = await (admin as any)
    .from("affiliates")
    .select("*")
    .eq("code", code)
    .eq("status", "active")
    .maybeSingle()
  if (error) {
    console.error("[affiliate] getAffiliateByCode failed", error)
    return null
  }
  return (data as AffiliateRow) ?? null
}

/** The affiliate row for a user (if they are an influencer), else null. */
export async function getAffiliateForUser(
  userId: string
): Promise<AffiliateRow | null> {
  const admin = getBillingAdminClient()
  const { data, error } = await (admin as any)
    .from("affiliates")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) {
    console.error("[affiliate] getAffiliateForUser failed", error)
    return null
  }
  return (data as AffiliateRow) ?? null
}

/**
 * Record that `referredUserId` signed up via `rawCode`. Idempotent and
 * defensive: ignores unknown/inactive codes, self-referrals, and any user who
 * is already attributed (the UNIQUE on referred_user_id). Best-effort - never
 * throws into the signup flow.
 */
export async function attributeReferral(params: {
  referredUserId: string
  rawCode: string
}): Promise<boolean> {
  const { referredUserId, rawCode } = params
  if (!referredUserId) return false
  try {
    const affiliate = await getAffiliateByCode(rawCode)
    if (!affiliate) return false
    if (affiliate.user_id === referredUserId) return false // no self-referral

    const admin = getBillingAdminClient()
    const { error } = await (admin as any).from("referrals").insert({
      affiliate_user_id: affiliate.user_id,
      code: affiliate.code,
      referred_user_id: referredUserId,
      status: "signed_up"
    })
    if (error) {
      // 23505 = already attributed; treat as a benign no-op.
      if ((error as { code?: string }).code !== "23505") {
        console.error("[affiliate] attributeReferral insert failed", error)
      }
      return false
    }
    return true
  } catch (e) {
    console.error("[affiliate] attributeReferral failed", e)
    return false
  }
}

/**
 * On a referred viewer's first paid purchase: book the commission and grant the
 * viewer's bonus credits, atomically and exactly once (the RPC no-ops on
 * renewals / already-converted referrals). Best-effort - never throws into the
 * webhook.
 */
export async function recordReferralConversion(params: {
  referredUserId: string
  plan: PlanId
}): Promise<void> {
  const { referredUserId, plan } = params
  if (!referredUserId) return
  try {
    const admin = getBillingAdminClient()
    // Look up the (still-pending) referral to resolve the affiliate's terms.
    const { data: refData, error: refErr } = await (admin as any)
      .from("referrals")
      .select("affiliate_user_id,status")
      .eq("referred_user_id", referredUserId)
      .maybeSingle()
    if (refErr) {
      console.error("[affiliate] conversion lookup failed", refErr)
      return
    }
    const ref = refData as Pick<ReferralRow, "affiliate_user_id" | "status">
    if (!ref || ref.status !== "signed_up") return // not referred / already done

    const affiliate = await getAffiliateForUser(ref.affiliate_user_id)
    const rate = affiliate?.commission_rate ?? DEFAULT_COMMISSION_RATE
    const bonusTokens =
      affiliate?.viewer_bonus_tokens ??
      DEFAULT_VIEWER_BONUS_CREDITS * TOKENS_PER_CREDIT

    const { error } = await admin.rpc(
      "record_referral_conversion" as any,
      {
        p_referred_user_id: referredUserId,
        p_plan: plan,
        p_commission_cents: commissionCentsFor(plan, rate),
        p_bonus_tokens: bonusTokens
      } as any
    )
    if (error)
      console.error("[affiliate] record_referral_conversion failed", error)
  } catch (e) {
    console.error("[affiliate] recordReferralConversion failed", e)
  }
}

/** Build the influencer's dashboard payload (aggregated; no raw user ids). */
export async function getAffiliateDashboard(
  userId: string,
  baseUrl: string
): Promise<AffiliateDashboard | { isAffiliate: false }> {
  const affiliate = await getAffiliateForUser(userId)
  if (!affiliate) return { isAffiliate: false }

  const admin = getBillingAdminClient()
  const { data, error } = await (admin as any)
    .from("referrals")
    .select("*")
    .eq("affiliate_user_id", userId)
  if (error)
    console.error("[affiliate] dashboard referrals query failed", error)
  const referrals = (data as ReferralRow[]) ?? []
  const stats = aggregateReferrals(referrals)

  const base = baseUrl.replace(/\/+$/, "")
  return {
    isAffiliate: true,
    code: affiliate.code,
    displayName: affiliate.display_name,
    status: affiliate.status,
    commissionRate: affiliate.commission_rate,
    viewerBonusCredits: Math.round(
      affiliate.viewer_bonus_tokens / TOKENS_PER_CREDIT
    ),
    shareUrl: `${base}/?ref=${encodeURIComponent(affiliate.code)}`,
    stats
  }
}
