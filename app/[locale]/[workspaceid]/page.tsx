"use client"

import {
  IconFileText,
  IconFlask,
  IconFolder,
  IconMessage,
  IconPlus
} from "@tabler/icons-react"
import { useRouter, useSearchParams } from "next/navigation"
import { FC, useContext, useEffect, useMemo, useState } from "react"

import { getProjectsByWorkspaceId } from "@/db/projects"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
// Chip primitive was used by the old multi-coloured tag row on
// design / report / chat slabs. The new slab layout uses inline
// status pills with their own tailwind classes (CHIP_PROJECT,
// STATUS_COMPLETED, etc) so we no longer pull Chip in here.
import { DisplayHeading, Eyebrow } from "@/components/ui/typography"
// StageId still referenced by the props for DesignsList items
// (current_stage / approved_phases come off the Firestore row); STAGES
// list itself is unused now that PhaseBar is gone.
import { type StageId } from "@/components/design-flow/stepper"
import { ChatbotUIContext } from "@/context/context"
import { getDesignProgress } from "@/lib/design-status"
import { formatCreatedModifiedStacked } from "@/lib/format-date"
import { SlabPager } from "@/components/ui/slab-pager"
import { SlabRow } from "@/components/ui/slab-row"
import { cn } from "@/lib/utils"
import { track } from "@/lib/analytics"

// Page size for the dashboard previews. Same value for all three
// lists so the rhythm reads consistently.
const DASH_PAGE_SIZE = 8

// Status pill styles shared by Design + Report slabs. Light-green for
// completed is the scientist's ask - signals "this is done" at a
// glance vs the amber in-progress chip.
const STATUS_COMPLETED =
  "rounded-full border border-transparent bg-[#DDE9DF] px-2 py-0.5 text-[10.5px] font-medium text-[#1F4A2C]"
const STATUS_IN_PROGRESS =
  "rounded-full border border-amber-300/40 bg-amber-100/70 px-2 py-0.5 text-[10.5px] font-medium text-amber-800"
const STATUS_DRAFT =
  "rounded-full border border-purple-persona/30 bg-purple-persona-tint px-2 py-0.5 text-[10.5px] font-medium text-purple-persona"
// Locked entity chips (item: folder=project, flask=design, report=report,
// message=chat) - each its own colour so the attribution reads at a glance.
const CHIP_PROJECT =
  "inline-flex items-center gap-1 rounded-full border border-teal-journey/30 bg-teal-journey-tint px-2 py-0.5 text-[10.5px] font-medium text-teal-journey"
const CHIP_DESIGN =
  "inline-flex items-center gap-1 rounded-full border border-orange-product/30 bg-orange-product-tint px-2 py-0.5 text-[10.5px] font-medium text-orange-product"
const CHIP_REPORT =
  "inline-flex items-center gap-1 rounded-full border border-sage-brand/30 bg-sage-brand-tint px-2 py-0.5 text-[10.5px] font-medium text-sage-brand"
const CHIP_STAGE =
  "rounded-full border border-purple-persona/30 bg-purple-persona-tint px-2 py-0.5 text-[10.5px] font-medium text-purple-persona"
// How a design was produced: the hands-free pipeline, or the researcher
// driving each stage. Different colours so the two are separable at a glance.
const CHIP_MODE_AUTO =
  "rounded-full border border-brick/30 bg-brick/10 px-2 py-0.5 text-[10.5px] font-medium text-brick"
const CHIP_MODE_OWN =
  "rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-[10.5px] font-medium text-ink-600"

function greeting(now = new Date()) {
  const h = now.getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

function formatDay(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short"
  })
}

interface StatProps {
  label: string
  value: string | number
  sub: string
  active?: boolean
  onClick?: () => void
}
const Stat: FC<StatProps> = ({ label, value, sub, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "border-line bg-surface hover:border-line-strong rounded-xl border p-[18px] text-left transition-colors",
      active && "border-ink ring-rust-soft ring-2"
    )}
    aria-pressed={active}
  >
    <Eyebrow className="text-[10px]">{label}</Eyebrow>
    <div className="font-display text-ink mt-1.5 text-[30px] tracking-[-0.01em]">
      {value}
    </div>
    <div className="text-ink-3 mt-0.5 text-[11.5px]">{sub}</div>
  </button>
)

type ListKind = "designs" | "reports" | "chats"

