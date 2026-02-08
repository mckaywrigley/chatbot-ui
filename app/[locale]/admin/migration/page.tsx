"use client"

import { useState, useEffect } from "react"
import {
  IconUsers,
  IconMail,
  IconLogin,
  IconCheck,
  IconTrendingUp,
  IconAlertCircle
} from "@tabler/icons-react"

interface MigrationStats {
  total: number
  notMigrated: number
  invited: number
  loggedIn: number
  active: number
  migrated: number
  choseLegacy: number
}

export default function MigrationDashboard() {
  const [stats, setStats] = useState<MigrationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    // In production, this would fetch from your API
    // For now, showing placeholder structure
    setStats({
      total: 25,
      notMigrated: 0,
      invited: 15,
      loggedIn: 5,
      active: 3,
      migrated: 2,
      choseLegacy: 0
    })
    setLoading(false)
  }

  const sendBatchEmails = async (template: string) => {
    setSending(true)
    // API call to send emails
    setSending(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-gray-300 border-t-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          Legacy Migration Dashboard
        </h1>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={IconUsers}
            label="Total Legacy Users"
            value={stats?.total || 0}
            color="blue"
          />
          <StatCard
            icon={IconMail}
            label="Invited"
            value={stats?.invited || 0}
            color="yellow"
          />
          <StatCard
            icon={IconLogin}
            label="Logged In"
            value={stats?.loggedIn || 0}
            color="purple"
          />
          <StatCard
            icon={IconCheck}
            label="Migrated"
            value={stats?.migrated || 0}
            color="green"
          />
        </div>

        {/* Progress Bar */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Migration Progress
          </h2>
          <div className="h-4 w-full rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all"
              style={{
                width: `${((stats?.migrated || 0) / (stats?.total || 1)) * 100}%`
              }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {stats?.migrated} of {stats?.total} users migrated (
            {Math.round(((stats?.migrated || 0) / (stats?.total || 1)) * 100)}%)
          </p>
        </div>

        {/* Email Campaign Actions */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Email Campaigns
          </h2>

          <div className="space-y-3">
            <CampaignRow
              week="Week 1"
              title="🚀 Your Account is Upgraded"
              description="Announcement + free months offer"
              sent={15}
              total={25}
              onSend={() => sendBatchEmails("week1")}
              sending={sending}
            />
            <CampaignRow
              week="Week 2"
              title="Have you tried it yet?"
              description="Reminder + social proof"
              sent={0}
              total={10}
              onSend={() => sendBatchEmails("week2")}
              sending={sending}
            />
            <CampaignRow
              week="Week 3"
              title="[Last call] 72% switched"
              description="Urgency + stats"
              sent={0}
              total={10}
              onSend={() => sendBatchEmails("week3")}
              sending={sending}
            />
            <CampaignRow
              week="Week 4"
              title="Which should we keep?"
              description="Final decision request"
              sent={0}
              total={10}
              onSend={() => sendBatchEmails("week4")}
              sending={sending}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-6">
          <div className="flex items-center gap-3">
            <IconAlertCircle className="size-6 text-amber-600" />
            <div>
              <h3 className="font-bold text-amber-900">Next Steps</h3>
              <p className="text-sm text-amber-800">
                1. Export user emails from legacy database
                <br />
                2. Import to this dashboard
                <br />
                3. Send Week 1 campaign
                <br />
                4. Monitor logins daily
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: React.ElementType
  label: string
  value: number
  color: "blue" | "yellow" | "purple" | "green"
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    yellow: "bg-yellow-100 text-yellow-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600"
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${colors[color]}`}>
        <Icon className="size-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  )
}

function CampaignRow({
  week,
  title,
  description,
  sent,
  total,
  onSend,
  sending
}: {
  week: string
  title: string
  description: string
  sent: number
  total: number
  onSend: () => void
  sending: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
            {week}
          </span>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
        <p className="mt-1 text-xs text-gray-400">
          {sent} of {total} sent
        </p>
      </div>
      <button
        onClick={onSend}
        disabled={sending || sent === total}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {sending ? "Sending..." : sent === total ? "Sent" : "Send"}
      </button>
    </div>
  )
}
