import { supabase } from "@/lib/supabase/service-role"

// Plan prices in cents (monthly)
const PLAN_PRICES: Record<string, number> = {
  premium_monthly: 2900, // $29/month
  premium_annual: 2500, // $25/month equivalent
  business_monthly: 9900, // $99/month
  business_annual: 8400, // $84/month equivalent
  ai_employee_monthly: 19900, // $199/month
  ai_employee_annual: 16900, // $169/month equivalent
  // Backwards compatibility
  premium: 2900,
  business: 9900,
  ai_employee: 19900
}

// Annual plan types
const ANNUAL_PLANS = ["premium_annual", "business_annual", "ai_employee_annual"]

export interface DailyMetrics {
  date: string
  new_users: number
  new_paying_users: number
  reports_generated: number
  chat_messages: number
  revenue_cents: number
}

export interface UserMetrics {
  totalRegistered: number
  totalPaying: number
  totalTrialing: number
  dailyChange: {
    registered: number
    paying: number
    trialing: number
  }
}

export interface RevenueMetrics {
  mrrCents: number
  arrCents: number
  activeRevenueCents: number
  dailyChange: {
    mrr: number
    arr: number
  }
}

export interface UsageMetrics {
  totalReports: number
  totalMessages: number
  dailyReports: number
  dailyMessages: number
  aiAssistantUsage: number
}

/**
 * Calculate MRR (Monthly Recurring Revenue) from active subscriptions
 */
export async function calculateMRR(): Promise<number> {
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select("plan_type, status")
    .in("status", ["active", "trialing"])

  if (error) {
    console.error("Error fetching subscriptions for MRR:", error)
    return 0
  }

  let mrrCents = 0

  for (const sub of subscriptions || []) {
    const planPrice = PLAN_PRICES[sub.plan_type] || 0

    // For annual plans, divide by 12 to get monthly equivalent
    if (ANNUAL_PLANS.includes(sub.plan_type)) {
      mrrCents += Math.round(planPrice / 12)
    } else {
      mrrCents += planPrice
    }
  }

  return mrrCents
}

/**
 * Calculate ARR (Annual Recurring Revenue)
 */
export async function calculateARR(): Promise<number> {
  const mrr = await calculateMRR()
  return mrr * 12
}

/**
 * Get daily new user counts for a date range
 */
export async function getDailyNewUsers(
  startDate: string,
  endDate: string
): Promise<{ date: string; count: number }[]> {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate + "T23:59:59.999Z")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching daily new users:", error)
    return []
  }

  // Group by date
  const counts: Record<string, number> = {}

  for (const profile of profiles || []) {
    const date = profile.created_at.split("T")[0]
    counts[date] = (counts[date] || 0) + 1
  }

  // Fill in missing dates with 0
  const result: { date: string; count: number }[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0]
    result.push({
      date: dateStr,
      count: counts[dateStr] || 0
    })
  }

  return result
}

/**
 * Get daily report generation counts
 */
export async function getDailyReports(
  startDate: string,
  endDate: string
): Promise<{ date: string; count: number }[]> {
  const { data: reports, error } = await supabase
    .from("property_reports")
    .select("created_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate + "T23:59:59.999Z")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching daily reports:", error)
    return []
  }

  // Group by date
  const counts: Record<string, number> = {}

  for (const report of reports || []) {
    if (report.created_at) {
      const date = report.created_at.split("T")[0]
      counts[date] = (counts[date] || 0) + 1
    }
  }

  // Fill in missing dates with 0
  const result: { date: string; count: number }[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0]
    result.push({
      date: dateStr,
      count: counts[dateStr] || 0
    })
  }

  return result
}

/**
 * Get daily chat message counts
 */
export async function getDailyMessages(
  startDate: string,
  endDate: string
): Promise<{ date: string; count: number }[]> {
  const { data: messages, error } = await supabase
    .from("messages")
    .select("created_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate + "T23:59:59.999Z")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching daily messages:", error)
    return []
  }

  // Group by date
  const counts: Record<string, number> = {}

  for (const message of messages || []) {
    const date = message.created_at.split("T")[0]
    counts[date] = (counts[date] || 0) + 1
  }

  // Fill in missing dates with 0
  const result: { date: string; count: number }[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0]
    result.push({
      date: dateStr,
      count: counts[dateStr] || 0
    })
  }

  return result
}

/**
 * Get daily revenue trends
 */
