import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// Helper to check if user is admin
async function isAdmin(supabase: any) {
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single()

  return profile?.is_admin === true
}

// GET /api/admin/metrics - Get current metrics snapshot
export async function GET(request: Request) {
  const supabase = await createClient()

  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    // Get current counts
    const { data: userCounts } = await supabase
      .from("profiles")
      .select("subscription_status, plan_type", { count: "exact" })

    const totalRegistered = userCounts?.length || 0
    const payingUsers =
      userCounts?.filter(
        u =>
          u.subscription_status === "active" ||
          u.subscription_status === "trialing"
      ).length || 0
    const trialingUsers =
      userCounts?.filter(u => u.subscription_status === "trialing").length || 0

    // Get MRR from Stripe subscriptions
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("plan_type, status")
      .eq("status", "active")

    const planPrices: Record<string, number> = {
      premium: 2500, // $25/month in cents
      business: 8400, // $84/month in cents
      ai_employee: 16900 // $169/month in cents
    }

    const mrrCents =
      subscriptions?.reduce((total, sub) => {
        return total + (planPrices[sub.plan_type] || 0)
      }, 0) || 0

    const arrCents = mrrCents * 12

    // Get today's usage
    const today = new Date().toISOString().split("T")[0]
    const { data: todayUsage } = await supabase
      .from("admin_daily_metrics")
      .select("*")
      .eq("date", today)
      .single()

    // Get 30-day trends
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: trendData } = await supabase
      .from("admin_daily_metrics")
      .select("*")
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: true })

    // Get total usage stats
    const { count: totalReports } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })

    const { count: totalChatMessages } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })

    return NextResponse.json({
      current: {
        totalRegisteredUsers: totalRegistered,
        totalPayingUsers: payingUsers,
        totalTrialingUsers: trialingUsers,
        mrrDollars: mrrCents / 100,
        arrDollars: arrCents / 100,
        totalReportsGenerated: totalReports || 0,
        totalChatMessages: totalChatMessages || 0
      },
      today: todayUsage || null,
      trends: trendData || []
    })
  } catch (error) {
    console.error("Error fetching admin metrics:", error)
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    )
  }
}
