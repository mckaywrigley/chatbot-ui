"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { IconRefresh, IconSparkles } from "@tabler/icons-react"
import { Maximize2 } from "lucide-react"
import { FC, useCallback, useEffect, useRef, useState } from "react"
import { ReportSection } from "./report-section"
import {
  getSectionGroups,
  getTemplate,
  ReportTemplate
} from "@/lib/report/templates"
import {
  ReportChart,
  type ChartType
} from "@/app/[locale]/[workspaceid]/report/components/report-chart"
import { cn } from "@/lib/utils"

// Chart-type tabs surfaced above the visualization. The set is locked
// to bar/line/pie because those are the formats the regenerate-chart
// route's zod schema supports - and they cover the bulk of the
// scientific reporting cases the scientist showed me.
const CHART_TYPE_OPTIONS: { key: ChartType; label: string }[] = [
  { key: "bar", label: "Bar" },
  { key: "line", label: "Line" },
  { key: "pie", label: "Pie" }
]

interface ChartSeriesShape {
  metric: string
  yAxisLabel?: string
  chartType?: ChartType
  data: Array<{ label: string; value: number }>
}

interface ChartDataShape {
  chartTitle?: string
  yAxisLabel?: string
  chartType?: ChartType
  data?: Array<{ label: string; value: number }>
  /** Every OTHER metric found in the uploaded data. */
  additionalSeries?: ChartSeriesShape[]
  /**
   * Indices into the combined series list (0 = the primary `data`) that the
   * researcher wants IN the report - what gets read, exported and filed to the
   * ELN. Absent means "just the primary", which is how every report generated
   * before the picker existed behaves.
   */
  selectedSeries?: number[]
}

/** Primary metric first, then each additional metric, as one flat list. */
export function chartSeriesList(
  cd: ChartDataShape | null | undefined
): ChartSeriesShape[] {
  const out: ChartSeriesShape[] = []
  if (Array.isArray(cd?.data) && cd!.data!.length) {
    out.push({
      metric: cd!.chartTitle || "Primary result",
      yAxisLabel: cd!.yAxisLabel,
      chartType: cd!.chartType,
      data: cd!.data!
    })
  }
  for (const extra of cd?.additionalSeries ?? []) {
    if (Array.isArray(extra?.data) && extra.data.length) {
      out.push({
        metric: extra.metric || "Metric",
        yAxisLabel: extra.yAxisLabel,
        chartType: extra.chartType,
        data: extra.data
      })
    }
  }
  return out
}

interface ReportTabProps {
  draft: Record<string, any> | null
  chartImage: string | null
  /** Raw chart payload - shown as an interactive recharts surface. */
  chartData?: ChartDataShape | null
  regenerating: string | null
  onRegenerate: (sectionKey: string, feedback: string) => Promise<void>
  onEditContent: (sectionKey: string, value: string) => void
  onRegenerateChart: (feedback: string) => Promise<void>
  /**
   * Called when the user clicks one of the chart-type tabs. The host
   * updates `chart_data.chartType` + persists, so a refresh keeps the
   * picked type.
   */
  onChartTypeChange?: (chartType: ChartType) => void
  /**
   * Called when the researcher ticks/unticks which datasets belong in the
   * report. The host writes `chart_data.selectedSeries` + persists.
   */
  onSelectedSeriesChange?: (indices: number[]) => void
  regeneratingChart: boolean
  onOpenPreview: () => void
  templateId?: string | null
  reportTitle?: string
  /**
   * `true` once the user has explicitly saved the report. Locks the
   * UI: hides Edit / Edit-with-AI / chart-variant tabs / save button.
   * The selected chart type stays in place and renders read-only.
   */
  isSaved?: boolean
  /** Opens the Save-as-Template dialog. Rendered next to Preview. */
  onSaveAsTemplate?: () => void
  /**
   * Custom-section additions sourced from the inputs tab + any
   * scientist additions made from the index sidebar's "+ Add
   * section" button. Each entry renders a ReportSection alongside
   * the template's built-in sections.
   */
  customSections?: Array<{
    id: string
    name: string
    description?: string
  }>
  /** Opens the dialog that asks for a name + description, then prepends a new section. */
  onAddCustomSection?: () => void
}

