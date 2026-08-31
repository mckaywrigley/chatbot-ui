"use client"

/**
 * Internal ops dashboard - signups, plan mix, and referral/affiliate
 * attribution. Gated by the same ADMIN_API_SECRET bearer used by the
 * /api/admin/* mint/comp endpoints (no separate secret to manage). The
 * secret lives in sessionStorage only (cleared when the tab closes) and is
 * sent as an Authorization header on every dashboard fetch - never in the
 * URL or a persistent cookie.
 */

import { FC, useEffect, useState } from "react"
import {
  IconAlertTriangle,
  IconLoader2,
  IconLock,
  IconRefresh,
  IconShieldLock
} from "@tabler/icons-react"

const STORAGE_KEY = "shadow_admin_secret"

interface DashboardUser {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
  confirmed: boolean
  plan: string
  subscription_status: string | null
  is_comp: boolean
  tokens_used_period: number
  custom_credit_tokens: number
}

interface DashboardData {
  totalUsers: number
  activeThisWeek: number
  paidUsers: number
  convertedReferrals: number
  signupsByDay: Array<{ day: string; n: number }>
  planBreakdown: Array<{ plan: string; n: number }>
  users: DashboardUser[]
  affiliates: Array<{
    user_id: string
    code: string
    display_name: string | null
    commission_rate: number
    viewer_bonus_tokens: number
    status: string
    created_at: string
  }>
  referrals: Array<{
    id: string
    affiliate_code: string | null
    affiliate_name: string | null
    status: string
    plan: string | null
    commission_cents: number
    bonus_granted: boolean
    payout_status: string
    created_at: string
    converted_at: string | null
  }>
  referralSummary: Array<{
    status: string
    n: number
    commission_cents: number
  }>
}

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    : "-"

const fmtNum = (n: number) => n.toLocaleString("en-US")

