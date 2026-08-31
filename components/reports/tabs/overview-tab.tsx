"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  IconChartHistogram,
  IconArrowRight,
  IconExternalLink,
  IconFileText,
  IconFlask,
  IconInfoCircle,
  IconUpload
} from "@tabler/icons-react"
import { FC, ReactNode } from "react"

export type ReportTab = "overview" | "inputs" | "report"

interface OverviewTabProps {
  /** Opens the full-size, labelled chart modal. */
  onOpenVisualization?: () => void
  report: any
  fileCount: number
  generationStatus: "idle" | "generating" | "ready" | "error"
  generationError: string | null
  onGoToTab: (tab: ReportTab) => void
  /** Parent design this report was generated from (when applicable). */
  sourceDesignName?: string | null
  onOpenDesign?: () => void
}

const STATUS_COPY: Record<
  OverviewTabProps["generationStatus"],
  { label: string; tone: string }
> = {
  idle: {
    label: "Not started - fill inputs to generate",
    tone: "bg-ink-50 text-ink-600 border-ink-200"
  },
  generating: {
    label: "Generating…",
    tone: "bg-amber-50 text-amber-700 border-amber-200"
  },
  ready: {
    label: "Ready",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  error: {
    label: "Generation failed",
    tone: "bg-red-50 text-red-700 border-red-200"
  }
}

/**
 * Markdown → a short, COMPLETE summary for a poster box.
 *
 * This used to hand back 420 characters cut wherever they happened to land,
 * so every box ended mid-sentence on an ellipsis and the one-pager read as a
 * wall of half-thoughts. It now flattens to prose and keeps whole sentences up
 * to a budget the box can actually hold - the full text is one click away in
 * the report tab, so the summary's job is to be readable, not complete.
 */
const SUMMARY_CHARS = 210

const toPlain = (s: unknown, limit = SUMMARY_CHARS): string => {
  if (typeof s !== "string") return ""
  const flat = s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\|.*\|/g, " ") // drop table rows - too dense for a poster box
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[#>*_`]/g, "")
    // Bullets become sentences so the box holds prose, not a stub list.
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
  if (!flat) return ""
  if (flat.length <= limit) return flat

  // Keep whole sentences while they fit; never end mid-word.
  const sentences = flat.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [flat]
  let out = ""
  for (const raw of sentences) {
    const sentence = raw.trim()
    if (!sentence) continue
    const next = out ? `${out} ${sentence}` : sentence
    if (next.length > limit) break
    out = next
  }
  if (out) return out

  // A single sentence longer than the whole budget - cut on a word boundary.
  return flat.slice(0, limit).replace(/\s+\S*$/, "") + "…"
}

const firstNonEmpty = (draft: any, keys: string[]): string => {
  for (const k of keys) {
    const v = toPlain(draft?.[k])
    if (v) return v
  }
  return ""
}

/** A labelled poster box. */
const PosterBox: FC<{
  label: string
  accent: string
  body: string
  children?: ReactNode
  className?: string
}> = ({ label, accent, body, children, className }) => (
  <div
    className={
      "border-ink-200 flex flex-col rounded-2xl border bg-white p-4 " +
      (className ?? "")
    }
  >
    <div
      className={
        "mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] " + accent
      }
    >
      {label}
    </div>
    {body ? (
      <p className="text-ink-700 whitespace-pre-line text-[12.5px] leading-relaxed">
        {body}
      </p>
    ) : (
      <p className="text-ink-400 text-[12.5px] italic">Not available yet.</p>
    )}
    {children}
  </div>
)

export const OverviewTab: FC<OverviewTabProps> = ({
  report,
  fileCount,
  generationStatus,
  generationError,
  onGoToTab,
  onOpenVisualization,
  sourceDesignName,
  onOpenDesign
}) => {
  const statusMeta = STATUS_COPY[generationStatus]
  const draft = report?.report_draft ?? null
  const hasDraft = draft && typeof draft === "object"
  const chart =
    typeof report?.chart_image === "string" && report.chart_image
      ? (report.chart_image as string)
      : null

  // Poster fields, mapped from the draft section keys.
  const objective =
    toPlain(report?.description) ||
    firstNonEmpty(draft, ["aim", "introduction"])
  // The problem the work set out to answer, and WHY the design was built this
  // way - both were missing, so the one-pager never said what was being asked
  // or on what basis, only what was done.
  const problem = firstNonEmpty(draft, [
    "problem",
    "background",
    "introduction",
    "principle"
  ])
  const rationale = firstNonEmpty(draft, [
    "rationale",
    "principle",
    "hypothesis",
    "theory"
  ])
  const design = firstNonEmpty(draft, [
    "procedure",
    "preparation",
    "material",
    "setup"
  ])
  const data = firstNonEmpty(draft, ["dataAnalysis"])
  const result = firstNonEmpty(draft, ["results", "discussion"])
  const conclusion = firstNonEmpty(draft, ["conclusion", "nextSteps"])

  const StatusRow = (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={
          "rounded-full border px-3 py-1 text-xs font-semibold " +
          statusMeta.tone
        }
      >
        {statusMeta.label}
      </span>
      {report?.name && (
        <span className="text-ink-500 text-sm">{report.name}</span>
      )}
      {report?.source_design_id && onOpenDesign && (
        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5"
          onClick={onOpenDesign}
        >
          <IconFlask size={13} className="text-teal-journey" />
          {sourceDesignName || report.source_design_name || "design"}
          <IconExternalLink size={12} />
        </Button>
      )}
    </div>
  )

  // ── Poster view (a one-pager once the report has a draft) ────────────────
  if (hasDraft) {
    return (
      <div className="space-y-4">
        {StatusRow}

        <div className="border-ink-200 overflow-hidden rounded-2xl border bg-white">
          <div className="border-ink-200 from-teal-journey-tint/50 border-b bg-gradient-to-r to-transparent px-5 py-4">
            <div className="text-teal-journey text-[10px] font-bold uppercase tracking-[0.16em]">
              Report at a glance
            </div>
            <h2 className="text-ink-900 mt-0.5 text-lg font-bold leading-tight">
              {report?.name || "Report"}
            </h2>
          </div>

          {/* Reads top-to-bottom as the whole experiment: what was asked, what
              success looked like, why it was designed this way, what was done,
              what came out, what it means. */}
          <div className="space-y-3 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <PosterBox label="Problem" accent="text-ink-700" body={problem} />
              <PosterBox
                label="Objective"
                accent="text-teal-journey"
                body={objective}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <PosterBox
                label="Design rationale"
                accent="text-purple-persona"
                body={rationale}
              />
              <PosterBox
                label="Method"
                accent="text-orange-product"
                body={design}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <PosterBox
                label="Result"
                accent="text-sage-brand"
                body={result}
              />
              <PosterBox
                label="Conclusion"
                accent="text-brick"
                body={conclusion}
              />
            </div>

            {/* The chart used to be embedded here at poster scale, where the
                axis labels were unreadable and it explained nothing. It now
                opens full-size, titled and labelled, on demand. */}
            {(chart || data) && (
              <div className="border-ink-200 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3">
                <p className="text-ink-500 min-w-0 text-[12.5px]">
                  {data || "Result data is attached to this report."}
                </p>
                {chart && onOpenVisualization && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={onOpenVisualization}
                  >
                    <IconChartHistogram size={14} />
                    Show data visualization
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="border-ink-200 flex items-center justify-between border-t px-5 py-3">
            <span className="text-ink-400 text-xs">
              A summary - open the full report for every section.
            </span>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => onGoToTab("report")}
            >
              <IconFileText size={14} /> Open full report
              <IconArrowRight size={14} />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Pre-generation view (no draft yet) ───────────────────────────────────
  const phaseCards: Array<{
    key: ReportTab
    title: string
    summary: string
    icon: React.ReactNode
    accent: string
  }> = [
    {
      key: "inputs",
      title: "Inputs",
      summary: fileCount
        ? `${fileCount} file${fileCount === 1 ? "" : "s"} attached`
        : "No files attached",
      icon: <IconUpload size={20} />,
      accent: "text-ink-900"
    },
    {
      key: "report",
      title: "Report",
      summary: "Pending - generate to see sections",
      icon: <IconFileText size={20} />,
      accent: "text-teal-journey"
    }
  ]

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-teal-journey text-lg">
            Report Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {StatusRow}

          {report?.description ? (
            <div>
              <div className="text-ink-400 mb-1 text-[11px] font-bold uppercase tracking-widest">
                Objective
              </div>
              <p className="text-ink-700 text-sm leading-relaxed">
                {report.description}
              </p>
            </div>
          ) : (
            <div className="border-ink-200 flex items-start gap-2 rounded-xl border border-dashed p-3">
              <IconInfoCircle size={16} className="text-ink-400 mt-0.5" />
              <div className="text-ink-500 text-sm">
                Add an objective on the <strong>Inputs</strong> tab to describe
                what this report should cover.
              </div>
            </div>
          )}

          {generationStatus === "error" && generationError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {generationError}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {phaseCards.map(card => (
          <button
            key={card.key}
            onClick={() => onGoToTab(card.key)}
            className="border-ink-200 hover:border-teal-journey hover:bg-teal-journey-tint/40 group flex items-center justify-between rounded-2xl border bg-white p-4 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={card.accent}>{card.icon}</span>
              <div>
                <div className="text-ink-900 text-sm font-semibold">
                  {card.title}
                </div>
                <div className="text-ink-500 text-xs">{card.summary}</div>
              </div>
            </div>
            <IconArrowRight
              size={16}
              className="text-ink-400 group-hover:text-teal-journey"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
