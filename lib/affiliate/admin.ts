import { getBillingAdminClient } from "@/lib/billing/service-client"
import { getPlan, type PlanId } from "@/lib/billing/plans"
import { isValidCode, normalizeCode, suggestCode } from "./codes"
import {
  DEFAULT_COMMISSION_RATE,
  DEFAULT_VIEWER_BONUS_CREDITS
} from "./constants"
import type { AffiliateRow } from "./types"

const TOKENS_PER_CREDIT = 1000

/**
 * Resolve a Supabase auth user id from an email. Service-role only.
 *
 * Uses the Admin Auth API (`auth.admin.listUsers`), NOT a direct PostgREST
 * query against `auth.users` - the `auth` schema isn't exposed over the Data
 * API by default, so `.schema("auth").from("users")` always errors and (the
 * bug this replaced) silently swallowed that error into a false "no account
 * found", breaking every affiliate/comp mint by email. Same pattern as the
 * design-collaborators lookup (app/api/design/[designid]/collaborators/route.ts).
 */
export async function getUserIdByEmail(email: string): Promise<string | null> {
  const e = (email ?? "").trim().toLowerCase()
  if (!e) return null
  const admin = getBillingAdminClient()
  // listUsers' `email` filter matches exactly (Supabase does the normalization);
  // paginate defensively in case of a future large user base + hash collisions.
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
    email: e
  } as any)
  if (error) {
    console.error("[affiliate/admin] getUserIdByEmail failed", error)
    return null
  }
  const match = data?.users?.find(
    u => (u.email ?? "").trim().toLowerCase() === e
  )
  return match?.id ?? null
}

export interface CreateAffiliateInput {
  userId: string
  code?: string | null
  displayName?: string | null
  commissionRate?: number | null
  viewerBonusCredits?: number | null
}

/**
 * Mint (or update) an affiliate row for a user. Generates a code from the
 * display name when none is supplied. Returns the row, or an error string.
 */
export async function createAffiliate(
  input: CreateAffiliateInput
): Promise<{ affiliate?: AffiliateRow; error?: string }> {
  if (!input.userId) return { error: "userId is required" }

  let code = normalizeCode(input.code || "")
  if (!code) code = suggestCode(input.displayName)
  if (!isValidCode(code)) {
    return { error: "Code must be 3–32 letters/digits." }
  }

  const commission_rate =
    typeof input.commissionRate === "number"
      ? Math.max(0, Math.min(1, input.commissionRate))
      : DEFAULT_COMMISSION_RATE
  const viewer_bonus_tokens =
    (typeof input.viewerBonusCredits === "number" &&
    input.viewerBonusCredits >= 0
      ? Math.round(input.viewerBonusCredits)
      : DEFAULT_VIEWER_BONUS_CREDITS) * TOKENS_PER_CREDIT

  const admin = getBillingAdminClient()
  const { data, error } = await (admin as any)
    .from("affiliates")
    .upsert(
      {
        user_id: input.userId,
        code,
        display_name: input.displayName ?? null,
        commission_rate,
        viewer_bonus_tokens,
        status: "active"
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single()

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { error: `Code "${code}" is already taken - choose another.` }
    }
    console.error("[affiliate/admin] createAffiliate failed", error)
    return { error: "Could not create the affiliate." }
  }
  return { affiliate: data as AffiliateRow }
}

/**
 * Grant a user a comp plan (e.g. Max for free, for an influencer to explore).
 * Sets the plan, marks it as a comp, and opens a long billing window so the
 * monthly allowance keeps rolling. Comp plans have no RevenueCat subscription,
 * so no webhook ever downgrades them.
 */
export async function grantComp(params: {
  userId: string
  plan: PlanId
}): Promise<{ ok: boolean; error?: string }> {
  const { userId, plan } = params
  if (!userId) return { ok: false, error: "userId is required" }
  const resolved = getPlan(plan)

  const admin = getBillingAdminClient()
  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setFullYear(periodEnd.getFullYear() + 1)

  const { error } = await (admin as any).from("billing_accounts").upsert(
    {
      user_id: userId,
      plan: resolved.id,
      is_comp: plan !== "free",
      subscription_status: "active",
      period_start: now.toISOString(),
      period_end: periodEnd.toISOString(),
      tokens_used_period: 0,
      rc_entitlement: null
    },
    { onConflict: "user_id" }
  )
  if (error) {
    console.error("[affiliate/admin] grantComp failed", error)
    return { ok: false, error: "Could not grant the comp plan." }
  }
  return { ok: true }
}
