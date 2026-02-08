import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

// Service role client
const getServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Verify admin access via is_admin flag
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

// Email templates
const EMAIL_TEMPLATES: Record<
  string,
  { subject: string; html: (vars: Record<string, string>) => string }
> = {
  welcome: {
    subject: "Welcome to Rooftops AI!",
    html: vars => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Rooftops AI</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${vars.name || "there"},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Welcome aboard! We&apos;re excited to have you on Rooftops AI.</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Get started by generating your first AI-powered roof report or chatting with our AI assistant.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://rooftops.ai" style="background: #0891b2; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Get Started</a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
          <p>Rooftops AI - The AI Platform for Roofing Professionals</p>
        </div>
      </div>
    `
  },
  trial_expiring: {
    subject: "Your trial is ending soon - Don't lose access!",
    html: vars => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Your Trial is Ending Soon</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${vars.name || "there"},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your free trial of Rooftops AI ${vars.plan || "Premium"} ends on <strong>${vars.trial_end || "soon"}</strong>.</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Upgrade now to keep access to all your data, reports, and AI-powered tools.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://rooftops.ai/pricing" style="background: #f59e0b; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Upgrade Now</a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
          <p>Rooftops AI - The AI Platform for Roofing Professionals</p>
        </div>
      </div>
    `
  },
  check_in: {
    subject: "How's everything going with Rooftops AI?",
    html: vars => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Just Checking In</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${vars.name || "there"},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">${vars.message || "We wanted to check in and see how things are going with Rooftops AI. Is there anything we can help with?"}</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Feel free to reply to this email if you have any questions or feedback!</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
          <p>Rooftops AI - The AI Platform for Roofing Professionals</p>
        </div>
      </div>
    `
  },
  feature_announcement: {
    subject: "New Feature: Check out what's new in Rooftops AI!",
    html: vars => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">What&apos;s New</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${vars.name || "there"},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">${vars.message || "We've got some exciting updates to share with you."}</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://rooftops.ai" style="background: #7c3aed; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Try It Now</a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
          <p>Rooftops AI - The AI Platform for Roofing Professionals</p>
        </div>
      </div>
    `
  },
  custom: {
    subject: "",
    html: vars => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Rooftops AI</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">${(vars.message || "").replace(/\n/g, "<br>")}</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
          <p>Rooftops AI - The AI Platform for Roofing Professionals</p>
        </div>
      </div>
    `
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const cookieStore = cookies()
    const serverClient = createServerClient(cookieStore)
    const { authorized, email: adminEmail } = await verifyAdmin(serverClient)

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { action, userId, userIds, data } = body

    const supabase = getServiceClient()

    switch (action) {
      case "send_email": {
        const targetUserIds = userIds || [userId]
        const { subject, message, template, templateVars } = data

        // Fetch ALL auth users with pagination
        const allAuthUsers: any[] = []
        let page = 1
        while (true) {
          const { data: authData } = await supabase.auth.admin.listUsers({
            page,
            perPage: 500
          })
          if (!authData?.users || authData.users.length === 0) break
          allAuthUsers.push(...authData.users)
          if (authData.users.length < 500) break
          page++
        }

        const targetUsers = allAuthUsers.filter(u =>
          targetUserIds.includes(u.id)
        )

        if (targetUsers.length === 0) {
          return NextResponse.json({ error: "No users found" }, { status: 404 })
        }

        const RESEND_API_KEY = process.env.RESEND_API_KEY
        if (!RESEND_API_KEY) {
          return NextResponse.json(
            { error: "Email service not configured - RESEND_API_KEY missing" },
            { status: 500 }
          )
        }

        const fromEmail =
          process.env.RESEND_FROM_EMAIL || "Rooftops AI <onboarding@resend.dev>"

        const results = []
        for (const targetUser of targetUsers) {
          if (!targetUser.email) continue

          try {
            let emailSubject = subject
            let emailHtml = ""

            if (template && EMAIL_TEMPLATES[template]) {
              const tmpl = EMAIL_TEMPLATES[template]
              emailSubject = emailSubject || tmpl.subject
              emailHtml = tmpl.html({
                name:
                  targetUser.user_metadata?.display_name ||
                  targetUser.user_metadata?.name ||
                  "",
                message: message || "",
                ...(templateVars || {})
              })
            } else {
              // Use custom template with plain message
              emailHtml = EMAIL_TEMPLATES.custom.html({
                message: message || ""
              })
            }

            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                from: fromEmail,
                to: targetUser.email,
                subject: emailSubject || "Message from Rooftops AI",
                html: emailHtml
              })
            })

            const resData = await response.json()
            if (response.ok) {
              results.push({
                email: targetUser.email,
                success: true,
                id: resData.id
              })
            } else {
              console.error(`Resend error for ${targetUser.email}:`, resData)
              results.push({
                email: targetUser.email,
                success: false,
                error:
                  resData.message || resData.error || JSON.stringify(resData)
              })
            }
          } catch (err: any) {
            console.error(`Email send exception for ${targetUser.email}:`, err)
            results.push({
              email: targetUser.email,
              success: false,
              error: err.message
            })
          }
        }

        return NextResponse.json({
          success: true,
          sent: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results
        })
      }

      case "extend_trial": {
        const { days } = data
        const daysToExtend = days || 7

        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .single()

        if (!subscription) {
          return NextResponse.json(
            { error: "No subscription found" },
            { status: 404 }
          )
        }

        const currentEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end)
          : new Date()

        const newEnd = new Date(
          currentEnd.getTime() + daysToExtend * 24 * 60 * 60 * 1000
        )

        const { error } = await supabase
          .from("subscriptions")
          .update({
            current_period_end: newEnd.toISOString(),
            status: "trialing",
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)

        if (error) {
          return NextResponse.json(
            { error: "Failed to extend trial" },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `Trial extended by ${daysToExtend} days until ${newEnd.toLocaleDateString()}`
        })
      }

      case "upgrade_user": {
        const { plan_type, status } = data

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .single()

        if (existingSub) {
          const { error } = await supabase
            .from("subscriptions")
            .update({
              plan_type: plan_type || existingSub.plan_type,
              tier: plan_type || existingSub.plan_type,
              status: status || "active",
              updated_at: new Date().toISOString()
            })
            .eq("user_id", userId)

          if (error) {
            return NextResponse.json(
              { error: "Failed to update subscription" },
              { status: 500 }
            )
          }
        } else {
          const { error } = await supabase.from("subscriptions").insert({
            user_id: userId,
            plan_type: plan_type || "premium",
            tier: plan_type || "premium",
            status: status || "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

          if (error) {
            return NextResponse.json(
              { error: "Failed to create subscription" },
              { status: 500 }
            )
          }
        }

        return NextResponse.json({
          success: true,
          message: `User plan updated to ${plan_type}`
        })
      }

      case "cancel_subscription": {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            cancel_at_period_end: true,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)

        if (error) {
          return NextResponse.json(
            { error: "Failed to cancel subscription" },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: "Subscription canceled"
        })
      }

      case "export_users": {
        // Fetch ALL auth users with pagination
        const allAuthUsers: any[] = []
        let pg = 1
        while (true) {
          const { data: authData } = await supabase.auth.admin.listUsers({
            page: pg,
            perPage: 500
          })
          if (!authData?.users || authData.users.length === 0) break
          allAuthUsers.push(...authData.users)
          if (authData.users.length < 500) break
          pg++
        }

        const { data: profiles } = await supabase.from("profiles").select("*")
        const { data: subscriptions } = await supabase
          .from("subscriptions")
          .select("*")
        const { data: userUsage } = await supabase
          .from("user_usage")
          .select("*")

        const profileMap = new Map(
          (profiles || []).map((p: any) => [p.user_id, p])
        )
        const subMap = new Map(
          (subscriptions || []).map((s: any) => [s.user_id, s])
        )

        const csvRows = [
          "Email,Name,Plan,Status,Trial End,Stripe Customer ID,Created,Last Sign In,Onboarded,Chat Messages,Reports,Web Searches"
        ]

        allAuthUsers.forEach(u => {
          const profile = profileMap.get(u.id)
          const sub = subMap.get(u.id)
          const usage = (userUsage || []).filter(
            (uu: any) => uu.user_id === u.id
          )
          const totalChats = usage.reduce(
            (s: number, uu: any) =>
              s +
              (uu.chat_messages_free || 0) +
              (uu.chat_messages_premium || 0),
            0
          )
          const totalReports = usage.reduce(
            (s: number, uu: any) => s + (uu.reports_generated || 0),
            0
          )
          const totalSearches = usage.reduce(
            (s: number, uu: any) => s + (uu.web_searches || 0),
            0
          )

          csvRows.push(
            [
              `"${(u.email || "").replace(/"/g, '""')}"`,
              `"${((profile as any)?.display_name || "").replace(/"/g, '""')}"`,
              sub?.plan_type || "free",
              sub?.status || "none",
              sub?.current_period_end
                ? new Date(sub.current_period_end).toLocaleDateString()
                : "",
              sub?.stripe_customer_id || "",
              u.created_at ? new Date(u.created_at).toLocaleDateString() : "",
              u.last_sign_in_at
                ? new Date(u.last_sign_in_at).toLocaleDateString()
                : "",
              (profile as any)?.has_onboarded ? "Yes" : "No",
              totalChats,
              totalReports,
              totalSearches
            ].join(",")
          )
        })

        return NextResponse.json({
          success: true,
          csv: csvRows.join("\n"),
          count: allAuthUsers.length
        })
      }

      case "get_templates": {
        const templates = Object.entries(EMAIL_TEMPLATES).map(([key, val]) => ({
          id: key,
          subject: val.subject,
          name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")
        }))
        return NextResponse.json({ templates })
      }

      case "get_usage_metrics": {
        const { startDate, endDate } = data || {}

        // Build date-filtered count queries in parallel
        const queries: Promise<any>[] = []

        // Chats count
        let chatsQuery = supabase
          .from("chats")
          .select("*", { count: "exact", head: true })
        if (startDate) chatsQuery = chatsQuery.gte("created_at", startDate)
        if (endDate) chatsQuery = chatsQuery.lte("created_at", endDate)
        queries.push(chatsQuery)

        // Messages count
        let messagesQuery = supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
        if (startDate)
          messagesQuery = messagesQuery.gte("created_at", startDate)
        if (endDate) messagesQuery = messagesQuery.lte("created_at", endDate)
        queries.push(messagesQuery)

        // Reports count
        let reportsQuery = supabase
          .from("property_reports")
          .select("*", { count: "exact", head: true })
        if (startDate) reportsQuery = reportsQuery.gte("created_at", startDate)
        if (endDate) reportsQuery = reportsQuery.lte("created_at", endDate)
        queries.push(reportsQuery)

        // Web searches - aggregated in user_usage by month, so filter by month strings
        let usageQuery = supabase
          .from("user_usage")
          .select(
            "web_searches, chat_messages_free, chat_messages_premium, reports_generated, month"
          )
        if (startDate) {
          const startMonth = startDate.substring(0, 7) // "YYYY-MM"
          usageQuery = usageQuery.gte("month", startMonth)
        }
        if (endDate) {
          const endMonth = endDate.substring(0, 7)
          usageQuery = usageQuery.lte("month", endMonth)
        }
        queries.push(usageQuery)

        const [chatsResult, messagesResult, reportsResult, usageResult] =
          await Promise.all(queries)

        const usageRows = usageResult.data || []
        const totalWebSearches = usageRows.reduce(
          (sum: number, u: any) => sum + (u.web_searches || 0),
          0
        )

        return NextResponse.json({
          success: true,
          metrics: {
            chats: chatsResult.count || 0,
            messages: messagesResult.count || 0,
            reports: reportsResult.count || 0,
            webSearches: totalWebSearches
          }
        })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Admin action error:", error)
    return NextResponse.json(
      {
        error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`
      },
      { status: 500 }
    )
  }
}
