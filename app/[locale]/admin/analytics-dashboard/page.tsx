"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  IconUsers,
  IconCreditCard,
  IconTrendingUp,
  IconReport,
  IconMessageCircle,
  IconArrowUp,
  IconArrowDown,
  IconCalendar
} from "@tabler/icons-react"
import { Line, Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface MetricsData {
  current: {
    totalRegisteredUsers: number
    totalPayingUsers: number
    totalTrialingUsers: number
    mrrDollars: number
    arrDollars: number
    totalReportsGenerated: number
    totalChatMessages: number
  }
  today: any
  trends: any[]
}

export default function AdminDashboard() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndFetch()
  }, [])

  const checkAuthAndFetch = async () => {
    const supabase = createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    // Check if admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()

    if (!profile?.is_admin) {
      router.push("/")
      return
    }

    fetchMetrics()
  }

  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/admin/metrics")
      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()
      setMetrics(data)
    } catch (err) {
      setError("Failed to load metrics")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    )
  }

  const current = metrics?.current
  const trends = metrics?.trends || []

  // Calculate changes (compare to 7 days ago)
  const sevenDaysAgo = trends[trends.length - 8]
  const latest = trends[trends.length - 1]

  const userChange = sevenDaysAgo
    ? (current?.totalRegisteredUsers || 0) -
      (sevenDaysAgo.total_registered_users || 0)
    : 0

  const mrrChange = sevenDaysAgo
    ? (current?.mrrDollars || 0) - (sevenDaysAgo.mrr_cents / 100 || 0)
    : 0

  // Chart data
  const userTrendData = {
    labels: trends.map(t =>
      new Date(t.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      })
    ),
    datasets: [
      {
        label: "Total Users",
        data: trends.map(t => t.total_registered_users),
        borderColor: "#24BDEB",
        backgroundColor: "rgba(36, 189, 235, 0.1)",
        fill: true,
        tension: 0.4
      },
      {
        label: "Paying Users",
        data: trends.map(t => t.total_paying_users),
        borderColor: "#4FEBBC",
        backgroundColor: "rgba(79, 235, 188, 0.1)",
        fill: true,
        tension: 0.4
      }
    ]
  }

  const revenueTrendData = {
    labels: trends.map(t =>
      new Date(t.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      })
    ),
    datasets: [
      {
        label: "MRR ($)",
        data: trends.map(t => t.mrr_cents / 100),
        borderColor: "#10B981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4
      }
    ]
  }

  const usageData = {
    labels: trends
      .slice(-7)
      .map(t =>
        new Date(t.date).toLocaleDateString("en-US", { weekday: "short" })
      ),
    datasets: [
      {
        label: "Reports Generated",
        data: trends.slice(-7).map(t => t.total_reports_generated),
        backgroundColor: "#24BDEB"
      },
      {
        label: "Chat Messages",
        data: trends.slice(-7).map(t => t.total_chat_messages),
        backgroundColor: "#4FEBBC"
      }
    ]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">
            Rooftops AI Analytics & Metrics
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Key Metrics Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Users */}
          <MetricCard
            title="Total Registered Users"
            value={current?.totalRegisteredUsers || 0}
            change={userChange}
            icon={IconUsers}
            color="blue"
          />

          {/* Paying Users */}
          <MetricCard
            title="Paying Users"
            value={current?.totalPayingUsers || 0}
            subtitle={`${current?.totalTrialingUsers || 0} trialing`}
            icon={IconCreditCard}
            color="green"
          />

          {/* MRR */}
          <MetricCard
            title="Monthly Recurring Revenue"
            value={`$${(current?.mrrDollars || 0).toLocaleString()}`}
            change={mrrChange}
            changePrefix="$"
            subtitle={`ARR: $${(current?.arrDollars || 0).toLocaleString()}`}
            icon={IconTrendingUp}
            color="emerald"
          />

          {/* Usage Stats */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconReport className="size-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-600">
                  Total Usage
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Reports Generated</span>
                <span className="font-semibold text-gray-900">
                  {(current?.totalReportsGenerated || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Chat Messages</span>
                <span className="font-semibold text-gray-900">
                  {(current?.totalChatMessages || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* User Growth Chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              User Growth (30 Days)
            </h3>
            <div className="h-64">
              <Line
                data={userTrendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Revenue Growth (30 Days)
            </h3>
            <div className="h-64">
              <Line
                data={revenueTrendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { callback: value => `$${value}` }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Usage (Last 7 Days)
          </h3>
          <div className="h-64">
            <Bar
              data={usageData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>

        {/* Daily Metrics Table */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Daily Metrics (Last 30 Days)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3 font-medium text-gray-500">
                    New Signups
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">
                    Paying
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">MRR</th>
                  <th className="px-6 py-3 font-medium text-gray-500">
                    Reports
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">Chats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...trends]
                  .reverse()
                  .slice(0, 10)
                  .map(day => (
                    <tr key={day.date}>
                      <td className="px-6 py-3 text-gray-900">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        +{day.new_signups}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {day.total_paying_users}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        ${(day.mrr_cents / 100).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {day.total_reports_generated.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {day.total_chat_messages.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

// Metric Card Component
function MetricCard({
  title,
  value,
  change,
  changePrefix = "",
  subtitle,
  icon: Icon,
  color
}: any) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    emerald: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600"
  }

  const isPositive = (change || 0) >= 0
  const ArrowIcon = isPositive ? IconArrowUp : IconArrowDown

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div
          className={`flex size-10 items-center justify-center rounded-lg ${colorClasses[color]}`}
        >
          <Icon className="size-5" />
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}
          >
            <ArrowIcon className="size-4" />
            {changePrefix}
            {Math.abs(change).toLocaleString()}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{title}</div>
      {subtitle && <div className="mt-1 text-xs text-gray-400">{subtitle}</div>}
    </div>
  )
}
