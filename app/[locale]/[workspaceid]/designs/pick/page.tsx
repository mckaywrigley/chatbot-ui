"use client"

import {
  IconArrowRight,
  IconChartBar,
  IconCheck,
  IconClipboardText,
  IconFlask
} from "@tabler/icons-react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useContext, useEffect, useMemo, useState } from "react"

import { PageTopBar } from "@/components/shell/page-top-bar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Chip } from "@/components/ui/chip"
import { Eyebrow } from "@/components/ui/typography"
import { ChatbotUIContext } from "@/context/context"
import type { DesignContentV2, PhaseKey } from "@/lib/design-agent"
import { PHASE_ORDER } from "@/lib/design-agent"
import { formatCreatedModified } from "@/lib/format-date"
import { cn } from "@/lib/utils"

type PickerMode = "check-stats" | "make-plan"

const MODE_META: Record<
  PickerMode,
  {
    eyebrow: string
    title: string
    desc: string
    cta: string
    icon: typeof IconChartBar
    autoParam: string
  }
> = {
  "check-stats": {
    eyebrow: "Statistical review",
    title: "Pick a design to review",
    desc: "Shadow AI will re-run only the statistical-analysis section on the design you pick - everything else stays put.",
    cta: "Check statistics",
    icon: IconChartBar,
    autoParam: "stats-review"
  },
  "make-plan": {
    eyebrow: "Execution plan",
    title: "Pick a design to plan for",
    desc: "Shadow AI will generate a dated, role-assigned execution plan and drop it in as a new section on the design.",
    cta: "Make a plan",
    icon: IconClipboardText,
    autoParam: "make-plan"
  }
}

function isPickerMode(v: string | null): v is PickerMode {
  return v === "check-stats" || v === "make-plan"
}

// Relative-time helper retired in favour of `formatCreatedModified` from
// `lib/format-date.ts` - scientists asked for explicit "Created mm/dd/yy"
// rows over fuzzy "3 days ago" strings (issue #4).

/**
 * Design picker for actions that need an existing design. Reads `?mode=` to
 * decide which action the user is on their way to (check-stats / make-plan)
 * and appends `?auto=…` when navigating to the design detail so the target
 * page auto-runs the action once on mount.
 */
