"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  IconUsers,
  IconCash,
  IconMessage,
  IconFileAnalytics,
  IconWorld,
  IconTrendingUp,
  IconUserPlus,
  IconCrown,
  IconRefresh,
  IconSearch,
  IconMail,
  IconDownload,
  IconCheck,
  IconX,
  IconExternalLink,
  IconSend,
  IconGift,
  IconEye,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconAlertTriangle,
  IconBan,
  IconArrowUp,
  IconArrowDown,
  IconTemplate,
  IconCalendar,
  IconActivity,
  IconUserCheck,
  IconPercentage,
  IconReceipt
} from "@tabler/icons-react"
import { toast } from "sonner"

// === TYPES ===

interface DashboardStats {
  totalUsers: number
  activeUsersLast7Days: number
  activeUsersLast30Days: number
  newUsersToday: number
  newUsersThisWeek: number
  newUsersThisMonth: number
  freeUsers: number
  premiumUsers: number
  businessUsers: number
  aiEmployeeUsers: number
  trialingUsers: number
  canceledUsers: number
  pastDueUsers: number
  estimatedMRR: number
  estimatedARR: number
  totalChats: number
  totalMessages: number
  totalReports: number
  totalWebSearches: number
  chatsThisMonth: number
  reportsThisMonth: number
  webSearchesThisMonth: number
  trialToPayConversion: number
  onboardingCompletion: number
}

interface UserDetails {
  id: string
  email: string
  display_name: string
  created_at: string
  last_sign_in: string | null
  email_confirmed: boolean
  plan_type: string
  subscription_status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  trial_end: string | null
  trial_start: string | null
  cancel_at_period_end: boolean
  scheduled_plan_type: string | null
  chat_messages: number
  reports_generated: number
  reports_count: number
  chats_count: number
  web_searches: number
  profile_context: string
  has_onboarded: boolean
  profile_image: string | null
  provider: string
  phone: string | null
}

interface EmailTemplate {
  id: string
  subject: string
  name: string
}

type FilterType =
  | "all"
  | "free"
  | "premium"
  | "business"
  | "trialing"
  | "canceled"
  | "past_due"
  | "active_paid"
  | "inactive_7d"
  | "inactive_30d"
  | "not_onboarded"
type SortField =
  | "created_at"
  | "last_sign_in"
  | "email"
  | "chat_messages"
  | "reports_count"
  | "web_searches"
type SortOrder = "asc" | "desc"
type TabType = "overview" | "users" | "revenue" | "engagement"

// Saved filter presets
const SAVED_FILTERS: {
  id: FilterType
  label: string
  description: string
  icon: React.ElementType
}[] = [
  {
    id: "all",
    label: "All Users",
    description: "Every registered user",
    icon: IconUsers
  },
  {
    id: "trialing",
    label: "Active Trials",
    description: "Users currently on a trial",
    icon: IconClock
  },
  {
    id: "active_paid",
    label: "Paying Customers",
    description: "Active premium/business subscribers",
    icon: IconCash
  },
  {
    id: "inactive_7d",
    label: "Inactive (7d)",
    description: "Haven&apos;t logged in for 7+ days",
    icon: IconAlertTriangle
  },
  {
    id: "inactive_30d",
    label: "At Risk",
    description: "Haven&apos;t logged in for 30+ days",
    icon: IconBan
  },
  {
    id: "not_onboarded",
    label: "Not Onboarded",
    description: "Signed up but never completed setup",
    icon: IconUserPlus
  },
  {
    id: "canceled",
    label: "Churned",
    description: "Canceled subscriptions",
    icon: IconX
  },
  {
    id: "past_due",
    label: "Past Due",
    description: "Failed payments",
    icon: IconAlertTriangle
  }
]

const ITEMS_PER_PAGE = 25

