import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/server/require-admin"
import { getBillingAdminClient } from "@/lib/billing/service-client"

/**
 * GET /api/admin/dashboard  (operator-only; ADMIN_API_SECRET bearer)
 *
 * Read-only aggregate view for the /admin dashboard page: signups, plan
 * mix, and referral/affiliate attribution. Uses the Admin Auth API for the
 * user list (NOT a direct `auth.users` PostgREST query - that schema isn't
 * exposed over the Data API; see the getUserIdByEmail fix in
 * lib/affiliate/admin.ts for the bug this pattern avoids).
 */
export async function GET(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const admin = getBillingAdminClient()

  // Paginate through every auth user (small user base today; caps at a
  // generous 50 pages = 50,000 users so a bug can't spin this forever).
  const users: Array<{
    id: string
    email: string | null
    created_at: string
    last_sign_in_at: string | null
    confirmed: boolean
  }> = []
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    for (const u of data.users) {
      users.push({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        confirmed: !!u.email_confirmed_at
      })
    }
    if (data.users.length < 1000) break
  }

  // `affiliates`/`referrals` predate the last `npm run db-types` regen, so
  // they're absent from the generated Database type - same workaround already
  // used in lib/affiliate/admin.ts.
  const [billingRes, affiliatesRes, referralsRes] = await Promise.all([
    admin.from("billing_accounts").select("*"),
    (admin as any).from("affiliates").select("*"),
    (admin as any).from("referrals").select("*")
  ])

  const billingByUser = new Map<string, any>(
    (billingRes.data ?? []).map((b: any) => [b.user_id, b])
  )
  const affiliateByUser = new Map<string, any>(
    (affiliatesRes.data ?? []).map((a: any) => [a.user_id, a])
  )

  const usersOut = users
    .map(u => {
      const b = billingByUser.get(u.id)
      return {
        ...u,
        plan: b?.plan ?? "free",
        subscription_status: b?.subscription_status ?? null,
        is_comp: b?.is_comp ?? false,
        tokens_used_period: b?.tokens_used_period ?? 0,
        custom_credit_tokens: b?.custom_credit_tokens ?? 0
      }
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  const signupsByDayMap = new Map<string, number>()
  for (const u of users) {
    const day = u.created_at.slice(0, 10)
    signupsByDayMap.set(day, (signupsByDayMap.get(day) ?? 0) + 1)
  }
  const signupsByDay = Array.from(signupsByDayMap.entries())
    .map(([day, n]) => ({ day, n }))
    .sort((a, b) => a.day.localeCompare(b.day))

  const planBreakdownMap = new Map<string, number>()
  for (const u of usersOut) {
    const key = `${u.plan}`
    planBreakdownMap.set(key, (planBreakdownMap.get(key) ?? 0) + 1)
  }
  const planBreakdown = Array.from(planBreakdownMap.entries()).map(
    ([plan, n]) => ({ plan, n })
  )

  const referrals = (referralsRes.data ?? [])
    .map((r: any) => ({
      ...r,
      affiliate_code: affiliateByUser.get(r.affiliate_user_id)?.code ?? null,
      affiliate_name:
        affiliateByUser.get(r.affiliate_user_id)?.display_name ?? null
    }))
    .sort((a: any, b: any) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? "")
    )

  const referralSummaryMap = new Map<
    string,
    { n: number; commission_cents: number }
  >()
  for (const r of (referralsRes.data ?? []) as any[]) {
    const cur = referralSummaryMap.get(r.status) ?? {
      n: 0,
      commission_cents: 0
    }
    cur.n += 1
    cur.commission_cents += r.commission_cents ?? 0
    referralSummaryMap.set(r.status, cur)
  }
  const referralSummary = Array.from(referralSummaryMap.entries()).map(
    ([status, v]) => ({ status, ...v })
  )

  const activeWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const activeThisWeek = usersOut.filter(
    u =>
      u.last_sign_in_at &&
      new Date(u.last_sign_in_at).getTime() >= activeWeekAgo
  ).length

  return NextResponse.json({
    totalUsers: users.length,
    activeThisWeek,
    paidUsers: usersOut.filter(u => u.plan !== "free").length,
    convertedReferrals: (referralsRes.data ?? []).filter(
      (r: any) => r.status === "converted"
    ).length,
    signupsByDay,
    planBreakdown,
    users: usersOut,
    affiliates: (affiliatesRes.data ?? []).sort((a: any, b: any) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? "")
    ),
    referrals,
    referralSummary
  })
}
