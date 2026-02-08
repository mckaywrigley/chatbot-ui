import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

// Service role client for accessing auth.users - bypasses RLS
const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Verify admin access - checks is_admin flag in profiles table
async function verifyAdmin(
  serverClient: any
): Promise<{ authorized: boolean; userId?: string; email?: string }> {
  const {
    data: { user },
    error
  } = await serverClient.auth.getUser()
  if (error || !user) {
    return { authorized: false }
  }

  const { data: profile } = await serverClient
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single()

  if (!profile?.is_admin) {
    return { authorized: false }
  }

  return { authorized: true, userId: user.id, email: user.email }
}

// Fetch ALL auth users with pagination (Supabase returns max 50-1000 per page)
async function fetchAllAuthUsers(supabase: any) {
  const allUsers: any[] = []
  let page = 1
  const perPage = 500

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    })

    if (error) {
      console.error(`Error fetching auth users page ${page}:`, error)
      throw error
    }

    if (!data?.users || data.users.length === 0) {
      break
    }

    allUsers.push(...data.users)

    // If we got fewer than perPage, we've reached the end
    if (data.users.length < perPage) {
      break
    }

    page++

    // Safety limit
    if (page > 100) {
      console.warn("Hit pagination safety limit at 100 pages")
      break
    }
  }

  return allUsers
}

// Plan prices for MRR calculation (monthly in dollars)
const PLAN_PRICES: Record<string, number> = {
  premium: 29,
  premium_monthly: 29,
  premium_annual: 25,
  business: 99,
  business_monthly: 99,
  business_annual: 84,
  ai_employee: 199,
  ai_employee_monthly: 199,
  ai_employee_annual: 169
}