// Admin emails that can access the dashboard (fallback if is_admin not set)
const ADMIN_EMAILS = [
  "sb@rooftops.ai",
  "steele@rooftops.ai",
  "admin@rooftops.ai"
]

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()

  // Core state
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [users, setUsers] = useState<UserDetails[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [error, setError] = useState<string | null>(null)

  // User list state
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [sortField, setSortField] = useState<SortField>("created_at")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  // Modal state
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailMessage, setEmailMessage] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])

  // Action state
  const [actionLoading, setActionLoading] = useState(false)

  // Usage date range state
  type UsageRange = "all" | "30d" | "7d" | "today" | "custom"
  const [usageRange, setUsageRange] = useState<UsageRange>("all")
  const [usageCustomStart, setUsageCustomStart] = useState("")
  const [usageCustomEnd, setUsageCustomEnd] = useState("")
  const [usageMetrics, setUsageMetrics] = useState<{
    chats: number
    messages: number
    reports: number
    webSearches: number
  } | null>(null)
  const [usageLoading, setUsageLoading] = useState(false)

  useEffect(() => {
    checkAuthAndFetchData()
    fetchEmailTemplates()
  }, [])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType, sortField, sortOrder])

  const checkAuthAndFetchData = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        console.log("No user found, redirecting")
        router.push("/")
        return
      }

      console.log("User email:", user.email)

      // Check is_admin flag OR email in admin list
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .single()

      const isAdminByFlag = profile?.is_admin === true
      const isAdminByEmail = ADMIN_EMAILS.includes(user.email || "")

      console.log(
        "is_admin flag:",
        profile?.is_admin,
        "isAdminByEmail:",
        isAdminByEmail
      )

      if (!isAdminByFlag && !isAdminByEmail) {
        console.log("Not authorized, redirecting")
        router.push("/")
        return
      }

      setAuthorized(true)
      await fetchDashboardData()
    } catch (err) {
      console.error("Auth check failed:", err)
      router.push("/")
    }
  }

  const fetchDashboardData = async () => {
    setRefreshing(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/users")
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setUsers(data.users || [])
      setStats(data.stats || null)

      if (data.users?.length === 0) {
        setError("No users returned. Check server logs for details.")
      }
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err)
      setError(err.message || "Failed to fetch dashboard data")
      toast.error("Failed to fetch dashboard data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchEmailTemplates = async () => {
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_templates" })
      })
      const data = await response.json()
      if (data.templates) {
        setEmailTemplates(data.templates)
      }
    } catch (err) {
      // Silently fail - templates are optional
    }
  }

  // Fetch usage metrics for a date range
  const fetchUsageMetrics = useCallback(
    async (range: UsageRange, customStart?: string, customEnd?: string) => {
      if (range === "all") {
        setUsageMetrics(null) // null means use the default stats
        return
      }

      setUsageLoading(true)
      try {
        const now = new Date()
        let startDate: string
        let endDate: string = now.toISOString()

        switch (range) {
          case "today":
            startDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate()
            ).toISOString()
            break
          case "7d":
            startDate = new Date(
              now.getTime() - 7 * 24 * 60 * 60 * 1000
            ).toISOString()
            break
          case "30d":
            startDate = new Date(
              now.getTime() - 30 * 24 * 60 * 60 * 1000
            ).toISOString()
            break
          case "custom":
            startDate = customStart
              ? new Date(customStart).toISOString()
              : new Date(0).toISOString()
            endDate = customEnd
              ? new Date(customEnd + "T23:59:59").toISOString()
              : now.toISOString()
            break
          default:
            startDate = new Date(0).toISOString()
        }

        const response = await fetch("/api/admin/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_usage_metrics",
            data: { startDate, endDate }
          })
        })

        const result = await response.json()
        if (result.success) {
          setUsageMetrics(result.metrics)
        }
      } catch (err) {
        console.error("Failed to fetch usage metrics:", err)
      } finally {
        setUsageLoading(false)
      }
    },
    []
  )

  // Refetch usage when range changes
  useEffect(() => {
    if (!authorized || loading) return
    if (usageRange === "custom") {
      if (usageCustomStart && usageCustomEnd) {
        fetchUsageMetrics("custom", usageCustomStart, usageCustomEnd)
      }
    } else {
      fetchUsageMetrics(usageRange)
    }
  }, [
    usageRange,
    usageCustomStart,
    usageCustomEnd,
    authorized,
    loading,
    fetchUsageMetrics
  ])

  // Filter and sort users with pagination
  const filteredUsers = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    let result = users.filter(user => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.stripe_customer_id || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())

      // Filter by category
      let matchesFilter = true
      switch (filterType) {
        case "free":
          matchesFilter =
            user.subscription_status === "none" || user.plan_type === "free"
          break
        case "premium":
          matchesFilter =
            (user.plan_type === "premium" ||
              user.plan_type === "premium_monthly" ||
              user.plan_type === "premium_annual") &&
            user.subscription_status !== "canceled"
          break
        case "business":
          matchesFilter =
            (user.plan_type === "business" ||
              user.plan_type === "business_monthly" ||
              user.plan_type === "business_annual") &&
            user.subscription_status !== "canceled"
          break
        case "trialing":
          matchesFilter = user.subscription_status === "trialing"
          break
        case "canceled":
          matchesFilter =
            user.subscription_status === "canceled" ||
            user.subscription_status === "cancelled"
          break
        case "past_due":
          matchesFilter = user.subscription_status === "past_due"
          break
        case "active_paid":
          matchesFilter =
            user.subscription_status === "active" && user.plan_type !== "free"
          break
        case "inactive_7d":
          matchesFilter =
            !user.last_sign_in || new Date(user.last_sign_in) < weekAgo
          break
        case "inactive_30d":
          matchesFilter =
            !user.last_sign_in || new Date(user.last_sign_in) < monthAgo
          break
        case "not_onboarded":
          matchesFilter = !user.has_onboarded
          break
      }

      return matchesSearch && matchesFilter
    })

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === "created_at" || sortField === "last_sign_in") {
        aVal = aVal ? new Date(aVal).getTime() : 0
        bVal = bVal ? new Date(bVal).getTime() : 0
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase()
        bVal = (bVal || "").toLowerCase()
      }

      if (sortOrder === "asc") return aVal > bVal ? 1 : -1
      return aVal < bVal ? 1 : -1
    })

    return result
  }, [users, searchTerm, filterType, sortField, sortOrder])

  // Paginate
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredUsers, currentPage])

  // === ACTIONS ===

  const handleSendEmail = async (targetUserIds?: string[]) => {
    if (!emailSubject || !emailMessage) {
      toast.error("Please enter subject and message")
      return
    }

    setSendingEmail(true)
    try {
      const userIds = targetUserIds || selectedUsers
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_email",
          userIds,
          data: {
            subject: emailSubject,
            message: emailMessage,
            template: selectedTemplate || "custom"
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        const failedDetails = result.results
          ?.filter((r: any) => !r.success)
          .map((r: any) => `${r.email}: ${r.error}`)
          .join(", ")
        if (result.failed > 0) {
          toast.success(`Sent to ${result.sent} user(s)`)
          toast.error(`${result.failed} failed: ${failedDetails}`)
        } else {
          toast.success(`Email sent to ${result.sent} user(s)`)
        }
        setShowEmailModal(false)
        setEmailSubject("")
        setEmailMessage("")
        setSelectedTemplate("")
        setSelectedUsers([])
      } else {
        toast.error(result.error || "Failed to send email")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send email")
    } finally {
      setSendingEmail(false)
    }
  }

  const handleExtendTrial = async (userId: string, days: number) => {
    setActionLoading(true)
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extend_trial", userId, data: { days } })
      })
      const result = await response.json()
      if (result.success) {
        toast.success(result.message)
        fetchDashboardData()
      } else {
        toast.error(result.error || "Failed to extend trial")
      }
    } catch (err) {
      toast.error("Failed to extend trial")
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpgradeUser = async (userId: string, planType: string) => {
    setActionLoading(true)
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upgrade_user",
          userId,
          data: { plan_type: planType, status: "active" }
        })
      })
      const result = await response.json()
      if (result.success) {
        toast.success(result.message)
        fetchDashboardData()
        setShowUserModal(false)
      } else {
        toast.error(result.error || "Failed to upgrade user")
      }
    } catch (err) {
      toast.error("Failed to upgrade user")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelSubscription = async (userId: string) => {
    setActionLoading(true)
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel_subscription", userId })
      })
      const result = await response.json()
      if (result.success) {
        toast.success("Subscription canceled")
        fetchDashboardData()
        setShowUserModal(false)
      } else {
        toast.error(result.error || "Failed to cancel")
      }
    } catch (err) {
      toast.error("Failed to cancel subscription")
    } finally {
      setActionLoading(false)
    }
  }

  const handleExportUsers = async () => {
    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_users" })
      })
      const result = await response.json()
      if (result.success) {
        const blob = new Blob([result.csv], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `rooftops-users-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success(`Exported ${result.count} users`)
      }
    } catch (err) {
      toast.error("Failed to export users")
    }
  }

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAllFiltered = () => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(paginatedUsers.map(u => u.id))
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  // Template selection handler
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = emailTemplates.find(t => t.id === templateId)
    if (template && template.subject) {
      setEmailSubject(template.subject)
    }
  }

  // === HELPERS ===

  const formatDate = (date: string | null) => {
    if (!date) return "Never"
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  const formatDateTime = (date: string | null) => {
    if (!date) return "Never"
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    })
  }

  const getTimeAgo = (date: string | null) => {
    if (!date) return "Never"
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 5) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
    return `${Math.floor(diffDays / 365)}y ago`
  }

  const getTrialDaysLeft = (trialEnd: string | null) => {
    if (!trialEnd) return null
    const now = new Date()
    const end = new Date(trialEnd)
    const diff = Math.ceil(
      (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diff
  }

  const getUserHealthColor = (user: UserDetails) => {
    if (user.subscription_status === "past_due") return "red"
    if (
      user.subscription_status === "canceled" ||
      user.subscription_status === "cancelled"
    )
      return "red"

    const lastSignIn = user.last_sign_in ? new Date(user.last_sign_in) : null
    const now = new Date()
    if (!lastSignIn) return "gray"

    const daysSince = Math.floor(
      (now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSince <= 3) return "green"
    if (daysSince <= 7) return "yellow"
    if (daysSince <= 30) return "orange"
    return "red"
  }

  // === LOADING STATE ===

  if (!authorized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-gray-300 border-t-cyan-500"></div>
          <p className="text-gray-500 dark:text-gray-400">
            Loading admin dashboard...
          </p>
        </div>
      </div>
    )
  }

  // === RENDER ===

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
        <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stats ? `${stats.totalUsers} users` : "Loading..."} &middot;
                Last refreshed {new Date().toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportUsers}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <IconDownload className="size-3.5" />
                Export
              </button>
              <button
                onClick={() => fetchDashboardData()}
                disabled={refreshing}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
              >
                <IconRefresh
                  className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="-mb-px mt-3 flex gap-6">
            {(["overview", "users", "revenue", "engagement"] as TabType[]).map(
              tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-2 pb-2 text-xs font-medium capitalize transition ${
                    activeTab === tab
                      ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6">
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <IconAlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <IconX className="size-4" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1600px] space-y-4 p-4 sm:px-6">
        {/* === OVERVIEW TAB === */}
        {activeTab === "overview" && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KPICard
                label="Total Users"
                value={stats?.totalUsers || 0}
                icon={IconUsers}
                color="blue"
                subtext={`+${stats?.newUsersThisWeek || 0} this week`}
              />
              <KPICard
                label="Active (30d)"
                value={stats?.activeUsersLast30Days || 0}
                icon={IconActivity}
                color="green"
                subtext={`${stats?.totalUsers ? Math.round((stats.activeUsersLast30Days / stats.totalUsers) * 100) : 0}% of total`}
              />
              <KPICard
                label="MRR"
                value={`$${(stats?.estimatedMRR || 0).toLocaleString()}`}
                icon={IconCash}
                color="emerald"
                subtext={`$${(stats?.estimatedARR || 0).toLocaleString()} ARR`}
              />
              <KPICard
                label="Trials"
                value={stats?.trialingUsers || 0}
                icon={IconClock}
                color="amber"
                subtext={`${stats?.trialToPayConversion || 0}% convert`}
              />
              <KPICard
                label="Churned"
                value={stats?.canceledUsers || 0}
                icon={IconBan}
                color="red"
                subtext={
                  stats?.pastDueUsers
                    ? `${stats.pastDueUsers} past due`
                    : undefined
                }
              />
              <KPICard
                label="New Today"
                value={stats?.newUsersToday || 0}
                icon={IconUserPlus}
                color="purple"
                subtext={`${stats?.newUsersThisMonth || 0} this month`}
              />
            </div>

            {/* Two Column Layout */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Subscription Breakdown */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">
                  Subscription Breakdown
                </h2>
                <div className="space-y-3">
                  <BarRow
                    label="Free"
                    count={stats?.freeUsers || 0}
                    total={stats?.totalUsers || 1}
                    color="bg-gray-400"
                  />
                  <BarRow
                    label="Premium"
                    count={stats?.premiumUsers || 0}
                    total={stats?.totalUsers || 1}
                    color="bg-amber-400"
                    subtext="$29/mo"
                  />
                  <BarRow
                    label="Business"
                    count={stats?.businessUsers || 0}
                    total={stats?.totalUsers || 1}
                    color="bg-purple-500"
                    subtext="$99/mo"
                  />
                  <BarRow
                    label="AI Employee"
                    count={stats?.aiEmployeeUsers || 0}
                    total={stats?.totalUsers || 1}
                    color="bg-blue-500"
                    subtext="$199/mo"
                  />
                  <BarRow
                    label="Trialing"
                    count={stats?.trialingUsers || 0}
                    total={stats?.totalUsers || 1}
                    color="bg-cyan-400"
                  />
                  <BarRow
                    label="Canceled"
                    count={stats?.canceledUsers || 0}
                    total={stats?.totalUsers || 1}
                    color="bg-red-400"
                  />
                  {(stats?.pastDueUsers || 0) > 0 && (
                    <BarRow
                      label="Past Due"
                      count={stats?.pastDueUsers || 0}
                      total={stats?.totalUsers || 1}
                      color="bg-orange-400"
                    />
                  )}
                </div>
              </div>

              {/* Platform Usage */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-white">
                    Platform Usage
                  </h2>
                  <div className="flex items-center gap-1.5">
                    {(["all", "30d", "7d", "today", "custom"] as const).map(
                      range => (
                        <button
                          key={range}
                          onClick={() => setUsageRange(range)}
                          className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${
                            usageRange === range
                              ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
                              : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                          }`}
                        >
                          {range === "all"
                            ? "All Time"
                            : range === "30d"
                              ? "30 Days"
                              : range === "7d"
                                ? "7 Days"
                                : range === "today"
                                  ? "Today"
                                  : "Custom"}
                        </button>
                      )
                    )}
                    {usageLoading && (
                      <IconRefresh className="size-3.5 animate-spin text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Custom date range inputs */}
                {usageRange === "custom" && (
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      type="date"
                      value={usageCustomStart}
                      onChange={e => setUsageCustomStart(e.target.value)}
                      className="rounded-lg border bg-gray-50 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    <span className="text-xs text-gray-400">to</span>
                    <input
                      type="date"
                      value={usageCustomEnd}
                      onChange={e => setUsageCustomEnd(e.target.value)}
                      className="rounded-lg border bg-gray-50 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <UsageStat
                    icon={IconMessage}
                    label="Chats"
                    value={
                      usageMetrics ? usageMetrics.chats : stats?.totalChats || 0
                    }
                    thisMonth={
                      usageRange === "all" ? stats?.chatsThisMonth : undefined
                    }
                  />
                  <UsageStat
                    icon={IconMessage}
                    label="Messages"
                    value={
                      usageMetrics
                        ? usageMetrics.messages
                        : stats?.totalMessages || 0
                    }
                  />
                  <UsageStat
                    icon={IconFileAnalytics}
                    label="Reports"
                    value={
                      usageMetrics
                        ? usageMetrics.reports
                        : stats?.totalReports || 0
                    }
                    thisMonth={
                      usageRange === "all" ? stats?.reportsThisMonth : undefined
                    }
                  />
                  <UsageStat
                    icon={IconWorld}
                    label="Web Searches"
                    value={
                      usageMetrics
                        ? usageMetrics.webSearches
                        : stats?.totalWebSearches || 0
                    }
                    thisMonth={
                      usageRange === "all"
                        ? stats?.webSearchesThisMonth
                        : undefined
                    }
                  />
                </div>

                {/* Key Metrics */}
                <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 dark:border-gray-700">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats?.onboardingCompletion || 0}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Onboarding Rate
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats?.trialToPayConversion || 0}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Trial Conversion
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Filter Cards - Clickable to switch to Users tab with filter */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">
                Quick Segments
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SAVED_FILTERS.filter(f => f.id !== "all").map(filter => {
                  const count = (() => {
                    switch (filter.id) {
                      case "trialing":
                        return stats?.trialingUsers || 0
                      case "active_paid":
                        return (
                          (stats?.premiumUsers || 0) +
                          (stats?.businessUsers || 0) +
                          (stats?.aiEmployeeUsers || 0)
                        )
                      case "canceled":
                        return stats?.canceledUsers || 0
                      case "past_due":
                        return stats?.pastDueUsers || 0
                      case "inactive_7d":
                        return users.filter(u => {
                          if (!u.last_sign_in) return true
                          return (
                            new Date(u.last_sign_in) <
                            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                          )
                        }).length
                      case "inactive_30d":
                        return users.filter(u => {
                          if (!u.last_sign_in) return true
                          return (
                            new Date(u.last_sign_in) <
                            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                          )
                        }).length
                      case "not_onboarded":
                        return users.filter(u => !u.has_onboarded).length
                      default:
                        return 0
                    }
                  })()

                  return (
                    <button
                      key={filter.id}
                      onClick={() => {
                        setFilterType(filter.id)
                        setActiveTab("users")
                      }}
                      className="flex items-center gap-2 rounded-lg border border-gray-100 p-3 text-left transition hover:border-cyan-200 hover:bg-cyan-50/50 dark:border-gray-700 dark:hover:border-cyan-800 dark:hover:bg-cyan-900/10"
                    >
                      <filter.icon className="size-4 text-gray-400" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {count}
                        </div>
                        <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {filter.label}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Recent Signups */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white">
                  Recent Signups
                </h2>
                <button
                  onClick={() => {
                    setActiveTab("users")
                    setFilterType("all")
                    setSortField("created_at")
                    setSortOrder("desc")
                  }}
                  className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {users.slice(0, 8).map(user => (
                  <div
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user)
                      setShowUserModal(true)
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <HealthDot color={getUserHealthColor(user)} />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{user.display_name}</span>
                          <span>&middot;</span>
                          <span>{getTimeAgo(user.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PlanBadge
                        plan={user.plan_type}
                        status={user.subscription_status}
                      />
                      {user.subscription_status === "trialing" &&
                        user.trial_end && (
                          <span className="text-xs text-gray-400">
                            {getTrialDaysLeft(user.trial_end)}d left
                          </span>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* === USERS TAB === */}
        {activeTab === "users" && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {/* Toolbar */}
            <div className="border-b p-4 dark:border-gray-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center gap-2">
                  {/* Search */}
                  <div className="relative max-w-xs flex-1">
                    <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search email, name, Stripe ID..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full rounded-lg border bg-gray-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Filter dropdown */}
                  <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value as FilterType)}
                    className="rounded-lg border bg-gray-50 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    {SAVED_FILTERS.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bulk actions */}
                <div className="flex items-center gap-2">
                  {selectedUsers.length > 0 && (
                    <>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedUsers.length} selected
                      </span>
                      <button
                        onClick={() => setShowEmailModal(true)}
                        className="flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-cyan-700"
                      >
                        <IconMail className="size-3.5" />
                        Email
                      </button>
                      <button
                        onClick={() => setSelectedUsers([])}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* User Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80 text-[10px] uppercase tracking-wider text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
                  <tr>
                    <th className="w-10 px-3 py-2.5 text-left">
                      <input
                        type="checkbox"
                        checked={
                          selectedUsers.length === paginatedUsers.length &&
                          paginatedUsers.length > 0
                        }
                        onChange={selectAllFiltered}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <SortButton
                        field="email"
                        currentField={sortField}
                        order={sortOrder}
                        onClick={handleSort}
                        label="User"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left">Plan</th>
                    <th className="px-3 py-2.5 text-left">Health</th>
                    <th className="px-3 py-2.5 text-left">
                      <SortButton
                        field="chat_messages"
                        currentField={sortField}
                        order={sortOrder}
                        onClick={handleSort}
                        label="Usage"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <SortButton
                        field="created_at"
                        currentField={sortField}
                        order={sortOrder}
                        onClick={handleSort}
                        label="Joined"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <SortButton
                        field="last_sign_in"
                        currentField={sortField}
                        order={sortOrder}
                        onClick={handleSort}
                        label="Last Active"
                      />
                    </th>
                    <th className="w-24 px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700/50">
                  {paginatedUsers.map(user => (
                    <tr
                      key={user.id}
                      className="transition hover:bg-gray-50/50 dark:hover:bg-gray-700/30"
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-[10px] font-bold text-white">
                            {user.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 text-xs font-medium text-gray-900 dark:text-white">
                              <span className="truncate">{user.email}</span>
                              {user.email_confirmed && (
                                <IconCheck className="size-3 shrink-0 text-green-500" />
                              )}
                            </div>
                            <div className="truncate text-[10px] text-gray-500 dark:text-gray-400">
                              {user.display_name}{" "}
                              {user.provider !== "email" &&
                                `(${user.provider})`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <PlanBadge
                          plan={user.plan_type}
                          status={user.subscription_status}
                        />
                        {user.subscription_status === "trialing" &&
                          user.trial_end && (
                            <div className="mt-0.5 text-[10px] text-gray-500">
                              {(() => {
                                const days = getTrialDaysLeft(user.trial_end)
                                if (days === null) return ""
                                if (days <= 0) return "Expired"
                                if (days <= 3)
                                  return (
                                    <span className="text-red-500">
                                      {days}d left
                                    </span>
                                  )
                                return <span>{days}d left</span>
                              })()}
                            </div>
                          )}
                      </td>
                      <td className="px-3 py-2.5">
                        <HealthDot color={getUserHealthColor(user)} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs">
                          <div className="text-gray-900 dark:text-white">
                            {user.chat_messages} msgs
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {user.reports_count} reports &middot;{" "}
                            {user.web_searches} searches
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                        {getTimeAgo(user.last_sign_in)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => {
                              setSelectedUser(user)
                              setShowUserModal(true)
                            }}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                            title="View Details"
                          >
                            <IconEye className="size-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUsers([user.id])
                              setShowEmailModal(true)
                            }}
                            className="rounded p-1 text-gray-400 hover:bg-cyan-50 hover:text-cyan-600 dark:hover:bg-cyan-900/20"
                            title="Send Email"
                          >
                            <IconMail className="size-3.5" />
                          </button>
                          {user.subscription_status === "trialing" && (
                            <button
                              onClick={() => handleExtendTrial(user.id, 7)}
                              disabled={actionLoading}
                              className="rounded p-1 text-gray-400 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20"
                              title="Extend Trial +7d"
                            >
                              <IconGift className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                      >
                        {searchTerm || filterType !== "all"
                          ? "No users match your filters."
                          : "No users found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-4 py-3 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Showing {paginatedUsers.length} of {filteredUsers.length} users
                {filterType !== "all" && ` (${users.length} total)`}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                  >
                    <IconChevronLeft className="size-4" />
                  </button>
                  <span className="px-2 text-xs text-gray-600 dark:text-gray-400">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                  >
                    <IconChevronRight className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === REVENUE TAB === */}
        {activeTab === "revenue" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KPICard
                label="MRR"
                value={`$${(stats?.estimatedMRR || 0).toLocaleString()}`}
                icon={IconCash}
                color="emerald"
              />
              <KPICard
                label="ARR"
                value={`$${(stats?.estimatedARR || 0).toLocaleString()}`}
                icon={IconReceipt}
                color="blue"
              />
              <KPICard
                label="Paying Customers"
                value={
                  (stats?.premiumUsers || 0) +
                  (stats?.businessUsers || 0) +
                  (stats?.aiEmployeeUsers || 0)
                }
                icon={IconUserCheck}
                color="green"
              />
              <KPICard
                label="Trial Conversion"
                value={`${stats?.trialToPayConversion || 0}%`}
                icon={IconPercentage}
                color="amber"
              />
            </div>

            {/* Revenue by Plan */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">
                Revenue by Plan
              </h2>
              <div className="space-y-4">
                <RevenueRow
                  plan="Premium"
                  count={stats?.premiumUsers || 0}
                  price={29}
                  color="amber"
                />
                <RevenueRow
                  plan="Business"
                  count={stats?.businessUsers || 0}
                  price={99}
                  color="purple"
                />
                <RevenueRow
                  plan="AI Employee"
                  count={stats?.aiEmployeeUsers || 0}
                  price={199}
                  color="blue"
                />
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-4 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Total MRR
                </span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  ${(stats?.estimatedMRR || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* At-Risk Revenue */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">
                Trials Ending Soon
              </h2>
              <div className="space-y-2">
                {users
                  .filter(
                    u => u.subscription_status === "trialing" && u.trial_end
                  )
                  .sort(
                    (a, b) =>
                      new Date(a.trial_end!).getTime() -
                      new Date(b.trial_end!).getTime()
                  )
                  .slice(0, 10)
                  .map(user => {
                    const daysLeft = getTrialDaysLeft(user.trial_end)
                    return (
                      <div
                        key={user.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        onClick={() => {
                          setSelectedUser(user)
                          setShowUserModal(true)
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-xs">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {user.email}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">
                              {user.plan_type} trial &middot;{" "}
                              {user.chat_messages} msgs &middot;{" "}
                              {user.reports_count} reports
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              (daysLeft || 0) <= 3
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : (daysLeft || 0) <= 7
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {daysLeft != null && daysLeft <= 0
                              ? "Expired"
                              : `${daysLeft}d left`}
                          </span>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              handleExtendTrial(user.id, 7)
                            }}
                            disabled={actionLoading}
                            className="rounded p-1 text-gray-400 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20"
                            title="Extend +7 days"
                          >
                            <IconGift className="size-3.5" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setSelectedUsers([user.id])
                              setShowEmailModal(true)
                            }}
                            className="rounded p-1 text-gray-400 hover:bg-cyan-50 hover:text-cyan-600 dark:hover:bg-cyan-900/20"
                            title="Send email"
                          >
                            <IconMail className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                {users.filter(u => u.subscription_status === "trialing")
                  .length === 0 && (
                  <p className="py-4 text-center text-xs text-gray-400">
                    No active trials
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* === ENGAGEMENT TAB === */}
        {activeTab === "engagement" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KPICard
                label="Onboarding Rate"
                value={`${stats?.onboardingCompletion || 0}%`}
                icon={IconUserCheck}
                color="green"
              />
              <KPICard
                label="Active (30d)"
                value={stats?.activeUsersLast30Days || 0}
                icon={IconActivity}
                color="blue"
              />
              <KPICard
                label="Reports/Month"
                value={stats?.reportsThisMonth || 0}
                icon={IconFileAnalytics}
                color="purple"
              />
              <KPICard
                label="Searches/Month"
                value={stats?.webSearchesThisMonth || 0}
                icon={IconWorld}
                color="amber"
              />
            </div>

            {/* Power Users */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">
                Most Active Users
              </h2>
              <div className="space-y-2">
                {[...users]
                  .sort(
                    (a, b) =>
                      b.chat_messages +
                      b.reports_count +
                      b.web_searches -
                      (a.chat_messages + a.reports_count + a.web_searches)
                  )
                  .slice(0, 10)
                  .map((user, idx) => (
                    <div
                      key={user.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      onClick={() => {
                        setSelectedUser(user)
                        setShowUserModal(true)
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {idx + 1}
                        </span>
                        <div className="text-xs">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.email}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {user.display_name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>{user.chat_messages} msgs</span>
                        <span>{user.reports_count} reports</span>
                        <span>{user.web_searches} searches</span>
                        <PlanBadge
                          plan={user.plan_type}
                          status={user.subscription_status}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Inactive / At Risk Users */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">
                At-Risk Users (No activity 14+ days)
              </h2>
              <div className="space-y-2">
                {users
                  .filter(u => {
                    if (!u.last_sign_in)
                      return (
                        u.subscription_status === "active" ||
                        u.subscription_status === "trialing"
                      )
                    const days = Math.floor(
                      (Date.now() - new Date(u.last_sign_in).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                    return (
                      days >= 14 &&
                      (u.subscription_status === "active" ||
                        u.subscription_status === "trialing")
                    )
                  })
                  .sort((a, b) => {
                    const aDate = a.last_sign_in
                      ? new Date(a.last_sign_in).getTime()
                      : 0
                    const bDate = b.last_sign_in
                      ? new Date(b.last_sign_in).getTime()
                      : 0
                    return aDate - bDate
                  })
                  .slice(0, 10)
                  .map(user => (
                    <div
                      key={user.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      onClick={() => {
                        setSelectedUser(user)
                        setShowUserModal(true)
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <HealthDot color="red" />
                        <div className="text-xs">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.email}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            Last active: {getTimeAgo(user.last_sign_in)}{" "}
                            &middot; {user.chat_messages} msgs
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <PlanBadge
                          plan={user.plan_type}
                          status={user.subscription_status}
                        />
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setSelectedUsers([user.id])
                            setShowEmailModal(true)
                          }}
                          className="rounded p-1 text-gray-400 hover:bg-cyan-50 hover:text-cyan-600 dark:hover:bg-cyan-900/20"
                          title="Send check-in email"
                        >
                          <IconMail className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                {users.filter(u => {
                  if (!u.last_sign_in) return false
                  const days = Math.floor(
                    (Date.now() - new Date(u.last_sign_in).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                  return (
                    days >= 14 &&
                    (u.subscription_status === "active" ||
                      u.subscription_status === "trialing")
                  )
                }).length === 0 && (
                  <p className="py-4 text-center text-xs text-gray-400">
                    No at-risk paying users
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* === USER DETAIL MODAL === */}
      {showUserModal && selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowUserModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white dark:bg-gray-800"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 border-b bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-sm font-bold text-white">
                    {selectedUser.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {selectedUser.display_name}
                      </h2>
                      <HealthDot color={getUserHealthColor(selectedUser)} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedUser.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <IconX className="size-5" />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {/* Subscription */}
              <Section title="Subscription">
                <div className="grid grid-cols-2 gap-3">
                  <InfoField
                    label="Plan"
                    value={
                      <PlanBadge
                        plan={selectedUser.plan_type}
                        status={selectedUser.subscription_status}
                      />
                    }
                  />
                  <InfoField
                    label="Status"
                    value={selectedUser.subscription_status}
                    capitalize
                  />
                  {selectedUser.trial_end && (
                    <InfoField
                      label="Trial Ends"
                      value={
                        <span
                          className={(() => {
                            const days = getTrialDaysLeft(
                              selectedUser.trial_end
                            )
                            if (days !== null && days <= 3)
                              return "font-medium text-red-600"
                            return ""
                          })()}
                        >
                          {formatDateTime(selectedUser.trial_end)}
                          {(() => {
                            const days = getTrialDaysLeft(
                              selectedUser.trial_end
                            )
                            if (days !== null)
                              return ` (${days <= 0 ? "expired" : `${days}d left`})`
                            return ""
                          })()}
                        </span>
                      }
                    />
                  )}
                  {selectedUser.cancel_at_period_end && (
                    <InfoField label="Cancel At Period End" value="Yes" />
                  )}
                  {selectedUser.scheduled_plan_type && (
                    <InfoField
                      label="Scheduled Change"
                      value={selectedUser.scheduled_plan_type}
                      capitalize
                    />
                  )}
                  {selectedUser.stripe_customer_id && (
                    <InfoField
                      label="Stripe"
                      value={
                        <a
                          href={`https://dashboard.stripe.com/customers/${selectedUser.stripe_customer_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700"
                        >
                          View in Stripe <IconExternalLink className="size-3" />
                        </a>
                      }
                    />
                  )}
                </div>
              </Section>

              {/* Usage */}
              <Section title="Usage">
                <div className="grid grid-cols-4 gap-3">
                  <StatBox
                    label="Messages"
                    value={selectedUser.chat_messages}
                  />
                  <StatBox label="Chats" value={selectedUser.chats_count} />
                  <StatBox label="Reports" value={selectedUser.reports_count} />
                  <StatBox label="Searches" value={selectedUser.web_searches} />
                </div>
              </Section>

              {/* Activity */}
              <Section title="Activity">
                <div className="space-y-1.5 text-xs">
                  <InfoRow
                    label="Joined"
                    value={formatDateTime(selectedUser.created_at)}
                  />
                  <InfoRow
                    label="Last Sign In"
                    value={`${formatDateTime(selectedUser.last_sign_in)} (${getTimeAgo(selectedUser.last_sign_in)})`}
                  />
                  <InfoRow
                    label="Email Confirmed"
                    value={selectedUser.email_confirmed ? "Yes" : "No"}
                  />
                  <InfoRow
                    label="Onboarded"
                    value={selectedUser.has_onboarded ? "Yes" : "No"}
                  />
                  <InfoRow
                    label="Auth Provider"
                    value={selectedUser.provider}
                  />
                  {selectedUser.phone && (
                    <InfoRow label="Phone" value={selectedUser.phone} />
                  )}
                </div>
              </Section>

              {/* Quick Actions */}
              <Section title="Actions">
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    icon={IconMail}
                    label="Send Email"
                    color="cyan"
                    onClick={() => {
                      setSelectedUsers([selectedUser.id])
                      setShowUserModal(false)
                      setShowEmailModal(true)
                    }}
                  />

                  {selectedUser.subscription_status === "trialing" && (
                    <>
                      <ActionButton
                        icon={IconGift}
                        label="+7d Trial"
                        color="purple"
                        loading={actionLoading}
                        onClick={() => handleExtendTrial(selectedUser.id, 7)}
                      />
                      <ActionButton
                        icon={IconGift}
                        label="+14d Trial"
                        color="purple"
                        loading={actionLoading}
                        onClick={() => handleExtendTrial(selectedUser.id, 14)}
                      />
                      <ActionButton
                        icon={IconGift}
                        label="+30d Trial"
                        color="purple"
                        loading={actionLoading}
                        onClick={() => handleExtendTrial(selectedUser.id, 30)}
                      />
                    </>
                  )}

                  {(selectedUser.plan_type === "free" ||
                    selectedUser.subscription_status === "none") && (
                    <>
                      <ActionButton
                        icon={IconCrown}
                        label="Gift Premium"
                        color="amber"
                        loading={actionLoading}
                        onClick={() =>
                          handleUpgradeUser(selectedUser.id, "premium")
                        }
                      />
                      <ActionButton
                        icon={IconCrown}
                        label="Gift Business"
                        color="purple"
                        loading={actionLoading}
                        onClick={() =>
                          handleUpgradeUser(selectedUser.id, "business")
                        }
                      />
                    </>
                  )}

                  {selectedUser.subscription_status === "trialing" && (
                    <ActionButton
                      icon={IconCrown}
                      label="Convert to Paid"
                      color="green"
                      loading={actionLoading}
                      onClick={() =>
                        handleUpgradeUser(
                          selectedUser.id,
                          selectedUser.plan_type
                        )
                      }
                    />
                  )}

                  {(selectedUser.subscription_status === "active" ||
                    selectedUser.subscription_status === "trialing") && (
                    <ActionButton
                      icon={IconBan}
                      label="Cancel Sub"
                      color="red"
                      loading={actionLoading}
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to cancel this subscription?"
                          )
                        ) {
                          handleCancelSubscription(selectedUser.id)
                        }
                      }}
                    />
                  )}
                </div>
              </Section>
            </div>
          </div>
        </div>
      )}

      {/* === EMAIL MODAL === */}
      {showEmailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowEmailModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="border-b p-5 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Send Email
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Sending to {selectedUsers.length} user
                    {selectedUsers.length > 1 ? "s" : ""}
                    {selectedUsers.length === 1 &&
                      users.find(u => u.id === selectedUsers[0]) && (
                        <span>
                          {" "}
                          ({users.find(u => u.id === selectedUsers[0])?.email})
                        </span>
                      )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEmailModal(false)
                    setEmailSubject("")
                    setEmailMessage("")
                    setSelectedTemplate("")
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <IconX className="size-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 p-5">
              {/* Template selector */}
              {emailTemplates.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={e => handleTemplateSelect(e.target.value)}
                    className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Custom email</option>
                    {emailTemplates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Email subject..."
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Message
                </label>
                <textarea
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  placeholder="Write your message..."
                  rows={6}
                  className="w-full resize-none rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t p-5 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowEmailModal(false)
                  setEmailSubject("")
                  setEmailMessage("")
                  setSelectedTemplate("")
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendEmail()}
                disabled={sendingEmail || !emailSubject || !emailMessage}
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {sendingEmail ? (
                  <>
                    <IconRefresh className="size-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <IconSend className="size-4" /> Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// === SUBCOMPONENTS ===

function KPICard({
  label,
  value,
  icon: Icon,
  color,
  subtext
}: {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
  subtext?: string
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green:
      "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    purple:
      "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    cyan: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400"
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div
        className={`mb-2 inline-flex rounded-lg p-1.5 ${colors[color] || colors.blue}`}
      >
        <Icon className="size-4" />
      </div>
      <div className="text-xl font-bold text-gray-900 dark:text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      {subtext && (
        <div className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
          {subtext}
        </div>
      )}
    </div>
  )
}

function BarRow({
  label,
  count,
  total,
  color,
  subtext
}: {
  label: string
  count: number
  total: number
  color: string
  subtext?: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">
          {label}{" "}
          {subtext && <span className="text-gray-400">({subtext})</span>}
        </span>
        <span className="font-medium text-gray-900 dark:text-white">
          {count} <span className="text-gray-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
    </div>
  )
}

function UsageStat({
  icon: Icon,
  label,
  value,
  thisMonth
}: {
  icon: React.ElementType
  label: string
  value: number
  thisMonth?: number
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
      <div className="rounded-lg bg-gray-200/80 p-1.5 dark:bg-gray-600">
        <Icon className="size-4 text-gray-600 dark:text-gray-300" />
      </div>
      <div>
        <div className="text-sm font-bold text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </div>
        <div className="text-[10px] text-gray-500 dark:text-gray-400">
          {label}
          {thisMonth !== undefined && (
            <span className="ml-1 text-cyan-600 dark:text-cyan-400">
              (+{thisMonth})
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function RevenueRow({
  plan,
  count,
  price,
  color
}: {
  plan: string
  count: number
  price: number
  color: string
}) {
  const colors: Record<string, string> = {
    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    purple:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[color]}`}
        >
          {plan}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {count} users &times; ${price}/mo
        </span>
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">
        ${(count * price).toLocaleString()}/mo
      </span>
    </div>
  )
}

function PlanBadge({ plan, status }: { plan: string; status: string }) {
  const getStyles = () => {
    if (status === "trialing")
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
    if (status === "canceled" || status === "cancelled")
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    if (status === "past_due")
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    switch (plan) {
      case "business":
      case "business_monthly":
      case "business_annual":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      case "premium":
      case "premium_monthly":
      case "premium_annual":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      case "ai_employee":
      case "ai_employee_monthly":
      case "ai_employee_annual":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
    }
  }

  const getLabel = () => {
    if (status === "trialing") return `Trial (${plan.replace(/_/g, " ")})`
    if (status === "canceled" || status === "cancelled") return "Canceled"
    if (status === "past_due") return "Past Due"
    if (status === "none" || !plan || plan === "free") return "Free"
    return plan.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-tight ${getStyles()}`}
    >
      {getLabel()}
    </span>
  )
}

function HealthDot({ color }: { color: string }) {
  const colors: Record<string, string> = {
    green: "bg-green-400",
    yellow: "bg-yellow-400",
    orange: "bg-orange-400",
    red: "bg-red-400",
    gray: "bg-gray-300 dark:bg-gray-600"
  }

  return (
    <span
      className={`inline-block size-2 rounded-full ${colors[color] || colors.gray}`}
    />
  )
}

function SortButton({
  field,
  currentField,
  order,
  onClick,
  label
}: {
  field: SortField
  currentField: SortField
  order: SortOrder
  onClick: (f: SortField) => void
  label: string
}) {
  return (
    <button
      onClick={() => onClick(field)}
      className="flex items-center gap-0.5 hover:text-gray-700 dark:hover:text-gray-200"
    >
      {label}
      {currentField === field &&
        (order === "asc" ? (
          <IconChevronUp className="size-3" />
        ) : (
          <IconChevronDown className="size-3" />
        ))}
    </button>
  )
}

function Section({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {title}
      </h3>
      {children}
    </div>
  )
}

function InfoField({
  label,
  value,
  capitalize
}: {
  label: string
  value: React.ReactNode
  capitalize?: boolean
}) {
  return (
    <div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div
        className={`text-xs font-medium text-gray-900 dark:text-white ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2.5 text-center dark:bg-gray-700/50">
      <div className="text-lg font-bold text-gray-900 dark:text-white">
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400">
        {label}
      </div>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  color,
  onClick,
  loading
}: {
  icon: React.ElementType
  label: string
  color: string
  onClick: () => void
  loading?: boolean
}) {
  const colors: Record<string, string> = {
    cyan: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400 dark:hover:bg-cyan-900/40",
    purple:
      "bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40",
    amber:
      "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40",
    green:
      "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40",
    red: "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${colors[color] || colors.cyan}`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}
