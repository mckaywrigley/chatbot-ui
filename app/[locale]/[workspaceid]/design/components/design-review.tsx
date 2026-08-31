"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DesignPlanLogEntry,
  DesignPlanStatus,
  DesignPlanHypothesis
} from "@/types/design-plan"
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  AlertTriangle,
  Atom,
  Beaker,
  ClipboardList,
  Clock,
  Copy,
  Download,
  FileDown,
  Info,
  Layers,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Target
} from "lucide-react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { designAgentPromptSchemas } from "@/lib/design/prompt-schemas"
import { AgentPromptUsage } from "@/types/design-prompts"
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx"
import type {
  MasterMixPlan,
  ProcedureStep,
  ReagentPreparation,
  WorkingSolutionRow
} from "@/app/api/design/draft/types"

interface CitationDetailItem {
  index: number
  title: string
  url: string
  source: string
  authors: string[]
  year?: string
  journal?: string
}

function linkProvenanceToCitation(
  provenanceText: string,
  citationsDetailed?: CitationDetailItem[]
): {
  text: string
  matchedCitation?: CitationDetailItem
  extractedUrl?: string
} {
  if (!citationsDetailed || citationsDetailed.length === 0) {
    // Even without citations, try to extract raw URLs from provenance text
    const urlMatch = provenanceText.match(/https?:\/\/[^\s,)}\]]+/)
    return { text: provenanceText, extractedUrl: urlMatch?.[0] }
  }

  const lowerProv = provenanceText.toLowerCase()

  // First pass: try bracket-index match (most reliable when model follows instructions)
  // Support formats: [1], [1], [ 1 ], and leading "[N] Title" pattern
  const bracketMatch = provenanceText.match(/\[(\d+)\]/)
  if (bracketMatch) {
    const idx = parseInt(bracketMatch[1], 10)
    const byIndex = citationsDetailed.find(c => c.index === idx)
    if (byIndex) {
      return { text: provenanceText, matchedCitation: byIndex }
    }
  }

  for (const citation of citationsDetailed) {
    // Check if provenance contains a significant portion of the citation title
    const titleWords = citation.title
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4)
    const titleMatchCount = titleWords.filter(word =>
      lowerProv.includes(word)
    ).length
    const titleMatchRatio =
      titleWords.length > 0 ? titleMatchCount / titleWords.length : 0

    // Check for author surname match
    const authorMatch = citation.authors.some(author => {
      const surname = author.split(/\s+/).pop()?.toLowerCase()
      return surname && surname.length > 2 && lowerProv.includes(surname)
    })

    // Check for DOI match
    const doiMatch =
      citation.url &&
      citation.url.includes("doi.org") &&
      lowerProv.includes(
        citation.url.replace(/^https?:\/\/(dx\.)?doi\.org\//, "").toLowerCase()
      )

    if (
      titleMatchRatio > 0.4 ||
      (authorMatch && titleMatchRatio > 0.2) ||
      doiMatch
    ) {
      return { text: provenanceText, matchedCitation: citation }
    }
  }

  // Fallback: extract raw URL from provenance text if no citation matched
  const urlMatch = provenanceText.match(/https?:\/\/[^\s,)}\]]+/)
  return { text: provenanceText, extractedUrl: urlMatch?.[0] }
}

interface DesignReviewProps {
  designData: {
    name?: string
    description?: string
    objectives?: string[]
    variables?: string[]
    specialConsiderations?: string[]
    reportWriterOutput?: any
  } | null
  planStatus?: DesignPlanStatus | null
  topHypotheses?: DesignPlanHypothesis[]
  logs?: DesignPlanLogEntry[]
  onGenerateDesign?: (hypothesis: DesignPlanHypothesis) => void
  generatingHypothesisId?: string | null
  selectedHypothesisId?: string | null
  generatedDesign?: any | null
  generatedLiteratureSummary?: any | null
  generatedStatReview?: any | null
  designError?: string | null
  onRegenerateDesign?: () => Promise<void> | void
  onCustomizePrompts?: (hypothesis: DesignPlanHypothesis) => void
  promptsUsed?: AgentPromptUsage[] | null
  onLoadSavedDesign?: (hypothesis: DesignPlanHypothesis) => void
  readOnly?: boolean
}

const markdownClasses =
  "prose prose-sm max-w-none text-foreground dark:prose-invert prose-headings:text-foreground prose-strong:text-foreground prose-li:marker:text-muted-foreground"

const normalizeInlineBullets = (text: string) => {
  // Inline bullets like "foo. - bar. - baz." → newline-separated. Safe for non-table text only.
  const withNewlines = text
    .replace(/(?<=\S)\s+-\s+/g, "\n- ")
    .replace(/(?<=\S)\s+(\d+\.)\s+/g, "\n$1 ")
  return withNewlines.replace(/\n{3,}/g, "\n\n").trim()
}

const PIPE_TABLE_RE =
  /(^|\n)((?:[ \t]*\|.*\|[ \t]*\n)[ \t]*\|[ \t]*:?-{2,}:?(?:[ \t]*\|[ \t]*:?-{2,}:?)+[ \t]*\|[ \t]*(?:\n[ \t]*\|.*\|[ \t]*)+)/g

type Block =
  | { kind: "text"; content: string }
  | { kind: "table"; headers: string[]; rows: string[][] }

const parseRow = (line: string): string[] => {
  const trimmed = line.trim().replace(/^\||\|$/g, "")
  return trimmed.split("|").map(cell => cell.trim())
}

const parsePipeTable = (raw: string): Block | null => {
  const lines = raw
    .trim()
    .split("\n")
    .filter(l => l.trim().length > 0)
  if (lines.length < 2) return null
  const headers = parseRow(lines[0])
  const bodyLines = lines.slice(2)
  const rows = bodyLines.map(parseRow)
  if (headers.length === 0) return null
  return { kind: "table", headers, rows }
}

const splitIntoBlocks = (text: string): Block[] => {
  const blocks: Block[] = []
  let cursor = 0
  const source = text
  PIPE_TABLE_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = PIPE_TABLE_RE.exec(source)) !== null) {
    const tableStart = match.index + (match[1]?.length ?? 0)
    if (tableStart > cursor) {
      blocks.push({
        kind: "text",
        content: source.slice(cursor, tableStart)
      })
    }
    const table = parsePipeTable(match[2])
    if (table) blocks.push(table)
    cursor = match.index + match[0].length
  }
  if (cursor < source.length) {
    blocks.push({ kind: "text", content: source.slice(cursor) })
  }
  return blocks.length > 0 ? blocks : [{ kind: "text", content: source }]
}

const structuredMarkdownComponents: Components = {
  ul: ({ node, ...props }) => (
    <ul
      className="text-muted-foreground marker:text-muted-foreground my-2 list-disc space-y-1 pl-5 text-sm"
      {...props}
    />
  ),
  ol: ({ node, ...props }) => (
    <ol
      className="text-muted-foreground marker:text-muted-foreground my-2 list-decimal space-y-1 pl-5 text-sm"
      {...props}
    />
  ),
  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />
}

const markdownPlugins = {
  remark: [remarkGfm, remarkMath],
  rehype: [rehypeKatex]
}