const ANNUAL_PLANS = ["premium_annual", "business_annual", "ai_employee_annual"]

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const cookieStore = cookies()
    const serverClient = createServerClient(cookieStore)
    const { authorized } = await verifyAdmin(serverClient)

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const supabase = getServiceClient()

    // Fetch ALL auth users with proper pagination
    let authUsers: any[]
    try {
      authUsers = await fetchAllAuthUsers(supabase)
    } catch (authError) {
      console.error("Failed to fetch auth users:", authError)
      return NextResponse.json(
        {
          error: "Failed to fetch auth users. Check SUPABASE_SERVICE_ROLE_KEY."
        },
        { status: 500 }
      )
    }

    // Fetch all related data in parallel for performance
    const [
      profilesResult,
      subscriptionsResult,
      userUsageResult,
      reportsResult,
      chatsResult,
      messagesCountResult,
      chatsCountResult,
      reportsCountResult
    ] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("subscriptions").select("*"),
      supabase.from("user_usage").select("*"),
      supabase.from("property_reports").select("user_id, created_at"),
      supabase.from("chats").select("user_id, created_at"),
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase.from("chats").select("*", { count: "exact", head: true }),
      supabase
        .from("property_reports")
        .select("*", { count: "exact", head: true })
    ])

    const profiles = profilesResult.data || []
    const subscriptions = subscriptionsResult.data || []
    const userUsage = userUsageResult.data || []
    const reports = reportsResult.data || []
    const chats = chatsResult.data || []
    const totalMessages = messagesCountResult.count || 0
    const totalChats = chatsCountResult.count || 0
    const totalReports = reportsCountResult.count || 0

    // Log data counts for debugging
    console.log(
      `[Admin API] Auth users: ${authUsers.length}, Profiles: ${profiles.length}, Subscriptions: ${subscriptions.length}`
    )

    // Build lookup maps for O(1) access
    const profileMap = new Map(profiles.map(p => [p.user_id, p]))
    const subscriptionMap = new Map(subscriptions.map(s => [s.user_id, s]))

    // Group usage data by user
    const usageByUser = new Map<string, any[]>()
    for (const u of userUsage) {
      const existing = usageByUser.get(u.user_id) || []
      existing.push(u)
      usageByUser.set(u.user_id, existing)
    }

    // Group reports by user
    const reportsByUser = new Map<string, any[]>()
    for (const r of reports) {
      const existing = reportsByUser.get(r.user_id) || []
      existing.push(r)
      reportsByUser.set(r.user_id, existing)
    }

    // Group chats by user
    const chatsByUser = new Map<string, any[]>()
    for (const c of chats) {
      const existing = chatsByUser.get(c.user_id) || []
      existing.push(c)
      chatsByUser.set(c.user_id, existing)
    }

    // Build user list with all data
    const users = authUsers.map(authUser => {
      const profile = profileMap.get(authUser.id)
      const subscription = subscriptionMap.get(authUser.id)
      const usage = usageByUser.get(authUser.id) || []
      const userReports = reportsByUser.get(authUser.id) || []
      const userChats = chatsByUser.get(authUser.id) || []

      // Calculate total usage across all months
      const totalChatMessages = usage.reduce(
        (sum: number, u: any) =>
          sum + (u.chat_messages_free || 0) + (u.chat_messages_premium || 0),
        0
      )
      const totalUserReports = usage.reduce(
        (sum: number, u: any) => sum + (u.reports_generated || 0),
        0
      )
      const totalWebSearches = usage.reduce(
        (sum: number, u: any) => sum + (u.web_searches || 0),
        0
      )

      return {
        id: authUser.id,
        email: authUser.email || "Unknown",
        display_name:
          profile?.display_name ||
          authUser.user_metadata?.display_name ||
          authUser.user_metadata?.name ||
          "No name",
        created_at: authUser.created_at,
        last_sign_in: authUser.last_sign_in_at,
        email_confirmed: !!authUser.email_confirmed_at,
        plan_type: subscription?.plan_type || subscription?.tier || "free",
        subscription_status: subscription?.status || "none",
        stripe_customer_id: subscription?.stripe_customer_id || null,
        stripe_subscription_id: subscription?.stripe_subscription_id || null,
        trial_end: subscription?.current_period_end || null,
        trial_start: subscription?.current_period_start || null,
        cancel_at_period_end: subscription?.cancel_at_period_end || false,
        scheduled_plan_type: subscription?.scheduled_plan_type || null,
        chat_messages: totalChatMessages,
        reports_generated: totalUserReports,
        reports_count: userReports.length,
        chats_count: userChats.length,
        web_searches: totalWebSearches,
        profile_context: profile?.profile_context || "",
        has_onboarded: profile?.has_onboarded || false,
        profile_image: profile?.image_url || null,
        provider: authUser.app_metadata?.provider || "email",
        phone: authUser.phone || null
      }
    })

    // Sort by created_at descending (newest first)
    users.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Calculate stats
    const now = new Date()
    const today = now.toISOString().split("T")[0]
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    const activeSubscriptions = subscriptions.filter(
      s => s.status === "active" || s.status === "trialing"
    )
    const trialingSubscriptions = subscriptions.filter(
      s => s.status === "trialing"
    )
    const canceledSubscriptions = subscriptions.filter(
      s => s.status === "canceled" || s.status === "cancelled"
    )
    const pastDueSubscriptions = subscriptions.filter(
      s => s.status === "past_due"
    )

    // Count by plan type
    const premiumSubs = activeSubscriptions.filter(
      s =>
        s.plan_type === "premium" ||
        s.plan_type === "premium_monthly" ||
        s.plan_type === "premium_annual"
    )
    const businessSubs = activeSubscriptions.filter(
      s =>
        s.plan_type === "business" ||
        s.plan_type === "business_monthly" ||
        s.plan_type === "business_annual"
    )
    const aiEmployeeSubs = activeSubscriptions.filter(
      s =>
        s.plan_type === "ai_employee" ||
        s.plan_type === "ai_employee_monthly" ||
        s.plan_type === "ai_employee_annual"
    )

    // Calculate MRR properly
    let estimatedMRR = 0
    for (const sub of activeSubscriptions) {
      const price = PLAN_PRICES[sub.plan_type] || 0
      if (ANNUAL_PLANS.includes(sub.plan_type)) {
        estimatedMRR += Math.round(price / 12)
      } else {
        estimatedMRR += price
      }
    }

    // Usage this month
    const thisMonthUsage = userUsage.filter(u => u.month === thisMonth)

    // Users who signed in during last 7 days
    const activeUsers7d = users.filter(
      u => u.last_sign_in && new Date(u.last_sign_in) > weekAgo
    ).length

    // Users who signed in during last 30 days
    const activeUsers30d = users.filter(
      u => u.last_sign_in && new Date(u.last_sign_in) > monthAgo
    ).length

    const stats = {
      totalUsers: users.length,
      activeUsersLast7Days: activeUsers7d,
      activeUsersLast30Days: activeUsers30d,
      newUsersToday: users.filter(u => u.created_at.startsWith(today)).length,
      newUsersThisWeek: users.filter(u => new Date(u.created_at) > weekAgo)
        .length,
      newUsersThisMonth: users.filter(u => new Date(u.created_at) > monthAgo)
        .length,
      freeUsers:
        users.length -
        activeSubscriptions.length -
        canceledSubscriptions.length,
      premiumUsers: premiumSubs.length,
      businessUsers: businessSubs.length,
      aiEmployeeUsers: aiEmployeeSubs.length,
      trialingUsers: trialingSubscriptions.length,
      canceledUsers: canceledSubscriptions.length,
      pastDueUsers: pastDueSubscriptions.length,
      estimatedMRR,
      estimatedARR: estimatedMRR * 12,
      totalChats,
      totalMessages,
      totalReports,
      totalWebSearches: userUsage.reduce(
        (sum, u) => sum + (u.web_searches || 0),
        0
      ),
      chatsThisMonth: thisMonthUsage.reduce(
        (sum, u) =>
          sum + (u.chat_messages_free || 0) + (u.chat_messages_premium || 0),
        0
      ),
      reportsThisMonth: thisMonthUsage.reduce(
        (sum, u) => sum + (u.reports_generated || 0),
        0
      ),
      webSearchesThisMonth: thisMonthUsage.reduce(
        (sum, u) => sum + (u.web_searches || 0),
        0
      ),
      // Conversion metrics
      trialToPayConversion:
        trialingSubscriptions.length > 0
          ? Math.round(
              ((premiumSubs.length +
                businessSubs.length +
                aiEmployeeSubs.length) /
                (premiumSubs.length +
                  businessSubs.length +
                  aiEmployeeSubs.length +
                  trialingSubscriptions.length)) *
                100
            )
          : 0,
      onboardingCompletion:
        users.length > 0
          ? Math.round(
              (users.filter(u => u.has_onboarded).length / users.length) * 100
            )
          : 0
    }

    return NextResponse.json({ users, stats })
  } catch (error) {
    console.error("Admin users API error:", error)
    return NextResponse.json(
      {
        error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`
      },
      { status: 500 }
    )
  }
}
