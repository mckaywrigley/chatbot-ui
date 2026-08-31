import { FC, useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../ui/card"
import { Badge } from "../ui/badge"
import { Progress } from "../ui/progress"
import { Separator } from "../ui/separator"
import { IconCheck, IconLoader2, IconSparkles } from "@tabler/icons-react"

interface PlanInfo {
  id: "free" | "pro" | "max"
  name: string
  priceUsd: number
  monthlyTokens: number
  tagline: string
  features: string[]
}

interface UsageSummary {
  plan: "free" | "pro" | "max"
  planName: string
  priceUsd: number
  status: string
  periodEnd: string
  limitCredits: number
  usedCredits: number
  remainingCredits: number
  customCredits: number
  percentUsed: number
  breakdown: { feature: string; tokens: number; credits: number }[]
  experimentsUsed: number
  experimentLimit: number
  experimentsLeft: number
}

interface RevenueCatConfig {
  configured: boolean
  publicApiKey: string | null
  proPackageId: string | null
  maxPackageId: string | null
  creditsPackageId: string | null
  customerPortalUrl: string | null
}

interface UsageResponse {
  appUserId: string
  summary: UsageSummary
  plans: PlanInfo[]
  revenueCat: RevenueCatConfig
}

const FEATURE_LABELS: Record<string, string> = {
  design: "Experiment design",
  lit_search: "Literature search",
  chat: "Knowledge chat",
  report: "Reports",
  data_collection: "Data collection",
  embeddings: "Document indexing",
  title: "Chat titles",
  tools: "Tools",
  jarvis: "Assistant",
  other: "Other"
}

const fmt = (n: number) => (n || 0).toLocaleString("en-US")

export const UsageBillingPanel: FC = () => {
  const [data, setData] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/usage")
      if (!res.ok) throw new Error("Failed to load usage")
      setData((await res.json()) as UsageResponse)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't load your usage. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const packageIdFor = (planId: string, rc: RevenueCatConfig) =>
    planId === "pro"
      ? rc.proPackageId
      : planId === "max"
        ? rc.maxPackageId
        : null

  const startCheckout = async (packageId: string | null, label: string) => {
    if (!data) return
    const rc = data.revenueCat
    if (!rc.configured || !rc.publicApiKey || !packageId) {
      toast.error("Billing isn't configured yet. Please check back soon.")
      return
    }
    try {
      setBusy(label)
      const { startRevenueCatCheckout } = await import(
        "@/lib/billing/revenuecat-client"
      )
      await startRevenueCatCheckout({
        publicApiKey: rc.publicApiKey,
        appUserId: data.appUserId,
        packageId
      })
      toast.success("Purchase complete - updating your plan…")
      // The webhook syncs the entitlement; give it a beat, then refetch.
      setTimeout(load, 2500)
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Checkout could not be completed."
      toast.error(msg)
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="text-muted flex items-center justify-center py-10">
        <IconLoader2 className="mr-2 animate-spin" size={18} /> Loading usage…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-muted py-10 text-center text-sm">
        Couldn’t load billing details.
        <Button
          variant="outline"
          size="sm"
          className="ml-2"
          onClick={() => {
            setLoading(true)
            load()
          }}
        >
          Retry
        </Button>
      </div>
    )
  }

  const { summary, plans, revenueCat } = data
  const overLimitButHasCredits =
    summary.percentUsed >= 100 && summary.customCredits > 0

  return (
    <div className="space-y-5">
      {/* Current usage */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Usage this period</CardTitle>
            <Badge
              variant={summary.status === "active" ? "success" : "secondary"}
            >
              {summary.planName}
            </Badge>
          </div>
          <CardDescription>
            Resets {new Date(summary.periodEnd).toLocaleDateString()}
            {summary.status !== "active" ? ` · ${summary.status}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink-2">
              {fmt(summary.usedCredits)} / {fmt(summary.limitCredits)} credits
            </span>
            <span className="text-muted">
              {fmt(summary.remainingCredits)} left
            </span>
          </div>
          <Progress value={summary.percentUsed} />
          {summary.plan === "free" && (
            <div className="border-line bg-paper-2 flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs">
              <span className="text-ink-2">Free experiments</span>
              <span
                className={
                  summary.experimentsLeft <= 0
                    ? "text-rust font-medium"
                    : "text-muted"
                }
              >
                {fmt(summary.experimentsUsed)} / {fmt(summary.experimentLimit)}{" "}
                used · {fmt(summary.experimentsLeft)} left
              </span>
            </div>
          )}
          {summary.customCredits > 0 && (
            <div className="text-muted flex items-center gap-1 text-xs">
              <IconSparkles size={13} />+{fmt(summary.customCredits)} top-up
              credits {overLimitButHasCredits ? "(in use)" : "(reserve)"}
            </div>
          )}

          {summary.breakdown.length > 0 && (
            <>
              <Separator className="my-1" />
              <div className="space-y-1.5">
                {summary.breakdown.map(b => (
                  <div
                    key={b.feature}
                    className="text-ink-2 flex items-center justify-between text-xs"
                  >
                    <span>{FEATURE_LABELS[b.feature] ?? b.feature}</span>
                    <span className="text-muted">{fmt(b.credits)} cr</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="space-y-1">
        <div className="text-ink text-sm font-medium">Plans</div>
        <p className="text-muted text-xs">
          1 credit ≈ 1,000 AI tokens. Credits cover every AI action - design,
          literature search, and chat.
        </p>
      </div>

      <div className="grid gap-3">
        {plans.map(plan => {
          const isCurrent = plan.id === summary.plan
          const isUpgrade = plan.priceUsd > summary.priceUsd
          const pkgId = packageIdFor(plan.id, revenueCat)
          return (
            <Card
              key={plan.id}
              className={isCurrent ? "border-line-strong border-2" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {plan.name}
                    {isCurrent && (
                      <Badge variant="solid" className="text-[10px]">
                        Current
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="text-ink text-sm font-semibold">
                    {plan.priceUsd === 0 ? "Free" : `$${plan.priceUsd}/mo`}
                  </div>
                </div>
                <CardDescription>{plan.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1">
                  {plan.features.map(f => (
                    <li
                      key={f}
                      className="text-ink-2 flex items-start gap-2 text-xs"
                    >
                      <IconCheck
                        size={14}
                        className="text-primary mt-0.5 shrink-0"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && isUpgrade && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    disabled={
                      busy === plan.id || !revenueCat.configured || !pkgId
                    }
                    onClick={() => startCheckout(pkgId, plan.id)}
                  >
                    {busy === plan.id ? (
                      <IconLoader2 className="mr-1 animate-spin" size={15} />
                    ) : null}
                    {revenueCat.configured && pkgId
                      ? `Upgrade to ${plan.name}`
                      : "Coming soon"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add credits + manage */}
      <div className="flex flex-wrap gap-2">
        {revenueCat.creditsPackageId && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy === "credits" || !revenueCat.configured}
            onClick={() =>
              startCheckout(revenueCat.creditsPackageId, "credits")
            }
          >
            {busy === "credits" ? (
              <IconLoader2 className="mr-1 animate-spin" size={15} />
            ) : (
              <IconSparkles className="mr-1" size={15} />
            )}
            Add credits
          </Button>
        )}
        {revenueCat.customerPortalUrl && summary.plan !== "free" && (
          <Button variant="ghost" size="sm" asChild>
            <a
              href={revenueCat.customerPortalUrl}
              target="_blank"
              rel="noreferrer"
            >
              Manage subscription
            </a>
          </Button>
        )}
      </div>

      {!revenueCat.configured && (
        <p className="text-muted text-xs">
          Paid plans aren’t enabled in this environment yet. You can keep using
          everything on the Free plan.
        </p>
      )}
    </div>
  )
}