export default function DesignPickerPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawMode = searchParams.get("mode")
  const mode: PickerMode = isPickerMode(rawMode) ? rawMode : "check-stats"

  const { designs, selectedWorkspace } = useContext(ChatbotUIContext)
  const wsId = (params.workspaceid as string) ?? selectedWorkspace?.id
  const locale = (params.locale as string) ?? "en"
  const meta = MODE_META[mode]
  const Icon = meta.icon

  const sorted = useMemo(
    () =>
      [...designs].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      ),
    [designs]
  )

  // Phase-status per design: {approvedPhases, designCount, hasStats, hasPlan}.
  // We fetch content for at most the first 20 designs in parallel to keep
  // the initial render cheap; the rest render without chips until the user
  // scrolls / interacts. Good enough for the typical lab's library size.
  interface DesignStatus {
    approvedPhases: PhaseKey[]
    designCount: number
    hasStats: boolean
    hasPlan: boolean
  }
  const [statusById, setStatusById] = useState<Record<string, DesignStatus>>({})

  useEffect(() => {
    const firstBatch = sorted.slice(0, 20)
    if (firstBatch.length === 0) return
    let cancelled = false

    void Promise.all(
      firstBatch.map(async d => {
        if (statusById[d.id]) return null
        try {
          const res = await fetch(`/api/design/${d.id}`)
          if (!res.ok) return null
          const data = await res.json()
          const parsed: DesignContentV2 =
            typeof data.content === "string"
              ? JSON.parse(data.content || "{}")
              : (data.content ?? {})
          const sections = (parsed.designs ?? []).flatMap(g => g.sections ?? [])
          const headings = new Set(sections.map(s => s.heading))
          return [
            d.id,
            {
              approvedPhases: parsed.approvedPhases ?? [],
              designCount: (parsed.designs ?? []).length,
              hasStats: headings.has("Statistical Analysis"),
              hasPlan: headings.has("Execution Plan")
            }
          ] as const
        } catch {
          return null
        }
      })
    ).then(entries => {
      if (cancelled) return
      const next: Record<string, DesignStatus> = {}
      for (const e of entries) {
        if (e) next[e[0]] = e[1]
      }
      if (Object.keys(next).length) {
        setStatusById(prev => ({ ...prev, ...next }))
      }
    })

    return () => {
      cancelled = true
    }
    // Deliberately depend only on the sorted id list so the fetch doesn't
    // refire on unrelated designs context changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted.map(d => d.id).join(",")])

  // Action-specific readiness: check-stats works once a design is generated;
  // make-plan same. We show a muted chip if the design is still early.
  const isReady = (s?: DesignStatus) => {
    if (!s) return undefined // unknown yet
    return s.designCount > 0
  }

  const handlePick = (designId: string) => {
    if (!wsId) return
    router.push(`/${locale}/${wsId}/designs/${designId}?auto=${meta.autoParam}`)
  }

  return (
    <div className="bg-paper flex h-full flex-col">
      <PageTopBar
        title={meta.title}
        subtitle={meta.eyebrow}
        onBack={() => router.push(`/${locale}/${wsId}`)}
      />

      <div className="flex-1 overflow-auto px-10 pb-16 pt-6">
        <div className="mx-auto max-w-[960px]">
          <Card className="mb-6 grid grid-cols-[auto_1fr] items-center gap-4 p-5">
            <div className="bg-rust-soft text-rust flex size-11 items-center justify-center rounded-xl">
              <Icon size={22} />
            </div>
            <div>
              <Eyebrow className="mb-1">How this works</Eyebrow>
              <p className="text-ink-2 text-[14px] leading-relaxed">
                {meta.desc}
              </p>
            </div>
          </Card>

          {sorted.length === 0 ? (
            <Card className="p-10 text-center">
              <IconFlask size={28} className="text-ink-3 mx-auto mb-3" />
              <div className="text-ink mb-1 text-[14px] font-semibold">
                No designs yet
              </div>
              <div className="text-ink-3 mb-5 text-[13px]">
                Create a design first - then come back to run {meta.cta}.
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  wsId && router.push(`/${locale}/${wsId}/designs/new`)
                }
              >
                Create a design
              </Button>
            </Card>
          ) : (
            <div className="flex flex-col gap-2.5">
              {sorted.map(d => {
                const s = statusById[d.id]
                const ready = isReady(s)
                const phases = s?.approvedPhases ?? []
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handlePick(d.id)}
                    className={cn(
                      "border-line bg-surface hover:border-line-strong hover:bg-paper group grid grid-cols-[1fr_auto_auto] items-center gap-5 rounded-lg border px-5 py-4 text-left transition-colors"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <Chip
                          variant="default"
                          className="h-[20px] text-[11px]"
                        >
                          Design
                        </Chip>
                        {/* Phase pips show how far through the 4-stage pipeline
                            each design is. Pipped filled = approved. */}
                        <span className="flex items-center gap-1">
                          {PHASE_ORDER.filter(p => p !== "simulation").map(
                            p => {
                              const done = phases.includes(p)
                              return (
                                <span
                                  key={p}
                                  title={`${p} ${done ? "approved" : "pending"}`}
                                  className={cn(
                                    "size-1.5 rounded-full",
                                    done ? "bg-ink" : "bg-paper-3"
                                  )}
                                />
                              )
                            }
                          )}
                        </span>
                        {s?.designCount ? (
                          <Chip
                            variant="success"
                            className="h-[20px] gap-1 px-2 text-[10.5px]"
                          >
                            <IconCheck size={10} stroke={3} />
                            {s.designCount} design
                            {s.designCount === 1 ? "" : "s"}
                          </Chip>
                        ) : null}
                        {mode === "check-stats" && s?.hasStats && (
                          <Chip
                            variant="accent"
                            className="h-[20px] px-2 text-[10.5px]"
                          >
                            has stats
                          </Chip>
                        )}
                        {mode === "make-plan" && s?.hasPlan && (
                          <Chip
                            variant="accent"
                            className="h-[20px] px-2 text-[10.5px]"
                          >
                            has plan
                          </Chip>
                        )}
                        {ready === false && (
                          <span className="text-ink-3 text-[11.5px]">
                            · generate a design first
                          </span>
                        )}
                      </div>
                      <div className="text-ink truncate text-[15px] font-semibold">
                        {d.name}
                      </div>
                      {d.description && (
                        <div className="text-ink-3 mt-1 line-clamp-1 text-[12.5px]">
                          {d.description}
                        </div>
                      )}
                    </div>
                    <div className="text-ink-3 min-w-[140px] text-right font-mono text-[11.5px]">
                      {formatCreatedModified(d.created_at, d.updated_at)}
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1 text-[13px] font-medium",
                        ready === false
                          ? "text-ink-3"
                          : "text-ink-2 group-hover:text-rust"
                      )}
                    >
                      {ready === false ? "Open anyway" : meta.cta}
                      <IconArrowRight size={14} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