export default function WorkspacePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedWorkspace, profile, designs, reports, chats } =
    useContext(ChatbotUIContext)
  // Legacy `query` state from the removed Quick-start input - the
  // Jarvis hero owns the prompt textarea now, so this state is no
  // longer wired to any input. Left out entirely.
  // `?list=chats|reports` deep-links a specific list (e.g. a chat's Back arrow
  // returns the user to the dashboard Chats list, not the design/project).
  const initialList = ((): ListKind => {
    const l = searchParams?.get("list")
    return l === "chats" || l === "reports" ? l : "designs"
  })()
  const [activeList, setActiveList] = useState<ListKind>(initialList)
  // Projects aren't on the global context; fetch once so list rows can
  // resolve project_id → name for cross-project attribution chips.
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>(
    []
  )
  // Free-plan experiment quota → show "N of 3 free designs left" in the hero.
  const [freeDesigns, setFreeDesigns] = useState<{
    left: number
    limit: number
  } | null>(null)

  const firstName =
    profile?.display_name?.split(" ")[0] || profile?.username || "there"
  const wsId = selectedWorkspace?.id

  useEffect(() => {
    let cancelled = false
    fetch("/api/billing/usage")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled || !d?.summary || d.summary.plan !== "free") return
        setFreeDesigns({
          left: d.summary.experimentsLeft,
          limit: d.summary.experimentLimit
        })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!wsId) return
    let cancelled = false
    void getProjectsByWorkspaceId(wsId)
      .then((rows: any[]) => {
        if (!cancelled) {
          setProjects(
            (rows ?? []).map(p => ({ id: p.id, name: p.name as string }))
          )
        }
      })
      .catch(err =>
        console.warn("[WorkspacePage] failed to load projects:", err)
      )
    return () => {
      cancelled = true
    }
  }, [wsId])

  const projectName = (id: string | null | undefined) =>
    (id && projects.find(p => p.id === id)?.name) || null

  const sortedDesigns = useMemo(
    () =>
      [...designs].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      ),
    [designs]
  )
  const sortedReports = useMemo(
    () =>
      [...reports].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      ),
    [reports]
  )

  // Resolve a report's parent design name. Reports are now generated from a
  // design (source_design_id), so the slab attributes each report to its
  // design rather than a project.
  const designNameOf = (id: string | null | undefined) =>
    (id && designs.find(d => d.id === id)?.name) || null

  const sortedChats = useMemo(
    () =>
      [...chats].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      ),
    [chats]
  )

  // A chat carries no "in progress / completed" status, so its slab is
  // attributed instead: the project it belongs to + which design it was held
  // with. A project-scoped chat spans every design → "All designs".
  const chatAttribution = (
    c: (typeof chats)[number]
  ): {
    project: string | null
    scopeLabel: string
    scopeKind: "design" | "report" | "project" | "general"
  } => {
    if (c.scope === "design") {
      const d = designs.find(x => x.id === c.scope_id)
      return {
        project: projectName(d?.project_id ?? c.project_id),
        scopeLabel: d?.name ?? "Design",
        scopeKind: "design"
      }
    }
    if (c.scope === "project") {
      return {
        project: projectName(c.project_id ?? c.scope_id),
        scopeLabel: "All designs",
        scopeKind: "project"
      }
    }
    if (c.scope === "report") {
      const r = reports.find(x => x.id === c.scope_id)
      const d = r
        ? designs.find(x => x.id === (r as any).source_design_id)
        : null
      return {
        project: projectName(c.project_id ?? d?.project_id),
        scopeLabel: r?.name ?? "Report",
        scopeKind: "report"
      }
    }
    return {
      project: projectName(c.project_id),
      scopeLabel: "General",
      scopeKind: "general"
    }
  }

  // Project name for a report → via its source design's project.
  const projectOfReport = (r: { source_design_id?: string | null }) =>
    projectName(designs.find(d => d.id === r.source_design_id)?.project_id)

  // In-progress heuristic: touched in the last 14 days (in lieu of loading
  // approvedPhases from Firestore for every design). Completed = total − active.
  const inProgressCount = useMemo(() => {
    const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000
    return designs.filter(d => {
      const ts = d.updated_at || d.created_at
      return ts && Date.now() - new Date(ts).getTime() < FOURTEEN_DAYS_MS
    }).length
  }, [designs])
  const completedCount = designs.length - inProgressCount

  // Reports completion mirrors the reports page: a report is "completed" once
  // it has a generated draft (`report_draft`), otherwise it's in progress.
  const reportsCompletedCount = useMemo(
    () => reports.filter(r => !!(r as any).report_draft).length,
    [reports]
  )
  const reportsInProgressCount = reports.length - reportsCompletedCount

  const startDesign = (seed?: string) => {
    if (!wsId) return
    track("new_design_clicked", { source: seed ? "suggestion" : "button" })
    const base = `/${wsId}/designs/new`
    router.push(seed ? `${base}?q=${encodeURIComponent(seed)}` : base)
  }

  // The first-run GuidedTour is armed ONLY by a fresh onboarding completion
  // (see onboarding-form) or the Tutorial button - never re-armed here, so it
  // can't reappear for existing accounts or after the user skips it.

  return (
    <div className="bg-paper h-full overflow-auto px-10 pb-16 pt-7">
      <div className="mx-auto max-w-[1060px]">
        {/* Hero */}
        <div className="mb-7 flex items-end justify-between gap-5">
          <div>
            <Eyebrow>
              {selectedWorkspace?.name || "Workspace"} · {formatDay(new Date())}
            </Eyebrow>
            <DisplayHeading as="h1" className="mb-1 mt-1.5 text-[42px]">
              {greeting()}, <span className="text-rust">{firstName}</span>
            </DisplayHeading>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* New design opens the create-design page directly - the
                multi-mode dropdown was removed; the page itself handles how
                the user wants to start. */}
            <Button
              variant="primary"
              size="lg"
              onClick={() => startDesign()}
              data-tour="new-design"
            >
              <IconPlus size={14} stroke={2.4} /> New design
            </Button>
            {freeDesigns && (
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium",
                  freeDesigns.left <= 0
                    ? "border-rust/30 bg-rust-soft text-rust"
                    : "border-line bg-surface text-ink-3"
                )}
              >
                {freeDesigns.left} of {freeDesigns.limit} free designs left
              </span>
            )}
          </div>
        </div>

        {/* Stats - clicking switches the list shown below */}
        <div className="mb-7 grid grid-cols-3 gap-3.5">
          <Stat
            label="Total designs"
            value={designs.length}
            sub={
              designs.length === 0
                ? "none yet"
                : `${inProgressCount} in progress · ${completedCount} completed`
            }
            active={activeList === "designs"}
            onClick={() => setActiveList("designs")}
          />
          <Stat
            label="Total reports"
            value={reports.length}
            sub={
              reports.length === 0
                ? "none yet"
                : `${reportsInProgressCount} in progress · ${reportsCompletedCount} completed`
            }
            active={activeList === "reports"}
            onClick={() => setActiveList("reports")}
          />
          <Stat
            label="Total chats"
            value={chats.length}
            sub={chats.length === 0 ? "none yet" : "across your projects"}
            active={activeList === "chats"}
            onClick={() => setActiveList("chats")}
          />
        </div>

        {/* Active list */}
        {activeList === "designs" && (
          <DesignsList
            items={sortedDesigns}
            wsId={wsId}
            onNew={() => startDesign()}
            projectNameOf={projectName}
          />
        )}
        {activeList === "reports" && (
          <ReportsList
            items={sortedReports}
            wsId={wsId}
            designNameOf={designNameOf}
            projectOf={projectOfReport}
          />
        )}
        {activeList === "chats" && (
          <ChatsList
            items={sortedChats}
            wsId={wsId}
            attributionOf={chatAttribution}
          />
        )}
      </div>
    </div>
  )
}

function ListHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3.5 flex items-baseline justify-between">
      <DisplayHeading as="h2" className="text-[22px]">
        {title}
      </DisplayHeading>
      <div className="text-ink-3 font-mono text-[12px]">{count} total</div>
    </div>
  )
}

interface DesignsListProps {
  items: Array<{
    id: string
    name: string
    description?: string | null
    project_id?: string | null
    updated_at?: string | null
    created_at: string
    current_stage?: StageId | null
    approved_phases?: StageId[] | null
    /** Raw Firestore JSON; we parse it for progress when the column-style
        fields aren't present (the API only denormalises some rows). */
    content?: string | Record<string, unknown> | null
  }>
  wsId?: string
  onNew: () => void
  projectNameOf: (id: string | null | undefined) => string | null
}

function DesignsList({ items, wsId, onNew, projectNameOf }: DesignsListProps) {
  const router = useRouter()
  const [page, setPage] = useState(0)
  if (items.length === 0) {
    return (
      <>
        <ListHeader title="Designs" count={0} />
        <Card className="p-10 text-center">
          <IconFlask size={28} className="text-ink-3 mx-auto mb-3" />
          <div className="text-ink mb-1 text-[14px] font-semibold">
            No designs yet
          </div>
          <div className="text-ink-3 mb-5 text-[13px]">
            Start from a research question and Shadow AI builds the full
            experiment - click New design to begin.
          </div>
          <Button variant="primary" size="sm" onClick={onNew}>
            <IconPlus size={12} /> New design
          </Button>
        </Card>
      </>
    )
  }
  const start = page * DASH_PAGE_SIZE
  const paged = items.slice(start, start + DASH_PAGE_SIZE)
  return (
    <>
      <ListHeader title="Designs" count={items.length} />
      <SlabPager
        total={items.length}
        page={page}
        pageSize={DASH_PAGE_SIZE}
        onPageChange={setPage}
      >
        <div className="flex flex-col gap-2.5">
          {paged.map(d => {
            const pname = projectNameOf(d.project_id)
            const progress = getDesignProgress(d)
            const isCompleted =
              progress.isCompleted ||
              (d.approved_phases ?? []).includes("design")
            const dateLines = formatCreatedModifiedStacked(
              d.created_at,
              d.updated_at
            )
            return (
              <SlabRow
                key={d.id}
                onClick={() =>
                  wsId &&
                  router.push(
                    `/${wsId}/designs/${d.id}?tab=overview&ret=${encodeURIComponent(`/${wsId}`)}`
                  )
                }
                dateLines={dateLines}
              >
                <div className="text-ink truncate text-[15px] font-semibold">
                  {d.name}
                </div>
                {d.description && (
                  <div className="text-ink-3 mt-1 line-clamp-1 text-[12.5px]">
                    {d.description}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {pname && (
                    <span className={CHIP_PROJECT}>
                      <IconFolder size={10} /> {pname}
                    </span>
                  )}
                  {/* How the design was built. An auto run and a hand-driven
                      one read identically in this list, yet they warrant very
                      different scrutiny - the auto one chose its own papers,
                      hypothesis and iterations. */}
                  <span
                    className={
                      progress.isAutoGenerated ? CHIP_MODE_AUTO : CHIP_MODE_OWN
                    }
                  >
                    {progress.isAutoGenerated ? "Auto mode" : "Built by you"}
                  </span>
                  <span
                    className={
                      isCompleted ? STATUS_COMPLETED : STATUS_IN_PROGRESS
                    }
                  >
                    {isCompleted ? "Completed" : "In progress"}
                  </span>
                  {!isCompleted && progress.currentStageLabel && (
                    <span className={CHIP_STAGE}>
                      Stage: {progress.currentStageLabel}
                    </span>
                  )}
                </div>
              </SlabRow>
            )
          })}
        </div>
      </SlabPager>
    </>
  )
}

// PhaseBar removed - the scientist asked for the grey bars next to
// the dates to come off the dashboard slabs. Stage info now lives on
// the "Stage:" chip in DesignsList alongside the in-progress status.

interface ReportsListProps {
  items: Array<{
    id: string
    name?: string | null
    description?: string | null
    /** Parent design this report was generated from. */
    source_design_id?: string | null
    /** Generated report body - when non-empty we mark the report Completed. */
    report_draft?: unknown
    updated_at?: string | null
    created_at: string
  }>
  wsId?: string
  designNameOf: (id: string | null | undefined) => string | null
  projectOf: (r: { source_design_id?: string | null }) => string | null
}

function ReportsList({
  items,
  wsId,
  designNameOf,
  projectOf
}: ReportsListProps) {
  const router = useRouter()
  const [page, setPage] = useState(0)
  if (items.length === 0) {
    return (
      <>
        <ListHeader title="Reports" count={0} />
        <Card className="p-10 text-center">
          <IconFileText size={28} className="text-ink-3 mx-auto mb-3" />
          <div className="text-ink mb-1 text-[14px] font-semibold">
            No reports yet
          </div>
          <div className="text-ink-3 text-[13px]">
            Reports appear here once you generate one from a design.
          </div>
        </Card>
      </>
    )
  }
  const start = page * DASH_PAGE_SIZE
  const paged = items.slice(start, start + DASH_PAGE_SIZE)
  return (
    <>
      <ListHeader title="Reports" count={items.length} />
      <SlabPager
        total={items.length}
        page={page}
        pageSize={DASH_PAGE_SIZE}
        onPageChange={setPage}
      >
        <div className="flex flex-col gap-2.5">
          {paged.map(r => {
            const dname = designNameOf(r.source_design_id)
            const pname = projectOf(r)
            const draft = r.report_draft
            const reportCompleted =
              (typeof draft === "string" && draft.trim().length > 0) ||
              (!!draft &&
                typeof draft === "object" &&
                Object.keys(draft as Record<string, unknown>).length > 0)
            const dateLines = formatCreatedModifiedStacked(
              r.created_at,
              r.updated_at
            )
            return (
              <SlabRow
                key={r.id}
                onClick={() => wsId && router.push(`/${wsId}/reports/${r.id}`)}
                dateLines={dateLines}
              >
                <div className="text-ink truncate text-[15px] font-semibold">
                  {r.name || "Untitled report"}
                </div>
                {r.description && (
                  <div className="text-ink-3 mt-1 line-clamp-1 text-[12.5px]">
                    {r.description}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {pname && (
                    <span className={CHIP_PROJECT}>
                      <IconFolder size={10} /> {pname}
                    </span>
                  )}
                  {dname && (
                    <span className={CHIP_DESIGN}>
                      <IconFlask size={10} /> {dname}
                    </span>
                  )}
                  <span
                    className={
                      reportCompleted ? STATUS_COMPLETED : STATUS_IN_PROGRESS
                    }
                  >
                    {reportCompleted ? "Completed" : "In progress"}
                  </span>
                </div>
              </SlabRow>
            )
          })}
        </div>
      </SlabPager>
    </>
  )
}

interface ChatsListProps {
  items: Array<{
    id: string
    name: string
    updated_at?: string | null
    created_at: string
    scope?: string | null
    scope_id?: string | null
    project_id?: string | null
  }>
  wsId?: string
  attributionOf: (c: any) => {
    project: string | null
    scopeLabel: string
    scopeKind: "design" | "report" | "project" | "general"
  }
}

function ChatsList({ items, wsId, attributionOf }: ChatsListProps) {
  const router = useRouter()
  const [page, setPage] = useState(0)
  if (items.length === 0) {
    return (
      <>
        <ListHeader title="Chats" count={0} />
        <Card className="p-10 text-center">
          <IconMessage size={28} className="text-ink-3 mx-auto mb-3" />
          <div className="text-ink mb-1 text-[14px] font-semibold">
            No chats yet
          </div>
          <div className="text-ink-3 text-[13px]">
            Open a design or project and start a chat - your conversations show
            up here, attributed to the design they were held with.
          </div>
        </Card>
      </>
    )
  }
  const start = page * DASH_PAGE_SIZE
  const paged = items.slice(start, start + DASH_PAGE_SIZE)
  return (
    <>
      <ListHeader title="Chats" count={items.length} />
      <SlabPager
        total={items.length}
        page={page}
        pageSize={DASH_PAGE_SIZE}
        onPageChange={setPage}
      >
        <div className="flex flex-col gap-2.5">
          {paged.map(c => {
            const { project, scopeLabel, scopeKind } = attributionOf(c)
            const dateLines = formatCreatedModifiedStacked(
              c.created_at,
              c.updated_at
            )
            const ScopeIcon =
              scopeKind === "report"
                ? IconFileText
                : scopeKind === "project"
                  ? IconFolder
                  : scopeKind === "general"
                    ? IconMessage
                    : IconFlask
            const scopeChip =
              scopeKind === "report"
                ? CHIP_REPORT
                : scopeKind === "design"
                  ? CHIP_DESIGN
                  : CHIP_STAGE
            return (
              <SlabRow
                key={c.id}
                onClick={() => wsId && router.push(`/${wsId}/chat/${c.id}`)}
                dateLines={dateLines}
              >
                <div className="text-ink truncate text-[15px] font-semibold">
                  {c.name || "Untitled chat"}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {project && (
                    <span className={CHIP_PROJECT}>
                      <IconFolder size={10} /> {project}
                    </span>
                  )}
                  <span className={scopeChip}>
                    <ScopeIcon size={10} className="-mt-px mr-1 inline" />
                    {scopeLabel}
                  </span>
                </div>
              </SlabRow>
            )
          })}
        </div>
      </SlabPager>
    </>
  )
}