const StructuredMarkdown = ({
  content,
  className
}: {
  content: string
  className?: string
}) => {
  const blocks = splitIntoBlocks(content)
  return (
    <div className={className}>
      {blocks.map((block, idx) => {
        if (block.kind === "table") {
          return (
            <div
              key={`table-${idx}`}
              className="border-border/70 bg-background/60 my-3 overflow-hidden rounded-lg border"
            >
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    {block.headers.map((header, hIdx) => (
                      <TableHead
                        key={`h-${idx}-${hIdx}`}
                        className="text-foreground h-10 px-3 text-xs font-semibold uppercase tracking-wide"
                      >
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {block.rows.map((row, rIdx) => (
                    <TableRow key={`r-${idx}-${rIdx}`}>
                      {row.map((cell, cIdx) => (
                        <TableCell
                          key={`c-${idx}-${rIdx}-${cIdx}`}
                          className="px-3 py-2 text-sm"
                        >
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        }
        const text = normalizeInlineBullets(block.content)
        if (!text) return null
        return (
          <div key={`text-${idx}`} className={markdownClasses}>
            <ReactMarkdown
              remarkPlugins={markdownPlugins.remark}
              rehypePlugins={markdownPlugins.rehype}
              components={structuredMarkdownComponents}
            >
              {text}
            </ReactMarkdown>
          </div>
        )
      })}
    </div>
  )
}

const SectionCard = ({
  title,
  description,
  children,
  badge
}: {
  title: string
  description?: string
  children: ReactNode
  badge?: string
}) => (
  <div className="border-border from-background via-background/60 to-background rounded-xl border bg-gradient-to-b p-4 shadow-inner">
    <div className="border-border/70 flex flex-col gap-1 border-b pb-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-foreground text-lg font-semibold">{title}</h3>
        {badge && (
          <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-semibold">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
    </div>
    <div className="text-muted-foreground pt-3 text-sm">{children}</div>
  </div>
)

const InfoTile = ({
  label,
  value,
  icon: Icon
}: {
  label: string
  value?: string
  icon?: React.ElementType
}) => {
  if (!value) return null

  return (
    <div className="border-border/70 bg-background/80 flex flex-col gap-2 rounded-lg border p-3 shadow-sm">
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        {Icon && <Icon className="text-primary size-4" />}
        {label}
      </div>
      <p className="text-foreground text-sm">{value}</p>
    </div>
  )
}

type StepAccent = "emerald" | "blue" | "violet" | "amber" | "rose"

type ExecutionStep = {
  label: string
  value?: string
  accent: StepAccent
}

type StructuredConditionsTable = {
  headers: string[]
  rows: string[][]
}

const coerceConditionsTable = (
  input: unknown
): StructuredConditionsTable | null => {
  if (!input) return null
  if (
    typeof input === "object" &&
    Array.isArray((input as any).headers) &&
    Array.isArray((input as any).rows)
  ) {
    const t = input as StructuredConditionsTable
    if (t.headers.length === 0 || t.rows.length === 0) return null
    return t
  }
  if (typeof input === "string") {
    const parsed = splitIntoBlocks(input).find(
      (b): b is Extract<Block, { kind: "table" }> => b.kind === "table"
    )
    return parsed ? { headers: parsed.headers, rows: parsed.rows } : null
  }
  return null
}

const ConditionsTableCard = ({
  title = "Conditions Table",
  table,
  accent = "rose"
}: {
  title?: string
  table: unknown
  accent?: StepAccent
}) => {
  const accentMap: Record<StepAccent, string> = {
    emerald: "border-emerald-500/40 bg-emerald-500/5",
    blue: "border-sky-500/40 bg-sky-500/5",
    violet: "border-violet-500/40 bg-violet-500/5",
    amber: "border-amber-500/40 bg-amber-500/5",
    rose: "border-rose-500/40 bg-rose-500/5"
  }
  const structured = coerceConditionsTable(table)
  if (!structured) {
    if (typeof table === "string" && table.trim().length > 0) {
      return <StepCard title={title} body={table} accent={accent} />
    }
    return null
  }
  return (
    <div
      className={`rounded-lg border ${accentMap[accent]} p-3 shadow-sm backdrop-blur`}
    >
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
        {title}
      </p>
      <div className="border-border/70 bg-background/60 mt-2 overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {structured.headers.map((header, hIdx) => (
                <TableHead
                  key={`ct-h-${hIdx}`}
                  className="text-foreground h-10 px-3 text-xs font-semibold uppercase tracking-wide"
                >
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {structured.rows.map((row, rIdx) => (
              <TableRow key={`ct-r-${rIdx}`}>
                {structured.headers.map((_, cIdx) => (
                  <TableCell
                    key={`ct-c-${rIdx}-${cIdx}`}
                    className="px-3 py-2 text-sm"
                  >
                    {row[cIdx] ?? ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const StepCard = ({
  title,
  body,
  accent = "emerald"
}: {
  title: string
  body?: string
  accent?: StepAccent
}) => {
  if (!body) return null

  const accentMap: Record<StepAccent, string> = {
    emerald: "border-emerald-500/40 bg-emerald-500/5",
    blue: "border-sky-500/40 bg-sky-500/5",
    violet: "border-violet-500/40 bg-violet-500/5",
    amber: "border-amber-500/40 bg-amber-500/5",
    rose: "border-rose-500/40 bg-rose-500/5"
  } as const

  const baseClass = accentMap[accent] || accentMap.emerald

  return (
    <div
      className={`rounded-lg border ${baseClass} p-3 shadow-sm backdrop-blur`}
    >
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
        {title}
      </p>
      <StructuredMarkdown content={body} className="mt-2" />
    </div>
  )
}

function formatList(label: string, values?: string[]) {
  if (!values || values.length === 0) return null
  return (
    <div>
      <h4 className="text-muted-foreground text-sm font-semibold">{label}</h4>
      <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
        {values.map((item, index) => (
          <li key={`${label}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

const StatPill = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null
  return (
    <div className="border-border/60 bg-background/80 flex flex-col rounded-md border px-2.5 py-1.5 text-[11px]">
      <span className="text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-foreground font-semibold">{value}</span>
    </div>
  )
}

function ReagentsView({ reagents }: { reagents: ReagentPreparation[] }) {
  if (!reagents?.length) {
    return (
      <p className="text-muted-foreground text-xs italic">
        No reagents specified.
      </p>
    )
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {reagents.map((r, idx) => (
        <div
          key={`reagent-${idx}-${r.name}`}
          className="border-border/70 bg-background/70 rounded-lg border p-3 shadow-sm"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-foreground text-sm font-semibold">{r.name}</h4>
            <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
              {r.role}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {r.molecularWeightGPerMol !== undefined && (
              <StatPill
                label="MW"
                value={`${r.molecularWeightGPerMol} g/mol`}
              />
            )}
            <StatPill label="Target conc." value={r.targetConcentration} />
            <StatPill label="Target volume" value={r.targetVolume} />
            {r.massToWeigh && <StatPill label="Mass" value={r.massToWeigh} />}
            {r.volumeToPipette && (
              <StatPill label="Pipette" value={r.volumeToPipette} />
            )}
            {r.dilutionFromStock && (
              <StatPill label="Dilution" value={r.dilutionFromStock} />
            )}
          </div>
          <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
            <div>
              <span className="font-semibold">Diluent:</span> {r.diluent}
            </div>
            {r.pHAdjustment && (
              <div>
                <span className="font-semibold">pH:</span> {r.pHAdjustment}
              </div>
            )}
            <div>
              <span className="font-semibold">Storage:</span> {r.storage}
            </div>
            {r.notes && (
              <div className="italic">
                <span className="font-semibold not-italic">Note:</span>{" "}
                {r.notes}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function MasterMixView({ plan }: { plan?: MasterMixPlan }) {
  if (!plan || !plan.components?.length) {
    return (
      <p className="text-muted-foreground text-xs italic">
        No master mix plan specified.
      </p>
    )
  }
  return (
    <div className="space-y-3">
      <div className="border-border/70 overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead className="text-right">Per-reaction (µL)</TableHead>
              <TableHead className="text-right">N reactions</TableHead>
              <TableHead className="text-right">Total (µL)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plan.components.map((c, idx) => (
              <TableRow key={`mm-${idx}-${c.name}`}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.perReactionVolumeUl}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.nReactions}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.totalVolumeUl}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell>Totals</TableCell>
              <TableCell className="text-right tabular-nums">
                {plan.totalPerReactionUl} /rxn
              </TableCell>
              <TableCell />
              <TableCell className="text-right tabular-nums">
                {plan.totalBatchUl} batch
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      {plan.mixingOrder?.length > 0 && (
        <div>
          <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Mixing order
          </h4>
          <ol className="text-foreground mt-1 list-decimal space-y-0.5 pl-5 text-sm">
            {plan.mixingOrder.map((step, i) => (
              <li key={`mm-order-${i}`}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      {plan.notes && plan.notes !== "Not specified" && (
        <p className="text-muted-foreground text-xs italic">{plan.notes}</p>
      )}
    </div>
  )
}

function WorkingSolutionsView({ rows }: { rows: WorkingSolutionRow[] }) {
  if (!rows?.length) {
    return (
      <p className="text-muted-foreground text-xs italic">
        No working solutions specified.
      </p>
    )
  }
  return (
    <div className="border-border/70 overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Condition ID</TableHead>
            <TableHead>Target conc.</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead className="text-right">V_stock (µL)</TableHead>
            <TableHead className="text-right">V_diluent (µL)</TableHead>
            <TableHead className="text-right">V_final (µL)</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={`ws-${idx}-${r.conditionId}`}>
              <TableCell className="font-medium">{r.conditionId}</TableCell>
              <TableCell>{r.targetConcentration}</TableCell>
              <TableCell>{r.stockUsed}</TableCell>
              <TableCell className="text-right tabular-nums">
                {r.stockVolumeUl}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {r.diluentVolumeUl}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {r.finalVolumeUl}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {r.notes ?? ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ProcedureStepsView({ steps }: { steps: ProcedureStep[] }) {
  if (!steps?.length) {
    return (
      <p className="text-muted-foreground text-xs italic">
        No steps specified.
      </p>
    )
  }
  return (
    <ol className="space-y-2">
      {steps.map(step => (
        <li
          key={`step-${step.stepNumber}`}
          className="border-border/70 bg-background/70 rounded-md border p-2.5 shadow-sm"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-primary bg-primary/10 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
              {step.stepNumber}
            </span>
            <p className="text-foreground text-sm">{step.action}</p>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5 pl-7">
            {step.volume && <StatPill label="Vol" value={step.volume} />}
            {step.temperature && (
              <StatPill label="Temp" value={step.temperature} />
            )}
            {step.duration && <StatPill label="Time" value={step.duration} />}
            {step.mixing && <StatPill label="Mix" value={step.mixing} />}
            {step.instrument && (
              <StatPill label="Instrument" value={step.instrument} />
            )}
          </div>
          {step.notes && (
            <p className="text-muted-foreground mt-1.5 pl-7 text-xs italic">
              {step.notes}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}

function renderPlanStatus(status: DesignPlanStatus) {
  const progress = status.progress
  const percentComplete =
    progress.seedCount > 0
      ? Math.min((progress.generated / progress.seedCount) * 100, 100)
      : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Status</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground space-y-4 text-sm">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <span className="text-foreground font-semibold">Status: </span>
            {status.status.replaceAll("_", " ")}
          </div>
          <div>
            <span className="text-foreground font-semibold">Created: </span>
            {formatDistanceToNow(new Date(status.createdAt), {
              addSuffix: true
            })}
          </div>
          {status.completedAt && (
            <div>
              <span className="text-foreground font-semibold">Completed: </span>
              {formatDistanceToNow(new Date(status.completedAt), {
                addSuffix: true
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Overall progress</span>
            <span className="text-foreground font-semibold">
              {Math.round(percentComplete)}%
            </span>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        <div className="border-border grid gap-2 rounded-lg border p-3 text-xs">
          <div className="flex items-center justify-between">
            <span>Hypotheses generated</span>
            <span className="text-foreground font-semibold">
              {progress.generated}/{progress.seedCount}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ranked / completed</span>
            <span className="text-foreground font-semibold">
              {progress.completed}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Failed / discarded</span>
            <span className="text-foreground font-semibold">
              {progress.failed}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function renderLogs(logs: DesignPlanLogEntry[]) {
  if (!logs.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {logs.slice(0, 10).map(log => (
          <div
            key={`${log.timestamp}-${log.actor}-${log.message}`}
            className="border-border rounded-md border p-3"
          >
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
              <span className="text-foreground font-semibold">{log.actor}</span>
              <span>{log.level.toUpperCase()}</span>
              <span>
                {formatDistanceToNow(new Date(log.timestamp), {
                  addSuffix: true
                })}
              </span>
            </div>
            <p className="text-muted-foreground mt-2">{log.message}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function renderLegacyReport(report: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Legacy Report</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground space-y-6 text-sm">
        {report.researchObjective && (
          <div>
            <h3 className="text-foreground text-base font-semibold">
              Research Objective
            </h3>
            <p>{report.researchObjective}</p>
          </div>
        )}
        {report.literatureSummary && (
          <div>
            <h3 className="text-foreground text-base font-semibold">
              Literature Summary
            </h3>
            <ReactMarkdown
              className={markdownClasses}
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={structuredMarkdownComponents}
            >
              {report.literatureSummary.whatOthersHaveDone}
            </ReactMarkdown>
          </div>
        )}
        {report.hypothesis && (
          <div>
            <h3 className="text-foreground text-base font-semibold">
              Hypothesis
            </h3>
            <p className="text-foreground font-medium">
              {report.hypothesis.hypothesis}
            </p>
            <p>{report.hypothesis.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DesignReview({
  designData,
  planStatus,
  topHypotheses,
  logs,
  onGenerateDesign,
  onCustomizePrompts,
  generatingHypothesisId,
  selectedHypothesisId,
  generatedDesign,
  generatedLiteratureSummary,
  generatedStatReview,
  designError,
  onRegenerateDesign,
  promptsUsed,
  onLoadSavedDesign,
  readOnly = false
}: DesignReviewProps) {
  const [showAllHypotheses, setShowAllHypotheses] =
    useState(!selectedHypothesisId)
  const [reasoningDialogOpen, setReasoningDialogOpen] = useState(false)
  const [reasoningHypothesis, setReasoningHypothesis] =
    useState<DesignPlanHypothesis | null>(null)
  const [hypothesesWithSavedDesigns, setHypothesesWithSavedDesigns] = useState<
    Set<string>
  >(new Set())

  useEffect(() => {
    setShowAllHypotheses(!selectedHypothesisId)
  }, [selectedHypothesisId])

  // Check which hypotheses have saved designs
  useEffect(() => {
    const checkSavedDesigns = async () => {
      if (!topHypotheses || topHypotheses.length === 0) {
        console.log("[DESIGN_REVIEW] No hypotheses to check for saved designs")
        return
      }

      console.log(
        `[DESIGN_REVIEW] Checking ${topHypotheses.length} hypotheses for saved designs...`
      )
      const savedSet = new Set<string>()

      await Promise.all(
        topHypotheses.map(async hypothesis => {
          try {
            const response = await fetch(
              `/api/design/draft/hypothesis/${hypothesis.hypothesisId}/saved-design`
            )
            console.log(
              `[DESIGN_REVIEW] Hypothesis ${hypothesis.hypothesisId.slice(0, 8)}... saved design check:`,
              response.ok ? "✅ HAS SAVED DESIGN" : "❌ No saved design"
            )
            if (response.ok) {
              savedSet.add(hypothesis.hypothesisId)
            }
          } catch (error) {
            console.error(
              `[DESIGN_REVIEW] Error checking saved design for ${hypothesis.hypothesisId.slice(0, 8)}...:`,
              error
            )
          }
        })
      )

      console.log(
        `[DESIGN_REVIEW] Found ${savedSet.size} hypotheses with saved designs`
      )
      setHypothesesWithSavedDesigns(savedSet)
    }

    checkSavedDesigns()
  }, [topHypotheses])

  const objectives = designData?.objectives || []
  const variables = designData?.variables || []
  const specialConsiderations = designData?.specialConsiderations || []
  const selectedHypothesis =
    selectedHypothesisId && topHypotheses
      ? topHypotheses.find(h => h.hypothesisId === selectedHypothesisId) || null
      : null
  const isGeneratingDesign =
    !!selectedHypothesisId &&
    generatingHypothesisId === selectedHypothesisId &&
    !generatedDesign
  const isDesignComplete = !!generatedDesign && !!selectedHypothesis
  const promptsAvailable =
    !!generatedDesign && !!promptsUsed && promptsUsed.length > 0

  const handleDownloadPrompts = useCallback(async () => {
    if (!promptsAvailable || !promptsUsed) {
      return
    }

    const fileBaseName = `experiment-prompts-${
      selectedHypothesis?.hypothesisId || "design"
    }`

    const downloadBlob = (blob: Blob, extension: string) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${fileBaseName}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }

    const fallbackPlainText = () => {
      const lines: string[] = []
      lines.push("Experiment Prompt Pack")
      lines.push(
        `Hypothesis: ${selectedHypothesis?.content || "No hypothesis selected"}`
      )
      lines.push(`Generated: ${new Date().toLocaleString()}`)
      lines.push("")
      promptsUsed.forEach(entry => {
        const schema = designAgentPromptSchemas[entry.agentId]
        lines.push(
          `${schema?.title || entry.agentId} (${entry.agentId
            .replace(/([A-Z])/g, " $1")
            .trim()})`
        )
        lines.push("")
        lines.push("System Prompt:")
        lines.push(entry.systemPrompt.trim())
        if (entry.userPrompt) {
          lines.push("")
          lines.push("User Prompt:")
          lines.push(entry.userPrompt.trim())
        }
        lines.push("")
      })
      return lines.join("\n")
    }

    try {
      const docChildren: Paragraph[] = []
      const now = new Date()
      docChildren.push(
        new Paragraph({
          text: "Experiment Prompt Pack",
          heading: HeadingLevel.TITLE
        })
      )
      docChildren.push(
        new Paragraph({
          text: `Hypothesis: ${
            selectedHypothesis?.content || "No hypothesis selected"
          }`
        })
      )
      docChildren.push(
        new Paragraph({
          text: `Generated: ${now.toLocaleString()}`
        })
      )
      docChildren.push(new Paragraph({ text: "" }))

      const addMultiline = (text?: string) => {
        if (!text) {
          docChildren.push(new Paragraph({ text: "-" }))
          return
        }
        text.split(/\r?\n/).forEach(line => {
          docChildren.push(new Paragraph({ text: line || " " }))
        })
      }

      promptsUsed.forEach(entry => {
        const schema = designAgentPromptSchemas[entry.agentId]
        const headingLabel = schema
          ? `${schema.title} (${schema.id})`
          : entry.agentId
        docChildren.push(
          new Paragraph({
            text: headingLabel,
            heading: HeadingLevel.HEADING_2
          })
        )
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: "System Prompt:", bold: true })]
          })
        )
        addMultiline(entry.systemPrompt)
        if (entry.userPrompt) {
          docChildren.push(new Paragraph({ text: "" }))
          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: "User Prompt:", bold: true })]
            })
          )
          addMultiline(entry.userPrompt)
        }
        docChildren.push(new Paragraph({ text: "" }))
      })

      const doc = new Document({
        sections: [
          {
            children: docChildren
          }
        ]
      })

      const docBlob = await Packer.toBlob(doc)
      downloadBlob(docBlob, "docx")
    } catch (error) {
      console.error("[DESIGN_REVIEW] Failed to build DOCX:", error)
      const fallbackBlob = new Blob([fallbackPlainText()], {
        type: "text/plain"
      })
      downloadBlob(fallbackBlob, "txt")
    }
  }, [promptsAvailable, promptsUsed, selectedHypothesis])

  const designContentRef = useRef<HTMLDivElement>(null)

  const handleDownloadPDF = useCallback(async () => {
    if (!designContentRef.current || !generatedDesign) return

    try {
      const html2canvas = (await import("html2canvas")).default
      const { jsPDF } = await import("jspdf")

      const element = designContentRef.current

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      })

      const imgWidth = 190 // A4 usable width in mm (210 - 20 margin)
      const pageHeight = 277 // A4 usable height in mm (297 - 20 margin)
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF("p", "mm", "a4")
      let heightLeft = imgHeight
      let position = 10 // top margin

      // First page
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        10,
        position,
        imgWidth,
        imgHeight
      )
      heightLeft -= pageHeight

      // Additional pages if content overflows
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          10,
          position,
          imgWidth,
          imgHeight
        )
        heightLeft -= pageHeight
      }

      const fileName = `${designData?.name || "experiment"}-design.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error("[DESIGN_REVIEW] Failed to generate PDF:", error)
    }
  }, [generatedDesign, designData?.name])

  const designReportCard = generatedDesign &&
    typeof generatedDesign === "object" && (
      <Card>
        <CardHeader>
          <CardTitle>Experiment Design</CardTitle>
          {generatedDesign && (
            <div className="flex flex-wrap gap-2 pt-3">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <FileDown className="mr-2 size-4" />
                Download Design (.pdf)
              </Button>
              {promptsAvailable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPrompts}
                >
                  <Download className="mr-2 size-4" />
                  Download Prompts (.docx)
                </Button>
              )}
              {!readOnly && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRegenerateDesign?.()}
                      >
                        <RefreshCw className="mr-2 size-4" />
                        Regenerate
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Run the entire design pipeline again with fresh agents.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent
          ref={designContentRef}
          className="text-muted-foreground space-y-4 text-sm"
        >
          {generatedDesign.researchObjective && (
            <SectionCard
              title="Research Objective"
              description="Primary goal the experiment must accomplish."
            >
              <p className="text-foreground">
                {generatedDesign.researchObjective}
              </p>
            </SectionCard>
          )}
          {generatedDesign.literatureSummary && (
            <SectionCard
              title="Literature Summary"
              description="Key learnings from recent papers."
              badge={`${generatedLiteratureSummary?.citations?.length || 0} refs`}
            >
              <ReactMarkdown
                className={markdownClasses}
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={structuredMarkdownComponents}
              >
                {[
                  generatedDesign.literatureSummary.whatOthersHaveDone,
                  generatedDesign.literatureSummary.goodMethodsAndTools,
                  generatedDesign.literatureSummary.potentialPitfalls
                ]
                  .filter(Boolean)
                  .join("\n\n")}
              </ReactMarkdown>
            </SectionCard>
          )}
          {generatedDesign.hypothesis && (
            <SectionCard title="Selected Hypothesis" badge="Final pick">
              <p className="text-foreground font-medium">
                {generatedDesign.hypothesis.hypothesis}
              </p>
              <p>{generatedDesign.hypothesis.explanation}</p>
            </SectionCard>
          )}
          {generatedDesign.experimentDesign && (
            <SectionCard
              title="Experiment Blueprint"
              description="Design parameters - domain- and phase-aware."
            >
              {(() => {
                const designer = generatedDesign.experimentDesign
                const blueprint = designer.experimentDesign || {}
                const blueprintHighlights = [
                  {
                    label: "What is Tested",
                    value: blueprint.whatWillBeTested,
                    icon: Target
                  },
                  {
                    label: "What is Measured",
                    value: blueprint.whatWillBeMeasured,
                    icon: ClipboardList
                  },
                  {
                    label: "Control Groups",
                    value: blueprint.controlGroups,
                    icon: ShieldCheck
                  },
                  {
                    label: "Experimental Groups",
                    value: blueprint.experimentalGroups,
                    icon: Layers
                  },
                  {
                    label: "Sample Types",
                    value: blueprint.sampleTypes,
                    icon: Beaker
                  },
                  {
                    label: "Tools Needed",
                    value: blueprint.toolsNeeded,
                    icon: AlertTriangle
                  },
                  {
                    label: "Replicates & Conditions",
                    value: blueprint.replicatesAndConditions,
                    icon: Copy
                  },
                  {
                    label: "Specific Requirements",
                    value: blueprint.specificRequirements,
                    icon: Atom
                  }
                ].filter(tile => tile.value)

                const designSteps = (
                  [
                    {
                      label: "Design Summary",
                      value: designer.designSummary,
                      accent: "emerald"
                    },
                    {
                      label: "Experimental Groups Overview",
                      value: designer.experimentalGroupsOverview,
                      accent: "blue"
                    },
                    {
                      label: "Statistical Rationale",
                      value: designer.statisticalRationale,
                      accent: "violet"
                    },
                    {
                      label: "Critical Technical Requirements",
                      value: designer.criticalTechnicalRequirements,
                      accent: "amber"
                    },
                    {
                      label: "Handoff Note for Planner",
                      value: designer.handoffNoteForPlanner,
                      accent: "emerald"
                    }
                  ] satisfies ExecutionStep[]
                ).filter(step => step.value)

                return (
                  <div className="space-y-5">
                    {designer.conditionsTable && (
                      <ConditionsTableCard
                        table={designer.conditionsTable}
                        accent="rose"
                      />
                    )}
                    {blueprintHighlights.length > 0 && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {blueprintHighlights.map(tile => (
                          <InfoTile
                            key={tile.label}
                            label={tile.label}
                            value={tile.value}
                            icon={tile.icon}
                          />
                        ))}
                      </div>
                    )}
                    {designSteps.length > 0 && (
                      <div className="grid gap-3">
                        {designSteps.map(step => (
                          <StepCard
                            key={step.label}
                            title={step.label}
                            body={step.value}
                            accent={step.accent}
                          />
                        ))}
                      </div>
                    )}
                    {designer.rationale && (
                      <p className="text-foreground italic">
                        {designer.rationale}
                      </p>
                    )}
                  </div>
                )
              })()}
            </SectionCard>
          )}
          {generatedDesign.statisticalReview?.correctedDesign && (
            <SectionCard
              title="Stat-Check Corrected Design"
              description="The design after Stat Check's review - this is what Planner and Procedure build on."
              badge="Corrected"
            >
              <div className="space-y-3">
                <StepCard
                  title="Corrected Conditions Table"
                  body={generatedDesign.statisticalReview.correctedDesign}
                  accent="emerald"
                />
                {generatedDesign.statisticalReview.changeLog?.length > 0 && (
                  <StepCard
                    title="Change Log"
                    body={generatedDesign.statisticalReview.changeLog
                      .map((item: string) => `- ${item}`)
                      .join("\n")}
                    accent="blue"
                  />
                )}
                {generatedDesign.statisticalReview.improvementRationale && (
                  <StepCard
                    title="Improvement Rationale"
                    body={
                      generatedDesign.statisticalReview.improvementRationale
                    }
                    accent="violet"
                  />
                )}
              </div>
            </SectionCard>
          )}
          {generatedDesign.executionPlan && (
            <SectionCard
              title="Execution Plan"
              description="Calculation-complete preparation plan from the Planner agent."
              badge="Planner"
            >
              {(() => {
                const planner = generatedDesign.executionPlan || {}
                const stringSteps = (
                  [
                    {
                      label: "Feasibility Check",
                      value: planner.feasibilityCheck,
                      accent: "emerald"
                    },
                    {
                      label: "Summary of Totals",
                      value: planner.summaryOfTotals,
                      accent: "blue"
                    },
                    {
                      label: "Materials Checklist",
                      value: planner.materialsChecklist,
                      accent: "emerald"
                    },
                    {
                      label: "Stock Solution Preparation",
                      value: planner.stockSolutionPreparation,
                      accent: "violet"
                    },
                    {
                      label: "Tube & Label Planning",
                      value: planner.tubeAndLabelPlanning,
                      accent: "emerald"
                    },
                    {
                      label: "Consumable Prep & QC",
                      value: planner.consumablePrepAndQC,
                      accent: "blue"
                    },
                    {
                      label: "Study Layout",
                      value: planner.studyLayout,
                      accent: "violet"
                    },
                    {
                      label: "Prep Schedule",
                      value: planner.prepSchedule,
                      accent: "amber"
                    },
                    {
                      label: "Kit Pack List",
                      value: planner.kitPackList,
                      accent: "emerald"
                    },
                    {
                      label: "Critical Error Points",
                      value: planner.criticalErrorPoints,
                      accent: "rose"
                    },
                    {
                      label: "Material Optimization",
                      value: planner.materialOptimizationSummary,
                      accent: "blue"
                    },
                    {
                      label: "Assumptions & Confirmations",
                      value: planner.assumptionsAndConfirmations,
                      accent: "amber"
                    }
                  ] satisfies ExecutionStep[]
                ).filter(step => step.value && step.value !== "Not specified")

                const hasStructured =
                  (planner.reagents?.length ?? 0) > 0 ||
                  (planner.masterMix?.components?.length ?? 0) > 0 ||
                  (planner.workingSolutions?.length ?? 0) > 0

                if (stringSteps.length === 0 && !hasStructured) {
                  return (
                    <p className="text-muted-foreground">
                      Planner output pending.
                    </p>
                  )
                }

                return (
                  <div className="space-y-5">
                    {(planner.reagents?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                          Reagents & Buffers
                        </h4>
                        <div className="mt-2">
                          <ReagentsView reagents={planner.reagents || []} />
                        </div>
                      </div>
                    )}
                    {(planner.masterMix?.components?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                          Master Mix
                        </h4>
                        <div className="mt-2">
                          <MasterMixView plan={planner.masterMix} />
                        </div>
                      </div>
                    )}
                    {(planner.workingSolutions?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                          Working Solutions
                        </h4>
                        <div className="mt-2">
                          <WorkingSolutionsView
                            rows={planner.workingSolutions || []}
                          />
                        </div>
                      </div>
                    )}
                    {stringSteps.length > 0 && (
                      <div className="grid gap-3">
                        {stringSteps.map(step => (
                          <StepCard
                            key={step.label}
                            title={step.label}
                            body={step.value}
                            accent={step.accent}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
            </SectionCard>
          )}
          {generatedDesign.procedure && (
            <SectionCard
              title="Procedure (SOP)"
              description="Bench-ready step-by-step SOP from the Procedure agent."
              badge="SOP"
            >
              {(() => {
                const procedure = generatedDesign.procedure || {}
                const procedureSteps = (
                  [
                    {
                      label: "Pre-run Checklist",
                      value: procedure.preRunChecklist,
                      accent: "emerald"
                    },
                    {
                      label: "Bench Setup & Safety",
                      value: procedure.benchSetupAndSafety,
                      accent: "amber"
                    },
                    {
                      label: "Sample Labeling & ID Scheme",
                      value: procedure.sampleLabelingIdScheme,
                      accent: "blue"
                    },
                    {
                      label: "Instrument Setup & Calibration",
                      value: procedure.instrumentSetupCalibration,
                      accent: "violet"
                    },
                    {
                      label: "Critical Handling Rules",
                      value: procedure.criticalHandlingRules,
                      accent: "rose"
                    },
                    {
                      label: "Data Recording & Processing",
                      value: procedure.dataRecordingProcessing,
                      accent: "amber"
                    },
                    {
                      label: "Acceptance Criteria",
                      value: procedure.acceptanceCriteria,
                      accent: "emerald"
                    },
                    {
                      label: "Troubleshooting Guide",
                      value: procedure.troubleshootingGuide,
                      accent: "rose"
                    },
                    {
                      label: "Run Log Template",
                      value: procedure.runLogTemplate,
                      accent: "blue"
                    },
                    {
                      label: "Cleanup & Disposal",
                      value: procedure.cleanupDisposal,
                      accent: "amber"
                    },
                    {
                      label: "Data Handoff",
                      value: procedure.dataHandoff,
                      accent: "violet"
                    }
                  ] satisfies ExecutionStep[]
                ).filter(step => step.value && step.value !== "Not specified")

                const stepGroups: Array<{
                  label: string
                  steps: ProcedureStep[]
                }> = [
                  {
                    label: "Sample Preparation",
                    steps: procedure.samplePreparation ?? []
                  },
                  {
                    label: "Measurement Steps",
                    steps: procedure.measurementSteps ?? []
                  },
                  {
                    label: "Experimental Condition Execution",
                    steps: procedure.experimentalConditionExecution ?? []
                  }
                ].filter(g => g.steps.length > 0)

                if (procedureSteps.length === 0 && stepGroups.length === 0) {
                  return (
                    <p className="text-muted-foreground">
                      Procedure output pending.
                    </p>
                  )
                }

                return (
                  <div className="space-y-5">
                    {stepGroups.map(group => (
                      <div key={group.label}>
                        <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                          {group.label}
                        </h4>
                        <div className="mt-2">
                          <ProcedureStepsView steps={group.steps} />
                        </div>
                      </div>
                    ))}
                    {procedureSteps.length > 0 && (
                      <div className="grid gap-3">
                        {procedureSteps.map(step => (
                          <StepCard
                            key={step.label}
                            title={step.label}
                            body={step.value}
                            accent={step.accent}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
            </SectionCard>
          )}
          {generatedDesign.statisticalReview && (
            <SectionCard
              title="Statistical Review"
              description="Quality checks by the StatCheck agent."
              badge="QA"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-emerald-500/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                    What Looks Good
                  </p>
                  <ReactMarkdown
                    className={markdownClasses}
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={structuredMarkdownComponents}
                  >
                    {generatedDesign.statisticalReview.whatLooksGood ||
                      "No notes provided."}
                  </ReactMarkdown>
                </div>
                <div className="rounded-lg bg-rose-500/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-400">
                    Problems / Risks
                  </p>
                  <ReactMarkdown
                    className={markdownClasses}
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={structuredMarkdownComponents}
                  >
                    {generatedDesign.statisticalReview.problemsOrRisks
                      ?.map((item: string) => `- ${item}`)
                      .join("\n") || "None reported."}
                  </ReactMarkdown>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                    Suggested Improvements
                  </p>
                  <ReactMarkdown
                    className={markdownClasses}
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={structuredMarkdownComponents}
                  >
                    {generatedDesign.statisticalReview.suggestedImprovements
                      ?.map((item: string) => `- ${item}`)
                      .join("\n") || "No improvements suggested."}
                  </ReactMarkdown>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                    Overall Assessment
                  </p>
                  <ReactMarkdown
                    className={markdownClasses}
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={structuredMarkdownComponents}
                  >
                    {generatedDesign.statisticalReview.overallAssessment ||
                      "No assessment provided."}
                  </ReactMarkdown>
                </div>
              </div>
              {generatedDesign.statisticalReview.finalAssessment && (
                <div className="mt-3 rounded-lg bg-violet-500/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
                    Final Assessment
                  </p>
                  <ReactMarkdown
                    className={markdownClasses}
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={structuredMarkdownComponents}
                  >
                    {generatedDesign.statisticalReview.finalAssessment}
                  </ReactMarkdown>
                </div>
              )}
              {generatedDesign.statisticalReview.analysisPlan && (
                <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-500">
                    Statistical Analysis Plan
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li>
                      <span className="font-semibold">Primary test:</span>{" "}
                      {
                        generatedDesign.statisticalReview.analysisPlan
                          .primaryTest
                      }
                    </li>
                    <li>
                      <span className="font-semibold">n per group:</span>{" "}
                      {generatedDesign.statisticalReview.analysisPlan.nPerGroup}
                    </li>
                    <li>
                      <span className="font-semibold">Power estimate:</span>{" "}
                      {
                        generatedDesign.statisticalReview.analysisPlan
                          .powerEstimate
                      }
                    </li>
                    <li>
                      <span className="font-semibold">
                        Significance threshold:
                      </span>{" "}
                      {
                        generatedDesign.statisticalReview.analysisPlan
                          .significanceThreshold
                      }
                    </li>
                    <li>
                      <span className="font-semibold">Effect-size metric:</span>{" "}
                      {
                        generatedDesign.statisticalReview.analysisPlan
                          .effectSizeMetric
                      }
                    </li>
                    <li>
                      <span className="font-semibold">
                        Multiple-comparisons correction:
                      </span>{" "}
                      {
                        generatedDesign.statisticalReview.analysisPlan
                          .multipleComparisonsCorrection
                      }
                    </li>
                    {generatedDesign.statisticalReview.analysisPlan
                      .secondaryAnalyses && (
                      <li>
                        <span className="font-semibold">
                          Secondary analyses:
                        </span>{" "}
                        {
                          generatedDesign.statisticalReview.analysisPlan
                            .secondaryAnalyses
                        }
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </SectionCard>
          )}
          {generatedDesign.finalNotes && (
            <SectionCard title="Final Notes">
              <p>{generatedDesign.finalNotes}</p>
            </SectionCard>
          )}
        </CardContent>
      </Card>
    )

  const citationsCard =
    generatedLiteratureSummary &&
    (generatedLiteratureSummary.citations?.length ||
      generatedLiteratureSummary.citationsDetailed?.length) ? (
      <Card>
        <CardHeader>
          <CardTitle>Citations & Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-4 text-sm">
          {generatedLiteratureSummary.citationsDetailed &&
            generatedLiteratureSummary.citationsDetailed.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-foreground text-base font-semibold">
                  Detailed Citations
                </h3>
                <ol className="list-decimal space-y-2 pl-5">
                  {generatedLiteratureSummary.citationsDetailed.map(
                    (cite: any, idx: number) => (
                      <li key={`${cite.title}-${idx}`}>
                        <span className="text-foreground font-semibold">
                          {cite.title}
                        </span>
                        {cite.authors?.length > 0 && (
                          <span className="text-muted-foreground block text-xs">
                            {cite.authors.join(", ")}
                          </span>
                        )}
                        {cite.journal && (
                          <span className="text-muted-foreground block text-xs">
                            {cite.journal}
                            {cite.year ? ` (${cite.year})` : ""}
                          </span>
                        )}
                        {cite.url && (
                          <a
                            href={cite.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary text-xs underline"
                          >
                            View Source
                          </a>
                        )}
                      </li>
                    )
                  )}
                </ol>
              </div>
            )}
          {generatedLiteratureSummary.citations &&
            generatedLiteratureSummary.citations.length > 0 &&
            (!generatedLiteratureSummary.citationsDetailed ||
              generatedLiteratureSummary.citationsDetailed.length === 0) && (
              <div>
                <h3 className="text-foreground text-base font-semibold">
                  Citations
                </h3>
                <ol className="list-decimal space-y-2 pl-5">
                  {generatedLiteratureSummary.citations.map(
                    (cite: string, idx: number) => {
                      // Extract URL from the plain citation string
                      const urlMatch = cite.match(/https?:\/\/[^\s,)}\]]+/)
                      const url = urlMatch?.[0]
                      // Remove the URL from the display text to avoid duplication
                      const displayText = url
                        ? cite
                            .replace(url, "")
                            .replace(/\s{2,}/g, " ")
                            .trim()
                        : cite
                      return (
                        <li key={`cite-${idx}`}>
                          <span>{displayText || cite}</span>
                          {url && (
                            <>
                              {" "}
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary text-xs underline"
                              >
                                View Source
                              </a>
                            </>
                          )}
                        </li>
                      )
                    }
                  )}
                </ol>
              </div>
            )}
          {generatedDesign?.finalNotes && (
            <div>
              <h3 className="text-foreground text-base font-semibold">Notes</h3>
              <p>{generatedDesign.finalNotes}</p>
            </div>
          )}
          {generatedStatReview && (
            <div className="space-y-2">
              <h3 className="text-foreground text-base font-semibold">
                Review Highlights
              </h3>
              <ul className="list-disc space-y-1 pl-5">
                {generatedStatReview.problemsOrRisks?.map(
                  (issue: string, idx: number) => (
                    <li key={`issue-${idx}`}>{issue}</li>
                  )
                )}
                {generatedStatReview.suggestedImprovements?.map(
                  (tip: string, idx: number) => (
                    <li key={`improve-${idx}`}>{tip}</li>
                  )
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    ) : null

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Research Overview</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-4 text-sm">
          <p>{designData?.description || "No description provided."}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {formatList("Objectives", objectives)}
            {formatList("Variables", variables)}
            {formatList("Special Considerations", specialConsiderations)}
          </div>
        </CardContent>
      </Card>

      {!selectedHypothesis && planStatus && renderPlanStatus(planStatus)}

      {planStatus?.literatureContext && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="size-5" />
              Literature Context
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Research insights that informed hypothesis generation
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <SectionCard title="What Others Have Done">
              <ReactMarkdown
                className={markdownClasses}
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={structuredMarkdownComponents}
              >
                {planStatus.literatureContext.whatOthersHaveDone}
              </ReactMarkdown>
            </SectionCard>

            <SectionCard title="Good Methods & Tools">
              <ReactMarkdown
                className={markdownClasses}
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={structuredMarkdownComponents}
              >
                {planStatus.literatureContext.goodMethodsAndTools}
              </ReactMarkdown>
            </SectionCard>

            <SectionCard title="Potential Pitfalls">
              <ReactMarkdown
                className={markdownClasses}
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={structuredMarkdownComponents}
              >
                {planStatus.literatureContext.potentialPitfalls}
              </ReactMarkdown>
            </SectionCard>

            {planStatus.literatureContext.citationsDetailed &&
              planStatus.literatureContext.citationsDetailed.length > 0 && (
                <SectionCard
                  title="Citations"
                  badge={`${planStatus.literatureContext.citationsDetailed.length} sources`}
                >
                  <div className="max-h-96 space-y-3 overflow-y-auto pr-2">
                    {planStatus.literatureContext.citationsDetailed.map(
                      (citation, idx) => (
                        <div
                          key={idx}
                          className="border-border/50 rounded-lg border p-3"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground shrink-0 text-xs font-semibold">
                              [{citation.index}]
                            </span>
                            <div className="space-y-1">
                              <p className="text-foreground text-sm font-medium">
                                {citation.title}
                              </p>
                              {citation.authors.length > 0 && (
                                <p className="text-muted-foreground text-xs">
                                  {citation.authors.join(", ")}
                                </p>
                              )}
                              <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                                {citation.journal && (
                                  <span>{citation.journal}</span>
                                )}
                                {citation.year && (
                                  <span>({citation.year})</span>
                                )}
                                {citation.source && (
                                  <span className="bg-muted rounded px-1.5 py-0.5">
                                    {citation.source}
                                  </span>
                                )}
                              </div>
                              {citation.url && (
                                <a
                                  href={citation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary text-xs hover:underline"
                                >
                                  View source →
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </SectionCard>
              )}
          </CardContent>
        </Card>
      )}

      {topHypotheses && topHypotheses.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Hypotheses</CardTitle>
              {selectedHypothesis && (
                <p className="text-muted-foreground text-xs">
                  {isDesignComplete
                    ? "Experiment design generated."
                    : isGeneratingDesign
                      ? "Generating experiment design…"
                      : "Hypothesis selected. Pick another if needed."}
                </p>
              )}
            </div>
            {selectedHypothesis && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllHypotheses(prev => !prev)}
              >
                {showAllHypotheses ? "Hide list" : "Change hypothesis"}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedHypothesis && (
              <div className="border-border/70 bg-background/80 rounded-lg border p-4 shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-foreground text-sm font-semibold">
                        {selectedHypothesis.content}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {selectedHypothesis.explanation}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isDesignComplete
                          ? "bg-emerald-500/10 text-emerald-500"
                          : isGeneratingDesign
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-primary/10 text-primary"
                      }`}
                    >
                      {isDesignComplete
                        ? "Design ready"
                        : isGeneratingDesign
                          ? "In progress"
                          : "Selected"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="text-muted-foreground">
                        Hypothesis ID: {selectedHypothesis.hypothesisId}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReasoningHypothesis(selectedHypothesis)
                        setReasoningDialogOpen(true)
                      }}
                    >
                      <Info className="mr-1.5 size-3.5" />
                      Why this hypothesis?
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {(!selectedHypothesis || showAllHypotheses) && (
              <div className="space-y-4">
                {topHypotheses.map(hypothesis => {
                  const isSelected =
                    selectedHypothesisId === hypothesis.hypothesisId
                  const isGenerating =
                    generatingHypothesisId === hypothesis.hypothesisId

                  return (
                    <div
                      key={hypothesis.hypothesisId}
                      className={`border-border space-y-2 rounded-lg border p-4 ${
                        isSelected ? "border-primary shadow-md" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="text-foreground text-base font-semibold">
                            {hypothesis.content}
                          </h3>
                          {hypothesis.explanation && (
                            <p className="text-muted-foreground text-sm">
                              {hypothesis.explanation}
                            </p>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground mt-1"
                            onClick={() => {
                              setReasoningHypothesis(hypothesis)
                              setReasoningDialogOpen(true)
                            }}
                          >
                            <Info className="mr-1.5 size-3.5" />
                            Why this hypothesis?
                          </Button>
                        </div>
                        {!readOnly && (
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex flex-col items-end gap-2">
                              <Button
                                size="sm"
                                disabled={isGenerating}
                                onClick={() => onGenerateDesign?.(hypothesis)}
                              >
                                {isGenerating ? (
                                  <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Generating…
                                  </>
                                ) : (
                                  "Generate Experiment Design"
                                )}
                              </Button>
                              {hypothesesWithSavedDesigns.has(
                                hypothesis.hypothesisId
                              ) && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={isGenerating}
                                  onClick={() =>
                                    onLoadSavedDesign?.(hypothesis)
                                  }
                                >
                                  <Download className="mr-2 size-4" />
                                  Load Design
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isGenerating}
                                onClick={() => onCustomizePrompts?.(hypothesis)}
                              >
                                Customize Prompts
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      {isSelected && isGenerating && (
                        <p className="text-muted-foreground text-xs">
                          Generating experiment design…
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {designError && (
              <p className="text-destructive text-sm">{designError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {selectedHypothesis && isGeneratingDesign && (
        <Card>
          <CardHeader>
            <CardTitle>Design Agent Progress</CardTitle>
            <p className="text-muted-foreground text-xs">
              Tracking multi-agent pipeline for “
              {selectedHypothesis.content.slice(0, 80)}
              {selectedHypothesis.content.length > 80 ? "…" : ""}”
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                title: "Literature Scout",
                description: "Reviewing and summarizing relevant papers."
              },
              {
                title: "Experiment Designer",
                description: "Constructing the experimental blueprint."
              },
              {
                title: "Stat Check",
                description:
                  "Reviewing and upgrading the design for statistical soundness."
              },
              {
                title: "Planner",
                description:
                  "Computing materials, buffers, and logistics for execution."
              },
              {
                title: "Procedure",
                description: "Writing the bench-ready SOP."
              },
              {
                title: "Report Writer",
                description: "Compiling the final document."
              }
            ].map((step, index) => {
              const isCurrent = index === 0
              return (
                <div
                  key={step.title}
                  className="border-border/70 bg-background/80 flex items-start gap-3 rounded-lg border p-3"
                >
                  <div className="mt-1">
                    {isCurrent ? (
                      <Loader2 className="text-primary size-4 animate-spin" />
                    ) : (
                      <Clock className="text-muted-foreground size-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-foreground font-semibold">
                      {step.title}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {!selectedHypothesis && logs && logs.length > 0 && renderLogs(logs)}

      {(!planStatus || planStatus.status !== "completed") &&
        designData?.reportWriterOutput &&
        renderLegacyReport(designData.reportWriterOutput)}

      {!planStatus && !designData?.reportWriterOutput && (
        <Card>
          <CardHeader>
            <CardTitle>Design Output</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              No generated output is available for this design yet.
            </p>
          </CardContent>
        </Card>
      )}

      {designReportCard}
      {citationsCard}

      <Dialog open={reasoningDialogOpen} onOpenChange={setReasoningDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hypothesis Reasoning</DialogTitle>
            <DialogDescription>
              Detailed explanation of why this hypothesis was generated and
              selected
            </DialogDescription>
          </DialogHeader>
          {reasoningHypothesis && (
            <div className="space-y-4">
              <div className="border-border rounded-lg border p-4">
                <h4 className="text-foreground mb-2 font-semibold">
                  Hypothesis
                </h4>
                <p className="text-foreground text-sm">
                  {reasoningHypothesis.content}
                </p>
              </div>

              <div className="border-border rounded-lg border p-4">
                <h4 className="text-foreground mb-2 font-semibold">
                  Scientific Rationale
                </h4>
                <p className="text-muted-foreground text-sm">
                  {reasoningHypothesis.explanation ||
                    "No explanation provided."}
                </p>
              </div>

              {reasoningHypothesis.provenance &&
                reasoningHypothesis.provenance.length > 0 && (
                  <div className="border-border rounded-lg border p-4">
                    <h4 className="text-foreground mb-2 font-semibold">
                      Provenance & Sources
                    </h4>
                    <div className="text-muted-foreground space-y-2 text-sm">
                      {reasoningHypothesis.provenance.map((source, idx) => {
                        const sourceStr =
                          typeof source === "string"
                            ? source
                            : JSON.stringify(source, null, 2)
                        const linked = linkProvenanceToCitation(
                          sourceStr,
                          planStatus?.literatureContext
                            ?.citationsDetailed as CitationDetailItem[]
                        )

                        return (
                          <div
                            key={idx}
                            className="border-border/50 rounded border p-2"
                          >
                            {linked.matchedCitation ? (
                              <div className="space-y-1">
                                <p className="text-sm">{linked.text}</p>
                                <a
                                  href={linked.matchedCitation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                                >
                                  [{linked.matchedCitation.index}]{" "}
                                  {linked.matchedCitation.title}
                                  {linked.matchedCitation.year && (
                                    <span className="text-muted-foreground">
                                      ({linked.matchedCitation.year})
                                    </span>
                                  )}
                                  <span>&#8599;</span>
                                </a>
                              </div>
                            ) : linked.extractedUrl ? (
                              <div className="space-y-1">
                                <p className="text-sm">{linked.text}</p>
                                <a
                                  href={linked.extractedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                                >
                                  {linked.extractedUrl}
                                  <span>&#8599;</span>
                                </a>
                              </div>
                            ) : typeof source === "string" ? (
                              <p>{source}</p>
                            ) : (
                              <ReactMarkdown
                                className={markdownClasses}
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={structuredMarkdownComponents}
                              >
                                {JSON.stringify(source, null, 2)}
                              </ReactMarkdown>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

              {planStatus?.literatureContext?.citationsDetailed && (
                <div className="border-border rounded-lg border p-4">
                  <h4 className="text-foreground mb-2 font-semibold">
                    Related Citations from Literature Review
                  </h4>
                  <p className="text-muted-foreground mb-3 text-xs">
                    These papers informed the generation of all hypotheses for
                    this research plan
                  </p>
                  <div className="max-h-60 space-y-3 overflow-y-auto pr-2">
                    {planStatus.literatureContext.citationsDetailed.map(
                      (citation, idx) => (
                        <div
                          key={idx}
                          className="border-border/50 rounded-lg border p-3"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground shrink-0 text-xs font-semibold">
                              [{citation.index}]
                            </span>
                            <div className="space-y-1">
                              <p className="text-foreground text-sm font-medium">
                                {citation.title}
                              </p>
                              {citation.authors.length > 0 && (
                                <p className="text-muted-foreground text-xs">
                                  {citation.authors.join(", ")}
                                </p>
                              )}
                              <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                                {citation.journal && (
                                  <span>{citation.journal}</span>
                                )}
                                {citation.year && (
                                  <span>({citation.year})</span>
                                )}
                                {citation.source && (
                                  <span className="bg-muted rounded px-1.5 py-0.5">
                                    {citation.source}
                                  </span>
                                )}
                              </div>
                              {citation.url && (
                                <a
                                  href={citation.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary text-xs hover:underline"
                                >
                                  View source →
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Quality Metrics block removed (issue #21). Scientists asked
                  for relevance-only scoring; feasibility + novelty introduced
                  confusion when the ranking order didn't match relevance. */}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