const PasswordGate: FC<{
  onUnlock: (secret: string) => void
  error: string | null
  loading: boolean
}> = ({ onUnlock, error, loading }) => {
  const [value, setValue] = useState("")
  return (
    <div className="bg-paper flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={e => {
          e.preventDefault()
          if (value.trim()) onUnlock(value.trim())
        }}
        className="border-ink-200 w-full max-w-sm rounded-2xl border bg-white p-7 shadow-sm"
      >
        <div className="bg-ink-50 text-ink-700 mb-4 flex size-10 items-center justify-center rounded-full">
          <IconShieldLock size={19} />
        </div>
        <h1 className="text-ink-900 text-lg font-semibold">Admin access</h1>
        <p className="text-ink-500 mt-1 text-[13px] leading-relaxed">
          Internal dashboard. Enter the admin key to continue.
        </p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Admin key"
          className="border-ink-200 focus:border-teal-journey mt-4 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
        />
        {error && (
          <p className="text-rust mt-2 flex items-center gap-1.5 text-[12.5px]">
            <IconAlertTriangle size={14} /> {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="bg-brick hover:bg-brick-hover mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
        >
          {loading ? (
            <IconLoader2 size={15} className="animate-spin" />
          ) : (
            <IconLock size={15} />
          )}
          {loading ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  )
}

const StatCard: FC<{ label: string; value: string; sub?: string }> = ({
  label,
  value,
  sub
}) => (
  <div className="border-ink-200 rounded-xl border bg-white p-4">
    <div className="text-ink-400 text-[11px] font-semibold uppercase tracking-wider">
      {label}
    </div>
    <div className="text-ink-900 mt-1 font-mono text-2xl tabular-nums">
      {value}
    </div>
    {sub && <div className="text-ink-500 mt-0.5 text-[12px]">{sub}</div>}
  </div>
)

const Pill: FC<{
  tone: "teal" | "neutral" | "rust"
  children: React.ReactNode
}> = ({ tone, children }) => (
  <span
    className={
      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold " +
      (tone === "teal"
        ? "bg-teal-journey-tint text-teal-journey"
        : tone === "rust"
          ? "bg-rust-soft text-rust"
          : "bg-ink-50 text-ink-500")
    }
  >
    {children}
  </span>
)

const Dashboard: FC<{
  data: DashboardData
  onRefresh: () => void
  refreshing: boolean
}> = ({ data, onRefresh, refreshing }) => {
  const maxDay = Math.max(1, ...data.signupsByDay.map(d => d.n))
  return (
    <div className="bg-paper min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-teal-journey text-[11px] font-bold uppercase tracking-[0.13em]">
              Internal · Growth
            </div>
            <h1 className="text-ink-900 mt-1 text-2xl font-bold">
              Signup &amp; Growth Dashboard
            </h1>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="border-ink-200 text-ink-700 hover:bg-ink-50 flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-[13px] font-medium disabled:opacity-50"
          >
            <IconRefresh
              size={14}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total signups" value={fmtNum(data.totalUsers)} />
          <StatCard
            label="On a paid plan"
            value={fmtNum(data.paidUsers)}
            sub={`of ${data.totalUsers} total`}
          />
          <StatCard
            label="Converted referrals"
            value={fmtNum(data.convertedReferrals)}
            sub={`${data.affiliates.length} affiliates`}
          />
          <StatCard
            label="Active this week"
            value={fmtNum(data.activeThisWeek)}
          />
        </div>

        <section className="mb-8">
          <h2 className="text-ink-900 mb-1 text-[15px] font-semibold">
            Signups over time
          </h2>
          <p className="text-ink-500 mb-3 text-[12.5px]">
            One bar per day with at least one signup.
          </p>
          {data.signupsByDay.length === 0 ? (
            <div className="border-ink-200 text-ink-400 rounded-xl border border-dashed bg-white p-6 text-center text-sm">
              No signups yet.
            </div>
          ) : (
            <div className="border-ink-200 flex h-36 items-end gap-3 overflow-x-auto rounded-xl border bg-white p-5">
              {data.signupsByDay.map(d => (
                <div
                  key={d.day}
                  className="flex h-full min-w-[28px] flex-col items-center justify-end gap-1.5"
                >
                  <div className="text-ink-900 text-[12px] font-semibold">
                    {d.n}
                  </div>
                  <div
                    className="bg-teal-journey w-[22px] rounded-t"
                    style={{ height: `${(d.n / maxDay) * 100}%`, minHeight: 4 }}
                  />
                  <div className="text-ink-400 whitespace-nowrap text-[10px]">
                    {fmtDate(d.day)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-ink-900 mb-1 text-[15px] font-semibold">
            All signups
          </h2>
          <p className="text-ink-500 mb-3 text-[12.5px]">
            {data.users.length} users, newest first.
          </p>
          <div className="border-ink-200 overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[720px] text-[12.5px]">
              <thead>
                <tr className="border-ink-200 bg-ink-50 border-b text-left">
                  <th className="text-ink-400 px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-ink-400 px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide">
                    Signed up
                  </th>
                  <th className="text-ink-400 px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide">
                    Last active
                  </th>
                  <th className="text-ink-400 px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-ink-400 px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide">
                    Plan
                  </th>
                  <th className="text-ink-400 px-3.5 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-wide">
                    Tokens used
                  </th>
                  <th className="text-ink-400 px-3.5 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-wide">
                    Bonus credits
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.users.map(u => (
                  <tr
                    key={u.id}
                    className="border-ink-200 border-b last:border-0"
                  >
                    <td className="text-ink-900 px-3.5 py-2.5 font-medium">
                      {u.email ?? "-"}
                    </td>
                    <td className="text-ink-700 px-3.5 py-2.5 font-mono tabular-nums">
                      {fmtDate(u.created_at)}
                    </td>
                    <td className="text-ink-700 px-3.5 py-2.5 font-mono tabular-nums">
                      {fmtDate(u.last_sign_in_at)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Pill tone={u.confirmed ? "teal" : "rust"}>
                        {u.confirmed ? "Confirmed" : "Unconfirmed"}
                      </Pill>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Pill tone={u.plan === "free" ? "neutral" : "teal"}>
                        {u.is_comp ? `${u.plan} (comp)` : u.plan}
                      </Pill>
                    </td>
                    <td className="text-ink-700 px-3.5 py-2.5 text-right font-mono tabular-nums">
                      {fmtNum(u.tokens_used_period)}
                    </td>
                    <td className="text-ink-700 px-3.5 py-2.5 text-right font-mono tabular-nums">
                      {fmtNum(u.custom_credit_tokens)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-ink-900 mb-1 text-[15px] font-semibold">
            Referrals &amp; affiliates
          </h2>
          <p className="text-ink-500 mb-3 text-[12.5px]">
            {data.affiliates.length} affiliate
            {data.affiliates.length === 1 ? "" : "s"} minted ·{" "}
            {data.referrals.length} referral
            {data.referrals.length === 1 ? "" : "s"} attributed.
          </p>
          {data.referrals.length === 0 ? (
            <div className="border-ink-200 text-ink-400 rounded-xl border border-dashed bg-white p-6 text-center text-sm">
              No referrals yet.
            </div>
          ) : (
            <div className="border-ink-200 overflow-x-auto rounded-xl border bg-white">
              <table className="w-full min-w-[640px] text-[12.5px]">
                <thead>
                  <tr className="border-ink-200 bg-ink-50 border-b text-left">
                    <th className="text-ink-400 px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide">
                      Code
                    </th>
                    <th className="text-ink-400 px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-ink-400 px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide">
                      Plan
                    </th>
                    <th className="text-ink-400 px-3.5 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-wide">
                      Commission
                    </th>
                    <th className="text-ink-400 px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide">
                      Payout
                    </th>
                    <th className="text-ink-400 px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide">
                      Referred
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrals.map(r => (
                    <tr
                      key={r.id}
                      className="border-ink-200 border-b last:border-0"
                    >
                      <td className="text-ink-900 px-3.5 py-2.5 font-mono font-medium">
                        {r.affiliate_code ?? "-"}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <Pill
                          tone={
                            r.status === "converted"
                              ? "teal"
                              : r.status === "reversed"
                                ? "rust"
                                : "neutral"
                          }
                        >
                          {r.status}
                        </Pill>
                      </td>
                      <td className="text-ink-700 px-3.5 py-2.5">
                        {r.plan ?? "-"}
                      </td>
                      <td className="text-ink-700 px-3.5 py-2.5 text-right font-mono tabular-nums">
                        {(r.commission_cents / 100).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD"
                        })}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <Pill
                          tone={r.payout_status === "paid" ? "teal" : "neutral"}
                        >
                          {r.payout_status}
                        </Pill>
                      </td>
                      <td className="text-ink-700 px-3.5 py-2.5 font-mono tabular-nums">
                        {fmtDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [secret, setSecret] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    setSecret(stored)
    setHydrated(true)
  }, [])

  const load = async (key: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store"
      })
      if (res.status === 401) {
        sessionStorage.removeItem(STORAGE_KEY)
        setSecret(null)
        setError("Incorrect admin key.")
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? "Couldn't load the dashboard.")
        return
      }
      const json = (await res.json()) as DashboardData
      sessionStorage.setItem(STORAGE_KEY, key)
      setData(json)
    } catch {
      setError("Couldn't reach the server. Try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hydrated && secret) void load(secret)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  if (!hydrated) return null

  if (!secret || !data) {
    return (
      <PasswordGate
        onUnlock={key => {
          setSecret(key)
          void load(key)
        }}
        error={error}
        loading={loading}
      />
    )
  }

  return (
    <Dashboard
      data={data}
      onRefresh={() => void load(secret)}
      refreshing={loading}
    />
  )
}
