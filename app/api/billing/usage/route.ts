import { NextResponse } from "next/server"
import { requireUser } from "@/lib/server/require-user"
import { getUsageSummary } from "@/lib/billing/account"
import { getRevenueCatPublicConfig } from "@/lib/billing/revenuecat"
import { PLAN_ORDER, PLANS, TOKENS_PER_CREDIT } from "@/lib/billing/plans"

/**
 * GET /api/billing/usage
 * Returns the current user's plan + usage summary, the plan catalog, and the
 * (client-safe) RevenueCat config the Settings → Usage & Billing view needs.
 */
export async function GET() {
  const auth = await requireUser()
  if (auth.response) return auth.response

  try {
    const summary = await getUsageSummary(auth.user.id)
    return NextResponse.json({
      appUserId: auth.user.id,
      summary,
      tokensPerCredit: TOKENS_PER_CREDIT,
      plans: PLAN_ORDER.map(id => PLANS[id]),
      revenueCat: getRevenueCatPublicConfig()
    })
  } catch (e) {
    console.error("[billing/usage] failed", e)
    return NextResponse.json({ error: "Failed to load usage" }, { status: 500 })
  }
}
