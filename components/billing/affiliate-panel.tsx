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
import { Separator } from "../ui/separator"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import {
  IconCopy,
  IconHeartHandshake,
  IconHourglass,
  IconLoader2
} from "@tabler/icons-react"

interface AffiliateDashboard {
  isAffiliate: true
  code: string
  displayName: string | null
  status: "active" | "disabled"
  commissionRate: number
  viewerBonusCredits: number
  shareUrl: string
  stats: {
    signups: number
    conversions: number
    commissionTotalUsd: number
    commissionPendingUsd: number
  }
}

interface NotYet {
  isAffiliate: false
  application: {
    status: "pending" | "approved" | "rejected"
    reviewNote: string | null
  } | null
}

type Resp = AffiliateDashboard | NotYet

const usd = (n: number) =>
  `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const num = (n: number) => (n || 0).toLocaleString("en-US")

/**
 * Creator-program panel. Shows the influencer dashboard once approved, and the
 * self-serve apply / pending / rejected states otherwise. Silent while loading.
 */
export const AffiliatePanel: FC = () => {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/affiliate/me")
      if (!res.ok) return
      setData((await res.json()) as Resp)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading || !data) return null

  if (data.isAffiliate) return <DashboardView data={data} />
  return <ApplyView data={data} onChange={load} />
}

// ---------------------------------------------------------------------------
// Approved creator dashboard
// ---------------------------------------------------------------------------
const DashboardView: FC<{ data: AffiliateDashboard }> = ({ data }) => {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.shareUrl)
      toast.success("Share link copied")
    } catch {
      toast.error("Couldn't copy - select and copy the link manually.")
    }
  }

  return (
    <Card className="border-line-strong border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <IconHeartHandshake size={18} className="text-primary" />
            Creator program
          </CardTitle>
          <Badge variant={data.status === "active" ? "success" : "secondary"}>
            {data.status === "active" ? "Active" : "Paused"}
          </Badge>
        </div>
        <CardDescription>
          Share your link. Your viewers get {num(data.viewerBonusCredits)} bonus
          credits when they subscribe, and you earn{" "}
          {Math.round(data.commissionRate * 100)}% commission on each
          subscription.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="text-ink-2 text-xs font-medium">Your share link</div>
          <div className="flex items-center gap-2">
            <code className="bg-paper-2 border-line text-ink-2 min-w-0 flex-1 truncate rounded-md border px-2.5 py-2 text-xs">
              {data.shareUrl}
            </code>
            <Button variant="outline" size="sm" onClick={copy}>
              <IconCopy size={15} className="mr-1" />
              Copy
            </Button>
          </div>
          <p className="text-muted text-xs">
            Code: <span className="font-mono">{data.code}</span>
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Sign-ups" value={num(data.stats.signups)} />
          <Stat label="Subscribed" value={num(data.stats.conversions)} />
          <Stat label="Earned" value={usd(data.stats.commissionTotalUsd)} />
          <Stat
            label="Owed to you"
            value={usd(data.stats.commissionPendingUsd)}
          />
        </div>
        <p className="text-muted text-xs">
          Commission is paid out manually - we’ll reach out about payment.
        </p>
      </CardContent>
    </Card>
  )
}

const Stat: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-paper-2 border-line rounded-md border p-2.5">
    <div className="text-ink text-lg font-semibold leading-tight">{value}</div>
    <div className="text-muted text-[11px]">{label}</div>
  </div>
)

// ---------------------------------------------------------------------------
// Apply / pending / rejected
// ---------------------------------------------------------------------------
const ApplyView: FC<{ data: NotYet; onChange: () => void }> = ({
  data,
  onChange
}) => {
  const status = data.application?.status

  // Pending review - no form.
  if (status === "pending") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <IconHourglass size={18} className="text-primary" />
            Creator application
          </CardTitle>
          <CardDescription>
            Your application is under review - we’ll be in touch by email.
            Thanks for your interest!
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Approved but the affiliate row isn't visible yet (rare race).
  if (status === "approved") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <IconHeartHandshake size={18} className="text-primary" />
            Creator program
          </CardTitle>
          <CardDescription>
            You’re approved! Your dashboard will appear here shortly - reload if
            it doesn’t.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // No application, or a previous one was rejected → show the form.
  return (
    <ApplyForm
      rejectedNote={status === "rejected" ? data.application?.reviewNote : null}
      onSubmitted={onChange}
    />
  )
}

const ApplyForm: FC<{
  rejectedNote?: string | null
  onSubmitted: () => void
}> = ({ rejectedNote, onSubmitted }) => {
  const [handle, setHandle] = useState("")
  const [platform, setPlatform] = useState("")
  const [audience, setAudience] = useState("")
  const [pitch, setPitch] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (handle.trim().length < 2) {
      toast.error("Please enter your creator name / handle.")
      return
    }
    try {
      setBusy(true)
      const res = await fetch("/api/affiliate/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, platform, audience, pitch })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error ?? "Could not submit your application.")
        return
      }
      toast.success("Application submitted - we’ll review it soon.")
      onSubmitted()
    } catch {
      toast.error("Could not submit your application.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <IconHeartHandshake size={18} className="text-primary" />
          Become a creator
        </CardTitle>
        <CardDescription>
          Share Shadow with your audience: they get bonus credits when they
          subscribe, and you earn commission on every subscription. Apply below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rejectedNote !== undefined && (
          <p className="bg-rust-soft text-rust-ink border-rust-soft rounded-md border p-2.5 text-xs">
            Your previous application wasn’t approved
            {rejectedNote ? `: ${rejectedNote}` : "."} You’re welcome to apply
            again.
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="aff-handle" className="text-xs font-medium">
            Creator name / handle *
          </Label>
          <Input
            id="aff-handle"
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="@yourhandle"
            maxLength={80}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="aff-platform" className="text-xs font-medium">
            Main platform
          </Label>
          <Input
            id="aff-platform"
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            placeholder="YouTube, TikTok, X, newsletter…"
            maxLength={80}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="aff-audience" className="text-xs font-medium">
            Audience size
          </Label>
          <Input
            id="aff-audience"
            value={audience}
            onChange={e => setAudience(e.target.value)}
            placeholder="e.g. 25k subscribers"
            maxLength={120}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="aff-pitch" className="text-xs font-medium">
            Links & why you’re a fit
          </Label>
          <Textarea
            id="aff-pitch"
            value={pitch}
            onChange={e => setPitch(e.target.value)}
            placeholder="Links to your channel(s) and a sentence on your audience."
            maxLength={1000}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          disabled={busy}
          onClick={submit}
        >
          {busy ? (
            <IconLoader2 className="mr-1 animate-spin" size={15} />
          ) : null}
          Apply to the creator program
        </Button>
      </CardContent>
    </Card>
  )
}