export async function getDailyRevenue(
  startDate: string,
  endDate: string
): Promise<{ date: string; amount: number }[]> {
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select("created_at, plan_type, status")
    .gte("created_at", startDate)
    .lte("created_at", endDate + "T23:59:59.999Z")
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching daily revenue:", error)
    return []
  }

  // Group by date
  const amounts: Record<string, number> = {}

  for (const sub of subscriptions || []) {
    if (sub.created_at) {
      const date = sub.created_at.split("T")[0]
      const planPrice = PLAN_PRICES[sub.plan_type] || 0

      // For annual plans, divide by 12 to get monthly equivalent
      const monthlyPrice = ANNUAL_PLANS.includes(sub.plan_type)
        ? Math.round(planPrice / 12)
        : planPrice

      amounts[date] = (amounts[date] || 0) + monthlyPrice
    }
  }

  // Fill in missing dates with 0
  const result: { date: string; amount: number }[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0]
    result.push({
      date: dateStr,
      amount: (amounts[dateStr] || 0) / 100 // Convert to dollars
    })
  }

  return result
}

/**
 * Get comprehensive user metrics
 */
export async function getUserMetrics(): Promise<UserMetrics> {
  // Get total counts
  const { count: totalRegistered, error: registeredError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })

  if (registeredError) {
    console.error("Error fetching total registered:", registeredError)
  }

  // Get paying users (active or trialing subscriptions)
  const { data: payingData, error: payingError } = await supabase
    .from("subscriptions")
    .select("status")
    .in("status", ["active", "trialing"])

  if (payingError) {
    console.error("Error fetching paying users:", payingError)
  }

  const totalPaying = payingData?.length || 0
  const totalTrialing =
    payingData?.filter(u => u.status === "trialing").length || 0

  // Get yesterday's counts for daily change (approximation)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split("T")[0]

  const { count: yesterdayRegistered, error: yesterdayError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .lte("created_at", yesterdayStr + "T23:59:59.999Z")

  if (yesterdayError) {
    console.error("Error fetching yesterday's registered:", yesterdayError)
  }

  return {
    totalRegistered: totalRegistered || 0,
    totalPaying,
    totalTrialing,
    dailyChange: {
      registered: (totalRegistered || 0) - (yesterdayRegistered || 0),
      paying: 0, // Would need historical data for accurate daily change
      trialing: 0
    }
  }
}

/**
 * Get comprehensive revenue metrics
 */
export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const mrrCents = await calculateMRR()
  const arrCents = mrrCents * 12

  // Get active paying users total dollar amount
  const { data: activeSubscriptions, error } = await supabase
    .from("subscriptions")
    .select("plan_type, status")
    .in("status", ["active", "trialing"])

  if (error) {
    console.error("Error fetching active subscriptions:", error)
  }

  let activeRevenueCents = 0
  for (const sub of activeSubscriptions || []) {
    const planPrice = PLAN_PRICES[sub.plan_type] || 0
    if (ANNUAL_PLANS.includes(sub.plan_type)) {
      activeRevenueCents += Math.round(planPrice / 12)
    } else {
      activeRevenueCents += planPrice
    }
  }

  return {
    mrrCents,
    arrCents,
    activeRevenueCents,
    dailyChange: {
      mrr: 0, // Would need historical data
      arr: 0
    }
  }
}

/**
 * Get comprehensive usage metrics
 */
export async function getUsageMetrics(): Promise<UsageMetrics> {
  // Get total reports
  const { count: totalReports, error: reportsError } = await supabase
    .from("property_reports")
    .select("*", { count: "exact", head: true })

  if (reportsError) {
    console.error("Error fetching total reports:", reportsError)
  }

  // Get total messages
  const { count: totalMessages, error: messagesError } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })

  if (messagesError) {
    console.error("Error fetching total messages:", messagesError)
  }

  // Get today's counts
  const today = new Date().toISOString().split("T")[0]

  const { count: dailyReports, error: dailyReportsError } = await supabase
    .from("property_reports")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today)

  if (dailyReportsError) {
    console.error("Error fetching daily reports:", dailyReportsError)
  }

  const { count: dailyMessages, error: dailyMessagesError } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today)

  if (dailyMessagesError) {
    console.error("Error fetching daily messages:", dailyMessagesError)
  }

  // Get AI assistant usage (messages from assistant role)
  const { count: aiAssistantUsage, error: aiError } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("role", "assistant")

  if (aiError) {
    console.error("Error fetching AI assistant usage:", aiError)
  }

  return {
    totalReports: totalReports || 0,
    totalMessages: totalMessages || 0,
    dailyReports: dailyReports || 0,
    dailyMessages: dailyMessages || 0,
    aiAssistantUsage: aiAssistantUsage || 0
  }
}

/**
 * Export data to CSV format
 */
export function exportToCSV(
  data: Record<string, any>[],
  filename: string
): void {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(","),
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header]
          // Escape values containing commas or quotes
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value ?? ""
        })
        .join(",")
    )
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Format currency from cents to dollars
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(cents / 100)
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num)
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  })
}