const sectionAnchor = (key: string) => `section-${key}`

const ChartBlock: FC<{
  chartImage: string | null
  chartData: ChartDataShape | null
  regeneratingChart: boolean
  onRegenerateChart: (feedback: string) => Promise<void>
  onChartTypeChange?: (chartType: ChartType) => void
  /** Persist which datasets belong in the report. */
  onSelectedSeriesChange?: (indices: number[]) => void
  /** Saved-report lockdown - hides type tabs + Edit-with-AI button. */
  isLocked?: boolean
}> = ({
  chartImage,
  chartData,
  regeneratingChart,
  onRegenerateChart,
  onChartTypeChange,
  onSelectedSeriesChange,
  isLocked = false
}) => {
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback] = useState("")

  // Which datasets the researcher wants in the report. Defaults to the primary
  // one alone, matching every report generated before the picker existed.
  const allSeries = chartSeriesList(chartData)
  const selected =
    chartData?.selectedSeries && chartData.selectedSeries.length > 0
      ? chartData.selectedSeries.filter(i => i >= 0 && i < allSeries.length)
      : [0]

  const toggleSeries = (i: number) => {
    if (!onSelectedSeriesChange) return
    const next = selected.includes(i)
      ? selected.filter(x => x !== i)
      : [...selected, i].sort((a, b) => a - b)
    // Never leave the report with no chart at all - a dataset must stay picked.
    if (next.length === 0) return
    onSelectedSeriesChange(next)
  }

  const handleSubmit = async () => {
    const trimmed = feedback.trim()
    if (!trimmed) return
    await onRegenerateChart(trimmed)
    setFeedback("")
    setShowFeedback(false)
  }

  const currentType: ChartType = (chartData?.chartType as ChartType) ?? "bar"
  const hasData = (chartData?.data?.length ?? 0) > 0

  return (
    <div className="border-ink-100 space-y-3 rounded-xl border bg-white/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-ink-500 text-[11px] font-bold uppercase tracking-widest">
          Visualization
        </div>
        {!isLocked && (
          <div className="flex items-center gap-2">
            {/* Chart-type tabs (#17/#18) - only render when we have raw
                data AND the report is still editable. Saved reports
                lock the user into whatever variant was current at save
                time. */}
            {hasData && onChartTypeChange && (
              <div className="border-ink-200 inline-flex overflow-hidden rounded-md border bg-white">
                {CHART_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => onChartTypeChange(opt.key)}
                    disabled={regeneratingChart}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      currentType === opt.key
                        ? "bg-teal-journey text-white"
                        : "text-ink-700 hover:bg-ink-50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowFeedback(v => !v)}
              disabled={regeneratingChart}
            >
              <IconRefresh size={14} />
              {showFeedback ? "Cancel" : "Edit chart with AI"}
            </Button>
          </div>
        )}
      </div>
      {/* Prefer the interactive recharts surface (data labels, hover
          tooltips, switchable type) when we have raw `chart_data`. We
          fall back to the legacy static PNG for older reports that
          only persisted `chart_image` - those won't be interactive
          but at least keep rendering. */}
      {/* Dataset picker. An upload with several readouts used to chart exactly
          one of them with no hint the others existed; these are the datasets
          found in the file, and the ticked ones are what the report carries
          into export and the ELN. Only shown when there is a choice to make. */}
      {allSeries.length > 1 && (
        <div className="border-ink-100 space-y-1.5 border-b pb-3">
          <div className="text-ink-500 text-[11px] font-medium">
            {isLocked
              ? "Datasets in this report"
              : "Datasets from your file — tick the ones to include in the report"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allSeries.map((sr, i) => {
              const on = selected.includes(i)
              return (
                <button
                  key={sr.metric + i}
                  type="button"
                  disabled={isLocked || !onSelectedSeriesChange}
                  onClick={() => toggleSeries(i)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12px] transition-colors disabled:cursor-default",
                    on
                      ? "border-teal-journey bg-teal-journey text-white"
                      : "border-ink-200 text-ink-600 hover:border-ink-300"
                  )}
                >
                  {sr.metric}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {hasData ? (
        <div className="space-y-5">
          {selected.map(i => {
            const sr = allSeries[i]
            if (!sr) return null
            return (
              <ReportChart
                key={sr.metric + i}
                data={sr.data}
                chartTitle={sr.metric}
                yAxisLabel={sr.yAxisLabel}
                /* The type tabs drive the PRIMARY chart, which is the one the
                   exported PNG renders; the extra datasets keep whatever type
                   the generator judged right for them. */
                chartType={i === 0 ? currentType : (sr.chartType ?? "bar")}
              />
            )
          })}
        </div>
      ) : chartImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={chartImage}
          alt="Report chart"
          className="border-ink-100 max-w-full rounded-lg border"
        />
      ) : (
        <p className="text-ink-400 text-sm italic">
          Visualization not available.
        </p>
      )}
      {!isLocked && showFeedback && (
        <div className="border-ink-100 space-y-2 border-t pt-3">
          <Textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="How should the chart change? e.g. switch to pie chart, sort bars descending, update title"
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={regeneratingChart || !feedback.trim()}
              className="gap-1.5"
            >
              <IconSparkles size={14} />
              {regeneratingChart ? "Regenerating…" : "Regenerate with AI"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export const ReportTab: FC<ReportTabProps> = ({
  draft,
  chartImage,
  chartData,
  regenerating,
  onRegenerate,
  onEditContent,
  onRegenerateChart,
  onChartTypeChange,
  onSelectedSeriesChange,
  regeneratingChart,
  onOpenPreview,
  templateId,
  reportTitle,
  isSaved = false,
  onSaveAsTemplate,
  customSections
}) => {
  const template: ReportTemplate = getTemplate(templateId)
  const sectionGroups = getSectionGroups(template)
  const firstAnchor = sectionAnchor(template.sections[0]?.key ?? "aim")

  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeAnchor, setActiveAnchor] = useState<string>(firstAnchor)

  const handleJump = useCallback((anchor: string) => {
    const container = scrollRef.current
    if (!container) return
    const target = container.querySelector<HTMLElement>(
      `[data-anchor="${anchor}"]`
    )
    if (!target) return
    const top = target.offsetTop - 12
    container.scrollTo({ top, behavior: "smooth" })
    setActiveAnchor(anchor)
  }, [])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      const nodes = Array.from(
        container.querySelectorAll<HTMLElement>("[data-anchor]")
      )
      if (!nodes.length) return
      const threshold = container.scrollTop + 48
      let current = nodes[0].dataset.anchor || ""
      for (const node of nodes) {
        if (node.offsetTop <= threshold) {
          current = node.dataset.anchor || current
        } else {
          break
        }
      }
      if (current) setActiveAnchor(current)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => container.removeEventListener("scroll", handleScroll)
  }, [chartImage, draft, templateId])

  const chartCapable =
    template.includeChart &&
    (!!chartImage || (chartData?.data?.length ?? 0) > 0)

  return (
    <div className="flex gap-6">
      <aside className="sticky top-0 hidden h-[calc(100vh-11rem)] w-56 shrink-0 md:block">
        <nav className="border-ink-200 h-full overflow-y-auto rounded-2xl border bg-white/80 p-3 text-sm">
          <div className="text-ink-400 mb-2 px-2 text-[11px] font-bold uppercase tracking-widest">
            Contents
          </div>
          {sectionGroups.map(group => (
            <div key={group.label} className="mb-2">
              <div
                className={
                  "px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest " +
                  group.accentClassName
                }
              >
                {group.label}
              </div>
              {group.sections.map(section => {
                const anchor = sectionAnchor(section.key)
                const isActive = activeAnchor === anchor
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => handleJump(anchor)}
                    className={
                      "block w-full rounded-lg px-2 py-1.5 text-left transition-colors " +
                      (isActive
                        ? "bg-teal-journey-tint/50 text-teal-journey font-semibold"
                        : "text-ink-700 hover:bg-ink-50")
                    }
                  >
                    {section.title}
                  </button>
                )
              })}
            </div>
          ))}
          {/* Custom sections appear under a dedicated group at the
              bottom of the index so the scientist can scan their
              additions separately from the template defaults. */}
          {customSections && customSections.length > 0 && (
            <div className="mb-2">
              <div className="text-ink-400 px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest">
                Custom
              </div>
              {customSections.map(cs => {
                const anchor = sectionAnchor(cs.id)
                const isActive = activeAnchor === anchor
                return (
                  <button
                    key={cs.id}
                    type="button"
                    onClick={() => handleJump(anchor)}
                    className={
                      "block w-full truncate rounded-lg px-2 py-1.5 text-left transition-colors " +
                      (isActive
                        ? "bg-teal-journey-tint/50 text-teal-journey font-semibold"
                        : "text-ink-700 hover:bg-ink-50")
                    }
                  >
                    {cs.name || "Untitled section"}
                  </button>
                )
              })}
            </div>
          )}
        </nav>
      </aside>

      <div
        ref={scrollRef}
        className="max-h-[calc(100vh-11rem)] min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
      >
        <div className="flex items-center justify-between">
          <div>
            {reportTitle && (
              <h2 className="text-ink-900 text-2xl font-bold">{reportTitle}</h2>
            )}
            <div className="text-ink-500 mt-0.5 flex items-center gap-2 text-xs">
              <span className="text-ink-400 font-bold uppercase tracking-widest">
                Template
              </span>
              <span className="text-ink-700 font-medium">{template.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={onOpenPreview}
            >
              <Maximize2 className="size-4" />
              Preview
            </Button>
            {/* Save-as-Template surfaces on saved reports - this is
                the only action we want a locked report to retain so
                the scientist can capture the structure for reuse. */}
            {isSaved && onSaveAsTemplate && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onSaveAsTemplate}
              >
                <IconSparkles size={14} />
                Save as template
              </Button>
            )}
          </div>
        </div>

        {sectionGroups.map(group =>
          group.sections.map(section => {
            const raw = draft?.[section.key]
            const content =
              typeof raw === "string"
                ? raw
                : raw
                  ? JSON.stringify(raw, null, 2)
                  : ""
            const isDataAnalysis = section.key === "dataAnalysis"
            return (
              <div
                key={section.key}
                data-anchor={sectionAnchor(section.key)}
                className="scroll-mt-4"
              >
                <ReportSection
                  sectionKey={section.key}
                  title={section.title}
                  content={content}
                  onRegenerate={onRegenerate}
                  onEditContent={onEditContent}
                  isBusy={regenerating === section.key}
                  accentClassName={group.accentClassName}
                  // When the report is saved, lock every section -
                  // hides the inline Edit and Edit-with-AI buttons.
                  // The selected chart variant still shows but its
                  // tab strip + "Edit chart with AI" disappear via
                  // the ChartBlock's `isSaved` branch.
                  isLocked={isSaved}
                  afterContent={
                    isDataAnalysis && chartCapable ? (
                      <ChartBlock
                        chartImage={chartImage}
                        chartData={chartData ?? null}
                        regeneratingChart={regeneratingChart}
                        onRegenerateChart={onRegenerateChart}
                        onChartTypeChange={onChartTypeChange}
                        onSelectedSeriesChange={onSelectedSeriesChange}
                        isLocked={isSaved}
                      />
                    ) : null
                  }
                />
              </div>
            )
          })
        )}
        {/* Render scientist-added custom sections after the
            template's built-in ones so they don't fight for top-of-
            page real estate. Each carries its description in italics
            below the heading until the generation agent fills the
            body. */}
        {(customSections ?? []).map(cs => (
          <div
            key={cs.id}
            data-anchor={sectionAnchor(cs.id)}
            className="scroll-mt-4"
          >
            <ReportSection
              sectionKey={cs.id}
              title={cs.name || "Custom section"}
              content={
                (draft?.[cs.id] as string | undefined) ??
                (cs.description ? `_${cs.description}_` : "")
              }
              onRegenerate={onRegenerate}
              onEditContent={onEditContent}
              isBusy={regenerating === cs.id}
              isLocked={isSaved}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
