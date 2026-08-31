"use client"

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Kbd } from "@/components/ui/kbd"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { AccentTabs, type TabStatus } from "@/components/canvas/accent-tabs"
import {
  Stepper,
  type StageId as DesignStageId
} from "@/components/design-flow/stepper"
// Side chat rail (right split-screen) scoped to this design. Re-introduced
// for the experiment-design pivot: chat lives next to the design so the user
// can ask for edits while looking at it.
import { ScopedChatRail } from "@/components/canvas/scoped-chat-rail"
import ShareDialog from "@/components/design-flow/share-dialog"
import { StudyDetailsModal } from "@/components/design-flow/study-details-modal"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import type { DesignSubViewContext } from "@/components/design-flow/design-sub-views"
import { GenerateReportModal } from "@/components/designs/generate-report-modal"
import { deleteReport, getReportsByWorkspaceId } from "@/db/reports-firestore"
import { exportReportToPDF } from "@/lib/report/export"
import { DEFAULT_TEMPLATE_ID, getTemplate } from "@/lib/report/templates"
import { ClarifyStep } from "@/components/design-flow/clarify-step"
import { handleBudgetError } from "@/lib/billing/handle-budget-error"
import { DesignCoach } from "@/components/onboarding/design-coach"
import { clarifyAnswersToText } from "@/lib/design/clarify-shared"
import { trackDecision } from "@/lib/eval/track"
import { OutputRating } from "@/components/eval/output-rating"
import { editedRatio } from "@/lib/eval/types"
import type { ClarifyAnswer } from "@/lib/design-agent"
import type { Sharing } from "@/types/sharing"
import { addPaperToLibrary } from "@/db/paper-library"
import { createFileBasedOnExtension } from "@/db/files"
import { supabase } from "@/lib/supabase/browser-client"
import { ChatbotUIContext } from "@/context/context"
import { useToast } from "@/app/hooks/use-toast"
import { toast } from "sonner"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend as RLegend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis
} from "recharts"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  DEFAULT_DESIGN_EFFORT,
  DESIGN_DOMAIN_OPTIONS,
  DESIGN_PHASE_OPTIONS,
  PHASE_ORDER,
  type DesignAssumption,
  type DesignContentV2,
  type DesignDomain,
  type DesignEffort,
  type DesignPhase,
  type DesignSection,
  type DesignVersionSnapshot,
  type ExperimentIteration,
  type GeneratedDesign,
  type Hypothesis,
  type Paper,
  type ParsedLabData,
  type PhaseKey,
  type PreLabSimulation,
  type ProblemContext,
  type ValidationState,
  type ValidationVerdict
} from "@/lib/design-agent"
import { buildDesignChatContext } from "@/lib/design/chat-context"
import { cleanPaperTitle } from "@/lib/design/paper-title"
import {
  downloadBenchExecutionGuide,
  downloadMaterialList,
  downloadOverview,
  downloadRationaleCitations,
  downloadSOP,
  type ExportableDesign
} from "@/lib/design/export"
import { labStandardsToText } from "@/lib/settings/preferences"
import { track } from "@/lib/analytics"
import { applyDesignPatch } from "@/lib/design/apply-patch"
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconBook,
  IconBookmark,
  IconBookmarkFilled,
  IconBulb,
  IconBooks,
  IconChartBar,
  IconChartHistogram,
  IconCheck,
  IconChevronDown,
  IconArrowBackUp,
  IconClipboardText,
  IconDownload,
  IconTrash,
  IconFileText,
  IconFlask,
  IconInfoCircle,
  IconLayoutGrid,
  IconListDetails,
  IconLoader2,
  IconNote,
  IconPencil,
  IconQuote,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSend,
  IconShare,
  IconSparkles,
  IconTargetArrow,
  IconUpload,
  IconVariable,
  IconX
} from "@tabler/icons-react"

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

async function runAgentPhase(
  designId: string,
  body: Record<string, unknown>
): Promise<DesignContentV2> {
  const res = await fetch(`/api/design/${designId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => "")
    throw new Error(msg || `Generation failed (${res.status})`)
  }
  const json = await res.json()
  return json.content as DesignContentV2
}

export type PhaseProgress = {
  step: string
  message: string
  [k: string]: unknown
}

export type LiteratureProgress = PhaseProgress & {
  primaryQuery?: string
  totalPapers?: number
  sourceCounts?: Record<string, number>
  papersCount?: number
  // Per-round + filter step fields (#paper-finder). All optional so
  // the union still parses when an older event arrives without them.
  round?: number
  totalRounds?: number
  uniqueSoFar?: number
  dropped?: number
  remaining?: number
  // Richer commentary fields. `detail` is a short freeform string the
  // UI renders below the message line. `query` + `elapsedMs` are
  // emitted by the per-round event so we can show "q: '…' · 23.4s".
  // `intent` is the LLM-assigned angle for this round (mechanism /
  // methods / applications / etc.) - used in the round detail line.
  detail?: string
  query?: string
  elapsedMs?: number
  intent?: string
  // Dedup + post-rank funnel counts. `totalCandidates` carries the
  // "from N searched" count rendered in the surfaced-papers header.
  rawCount?: number
  uniqueCount?: number
  totalCandidates?: number
  /** Total hits seen across all sources BEFORE dedup - the true "examined". */
  rawCandidates?: number
}

async function runPhaseStreaming(
  designId: string,
  body: Record<string, unknown>,
  onProgress: (ev: PhaseProgress) => void
): Promise<DesignContentV2> {
  const res = await fetch(`/api/design/${designId}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    },
    body: JSON.stringify(body)
  })
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => "")
    throw new Error(msg || `Generation failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let finalContent: DesignContentV2 | null = null
  let streamError: string | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let idx: number
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)

      let eventName = "message"
      let dataLine = ""
      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim()
        else if (line.startsWith("data:")) dataLine += line.slice(5).trim()
      }
      if (!dataLine) continue

      try {
        const parsed = JSON.parse(dataLine)
        if (eventName === "progress") {
          onProgress(parsed as PhaseProgress)
        } else if (eventName === "result") {
          finalContent = parsed.content as DesignContentV2
        } else if (eventName === "error") {
          streamError = parsed.message || "Stream error"
        }
      } catch {
        // ignore malformed event
      }
    }
  }

  if (streamError) throw new Error(streamError)
  if (!finalContent) throw new Error("Stream ended without a result")
  return finalContent
}

// Background (Inngest) design generation. The design phase runs 4 long gpt-5.5
// sections per hypothesis - too slow for a 300s serverless function - so the
// route enqueues an Inngest job (processDesignGeneration) and returns 202. Here
// we poll the design doc's `designJob` for progress + completion. Mirrors
// runPhaseStreaming's signature so the phase handlers swap in with one word.
async function pollDesignJob(
  designId: string,
  onProgress: (ev: PhaseProgress) => void,
  startIndex = 0
): Promise<DesignContentV2> {
  const POLL_MS = 4000
  const MAX_MS = 20 * 60 * 1000
  const startedAt = Date.now()
  let seen = startIndex
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise(r => setTimeout(r, POLL_MS))
    if (Date.now() - startedAt > MAX_MS) {
      throw new Error("Design generation timed out. Please try again.")
    }
    let doc: any
    try {
      const res = await fetch(`/api/design/${designId}`)
      if (!res.ok) continue // transient - keep polling
      doc = await res.json()
    } catch {
      continue
    }
    const job = doc?.designJob
    const progress: PhaseProgress[] = Array.isArray(job?.progress)
      ? job.progress
      : []
    for (let i = seen; i < progress.length; i++) onProgress(progress[i])
    seen = progress.length

    if (job?.state === "failed") {
      throw new Error(job?.error || "Design generation failed.")
    }
    if (job?.state === "complete") {
      const content = parseContent(doc.content)
      if (!content) throw new Error("Design completed but returned no content.")
      return content
    }
  }
}

async function runPhaseBackground(
  designId: string,
  body: Record<string, unknown>,
  onProgress: (ev: PhaseProgress) => void
): Promise<DesignContentV2> {
  const startRes = await fetch(`/api/design/${designId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  if (!startRes.ok) {
    // 402 paywall (out of credits / out of free experiments) → show the upgrade
    // toast and stop quietly, instead of a generic "generation failed" error.
    if (await handleBudgetError(startRes)) {
      throw new Error("__paywall__")
    }
    const msg = await startRes.text().catch(() => "")
    throw new Error(
      msg || `Failed to start design generation (${startRes.status})`
    )
  }
  return pollDesignJob(designId, onProgress)
}

function parseContent(raw: unknown): DesignContentV2 | null {
  if (!raw) return null
  try {
    if (typeof raw === "string") return JSON.parse(raw)
    if (typeof raw === "object") return raw as DesignContentV2
  } catch {
    return null
  }
  return null
}

// buildDesignChatContext + TIER3_MAX_CHARS now live in
// @/lib/design/chat-context (imported above) so the design-chat context
// builder - the seam that guarantees the chat actually has the experiment's
// content - is unit-tested. Do not re-inline it here.

/**
 * Order-insensitive, undefined-stripped JSON serialization used to detect
 * no-op content saves (so opening a design doesn't bump its "modified" date).
 * Mirrors JSON.stringify's drop-undefined behaviour but sorts object keys, so
 * a re-hydrated problem object that differs only in key order / absent optional
 * fields compares equal to what was last stored.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value) ?? "null"
  if (Array.isArray(value))
    return "[" + value.map(stableStringify).join(",") + "]"
  const obj = value as Record<string, unknown>
  return (
    "{" +
    Object.keys(obj)
      .filter(k => obj[k] !== undefined)
      .sort()
      .map(k => JSON.stringify(k) + ":" + stableStringify(obj[k]))
      .join(",") +
    "}"
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function DesignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  // "auto" tells us the picker routed the user in with an intent to fire a
  // specific action once the design finishes loading. We run it exactly once
  // per mount and strip the param so it doesn't re-fire on back/forward.
  const autoAction = searchParams.get("auto")
  const autoFiredRef = useRef(false)
  const { toast } = useToast()
  const { profile, setUserInput, selectedWorkspace, chatSettings, setDesigns } =
    useContext(ChatbotUIContext)
  void profile

  const designId = params.designId as string
  const workspaceId = params.workspaceid as string
  const locale = params.locale as string

  const [design, setDesign] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  // Collaboration access. Derived from the GET design `_access` field. Defaults
  // are permissive (canEdit=true, isOwner=true) so the owner's own designs never
  // flicker into a read-only state before the fetch resolves; the fetch then
  // narrows them for invited viewers/editors.
  const [canEdit, setCanEdit] = useState(true)
  const [isOwner, setIsOwner] = useState(true)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [sharingState, setSharingState] = useState<{
    sharing: Sharing
    share_token: string | null
  }>({ sharing: "private", share_token: null })
  // Default landing tab is "problem" - newly-created designs should drop the
  // user straight into editing instead of showing the Overview placeholder.
  // Initial tab honours `?tab=` from the new-design dialog so non-
  // from-scratch modes land where they need to (hypotheses after
  // from-hypothesis, literature after from-plan, design after
  // check-stats / make-plan). Falls back to "problem". The resume
  // effect downstream still moves the user to the first non-approved
  // phase once the loader catches up.
  const initialTab = (() => {
    const t = searchParams?.get("tab") ?? ""
    return [
      "problem",
      "literature",
      "hypotheses",
      "design",
      "validate"
    ].includes(t)
      ? t
      : "problem"
  })()
  const [activeTab, setActiveTab] = useState(initialTab)
  // Secondary tab bar inside an opened design: the design flow itself, plus its
  // scoped Reports / Chats / Files. Reports/chats/files now live under the
  // design (not the project), so they only appear once a design is opened.
  const [showLibrary, setShowLibrary] = useState(false)
  // Full-page decision step after Design → Next: finalise now, or simulate
  // before the bench. Replaces the page while open.
  const [showDesignGate, setShowDesignGate] = useState(false)
  // "Validate & iterate" modal (replaces the old Validate/Iterate tabs). One
  // button, two paths inside - simulate the results, or bring your own lab
  // data - mirroring the hypothesis stage's Generated/Create-your-own pattern.
  const [validateModalOpen, setValidateModalOpen] = useState(false)
  const [validateMode, setValidateMode] = useState<"simulate" | "iterate">(
    "simulate"
  )
  // Provenance of the CURRENT design, used to label it in the iteration rail.
  const [designOrigin, setDesignOrigin] = useState<
    "original" | "simulation" | "lab-data" | "manual"
  >("original")
  const [busy, setBusy] = useState<
    | null
    | "literature"
    | "hypotheses"
    | "design"
    | "save"
    | "stats-review"
    | "make-plan"
  >(null)

  // Streaming agent runs (literature search / hypothesis generation / design
  // generation) take 1–3 minutes and lose all progress if the tab closes
  // mid-flight. While one of those phases is busy we attach a native
  // `beforeunload` warning so the browser prompts before close/refresh/back.
  // The in-page banner (rendered further down) handles the visual nudge.
  const isAgentRunning =
    busy === "literature" || busy === "hypotheses" || busy === "design"
  useEffect(() => {
    if (!isAgentRunning) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Legacy browsers need a non-empty `returnValue` to trigger the prompt;
      // modern ones ignore the string and use a built-in message.
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isAgentRunning])

  // Phase gating
  const [approvedPhases, setApprovedPhases] = useState<PhaseKey[]>([])

  // Problem tab state
  const [title, setTitle] = useState("")
  const [problemStatement, setProblemStatement] = useState("")
  const [domain, setDomain] = useState<DesignDomain | "">("")
  const [phase, setPhase] = useState<DesignPhase | "">("")
  const [objective, setObjective] = useState("")
  const [constraintMaterial, setConstraintMaterial] = useState("")
  const [constraintTime, setConstraintTime] = useState("")
  const [constraintEquipment, setConstraintEquipment] = useState("")
  const [variablesKnown, setVariablesKnown] = useState("")
  const [variablesUnknown, setVariablesUnknown] = useState("")
  // Issue #9 - non-mandatory free-text field. Captures the scientist's
  // definition of "what would count as a successful experiment" so the
  // hypothesis and design agents can target it directly.
  const [successCriteria, setSuccessCriteria] = useState("")
  // Issue #28 - explicit replicates toggle. "" = unset, "yes"/"no" otherwise.
  // Defaults to "" so the field renders empty (same UX as Domain/Phase),
  // and the Yes/No selection flows through to the design agent context.
  const [includeReplicates, setIncludeReplicates] = useState<"" | "yes" | "no">(
    ""
  )
  // Visible free-text field on the Problem tab. Captures concrete operating
  // parameters; read by the literature (steering), hypotheses, and design
  // prompts. This is the ONLY problem-stage context now that the literature
  // search runs without clarifying questions.
  const [replicateCount, setReplicateCount] = useState("")
  const [additionalDetails, setAdditionalDetails] = useState("")
  // Pre-flight "study details" step. Asked ONCE before anything generates, so
  // hypotheses and the design are built WITH the researcher's constraints
  // rather than around choices we made for them.
  const [studyDetailsFor, setStudyDetailsFor] = useState<
    null | "auto" | "hypotheses" | "own-questions" | "own-text"
  >(null)
  const pendingOwnTextRef = useRef<string>("")
  // Effort for generative runs (set on the create-design modal, persisted in
  // content.problem.effort). Scales literature + hypothesis work per phase.
  const [effort, setEffort] = useState<DesignEffort>(DEFAULT_DESIGN_EFFORT)

  // "Refine" clarifying questions. Set to a checkpoint to show the full-screen
  // Q&A before that phase runs; null = not refining.
  // NOTE: the PROBLEM checkpoint is deliberately gone — questions there were
  // diluting the literature search, which now runs straight off the Problem
  // tab. Only "hypothesis" and "design" ask questions.
  const [refineCheckpoint, setRefineCheckpoint] = useState<
    "hypothesis" | "design" | null
  >(null)
  // Hypothesis stage sub-tab: "suggested" (paper-derived hypotheses to pick +
  // edit) vs "own" (answer setup questions to generate one, or type your own).
  const [hypTab, setHypTab] = useState<"suggested" | "own">("suggested")
  // Which design version the user is READING. null = the live design. This is a
  // view pointer only - browsing history never mutates or renumbers it.
  const [viewingVersionId, setViewingVersionId] = useState<string | null>(null)
  // True when THIS design was produced by the hands-free auto pipeline. Auto
  // runs surface a finished design: only the hypothesis it picked, and no
  // choices panel to review.
  const [autoGenerated, setAutoGenerated] = useState(false)
  const [clarifications, setClarifications] = useState<{
    problem?: ClarifyAnswer[]
    hypothesis?: ClarifyAnswer[]
    design?: ClarifyAnswer[]
  }>({})

  // Validate-and-iterate loop: lab-data rounds testing the hypothesis, each
  // feeding the next. Persisted into content.validation.
  const [validation, setValidation] = useState<ValidationState>({
    iterations: []
  })
  const [validating, setValidating] = useState(false)
  const [simulating, setSimulating] = useState(false)

  // Literature tab state
  const [papers, setPapers] = useState<Paper[]>([])
  const [literatureProgress, setLiteratureProgress] = useState<
    LiteratureProgress[]
  >([])
  // Total candidates the pipeline sifted through (post-dedup +
  // post-review-filter, pre top-N cut). Drives the "from N searched"
  // label under the surfaced-papers header. Sourced from the most
  // recent `papers_found` progress event that carried the count.
  //
  // Also persisted into content.literatureStats so the count survives
  // navigation away from the design - the in-memory `literatureProgress`
  // stream resets on remount, but the persisted value stays put.
  const [persistedLitTotalCandidates, setPersistedLitTotalCandidates] =
    useState<number | undefined>(undefined)
  const [persistedLitRawCandidates, setPersistedLitRawCandidates] = useState<
    number | undefined
  >(undefined)
  const literatureRawCandidates = useMemo(() => {
    for (let i = literatureProgress.length - 1; i >= 0; i--) {
      const ev = literatureProgress[i]
      if (ev.step === "papers_found" && typeof ev.rawCandidates === "number") {
        return ev.rawCandidates
      }
    }
    return persistedLitRawCandidates
  }, [literatureProgress, persistedLitRawCandidates])
  const literatureTotalCandidates = useMemo(() => {
    for (let i = literatureProgress.length - 1; i >= 0; i--) {
      const ev = literatureProgress[i]
      if (
        ev.step === "papers_found" &&
        typeof ev.totalCandidates === "number"
      ) {
        return ev.totalCandidates
      }
    }
    return persistedLitTotalCandidates
  }, [literatureProgress, persistedLitTotalCandidates])

  // Hypotheses tab state
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([])
  const [hypothesesProgress, setHypothesesProgress] = useState<PhaseProgress[]>(
    []
  )
  // Last hypothesis-generation error, so the Hypotheses tab can show an
  // accurate "generation failed - retry" state instead of the misleading
  // "approve literature" prompt after a transient backend failure.
  const [hypothesesError, setHypothesesError] = useState<string | null>(null)

  // Designs state
  const [generatedDesigns, setGeneratedDesigns] = useState<GeneratedDesign[]>(
    []
  )
  // Always-current mirror of generatedDesigns so the chat apply-patch handler
  // (a window-event closure) reads the latest designs without restale binding -
  // and so a chat edit never clobbers / loses the design.
  const generatedDesignsRef = useRef<GeneratedDesign[]>([])
  useEffect(() => {
    generatedDesignsRef.current = generatedDesigns
  }, [generatedDesigns])
  // Session-level undo stack for chat-applied edits - snapshots the designs
  // BEFORE each applied change so the user can step back to a previous version.
  const undoStackRef = useRef<GeneratedDesign[][]>([])
  const [undoDepth, setUndoDepth] = useState(0)
  const pushUndoSnapshot = useCallback((prev: GeneratedDesign[]) => {
    if (!prev || prev.length === 0) return
    // Deep-clone so later mutations to the live array can't corrupt history.
    undoStackRef.current.push(JSON.parse(JSON.stringify(prev)))
    if (undoStackRef.current.length > 25) undoStackRef.current.shift()
    setUndoDepth(undoStackRef.current.length)
  }, [])
  const [activeDesignId, setActiveDesignId] = useState<string | null>(null)
  const [designProgress, setDesignProgress] = useState<PhaseProgress[]>([])
  const [designVersions, setDesignVersions] = useState<DesignVersionSnapshot[]>(
    []
  )
  /**
   * Version number of the LIVE design, when it isn't simply "one above the
   * highest in history".
   *
   * Promoting an old version used to append the promoted set as a brand-new
   * version, so restoring v1 produced a v4 that was a copy of v1 - the timeline
   * grew every time you looked back and the number no longer meant anything.
   * A promotion now swaps: the live set goes into history under its own number
   * and the promoted version comes out of history and keeps its number. This
   * holds that number.
   */
  const [currentVersionNumber, setCurrentVersionNumber] = useState<
    number | null
  >(null)

  /**
   * What an in-flight design regeneration is producing, and why.
   *
   * While a new version was being built the page carried on rendering the
   * PREVIOUS design with the buttons greyed out, which read as "nothing is
   * happening to a design I can't use". This drives a progress view naming the
   * version being generated and listing the changes going into it.
   */
  const [regenPlan, setRegenPlan] = useState<{
    version: number
    changes: string[]
    hypothesis?: string
  } | null>(null)

  /**
   * Highest number in history. Computed over the whole list rather than read
   * off `designVersions[0]`: promotion swaps entries in and out, so the first
   * element is no longer guaranteed to be the highest-numbered one.
   */
  const maxVersionNumber = designVersions.reduce(
    (m, v) => Math.max(m, v.versionNumber),
    0
  )
  /** What the LIVE design is called. */
  const liveVersionNumber = currentVersionNumber ?? maxVersionNumber + 1
  /** What the NEXT generated version will be called. */
  const nextNewVersionNumber =
    Math.max(maxVersionNumber + 1, liveVersionNumber) + 1

  // Rail toggle
  const [showRail, setShowRail] = useState(false)
  // Width of the design chat rail (px). User-resizable via the drag handle on
  // its left edge so they can give the chat more room.
  const [railWidth, setRailWidth] = useState(380)

  // Agent popover
  const [agentPopoverOpen, setAgentPopoverOpen] = useState(false)
  const [agentPrompt, setAgentPrompt] = useState("")

  // Autosave debounce for Problem tab
  const problemSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Always-fresh snapshot of the server-side design content. `design` state is
  // only populated on fetchDesign and does NOT reflect updates from streamed
  // phase runs or prior persistContent calls. Using the stale state as the
  // merge base caused PATCH writes to overwrite fields the server had just
  // saved (e.g. paper selections disappearing after reload, literatureContext
  // being wiped by a problem-autosave). This ref is kept current on every
  // fetch, every runPhaseStreaming result, and every persistContent write so
  // that persistContent always merges with the true latest content.
  const latestContentRef = useRef<DesignContentV2>({ schemaVersion: 2 })

  // ── Phase helpers ─────────────────────────────────────────────────────

  const isPhaseApproved = (phase: PhaseKey) => approvedPhases.includes(phase)

  const getPhaseState = (phase: PhaseKey): TabStatus => {
    if (isPhaseApproved(phase)) return "approved"
    // "iterate" is a UI stage, not a persisted phase, so it isn't in
    // PHASE_ORDER. indexOf returned -1 and slice(0, -1) then demanded EVERY
    // earlier phase (including validate) be approved - so skipping the
    // simulation locked Iterate permanently. The real prerequisite is just a
    // design to iterate on.
    if ((phase as string) === "iterate") {
      return generatedDesigns.length > 0 ? "active" : "locked"
    }
    const idx = PHASE_ORDER.indexOf(phase)
    if (idx < 0) return "active"
    if (idx === 0) return problemValid ? "review" : "active"
    const allPrevApproved = PHASE_ORDER.slice(0, idx).every(p =>
      approvedPhases.includes(p)
    )
    if (!allPrevApproved) return "locked"
    switch (phase) {
      case "literature":
        return papers.length > 0 ? "review" : "active"
      case "hypotheses":
        return hypotheses.length > 0 ? "review" : "active"
      case "design":
        return generatedDesigns.length > 0 ? "review" : "active"
      default:
        return "active"
    }
  }

  const clearDownstreamState = (fromPhase: PhaseKey) => {
    const idx = PHASE_ORDER.indexOf(fromPhase)
    const downstream = PHASE_ORDER.slice(idx + 1)
    for (const phase of downstream) {
      if (phase === "literature") setPapers([])
      if (phase === "hypotheses") setHypotheses([])
      if (phase === "design") {
        setGeneratedDesigns([])
        setActiveDesignId(null)
      }
    }
    const keep = approvedPhases.filter(p => PHASE_ORDER.indexOf(p) < idx)
    setApprovedPhases(keep)
    return keep
  }

  // ── Data fetch ────────────────────────────────────────────────────────

  useEffect(() => {
    if (designId) void fetchDesign()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designId])

  const fetchDesign = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/design/${designId}`)
      if (!response.ok) {
        toast({
          title: "Not found",
          description: "Design not found.",
          variant: "destructive"
        })
        router.push(`/${locale}/${workspaceId}`)
        return
      }
      const data = await response.json()
      setDesign(data)

      // Collaboration access for this viewer. The server returns `_access`
      // {isOwner, role, canEdit} for any user allowed to read the design; an
      // invited viewer gets canEdit=false (read-only), an editor canEdit=true.
      const access = (data as any)?._access ?? {}
      setCanEdit(access.canEdit ?? true)
      setIsOwner(access.isOwner ?? true)
      setSharingState({
        sharing: (data as any)?.sharing ?? "private",
        share_token: (data as any)?.share_token ?? null
      })

      const content = parseContent(data.content)
      latestContentRef.current = content ?? { schemaVersion: 2 }
      const problem = content?.problem ?? {}
      const loadedTitle = problem.title ?? data.name ?? ""
      setTitle(loadedTitle)
      // Always preserve the user-supplied problem statement. The previous
      // heuristic wiped it when it equalled the title (a workaround for
      // legacy seeding that mirrored title→description); now create-design
      // sends both fields explicitly so we trust what we get.
      setProblemStatement(problem.problemStatement ?? data.description ?? "")
      setDomain((problem.domain as DesignDomain | undefined) ?? "")
      setPhase((problem.phase as DesignPhase | undefined) ?? "")
      setObjective(problem.objective ?? problem.goal ?? "")
      setConstraintMaterial(problem.constraintsStructured?.material ?? "")
      setConstraintTime(problem.constraintsStructured?.time ?? "")
      setConstraintEquipment(problem.constraintsStructured?.equipment ?? "")
      // Migrate legacy array fields into the Known-variables textarea so older
      // designs don't lose content on first load.
      setVariablesKnown(
        problem.variablesStructured?.known ??
          (problem.variables?.length
            ? problem.variables.filter(Boolean).join("\n")
            : "")
      )
      setVariablesUnknown(problem.variablesStructured?.unknown ?? "")
      // New fields (issues #9 + #28). Optional; default to empty so legacy
      // designs that don't have them stored render with blank inputs.
      setSuccessCriteria(
        ((problem as any).successCriteria as string | undefined) ?? ""
      )
      const repRaw =
        ((problem as any).includeReplicates as string | undefined) ?? ""
      setIncludeReplicates(repRaw === "yes" || repRaw === "no" ? repRaw : "")
      setReplicateCount(((problem as any).replicateCount as string) ?? "")
      setAdditionalDetails(
        ((problem as any).additionalDetails as string | undefined) ?? ""
      )
      setEffort(
        ((problem as any).effort as DesignEffort | undefined) ??
          DEFAULT_DESIGN_EFFORT
      )
      if (content?.clarifications) setClarifications(content.clarifications)
      if (content?.validation) setValidation(content.validation)

      if (content?.papers) setPapers(content.papers)
      // Restore the "from N searched" total from prior runs so the
      // Literature header still reads correctly after coming back to the
      // page (the progress-event stream resets on remount).
      setPersistedLitTotalCandidates(content?.literatureStats?.totalCandidates)
      setPersistedLitRawCandidates(content?.literatureStats?.rawCandidates)
      setAutoGenerated(Boolean(content?.autoGenerated))
      if (content?.hypotheses) setHypotheses(content.hypotheses)
      if (content?.designs) {
        setGeneratedDesigns(content.designs)
        setActiveDesignId(content.designs[0]?.id ?? null)
      }
      if (content?.designVersions) setDesignVersions(content.designVersions)
      setCurrentVersionNumber(
        typeof content?.currentVersionNumber === "number"
          ? content.currentVersionNumber
          : null
      )
      if (content?.approvedPhases) setApprovedPhases(content.approvedPhases)

      // Resume polling ONLY if a background job is genuinely still in flight.
      // Guards against the "stuck generating" bug: a worker that died/timed out
      // without writing a terminal state leaves designJob.state = "running"
      // forever, so every reopen used to force busy + poll for 20 minutes even
      // though the content was already complete. We now skip the resume when:
      //   • the job is stale (last touched > STALE_MS ago - worker is dead), or
      //   • the output this job was producing is ALREADY present in content.
      const job = (data as any)?.designJob
      const jobActive =
        job && (job.state === "queued" || job.state === "running")
      const STALE_MS = 12 * 60 * 1000 // > realistic max generation time
      const lastTouch: string | undefined = job?.updatedAt || job?.startedAt
      const jobAgeMs = lastTouch
        ? Date.now() - new Date(lastTouch).getTime()
        : Number.POSITIVE_INFINITY
      const jobStale = !(jobAgeMs < STALE_MS)
      const jobPhase: string | undefined = job?.phase
      const outputAlreadyPresent =
        (jobPhase === "design" && (content?.designs?.length ?? 0) > 0) ||
        (jobPhase === "hypotheses" && (content?.hypotheses?.length ?? 0) > 0) ||
        (jobPhase === "literature" && (content?.papers?.length ?? 0) > 0)

      if (jobActive && !jobStale && !outputAlreadyPresent) {
        const prior: PhaseProgress[] = Array.isArray(job.progress)
          ? job.progress
          : []
        const resumeBusy =
          jobPhase === "literature" ||
          jobPhase === "hypotheses" ||
          jobPhase === "design"
            ? (jobPhase as "literature" | "hypotheses" | "design")
            : "design"
        setBusy(resumeBusy)
        setActiveTab(resumeBusy)
        setDesignProgress(prior)
        pollDesignJob(
          designId,
          ev => setDesignProgress(prev => [...prev, ev]),
          prior.length
        )
          .then(jobContent => {
            latestContentRef.current = jobContent
            // Apply whatever the resumed phase produced (literature → papers,
            // hypotheses → hypotheses, design → designs).
            if (jobContent.papers) setPapers(jobContent.papers)
            if (jobContent.hypotheses) setHypotheses(jobContent.hypotheses)
            const designs = jobContent.designs ?? []
            setGeneratedDesigns(designs)
            if (designs.length) setActiveDesignId(designs[0]?.id ?? null)
          })
          .catch((err: any) => {
            toast({
              title: "Design generation failed",
              description: err?.message ?? "Try again in a moment.",
              variant: "destructive"
            })
          })
          .finally(() => setBusy(null))
      }
    } catch (error) {
      console.error("Error fetching design:", error)
      toast({
        title: "Error",
        description: "Failed to load design.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // ── Persistence ───────────────────────────────────────────────────────

  const persistContent = async (
    patch: Partial<DesignContentV2>,
    extra?: { name?: string }
  ) => {
    // Merge against the freshest content we know about (updated on every
    // fetch and every phase run) - NOT the React `design` state, which can
    // be stale after an SSE phase run or a prior PATCH.
    const prevStable = stableStringify(latestContentRef.current)
    const merged: DesignContentV2 = {
      ...latestContentRef.current,
      ...patch,
      schemaVersion: 2
    }
    latestContentRef.current = merged
    // No-op guard: merely OPENING a design re-hydrates the problem fields and
    // fires the autosave effect, which used to bump `updated_at` (and so the
    // dashboard slab's "modified" date) even when nothing actually changed.
    // Compare an order-insensitive, undefined-stripped serialization and bail
    // before touching state or the API when the content is unchanged. The
    // autosave path mirrors the name into problem.title, so an unchanged
    // content also means an unchanged name - safe to skip the row update too.
    if (stableStringify(merged) === prevStable) return
    const serialized = JSON.stringify(merged)
    // Keep the shared context in sync so the Designs list + dashboard reflect
    // the new status (e.g. "Completed" after the design phase is approved)
    // immediately, instead of only after a full page refresh. getDesignProgress
    // reads `content`, so updating it here flips the slab's status chip live.
    setDesigns(prev =>
      prev.map(d =>
        d.id === designId
          ? ({
              ...d,
              ...(extra?.name !== undefined ? { name: extra.name } : {}),
              content: serialized,
              updated_at: new Date().toISOString()
            } as typeof d)
          : d
      )
    )
    await fetch(`/api/design/${designId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(extra?.name !== undefined ? { name: extra.name } : {}),
        content: serialized
      })
    })
  }

  const currentProblem = (): ProblemContext =>
    ({
      title,
      problemStatement,
      domain: domain || undefined,
      phase: phase || undefined,
      objective,
      goal: objective, // mirror into legacy field so old consumers still read a value
      constraintsStructured: {
        material: constraintMaterial,
        time: constraintTime,
        equipment: constraintEquipment
      },
      variablesStructured: {
        known: variablesKnown,
        unknown: variablesUnknown
      },
      // Issue #9 / #28 - both are optional so we only emit when set.
      ...(successCriteria.trim()
        ? { successCriteria: successCriteria.trim() }
        : {}),
      ...(includeReplicates ? { includeReplicates } : {}),
      ...(replicateCount.trim()
        ? { replicateCount: replicateCount.trim() }
        : {}),
      ...(additionalDetails.trim()
        ? { additionalDetails: additionalDetails.trim() }
        : {}),
      effort
    }) as ProblemContext

  useEffect(() => {
    // Read-only viewers must never trigger a (doomed) autosave PATCH.
    if (loading || !design || !canEdit) return
    if (problemSaveTimer.current) clearTimeout(problemSaveTimer.current)
    problemSaveTimer.current = setTimeout(() => {
      persistContent({ problem: currentProblem() }, { name: title }).catch(
        err => console.warn("Problem autosave failed:", err)
      )
    }, 800)
    return () => {
      if (problemSaveTimer.current) clearTimeout(problemSaveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    problemStatement,
    domain,
    phase,
    objective,
    constraintMaterial,
    constraintTime,
    constraintEquipment,
    variablesKnown,
    variablesUnknown,
    successCriteria,
    includeReplicates,
    additionalDetails
  ])

  // Objective is OPTIONAL - only the problem statement, domain, and phase gate
  // Continue (the user reported being stuck on the mandatory objective field).
  const problemValid =
    problemStatement.trim() !== "" && domain !== "" && phase !== ""

  // Gate every mutation behind edit access. A read-only (viewer) collaborator
  // is blocked here with a clear toast - the server also rejects the write, so
  // this is the UX layer over the real (backend) guard.
  const ensureCanEdit = () => {
    if (!canEdit) {
      toast({
        title: "Read-only access",
        description:
          "You have view-only access to this design. Ask the owner for editor access to make changes.",
        variant: "destructive"
      })
      return false
    }
    return true
  }

  // ── Approve & Generate handlers ───────────────────────────────────────

  const handleApproveAndGenerateLiterature = () => {
    if (!ensureCanEdit()) return
    // Block double-trigger while a run is already in flight (#3)
    if (busy) return
    if (!problemValid) {
      toast({
        title: "Missing fields",
        description:
          "Problem statement, domain, and phase are required (objective is optional).",
        variant: "destructive"
      })
      return
    }
    // If papers already generated, just switch to the tab - don't re-run (#3)
    if (papers.length > 0) {
      setActiveTab("literature")
      return
    }
    track("literature_search_started")
    void runLiteratureGeneration()
  }

  const runLiteratureGeneration = async (clarifyText?: string) => {
    const nextApproved: PhaseKey[] = ["problem"]
    setApprovedPhases(nextApproved)
    // Persist approvedPhases immediately so tab navigation survives a reload (#6)
    void persistContent({ approvedPhases: nextApproved })
    setActiveTab("literature")
    setBusy("literature")
    setLiteratureProgress([])
    try {
      // Accumulate the streamed events LOCALLY as well as into state. Reading
      // the `literatureProgress` state here instead would capture the stale
      // render-time value (empty at kick-off), so the examined-count was never
      // persisted and vanished on revisit.
      const runEvents: LiteratureProgress[] = []
      const content = await runPhaseBackground(
        designId,
        {
          phase: "literature",
          problem: {
            ...currentProblem(),
            ...(clarifyText !== undefined
              ? { additionalDetails: clarifyText }
              : {})
          },
          approvedPhases: nextApproved
        },
        ev => {
          runEvents.push(ev)
          setLiteratureProgress(prev => [...prev, ev])
        }
      )
      latestContentRef.current = content
      if (content.papers) setPapers(content.papers)
      // Persist the "N examined" total alongside the papers so the Literature
      // header still shows it when the user navigates away and comes back.
      let totalFromRun: number | undefined
      let rawFromRun: number | undefined
      for (let i = runEvents.length - 1; i >= 0; i--) {
        const ev = runEvents[i]
        if (
          ev.step === "papers_found" &&
          typeof ev.totalCandidates === "number"
        ) {
          totalFromRun = ev.totalCandidates
          if (typeof ev.rawCandidates === "number")
            rawFromRun = ev.rawCandidates
          break
        }
      }
      if (typeof totalFromRun === "number") {
        setPersistedLitTotalCandidates(totalFromRun)
        void persistContent({
          literatureStats: {
            totalCandidates: totalFromRun,
            rawCandidates: rawFromRun
          }
        })
      }
    } catch (error: any) {
      if ((error as any)?.message === "__paywall__") return
      toast({
        title: "Literature search failed",
        description: error?.message ?? "Try again in a moment.",
        variant: "destructive"
      })
    } finally {
      setBusy(null)
    }
  }

  // Gate: after the user selects papers, open the Refine step (hypothesis
  // checkpoint) BEFORE generating hypotheses, so the questions are specific to
  // the selected literature. It runs hypothesis generation on complete.
  const handleApproveAndGenerateHypotheses = async () => {
    if (!ensureCanEdit()) return
    if (busy) return // block double-trigger (#3)
    if (selectedPapers.length === 0) {
      toast({
        title: "No papers selected",
        description: "Select at least one paper to generate hypotheses.",
        variant: "destructive"
      })
      return
    }
    // If hypotheses already generated, just switch tab - don't re-run (#3)
    if (hypotheses.length > 0) {
      setActiveTab("hypotheses")
      return
    }
    // Land on the hypothesis stage WITHOUT generating anything. The researcher
    // picks the route first - have us suggest hypotheses from the papers, or
    // build their own - otherwise generation starts on its own and the
    // "Create your own" tab is dead until it finishes.
    setActiveTab("hypotheses")
    setHypTab("suggested")
  }

  /**
   * Commit the pre-flight study details, then continue into whatever the
   * researcher was about to do. Persisted immediately so the phase prompts read
   * them from the same problem object every downstream call uses.
   */
  const handleStudyDetails = async (d: {
    successCriteria: string
    includeReplicates: "yes" | "no" | ""
    replicateCount: string
    constraintMaterial: string
    constraintTime: string
    constraintEquipment: string
    variablesKnown: string
    variablesUnknown: string
    additionalDetails: string
  }) => {
    const target = studyDetailsFor
    setStudyDetailsFor(null)
    setSuccessCriteria(d.successCriteria)
    setIncludeReplicates(d.includeReplicates)
    setReplicateCount(d.replicateCount)
    setConstraintMaterial(d.constraintMaterial)
    setConstraintTime(d.constraintTime)
    setConstraintEquipment(d.constraintEquipment)
    setVariablesKnown(d.variablesKnown)
    setVariablesUnknown(d.variablesUnknown)
    setAdditionalDetails(d.additionalDetails)

    const nextProblem: ProblemContext = {
      ...currentProblem(),
      ...(d.successCriteria.trim()
        ? { successCriteria: d.successCriteria.trim() }
        : {}),
      ...(d.includeReplicates
        ? { includeReplicates: d.includeReplicates }
        : {}),
      ...(d.replicateCount.trim()
        ? { replicateCount: d.replicateCount.trim() }
        : {}),
      constraintsStructured: {
        material: d.constraintMaterial,
        time: d.constraintTime,
        equipment: d.constraintEquipment
      },
      variablesStructured: {
        known: d.variablesKnown,
        unknown: d.variablesUnknown
      },
      ...(d.additionalDetails.trim()
        ? { additionalDetails: d.additionalDetails.trim() }
        : {})
    }
    try {
      await persistContent({ problem: nextProblem })
    } catch (err) {
      console.warn("Couldn't save study details:", err)
    }

    if (target === "auto") void handleAutoGenerateDesign()
    else if (target === "hypotheses") void runHypothesisGeneration()
    else if (target === "own-questions") setRefineCheckpoint("hypothesis")
    else if (target === "own-text") {
      const text = pendingOwnTextRef.current
      pendingOwnTextRef.current = ""
      if (text) applyOwnHypothesis(text)
    }
  }

  /** Explicit "suggest hypotheses from my papers" action (item 1). */
  const handleGenerateSuggestedHypotheses = () => {
    if (!ensureCanEdit()) return
    if (busy) return
    track("hypothesis_generation_started", { papers: selectedPapers.length })
    setHypTab("suggested")
    void runHypothesisGeneration()
  }

  const runHypothesisGeneration = async (clarifyText?: string) => {
    const nextApproved: PhaseKey[] = ["problem", "literature"]
    setApprovedPhases(nextApproved)
    void persistContent({ approvedPhases: nextApproved })
    setActiveTab("hypotheses")
    setBusy("hypotheses")
    setHypothesesProgress([])
    setHypothesesError(null)
    try {
      // Carry the Refine answers into the hypothesis prompt via the existing
      // additionalDetails carrier (appended to any problem-stage details).
      const mergedDetails = [additionalDetails, clarifyText]
        .map(s => (s ?? "").trim())
        .filter(Boolean)
        .join("\n\n")
      const content = await runPhaseBackground(
        designId,
        {
          phase: "hypotheses",
          problem: {
            ...currentProblem(),
            ...(mergedDetails ? { additionalDetails: mergedDetails } : {})
          },
          papers,
          approvedPhases: nextApproved
        },
        ev => setHypothesesProgress(prev => [...prev, ev])
      )
      latestContentRef.current = content
      if (content.papers) setPapers(content.papers)
      if (content.hypotheses) setHypotheses(content.hypotheses)
    } catch (error: any) {
      const msg = error?.message ?? "Try again in a moment."
      setHypothesesError(msg)
      toast({
        title: "Hypothesis generation failed",
        description: msg,
        variant: "destructive"
      })
    } finally {
      setBusy(null)
    }
  }

  // Switching to "Create your own" CLEARS any suggested hypothesis the
  // researcher had ticked. Otherwise a stale selection survives into the design
  // stage and they'd generate a design for a hypothesis they'd moved on from.
  const handleHypTab = (t: "suggested" | "own") => {
    if (t === "own" && hypotheses.some(h => h.selected)) {
      const cleared = hypotheses.map(h => ({ ...h, selected: false }))
      setHypotheses(cleared)
      latestContentRef.current = {
        ...latestContentRef.current,
        hypotheses: cleared
      }
      void persistContent({ hypotheses: cleared })
    }
    setHypTab(t)
  }

  // "Create your own" tab: adopt a hypothesis the researcher typed themselves.
  // It becomes the single selected hypothesis; they then generate the design.
  /**
   * Gate: capture the study details FIRST (item 7 - the questions belong before
   * generation, not after), then adopt the hypothesis.
   */
  const handleUseOwnHypothesis = (text: string) => {
    if (!ensureCanEdit()) return
    const trimmed = text.trim()
    if (trimmed.length < 8) {
      toast({
        title: "Add a bit more",
        description: "Write your hypothesis (at least a sentence) to continue.",
        variant: "destructive"
      })
      return
    }
    pendingOwnTextRef.current = trimmed
    setStudyDetailsFor("own-text")
  }

  const applyOwnHypothesis = (text: string) => {
    const trimmed = text.trim()
    const own: Hypothesis = {
      id: `h-own-${Date.now()}`,
      text: trimmed,
      reasoning: "Researcher-supplied hypothesis.",
      basedOnPaperIds: selectedPapers.map(p => p.id),
      selected: true,
      userSupplied: true
    }
    // ADD to the list rather than replacing it.
    //
    // This used to be `[own]`, wiping every generated hypothesis. The moment a
    // researcher is best placed to write a sharp hypothesis is right after
    // reading ours - and that was exactly the moment acting on it destroyed
    // what they had just read, with no way back short of regenerating. Theirs
    // is now added on top and selected; the generated set stays available, and
    // they can pick a different one or several.
    // The single most informative event in the product: the researcher read
    // what we generated and wrote their own instead. Logged with the set they
    // rejected, so the two are comparable later.
    trackDecision({
      surface: "hypothesis_own",
      decision: "rejected",
      subjectType: "design",
      subjectId: designId,
      workspaceId,
      candidates: hypotheses.map((h, i) => ({
        id: h.id,
        label: h.title || h.text,
        rank: i + 1,
        chosen: false
      })),
      feedbackText: trimmed,
      meta: { effort, hadGeneratedOptions: hypotheses.length }
    })
    const next: Hypothesis[] = [
      own,
      ...hypotheses.map(h => ({ ...h, selected: false }))
    ]
    setHypotheses(next)
    latestContentRef.current = { ...latestContentRef.current, hypotheses: next }
    void persistContent({ hypotheses: next })
    setHypTab("suggested")
    toast({
      title: "Your hypothesis was added",
      description:
        hypotheses.length > 0
          ? "It's selected and sits at the top; the generated ones are still there."
          : "It's selected - generate the design when you're ready."
    })
  }

  // Step 1: validate + open the design-spec popup. The popup collects extra
  // parameters (concentration, condition count, notes) so the generated design
  // is specific to the researcher's use case rather than generic.
  const handleApproveAndGenerateDesign = () => {
    if (!ensureCanEdit()) return
    if (busy) return // block double-trigger (#3)
    if (selectedHypotheses.length === 0) {
      toast({
        title: "No hypotheses selected",
        description: "Select at least one hypothesis to generate a design.",
        variant: "destructive"
      })
      return
    }
    // If design already generated, just switch tab - don't re-run (#3)
    if (generatedDesigns.length > 0) {
      setActiveTab("design")
      return
    }
    track("design_generation_started", {
      hypotheses: selectedHypotheses.length
    })
    // The eval datum for the hypothesis ranker. Logging only the chosen one
    // would say nothing: what we need to know is WHICH RANK the researcher
    // actually reaches for, and that requires the refused alternatives and
    // their positions. `userSupplied` marks the strongest signal of all - a
    // hypothesis they wrote themselves because none of ours was good enough.
    trackDecision({
      surface: "hypotheses",
      decision: "selected",
      subjectType: "design",
      subjectId: designId,
      workspaceId,
      candidates: hypotheses.map((h, i) => ({
        id: h.id,
        label: h.title || h.text,
        rank: i + 1,
        chosen: h.selected
      })),
      meta: {
        effort,
        autoGenerated,
        anyUserSupplied: selectedHypotheses.some(h => h.userSupplied),
        papersSelected: papers.filter(p => p.selected).length
      }
    })
    // ALWAYS ask the design questions.
    //
    // This used to skip straight to generation whenever the chosen hypothesis
    // was one we suggested, on the reasoning that our own hypothesis already
    // encodes the direction. But the direction was never what these questions
    // are for - they ask what is on the bench: stock concentrations, the
    // diluent, how much material is on hand, the instrument and its settings.
    // None of that is knowable from the hypothesis, whoever wrote it. Since
    // picking a generated hypothesis is the common path, the effect was that
    // most runs were never asked anything and the design filled the gaps with
    // assumptions.
    setRefineCheckpoint("design")
  }

  // Step 2: run generation with the Refine answers as the design spec
  // (buildDesignBlocks reads designSpec).
  const runDesignGeneration = async (clarifyText?: string) => {
    if (!ensureCanEdit()) return
    const nextApproved: PhaseKey[] = ["problem", "literature", "hypotheses"]
    setApprovedPhases(nextApproved)
    void persistContent({ approvedPhases: nextApproved })
    setActiveTab("design")
    setBusy("design")
    setDesignProgress([])
    try {
      const designSpec = clarifyText?.trim()
        ? { notes: clarifyText.trim() }
        : {}
      // Fold the researcher's Lab standards (Settings) into the design prompt
      // so generated designs honour their replicate / stats / controls /
      // documentation defaults.
      const baseProblem = currentProblem()
      const mergedDetails = [
        baseProblem.additionalDetails,
        labStandardsToText()
      ]
        .map(s => (s ?? "").trim())
        .filter(Boolean)
        .join("\n\n")
      const problem = {
        ...baseProblem,
        ...(mergedDetails ? { additionalDetails: mergedDetails } : {}),
        ...(Object.keys(designSpec).length ? { designSpec } : {})
      }
      const content = await runPhaseBackground(
        designId,
        {
          phase: "design",
          problem,
          hypotheses,
          approvedPhases: nextApproved
        },
        ev => setDesignProgress(prev => [...prev, ev])
      )
      latestContentRef.current = content
      const designs = content.designs ?? []
      setGeneratedDesigns(designs)
      setViewingVersionId(null)
      setActiveDesignId(designs[0]?.id ?? null)
    } catch (error: any) {
      if ((error as any)?.message === "__paywall__") return
      toast({
        title: "Design generation failed",
        description: error?.message ?? "Try again in a moment.",
        variant: "destructive"
      })
    } finally {
      setBusy(null)
    }
  }

  // ── Auto-generate: run the WHOLE pipeline hands-free ───────────────────
  // literature → auto-select all papers → hypotheses → auto-select the top
  // one → design. No Refine questions, no manual selection. The scientist
  // gets a finished design straight from the Problem tab, then refines it by
  // chatting. Chains off each phase's RETURNED content (not React state, which
  // updates async) so the steps feed each other reliably.
  const handleAutoGenerateDesign = async () => {
    if (!ensureCanEdit()) return
    if (busy) return
    if (!problemValid) {
      toast({
        title: "Add the essentials first",
        description: "Problem statement, domain, and phase are required.",
        variant: "destructive"
      })
      return
    }
    try {
      // 1 — Literature
      setActiveTab("literature")
      setLiteratureProgress([])
      setBusy("literature")
      const litApproved: PhaseKey[] = ["problem"]
      setApprovedPhases(litApproved)
      const litContent = await runPhaseBackground(
        designId,
        {
          phase: "literature",
          problem: currentProblem(),
          approvedPhases: litApproved
        },
        ev => setLiteratureProgress(prev => [...prev, ev])
      )
      const autoPapers = (litContent.papers ?? []).map(p => ({
        ...p,
        selected: true
      }))
      if (autoPapers.length === 0)
        throw new Error("No papers were found to build on. Try again shortly.")
      setPapers(autoPapers)
      latestContentRef.current = litContent

      // 2 — Hypotheses (auto-select the top-ranked one)
      setActiveTab("hypotheses")
      setHypothesesProgress([])
      setBusy("hypotheses")
      const hypApproved: PhaseKey[] = ["problem", "literature"]
      setApprovedPhases(hypApproved)
      const hypContent = await runPhaseBackground(
        designId,
        {
          phase: "hypotheses",
          problem: currentProblem(),
          papers: autoPapers,
          approvedPhases: hypApproved
        },
        ev => setHypothesesProgress(prev => [...prev, ev])
      )
      const rawHyps = hypContent.hypotheses ?? []
      if (rawHyps.length === 0)
        throw new Error("No hypotheses were generated. Try again shortly.")
      // Auto mode carries exactly ONE hypothesis forward without the
      // researcher choosing it, so prefer the highest-ranked one that actually
      // cites the selected papers. Ranking now weights grounding, but if the
      // top pick still cites nothing, taking it would hand back a hypothesis
      // that reads as unrelated to the literature it was supposedly built on.
      const groundedIdx = rawHyps.findIndex(
        h => (h.basedOnPaperIds?.length ?? 0) > 0
      )
      const pickIdx = groundedIdx >= 0 ? groundedIdx : 0
      const autoHyps = rawHyps.map((h, i) => ({
        ...h,
        selected: i === pickIdx
      }))
      setHypotheses(autoHyps)
      latestContentRef.current = hypContent

      // 3 — Design (Lab-standards folded in, like the manual path)
      setActiveTab("design")
      setDesignProgress([])
      setBusy("design")
      const designApproved: PhaseKey[] = ["problem", "literature", "hypotheses"]
      setApprovedPhases(designApproved)
      const mergedDetails = [
        currentProblem().additionalDetails,
        labStandardsToText()
      ]
        .map(s => (s ?? "").trim())
        .filter(Boolean)
        .join("\n\n")
      const designContent = await runPhaseBackground(
        designId,
        {
          phase: "design",
          problem: {
            ...currentProblem(),
            ...(mergedDetails ? { additionalDetails: mergedDetails } : {})
          },
          hypotheses: autoHyps,
          approvedPhases: designApproved
        },
        ev => setDesignProgress(prev => [...prev, ev])
      )
      let curDesigns = designContent.designs ?? []
      setGeneratedDesigns(curDesigns)
      setViewingVersionId(null)
      setActiveDesignId(curDesigns[0]?.id ?? null)
      latestContentRef.current = designContent
      let curProblem: ProblemContext = {
        ...currentProblem(),
        ...(mergedDetails ? { additionalDetails: mergedDetails } : {})
      }
      // Persist (awaited) before simulating - the simulate route reads the
      // design back from Firestore, so it must be written first.
      setAutoGenerated(true)
      await persistContent({
        papers: autoPapers,
        hypotheses: autoHyps,
        designs: curDesigns,
        approvedPhases: designApproved,
        problem: curProblem,
        autoGenerated: true
      })

      // 4 — Simulate + iterate until the success criteria is met (or a cap).
      // The pre-lab Monte-Carlo sim predicts the design vs the target; if it
      // falls short we apply its suggested changes as a NEW design version and
      // re-simulate. Each round snapshots the prior design so the version rail
      // shows the trajectory. Skipped entirely when no target was given.
      const target = (
        curProblem.successCriteria ||
        curProblem.objective ||
        ""
      ).trim()
      let simMet = false
      let ranSim = false
      if (target) {
        const MAX_AUTO_SIM_ROUNDS = 3
        let versions = designVersions
        let curDetails = curProblem.additionalDetails ?? ""
        let curOrigin: "original" | "simulation" | "lab-data" | "manual" =
          designOrigin
        setApprovedPhases(prev =>
          prev.includes("validate") ? prev : [...prev, "validate"]
        )
        for (let round = 1; round <= MAX_AUTO_SIM_ROUNDS; round++) {
          // Simulate the current design against the target. The Validate tab
          // is gone - stay on Design and show progress via the busy state.
          setActiveTab("design")
          setSimulating(true)
          let sim: PreLabSimulation | null = null
          try {
            const res = await fetch(`/api/design/${designId}/validate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode: "simulate", desiredOutcome: target })
            })
            if (await handleBudgetError(res)) break
            const json = await res.json().catch(() => null)
            if (!res.ok || !json) break
            const nextValidation = json.validation as ValidationState
            setValidation(nextValidation)
            latestContentRef.current = {
              ...latestContentRef.current,
              validation: nextValidation
            }
            sim = (json.simulation ?? null) as PreLabSimulation | null
            ranSim = true
          } finally {
            setSimulating(false)
          }
          if (!sim) break
          if (sim.meetsTarget) {
            simMet = true
            break
          }
          const changes: string[] = Array.isArray(sim.optimizedChanges)
            ? sim.optimizedChanges
            : []
          // No actionable changes, or out of rounds → keep the best design.
          if (changes.length === 0 || round === MAX_AUTO_SIM_ROUNDS) break

          // Apply the simulation's changes as a new design iteration.
          const directive = [
            `[Auto design iteration ${round} — apply these simulation-suggested changes so the design meets the success criteria]`,
            `Success criteria / target: ${target}`,
            sim.gapAnalysis ? `Predicted gap: ${sim.gapAnalysis}` : "",
            `Apply these changes:\n- ${changes.join("\n- ")}`
          ]
            .filter(Boolean)
            .join("\n")
          const MARK = "\n\n<<ITERATION MEMORY>>\n"
          const baseDetails = curDetails.split(MARK)[0].trimEnd()
          curDetails = `${baseDetails}${MARK}${directive}`

          // Snapshot the current design before overwriting it.
          const nextVersionNumber = (versions[0]?.versionNumber ?? 0) + 1 || 1
          const snapshot: DesignVersionSnapshot = {
            id:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `v-${Date.now()}`,
            versionNumber: nextVersionNumber,
            designs: curDesigns,
            createdAt: new Date().toISOString(),
            origin: curOrigin,
            // Auto mode iterates unattended, so without this the researcher
            // came back to a stack of versions with no record of why any of
            // them was superseded. Keep the verdict, the numbers, the changes
            // that were applied, and the whole simulation for the expander.
            outcome: {
              verdict: sim.predictedResults,
              meetRate: sim.meetRate,
              metTarget: sim.meetsTarget,
              appliedChanges: changes,
              simulation: sim
            }
          }
          versions = [snapshot, ...versions]
          setDesignVersions(versions)
          setDesignOrigin("simulation")
          curOrigin = "simulation"

          // Regenerate the design with the changes folded in. Same progress
          // treatment as the manual path - otherwise the auto run sits on the
          // superseded protocol while it builds the next one.
          setActiveTab("design")
          setBusy("design")
          setDesignProgress([])
          setRegenPlan({ version: nextVersionNumber + 1, changes })
          curProblem = { ...curProblem, additionalDetails: curDetails }
          const iterContent = await runPhaseBackground(
            designId,
            {
              phase: "design",
              problem: curProblem,
              hypotheses: autoHyps,
              approvedPhases: designApproved
            },
            ev => setDesignProgress(prev => [...prev, ev])
          )
          setRegenPlan(null)
          curDesigns = iterContent.designs ?? curDesigns
          setGeneratedDesigns(curDesigns)
          setViewingVersionId(null)
          setActiveDesignId(curDesigns[0]?.id ?? null)
          latestContentRef.current = {
            ...iterContent,
            designVersions: versions,
            problem: curProblem
          }
          await persistContent({
            designs: curDesigns,
            designVersions: versions,
            problem: curProblem
          })
        }
      }

      // Land on the finished design (version rail + validation populated).
      setActiveTab("design")
      toast({
        title: simMet
          ? "Design meets your success criteria"
          : ranSim
            ? "Design built + simulated"
            : "Design generated",
        description: simMet
          ? "Ran the whole workflow and iterated the design until the simulation hit your target. Refine it by chatting on the right."
          : ranSim
            ? "Built and simulated the design — see the predicted gap and version history. Refine it by chatting on the right."
            : "Built the full design automatically. Refine it by chatting on the right."
      })
    } catch (error: any) {
      if ((error as any)?.message === "__paywall__") return
      toast({
        title: "Auto-generate failed",
        description: error?.message ?? "Try again in a moment.",
        variant: "destructive"
      })
    } finally {
      setBusy(null)
      // Never leave the pane stuck on "generating v3" if the run died midway.
      setRegenPlan(null)
    }
  }

  // ── Refine (clarifying questions) → run the gated phase ────────────────
  // Only "hypothesis" and "design" reach here; the problem checkpoint was
  // removed (its questions diluted the literature search).
  const handleClarifyComplete = async (answers: ClarifyAnswer[]) => {
    const cp = refineCheckpoint
    setRefineCheckpoint(null)
    if (!cp) return
    const text = clarifyAnswersToText(answers)
    const nextClarifications = { ...clarifications, [cp]: answers }
    setClarifications(nextClarifications)
    void persistContent({ clarifications: nextClarifications })
    if (cp === "hypothesis") {
      // Own-path questions answered → generate a steered hypothesis and land on
      // the Suggested tab so the researcher can pick + edit it, then continue.
      setHypTab("suggested")
      await runHypothesisGeneration(text)
    } else {
      await runDesignGeneration(text)
    }
  }

  const handleClarifyCancel = () => {
    // Back out to the prior step - no phase run.
    setRefineCheckpoint(null)
  }

  // Step back to the design state before the last chat-applied edit.
  const handleUndo = () => {
    if (!ensureCanEdit()) return
    const prev = undoStackRef.current.pop()
    setUndoDepth(undoStackRef.current.length)
    if (!prev) return
    generatedDesignsRef.current = prev
    setGeneratedDesigns(prev)
    if (!prev.find(d => d.id === activeDesignId)) {
      setActiveDesignId(prev[0]?.id ?? null)
    }
    void persistContent({ designs: prev })
      .then(() =>
        toast({
          title: "Reverted",
          description: "Restored the previous version of the design."
        })
      )
      .catch(() =>
        toast({
          title: "Revert failed",
          description: "Couldn't save the revert - reload and try again.",
          variant: "destructive"
        })
      )
  }

  // "Next" on the Design tab opens the decision page rather than finalising
  // outright — the scientist chooses between shipping the design as-is and
  // simulating it first.
  const handleApproveDesignAndContinue = () => {
    if (!ensureCanEdit()) return
    if (generatedDesigns.length === 0) return
    setShowDesignGate(true)
  }

  /** Gate option A — finalise. Approves the design, returns to it, and opens
   *  Export so the download formats are right there (items 10 / 15). */
  const handleFinalizeDesign = async () => {
    setShowDesignGate(false)
    const nextApproved: PhaseKey[] = [
      "problem",
      "literature",
      "hypotheses",
      "design"
    ]
    setApprovedPhases(nextApproved)
    await persistContent({ approvedPhases: nextApproved })
    setActiveTab("design")
    setShowLibrary(true)
    toast({
      title: "Design finalised",
      description: "Pick a format on the right to download it."
    })
  }

  /** Leave Validate/Iterate and go back to the design with Export open, so
   *  the download formats are right there (items 10 / 15). */
  const handleContinueToDesign = () => {
    setValidateModalOpen(false)
    setActiveTab("design")
    setShowLibrary(true)
  }

  /** Gate option B — simulate first. Opens the Validate & iterate modal on
   *  the simulate path and kicks the simulation off immediately. */
  const handleGoSimulate = () => {
    setShowDesignGate(false)
    setActiveTab("design")
    setValidateMode("simulate")
    setValidateModalOpen(true)
    if (!validation.simulation && !simulating) {
      void handleSimulate((successCriteria || objective || "").trim())
    }
  }

  // ── Validate-and-iterate loop ─────────────────────────────────────────────

  // 5a: pre-lab simulation — predict results vs the desired outcome and get the
  // design changes that would hit the target, before running anything.
  const handleSimulate = async (desiredOutcome: string) => {
    if (!ensureCanEdit()) return
    setSimulating(true)
    try {
      const res = await fetch(`/api/design/${designId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "simulate", desiredOutcome })
      })
      if (res.status === 402) {
        await handleBudgetError(res)
        return
      }
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        toast({
          title: "Simulation failed",
          description: json?.error ?? `Simulate failed (HTTP ${res.status}).`,
          variant: "destructive"
        })
        return
      }
      const nextValidation = json.validation as ValidationState
      setValidation(nextValidation)
      latestContentRef.current = {
        ...latestContentRef.current,
        validation: nextValidation
      }
      if (!approvedPhases.includes("validate")) {
        setApprovedPhases(prev =>
          prev.includes("validate") ? prev : [...prev, "validate"]
        )
      }
      const sim = json.simulation
      toast({
        title: sim?.meetsTarget
          ? "Simulation: design should hit your target"
          : "Simulation: design needs tuning",
        description: sim?.meetsTarget
          ? "Predicted to reach the desired outcome. Run it, then validate with real data."
          : "See the predicted gap + the changes that would get there below."
      })
    } catch {
      toast({
        title: "Couldn't run the simulation",
        description: "Try again in a moment.",
        variant: "destructive"
      })
    } finally {
      setSimulating(false)
    }
  }

  const handleRunValidation = async (
    raw: string,
    dataFiles: { id?: string; name: string; size?: number; type?: string }[],
    structured?: ParsedLabData | null
  ) => {
    if (!ensureCanEdit()) return
    setValidating(true)
    try {
      const res = await fetch(`/api/design/${designId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "validate", raw, dataFiles, structured })
      })
      if (res.status === 402) {
        await handleBudgetError(res)
        return
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: "Validation failed",
          description: json?.error ?? "Try again.",
          variant: "destructive"
        })
        return
      }
      const nextValidation = json.validation as ValidationState
      setValidation(nextValidation)
      // Server already persisted; mirror into the ref + approvedPhases so a
      // reload and the tab gating stay consistent without a second write.
      latestContentRef.current = {
        ...latestContentRef.current,
        validation: nextValidation
      }
      if (!approvedPhases.includes("validate")) {
        setApprovedPhases(prev =>
          prev.includes("validate") ? prev : [...prev, "validate"]
        )
      }
      const v = (json.iteration as ExperimentIteration)?.verdict
      toast({
        title: `Iteration ${json.iteration?.index}: ${verdictLabel(v)}`,
        description:
          v === "supported"
            ? "Your data supports the hypothesis."
            : "See the insights and suggested next steps below."
      })
    } catch {
      toast({
        title: "Couldn't reach the validator",
        description: "Check your connection and try again.",
        variant: "destructive"
      })
    } finally {
      setValidating(false)
    }
  }

  // 5b: apply the user's SELECTED suggested changes and regenerate the DESIGN
  // directly (snapshotting the current one as a version), rather than re-opening
  // the whole hypothesis→design loop. The chosen changes + running memory are
  // injected into the design prompt.
  const handleApplyIterationChanges = async (
    changes: string[],
    revisedHypothesis?: string,
    origin: "simulation" | "lab-data" = "lab-data"
  ) => {
    if (!ensureCanEdit()) return
    if (changes.length === 0 && !revisedHypothesis) {
      toast({
        title: "Nothing selected",
        description: "Pick at least one change to apply.",
        variant: "destructive"
      })
      return
    }
    const nextRound = validation.iterations.length + 1
    const latestIteration =
      validation.iterations[validation.iterations.length - 1]

    // Which of the offered optimisations the researcher actually believed.
    // The full offered list is logged with `chosen` per item, so the useful
    // question - "what fraction of suggested changes do people take, and are
    // the ignored ones always the same kind?" - becomes answerable. Counting
    // only the applied ones would hide every suggestion that gets skipped.
    const offeredChanges =
      origin === "simulation"
        ? (validation.simulation?.optimizedChanges ?? [])
        : (latestIteration?.suggestedChanges ?? [])
    if (offeredChanges.length > 0) {
      trackDecision({
        surface: "simulation_changes",
        decision: "selected",
        subjectType: "design",
        subjectId: designId,
        workspaceId,
        candidates: offeredChanges.map((c, i) => ({
          label: c,
          rank: i + 1,
          chosen: changes.includes(c)
        })),
        meta: {
          origin,
          round: nextRound,
          revisedHypothesis: !!revisedHypothesis,
          meetRate: validation.simulation?.meetRate ?? null
        }
      })
    }
    const directive = [
      `[Design iteration ${nextRound} — apply these changes the researcher selected after reviewing the data]`,
      validation.cumulativeInsights
        ? `Everything learned so far: ${validation.cumulativeInsights}`
        : "",
      changes.length ? `Apply these changes:\n- ${changes.join("\n- ")}` : "",
      revisedHypothesis
        ? `Test this sharper hypothesis: ${revisedHypothesis}`
        : ""
    ]
      .filter(Boolean)
      .join("\n")

    const MARK = "\n\n<<ITERATION MEMORY>>\n"
    const base = additionalDetails.split(MARK)[0].trimEnd()
    const nextDetails = `${base}${MARK}${directive}`
    setAdditionalDetails(nextDetails)
    const nextProblem = { ...currentProblem(), additionalDetails: nextDetails }

    // Snapshot the current design as a version before overwriting it. The
    // snapshot carries the provenance of the design being SAVED (the first one
    // is the original); the new design takes on this round's origin, so the
    // timeline reads "Original → Simulated → From lab data".
    let snapshotVersions = designVersions
    if (generatedDesigns.length > 0) {
      const nextVersionNumber = liveVersionNumber
      const snapshot: DesignVersionSnapshot = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `v-${Date.now()}`,
        versionNumber: nextVersionNumber,
        designs: generatedDesigns,
        createdAt: new Date().toISOString(),
        origin: designOrigin,
        // Record WHY this version was superseded, so reading it later still
        // shows the verdict and the changes that moved the design on - not
        // just the protocol with no reasoning attached.
        outcome: {
          ...(origin === "simulation" && validation.simulation
            ? {
                verdict: validation.simulation.predictedResults,
                meetRate: validation.simulation.meetRate,
                metTarget: validation.simulation.meetsTarget,
                simulation: validation.simulation
              }
            : {}),
          ...(origin === "lab-data" && latestIteration
            ? {
                verdict: latestIteration.reasoning || latestIteration.verdict,
                insights: latestIteration.insights
              }
            : {}),
          appliedChanges: changes
        }
      }
      snapshotVersions = [snapshot, ...designVersions]
      setDesignVersions(snapshotVersions)
      setDesignOrigin(origin)
      // The live design is the newest again, so drop any number pinned by an
      // earlier promotion - otherwise the new version would keep the old label.
      setCurrentVersionNumber(null)
      // Tell the design tab WHAT is being built, so it can show progress in
      // place of the version that is being superseded.
      setRegenPlan({
        version: nextVersionNumber + 1,
        changes,
        hypothesis: revisedHypothesis
      })
    }

    // Close the modal and land on the design so the regeneration - and then
    // the updated design with its new version-rail entry - is what they see.
    setValidateModalOpen(false)
    setActiveTab("design")
    setBusy("design")
    setDesignProgress([])
    try {
      const content = await runPhaseBackground(
        designId,
        {
          phase: "design",
          problem: nextProblem,
          hypotheses,
          approvedPhases
        },
        ev => setDesignProgress(prev => [...prev, ev])
      )
      latestContentRef.current = {
        ...content,
        designVersions: snapshotVersions,
        currentVersionNumber: null,
        problem: nextProblem
      }
      if (content.designs) {
        setGeneratedDesigns(content.designs)
        setViewingVersionId(null)
        setActiveDesignId(content.designs[0]?.id ?? null)
      }
      // The stored simulation described the design we just REPLACED. Leaving
      // it in place meant reopening Validate for the new version showed the
      // previous version's verdict and its full working stacked around the
      // simulate button - two versions' results on one screen with nothing
      // saying which was which. The old result lives on its version snapshot,
      // which is where "Earlier rounds" reads it from.
      const clearedValidation = { ...validation, simulation: undefined }
      setValidation(clearedValidation)
      void persistContent({
        designs: content.designs,
        designVersions: snapshotVersions,
        currentVersionNumber: null,
        problem: nextProblem,
        validation: clearedValidation
      })
      toast({
        title: `Design iteration ${nextRound} generated`,
        description: "Your selected changes are applied. Prior version saved."
      })
    } catch (e: any) {
      if (e?.message !== "__paywall__") {
        toast({
          title: "Couldn't generate the iteration",
          description: e?.message ?? "Try again.",
          variant: "destructive"
        })
      }
    } finally {
      setBusy(null)
      setRegenPlan(null)
    }
  }

  // ── Regenerate handlers ───────────────────────────────────────────────

  const handleGenerateMoreLiterature = async () => {
    if (!ensureCanEdit()) return
    setBusy("literature")
    setLiteratureProgress([])
    try {
      // Local accumulation — see the note in runLiteratureGeneration; reading
      // the state here captures the stale render-time value.
      const runEvents: LiteratureProgress[] = []
      const content = await runPhaseBackground(
        designId,
        {
          phase: "literature",
          mode: "append",
          problem: currentProblem(),
          approvedPhases
        },
        ev => {
          runEvents.push(ev)
          setLiteratureProgress(prev => [...prev, ev])
        }
      )
      latestContentRef.current = content
      if (content.papers) setPapers(content.papers)
      // Persist the "N examined" total alongside the papers so the header
      // still shows it after navigating away and back.
      let totalFromRun: number | undefined
      let rawFromRun: number | undefined
      for (let i = runEvents.length - 1; i >= 0; i--) {
        const ev = runEvents[i]
        if (
          ev.step === "papers_found" &&
          typeof ev.totalCandidates === "number"
        ) {
          totalFromRun = ev.totalCandidates
          if (typeof ev.rawCandidates === "number")
            rawFromRun = ev.rawCandidates
          break
        }
      }
      if (typeof totalFromRun === "number") {
        setPersistedLitTotalCandidates(totalFromRun)
        void persistContent({
          literatureStats: {
            totalCandidates: totalFromRun,
            rawCandidates: rawFromRun
          }
        })
      }
    } catch (error: any) {
      if ((error as any)?.message === "__paywall__") return
      toast({
        title: "Literature search failed",
        description: error?.message ?? "Try again in a moment.",
        variant: "destructive"
      })
    } finally {
      setBusy(null)
    }
  }

  const handleRegenerateHypotheses = async () => {
    if (!ensureCanEdit()) return
    const keep = clearDownstreamState("hypotheses")
    // Re-approve literature so a retry after a transient failure doesn't get
    // gated: clearDownstreamState keeps problem + literature, but be explicit.
    const keepWithLiterature = keep.includes("literature")
      ? keep
      : ([...keep, "literature"] as PhaseKey[])
    setApprovedPhases(keepWithLiterature)
    setBusy("hypotheses")
    setHypothesesProgress([])
    setHypothesesError(null)
    try {
      const content = await runPhaseBackground(
        designId,
        {
          phase: "hypotheses",
          problem: currentProblem(),
          papers,
          approvedPhases: keepWithLiterature
        },
        ev => setHypothesesProgress(prev => [...prev, ev])
      )
      latestContentRef.current = content
      if (content.papers) setPapers(content.papers)
      if (content.hypotheses) setHypotheses(content.hypotheses)
    } catch (error: any) {
      const msg = error?.message ?? "Try again in a moment."
      setHypothesesError(msg)
      toast({
        title: "Hypothesis generation failed",
        description: msg,
        variant: "destructive"
      })
    } finally {
      setBusy(null)
    }
  }

  const handleRegenerateDesign = async () => {
    if (!ensureCanEdit()) return
    // Snapshot the current design set into history before regenerating so
    // the user can restore it later via the version switcher.
    let snapshotVersions = designVersions
    if (generatedDesigns.length > 0) {
      const nextVersionNumber = liveVersionNumber
      const snapshot: DesignVersionSnapshot = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `v-${Date.now()}`,
        versionNumber: nextVersionNumber,
        designs: generatedDesigns,
        createdAt: new Date().toISOString()
      }
      snapshotVersions = [snapshot, ...designVersions]
      setDesignVersions(snapshotVersions)
      setCurrentVersionNumber(null)
      await persistContent({
        designVersions: snapshotVersions,
        currentVersionNumber: null
      })
    }

    const keep = clearDownstreamState("design")
    setBusy("design")
    setDesignProgress([])
    try {
      const content = await runPhaseBackground(
        designId,
        {
          phase: "design",
          problem: currentProblem(),
          hypotheses,
          approvedPhases: keep
        },
        ev => setDesignProgress(prev => [...prev, ev])
      )
      latestContentRef.current = {
        ...content,
        designVersions: snapshotVersions
      }
      const designs = content.designs ?? []
      setGeneratedDesigns(designs)
      setViewingVersionId(null)
      setActiveDesignId(designs[0]?.id ?? null)
      // Persist designVersions alongside the regenerated designs so they
      // survive a reload.
      await persistContent({
        designVersions: snapshotVersions,
        currentVersionNumber: null
      })
    } catch (error: any) {
      if ((error as any)?.message === "__paywall__") return
      toast({
        title: "Design generation failed",
        description: error?.message ?? "Try again in a moment.",
        variant: "destructive"
      })
    } finally {
      setBusy(null)
    }
  }

  /**
   * Resolve the ASSUMPTION LEDGER. Each answer is either the researcher's own
   * value or an explicit "keep what you assumed". The confirmed values become
   * an authoritative directive and the design is regenerated, snapshotting the
   * assumption-based draft as a version so the change is auditable.
   */
  const handleResolveAssumptions = async (
    answers: { id: string; value: string; acceptedAssumption: boolean }[]
  ) => {
    if (!ensureCanEdit()) return
    if (busy) return
    const design = generatedDesigns[0]
    const ledger = design?.assumptions ?? []
    if (!design || ledger.length === 0) return

    const answeredAt = new Date().toISOString()
    const byId = new Map(answers.map(a => [a.id, a]))
    const resolved = ledger.map(a => {
      const ans = byId.get(a.id)
      return ans
        ? {
            ...a,
            resolution: {
              value: ans.value,
              acceptedAssumption: ans.acceptedAssumption,
              answeredAt
            }
          }
        : a
    })

    // Only the values the researcher actually CHANGED need to override the
    // draft; accepted assumptions are already baked in.
    const corrections = resolved.filter(
      a => a.resolution && !a.resolution.acceptedAssumption
    )
    if (corrections.length === 0) {
      // Everything accepted - just record the confirmation, no regeneration.
      const confirmedDesigns = generatedDesigns.map(d =>
        d.id === design.id ? { ...d, assumptions: resolved } : d
      )
      setGeneratedDesigns(confirmedDesigns)
      latestContentRef.current = {
        ...latestContentRef.current,
        designs: confirmedDesigns
      }
      void persistContent({ designs: confirmedDesigns })
      toast({
        title: "Assumptions confirmed",
        description: "The design stands as generated."
      })
      return
    }

    const directive = [
      "[CONFIRMED PARAMETERS from the researcher - these REPLACE the values you assumed. Recompute every dependent volume, count, dilution and total. Do not keep the superseded numbers anywhere in the protocol.]",
      ...corrections.map(
        a =>
          `- ${a.parameter}: ${a.resolution!.value} (you had assumed ${a.assumedValue})`
      )
    ].join("\n")

    const MARK = "\n\n<<CONFIRMED PARAMETERS>>\n"
    const base = additionalDetails.split(MARK)[0].trimEnd()
    const nextDetails = `${base}${MARK}${directive}`
    setAdditionalDetails(nextDetails)
    const nextProblem = { ...currentProblem(), additionalDetails: nextDetails }

    // Snapshot the assumption-based draft before replacing it.
    let snapshotVersions = designVersions
    const nextVersionNumber = liveVersionNumber
    const snapshot: DesignVersionSnapshot = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `v-${Date.now()}`,
      versionNumber: nextVersionNumber,
      designs: generatedDesigns.map(d =>
        d.id === design.id ? { ...d, assumptions: resolved } : d
      ),
      createdAt: answeredAt,
      origin: designOrigin
    }
    snapshotVersions = [snapshot, ...designVersions]
    setDesignVersions(snapshotVersions)
    setCurrentVersionNumber(null)

    setActiveTab("design")
    setBusy("design")
    setDesignProgress([])
    try {
      const content = await runPhaseBackground(
        designId,
        {
          phase: "design",
          problem: nextProblem,
          hypotheses,
          approvedPhases
        },
        ev => setDesignProgress(prev => [...prev, ev])
      )
      // Carry the resolutions forward so the panel shows them as settled
      // rather than re-asking about parameters the researcher just answered.
      const carried = (content.designs ?? []).map((d, i) =>
        i === 0
          ? {
              ...d,
              assumptions: [
                ...resolved,
                ...(d.assumptions ?? []).filter(
                  na =>
                    !resolved.some(
                      r =>
                        r.parameter.trim().toLowerCase() ===
                        na.parameter.trim().toLowerCase()
                    )
                )
              ]
            }
          : d
      )
      setGeneratedDesigns(carried)
      setViewingVersionId(null)
      setActiveDesignId(carried[0]?.id ?? null)
      latestContentRef.current = {
        ...content,
        designs: carried,
        designVersions: snapshotVersions,
        currentVersionNumber: null,
        problem: nextProblem
      }
      await persistContent({
        designs: carried,
        designVersions: snapshotVersions,
        currentVersionNumber: null,
        problem: nextProblem
      })
      toast({
        title: `Design rebuilt on your values`,
        description: `${corrections.length} assumption${corrections.length === 1 ? "" : "s"} replaced. Prior draft saved to history.`
      })
    } catch (e: any) {
      if (e?.message !== "__paywall__") {
        toast({
          title: "Couldn't rebuild the design",
          description: e?.message ?? "Try again.",
          variant: "destructive"
        })
      }
    } finally {
      setBusy(null)
    }
  }

  /**
   * BROWSE a version (item 11). Clicking a version used to snapshot the current
   * design as a NEW version and delete the clicked one from history, so every
   * click inflated the numbering (v1/v2 → v3/v4 → …) and you could never get
   * back to where you started. Versions are now an immutable timeline and this
   * only moves a read pointer: no writes, no renumbering. `null` = the live
   * design.
   */
  const handleViewDesignVersion = (versionId: string | null) => {
    if (versionId && !designVersions.some(v => v.id === versionId)) return
    setViewingVersionId(versionId)
  }

  /**
   * Promote the version being viewed to be the live design.
   *
   * This is a SWAP, not an append. It used to snapshot the live set under a
   * brand-new number and then copy the chosen version on top, so restoring v1
   * produced a v4 that was really v1 - the timeline grew on every look back and
   * the numbers stopped meaning anything. Now the live set goes into history
   * under the number it already had, the promoted version comes out of history
   * keeping ITS number, and the total count is unchanged. Nothing is lost and
   * nothing is renumbered; the researcher can save and carry on from it.
   */
  const handleRestoreDesignVersion = async (versionId: string) => {
    if (!ensureCanEdit()) return
    const version = designVersions.find(v => v.id === versionId)
    if (!version) return

    // Take the promoted version OUT of history...
    let nextVersions = designVersions.filter(v => v.id !== versionId)
    // ...and put the set we were on IN, under its own existing number.
    if (generatedDesigns.length > 0) {
      const snapshot: DesignVersionSnapshot = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `v-${Date.now()}`,
        versionNumber: liveVersionNumber,
        designs: generatedDesigns,
        createdAt: new Date().toISOString(),
        origin: designOrigin,
        // Keep whatever verdict the set we're stepping away from earned, so
        // stepping back to it later still shows its simulation result.
        ...(validation.simulation
          ? {
              outcome: {
                verdict: validation.simulation.predictedResults,
                meetRate: validation.simulation.meetRate,
                metTarget: validation.simulation.meetsTarget,
                simulation: validation.simulation
              }
            }
          : {})
      }
      nextVersions = [snapshot, ...nextVersions]
    }

    setGeneratedDesigns(version.designs)
    setActiveDesignId(version.designs[0]?.id ?? null)
    setDesignVersions(nextVersions)
    setCurrentVersionNumber(version.versionNumber)
    setDesignOrigin(version.origin ?? "original")
    setViewingVersionId(null)
    await persistContent({
      designs: version.designs,
      designVersions: nextVersions,
      currentVersionNumber: version.versionNumber
    })
    toast({
      title: `v${version.versionNumber} is now the current design`,
      description:
        "It keeps its version number, and the set you were on moved into history. Save when you're ready."
    })
  }

  // ── Revise handler ────────────────────────────────────────────────────

  const handleRevisePhase = async (phase: PhaseKey) => {
    if (!ensureCanEdit()) return
    // A completed (Design-approved) design is locked: its scientific content
    // can't be edited in place. To change a hypothesis or an input, the user
    // duplicates it from the Designs list (the Duplicate icon reopens the copy
    // for editing while preserving the agent outputs).
    if (approvedPhases.includes("design")) {
      toast({
        title: "This design is locked",
        description:
          "Completed designs can't be edited. Duplicate it from the Designs list to branch a variant you can change.",
        variant: "destructive"
      })
      return
    }
    const keep = clearDownstreamState(phase)
    const revised = keep.filter(p => p !== phase)
    setApprovedPhases(revised)
    await persistContent({ approvedPhases: revised })
    setActiveTab(phase)
  }

  // ── Per-item toggle helpers ───────────────────────────────────────────

  const handleTogglePaper = (id: string) => {
    if (!ensureCanEdit()) return
    setPapers(prev => {
      const next = prev.map(p =>
        p.id === id ? { ...p, selected: !p.selected } : p
      )
      void persistContent({ papers: next })
      return next
    })
  }

  // Tracks which papers the user has saved into the design's library this
  // session, so the card's save icon can flip to a "Saved" state.
  const [savedPaperIds, setSavedPaperIds] = useState<Set<string>>(
    () => new Set<string>()
  )

  /**
   * Save a paper into the workspace paper library, tagged with this design so
   * it surfaces under the design name in the Library section. Optimistic +
   * fire-and-forget: the icon flips immediately and failures roll back with a
   * soft toast. (The card's own "Link ↗" is how the user opens the source -
   * saving no longer hijacks a new browser tab.)
   */
  const handleSavePaper = (paper: Paper) => {
    if (!workspaceId) return
    setSavedPaperIds(prev => {
      const next = new Set(prev)
      next.add(paper.id)
      return next
    })
    void addPaperToLibrary({
      workspaceId,
      paper: {
        title: paper.title,
        url: paper.sourceUrl || "",
        summary: paper.summary || "",
        authors: paper.authors ?? [],
        year: paper.year || "",
        journal: paper.journal || "",
        source: paper.source || undefined
      },
      sourceDesignId: designId
    })
      .then((res: any) => {
        if (res?.deduplicated) {
          console.log("[paper-library] paper already saved:", paper.title)
        } else {
          toast({
            title: "Saved to library",
            description: `"${paper.title.slice(0, 60)}" added to this design's library.`
          })
        }
      })
      .catch(err => {
        console.warn("[paper-library] save failed:", err)
        // Roll back the optimistic flag so the user can retry.
        setSavedPaperIds(prev => {
          const next = new Set(prev)
          next.delete(paper.id)
          return next
        })
        toast({
          title: "Couldn't save to library",
          description: err?.message ?? "Workspace save failed - try again.",
          variant: "destructive"
        })
      })
  }

  const handleUploadPdfs = (files: FileList | null) => {
    if (!ensureCanEdit()) return
    if (!files || files.length === 0) return
    const added: Paper[] = Array.from(files)
      .filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"))
      .map((f, i) => ({
        id: `u-${Date.now()}-${i}`,
        title: f.name.replace(/\.pdf$/i, ""),
        summary:
          "Summary pending - the agentic system will analyze this upload and return a structured abstract.",
        userAdded: true,
        selected: true
      }))
    if (added.length === 0) {
      toast({
        title: "No PDFs detected",
        description: "Drop PDF files to add them to the literature set.",
        variant: "destructive"
      })
      return
    }
    setPapers(prev => {
      const next = [...added, ...prev]
      void persistContent({ papers: next })
      return next
    })
  }

  const selectedPapers = useMemo(() => papers.filter(p => p.selected), [papers])

  const handleToggleHypothesis = (id: string) => {
    if (!ensureCanEdit()) return
    setHypotheses(prev => {
      const next = prev.map(h =>
        h.id === id ? { ...h, selected: !h.selected } : h
      )
      void persistContent({ hypotheses: next })
      return next
    })
  }

  /**
   * Inline edit on a hypothesis's text (#2). Lets the scientist tweak
   * a generated hypothesis with their own phrasing before approval.
   * Persists immediately so downstream agents see the edited text on
   * the next phase.
   */
  const handleEditHypothesis = (id: string, nextText: string) => {
    if (!ensureCanEdit()) return
    const trimmed = nextText.trim()
    if (!trimmed) return
    setHypotheses(prev => {
      const next = prev.map(h => (h.id === id ? { ...h, text: trimmed } : h))
      void persistContent({ hypotheses: next })
      return next
    })
  }

  const selectedHypotheses = useMemo(
    () => hypotheses.filter(h => h.selected),
    [hypotheses]
  )

  const handleSaveDesign = async (id: string) => {
    if (!ensureCanEdit()) return
    setBusy("save")
    try {
      const next = generatedDesigns.map(d =>
        d.id === id ? { ...d, saved: true } : d
      )
      setGeneratedDesigns(next)
      await persistContent({ designs: next })
      toast({
        title: "Design saved",
        description: "Saved to this design's persistent content."
      })
    } catch (error: any) {
      if ((error as any)?.message === "__paywall__") return
      toast({
        title: "Save failed",
        description: error?.message ?? "Try again in a moment.",
        variant: "destructive"
      })
    } finally {
      setBusy(null)
    }
  }

  /**
   * Re-run ONLY the statistical-analysis portion of phase 4 for a specific
   * generated design. Writes the result into that design's Statistical
   * Analysis section via the same edit path.
   */
  const handleReviewStatistics = async (targetGeneratedDesignId: string) => {
    if (!ensureCanEdit()) return
    setBusy("stats-review")
    try {
      const res = await fetch(`/api/design/${designId}/stats-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generatedDesignId: targetGeneratedDesignId })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || "Stats review failed")
      }
      const { statisticalAnalysis } = (await res.json()) as {
        statisticalAnalysis: string
      }
      if (!statisticalAnalysis?.trim()) {
        throw new Error("Agent returned empty statistics")
      }
      // Upsert (not edit-only) so external designs that don't yet have a
      // Statistical Analysis section get one created on first review.
      await handleUpsertSection(
        targetGeneratedDesignId,
        "Statistical Analysis",
        statisticalAnalysis.trim()
      )
      toast({
        title: "Statistics refreshed",
        description: "Statistical Analysis section has been updated."
      })
    } catch (err: any) {
      toast({
        title: "Stats review failed",
        description: err?.message ?? "Try again in a moment.",
        variant: "destructive"
      })
    } finally {
      setBusy(null)
    }
  }

  /**
   * Upsert a section onto a specific generated design - adds if missing,
   * edits if present. Shares the persist+rollback path with edits.
   */
  const handleUpsertSection = async (
    targetDesignId: string,
    heading: string,
    body: string
  ) => {
    if (!ensureCanEdit()) return
    const target = generatedDesigns.find(d => d.id === targetDesignId)
    if (!target) return
    const previousDesigns = generatedDesigns

    const existsAt = target.sections.findIndex(s => s.heading === heading)
    const nextDesigns = generatedDesigns.map(d => {
      if (d.id !== targetDesignId) return d
      const nextSections =
        existsAt === -1
          ? [...d.sections, { heading, body }]
          : d.sections.map((s, i) => (i === existsAt ? { ...s, body } : s))
      return { ...d, saved: false, sections: nextSections }
    })
    setGeneratedDesigns(nextDesigns)

    try {
      await persistContent({ designs: nextDesigns })
    } catch (err: any) {
      setGeneratedDesigns(previousDesigns)
      toast({
        title: "Couldn't save section",
        description: err?.message ?? "Try again in a moment.",
        variant: "destructive"
      })
    }
  }

  /**
   * Call the make-plan endpoint to generate a dated execution plan for
   * the active design, then upsert it onto the design as a new section
   * "Execution Plan" (or replace if already present).
   */
  const handleMakePlan = async () => {
    if (!ensureCanEdit()) return
    if (!activeDesign) return
    setBusy("make-plan")
    try {
      const res = await fetch(`/api/design/${designId}/make-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generatedDesignId: activeDesign.id })
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error || "Plan generation failed")
      }
      const { executionPlan } = (await res.json()) as {
        executionPlan: string
      }
      if (!executionPlan?.trim()) {
        throw new Error("Agent returned empty execution plan")
      }
      await handleUpsertSection(
        activeDesign.id,
        "Execution Plan",
        executionPlan.trim()
      )
      toast({
        title: "Execution plan ready",
        description: "Added as a new section on this design."
      })
    } catch (err: any) {
      toast({
        title: "Couldn't make a plan",
        description: err?.message ?? "Try again in a moment.",
        variant: "destructive"
      })
    } finally {
      setBusy(null)
    }
  }

  /**
   * Edit a single section's body inline. Writes the updated `designs` array
   * to Firestore via the shared persist path. Optimistic - local state
   * flips immediately; rolls back on persist failure.
   */
  const handleEditSection = async (
    designId: string,
    heading: string,
    nextBody: string
  ) => {
    if (!ensureCanEdit()) return
    const target = generatedDesigns.find(d => d.id === designId)
    if (!target) return
    const sectionIndex = target.sections.findIndex(s => s.heading === heading)
    if (sectionIndex === -1) return
    const previous = target.sections[sectionIndex].body
    if (previous === nextBody) return

    // How much of the generated section survived contact with the researcher.
    // Both versions are in hand right here, so the ratio costs nothing - and
    // it separates "fixed a number" from "rewrote it", which a binary
    // edited/not-edited flag cannot. The heading is the item_key, so this
    // aggregates into "which sections does everyone always have to fix".
    trackDecision({
      surface: "design_section",
      decision: "approved_with_edits",
      subjectType: "design",
      subjectId: designId,
      itemKey: heading,
      workspaceId,
      editedRatio: editedRatio(previous, nextBody),
      meta: {
        effort,
        autoGenerated,
        beforeChars: previous.length,
        afterChars: nextBody.length
      }
    })

    const nextDesigns = generatedDesigns.map(d =>
      d.id !== designId
        ? d
        : {
            ...d,
            // Clear `saved` so the user knows there are unsaved edits since
            // the last "Save" action - keeps the Save button meaningful.
            saved: false,
            sections: d.sections.map((s, i) =>
              i === sectionIndex ? { ...s, body: nextBody } : s
            )
          }
    )
    setGeneratedDesigns(nextDesigns)

    try {
      await persistContent({ designs: nextDesigns })
    } catch (err: any) {
      // Roll back on failure so the UI doesn't lie to the user.
      setGeneratedDesigns(generatedDesigns)
      toast({
        title: "Couldn't save edit",
        description: err?.message ?? "Your change wasn't persisted. Try again.",
        variant: "destructive"
      })
    }
  }

  // ── Tab configuration ─────────────────────────────────────────────────

  const tabDefs = useMemo(() => {
    const phaseTabConfig: Array<{
      key: PhaseKey
      label: string
      sublabel: string
      accent:
        | "teal-journey"
        | "orange-product"
        | "purple-persona"
        | "sage-brand"
      icon: React.ReactNode
    }> = [
      {
        key: "problem",
        label: "Problem",
        sublabel: title || "Define problem",
        accent: "teal-journey",
        icon: <IconTargetArrow size={18} />
      },
      {
        key: "literature",
        label: "Literature",
        sublabel: papers.length > 0 ? `${papers.length} papers` : "No papers",
        accent: "orange-product",
        icon: <IconBook size={18} />
      },
      {
        key: "hypotheses",
        label: "Hypotheses",
        sublabel:
          hypotheses.length > 0
            ? `${hypotheses.length} hypotheses`
            : "No hypotheses",
        accent: "purple-persona",
        icon: <IconBulb size={18} />
      },
      {
        key: "design",
        label: "Design",
        // Counts EVERY design produced, not just the ones in the current
        // version. Simulation and lab-data iterations snapshot the previous
        // designs into designVersions and replace the live set, so a researcher
        // who had iterated twice still saw "2 designs" and no sign that the
        // earlier work existed.
        sublabel:
          generatedDesigns.length === 0
            ? "No designs"
            : designVersions.length > 0
              ? `${
                  generatedDesigns.length +
                  designVersions.reduce(
                    (n, v) => n + (v.designs?.length ?? 0),
                    0
                  )
                } designs · ${designVersions.length + 1} versions`
              : `${generatedDesigns.length} designs`,
        accent: "sage-brand",
        icon: <IconClipboardText size={18} />
      }
      // Validate + Iterate are not stages anymore - they run in a modal opened
      // from the Design step, so the phase rail ends at Design.
    ]

    return phaseTabConfig.map(t => ({
      ...t,
      disabled: getPhaseState(t.key) === "locked",
      status: getPhaseState(t.key) as TabStatus | undefined,
      primary: false
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    approvedPhases,
    papers,
    hypotheses,
    generatedDesigns,
    designVersions,
    problemValid,
    title
  ])

  // ── Agent popover helpers ──────────────────────────────────────────

  const sendAgentPrompt = (prompt: string) => {
    if (!prompt.trim()) return
    setUserInput(prompt.trim())
    setShowRail(true)
    setAgentPopoverOpen(false)
    setAgentPrompt("")
  }

  type QuickAction = { label: string; prompt: string; icon: React.ReactNode }

  const QUICK_ACTIONS: Record<
    string,
    { heading: string; actions: QuickAction[] }
  > = {
    problem: {
      heading: "Problem Definition",
      actions: [
        {
          label: "Refine problem statement",
          prompt:
            "Help me refine and sharpen my problem statement to make it more specific and testable.",
          icon: <IconPencil size={14} />
        },
        {
          label: "Suggest key variables",
          prompt:
            "Based on my problem statement and goal, suggest additional key variables I should consider for this experiment.",
          icon: <IconVariable size={14} />
        },
        {
          label: "Recommend constraints",
          prompt:
            "What practical constraints should I add to make this experiment design more realistic and feasible?",
          icon: <IconTargetArrow size={14} />
        },
        {
          label: "Clarify research goal",
          prompt:
            "Help me clarify and improve my research goal to better guide the experiment design.",
          icon: <IconBulb size={14} />
        }
      ]
    },
    literature: {
      heading: "Literature Search",
      actions: [
        {
          label: "Find more related papers",
          prompt:
            "Search for more relevant papers related to my research problem that I might have missed.",
          icon: <IconSearch size={14} />
        },
        {
          label: "Summarize selected papers",
          prompt:
            "Provide a concise summary of the key findings and methodologies from the selected papers.",
          icon: <IconClipboardText size={14} />
        },
        {
          label: "Identify research gaps",
          prompt:
            "Analyze the selected literature and identify gaps or unexplored areas relevant to my problem.",
          icon: <IconSparkles size={14} />
        },
        {
          label: "Compare methodologies",
          prompt:
            "Compare the research methodologies used across the selected papers and highlight their strengths and weaknesses.",
          icon: <IconBook size={14} />
        }
      ]
    },
    hypotheses: {
      heading: "Hypotheses",
      actions: [
        {
          label: "Generate alternative hypotheses",
          prompt:
            "Suggest alternative hypotheses I haven't considered based on the literature and problem context.",
          icon: <IconPlus size={14} />
        },
        {
          label: "Strengthen reasoning",
          prompt:
            "Help me strengthen the reasoning and justification behind my selected hypotheses.",
          icon: <IconBulb size={14} />
        },
        {
          label: "Identify potential confounds",
          prompt:
            "What confounding variables or biases might affect the validity of these hypotheses?",
          icon: <IconInfoCircle size={14} />
        },
        {
          label: "Simplify hypotheses",
          prompt:
            "Simplify the language and structure of my hypotheses to make them clearer and more testable.",
          icon: <IconPencil size={14} />
        }
      ]
    },
    design: {
      heading: "Experiment Design",
      actions: [
        {
          label: "Improve methodology",
          prompt:
            "Review and suggest improvements to the experimental methodology to strengthen internal validity.",
          icon: <IconSparkles size={14} />
        },
        {
          label: "Suggest control groups",
          prompt:
            "Recommend appropriate control groups and conditions for this experiment design.",
          icon: <IconFlask size={14} />
        },
        {
          label: "Refine sample size",
          prompt:
            "Help me determine an appropriate sample size with a power analysis justification.",
          icon: <IconChartBar size={14} />
        },
        {
          label: "Strengthen validity",
          prompt:
            "How can I improve the internal and external validity of this experiment design?",
          icon: <IconCheck size={14} />
        }
      ]
    },
    overview: {
      heading: "Summary",
      actions: [
        {
          label: "Generate abstract",
          prompt:
            "Generate a concise academic abstract summarizing this entire research design.",
          icon: <IconClipboardText size={14} />
        },
        {
          label: "Summarize findings",
          prompt:
            "Summarize the key findings and decisions made across all phases of this design.",
          icon: <IconSparkles size={14} />
        },
        {
          label: "Identify limitations",
          prompt:
            "What are the key limitations of this research design that should be acknowledged?",
          icon: <IconInfoCircle size={14} />
        }
      ]
    }
  }

  const currentActions = QUICK_ACTIONS[activeTab] ?? QUICK_ACTIONS.problem

  // ── Render ────────────────────────────────────────────────────────────

  const activeDesign =
    generatedDesigns.find(d => d.id === activeDesignId) ?? generatedDesigns[0]

  // The historical version being read, if any. Resolved (not just the id) so a
  // version deleted/restored out from under the pointer falls back to the live
  // design instead of rendering an empty tab.
  const viewedVersion = viewingVersionId
    ? (designVersions.find(v => v.id === viewingVersionId) ?? null)
    : null

  // Auto-fire picker-routed actions once the design is loaded. Strips the
  // `auto` query param so a back/forward doesn't re-trigger the action.
  // "literature" fires without a pre-existing design (#8); other actions
  // require an activeDesign (stats-review / make-plan need design content).
  useEffect(() => {
    if (autoFiredRef.current) return
    if (loading) return
    if (!autoAction) return
    // "literature" and "full" start from the Problem (no design yet); the
    // review actions need an existing design.
    if (autoAction !== "literature" && autoAction !== "full" && !activeDesign)
      return
    autoFiredRef.current = true
    // Make sure the user sees the design tab where the action lands.
    if (activeTab !== "design") setActiveTab("design")
    const locale = (params.locale as string) ?? "en"
    const wsId = params.workspaceid as string
    router.replace(`/${locale}/${wsId}/designs/${designId}`)

    if (autoAction === "stats-review") {
      void handleReviewStatistics(activeDesign.id)
    } else if (autoAction === "make-plan") {
      void handleMakePlan()
    } else if (autoAction === "literature") {
      // from-scratch dialog already captured problem+objective - run the
      // literature search straight away (#8)
      if (problemValid && papers.length === 0 && !busy) {
        void runLiteratureGeneration()
      }
    } else if (autoAction === "full") {
      // Auto mode: run the WHOLE pipeline hands-free from the Problem.
      if (problemValid && generatedDesigns.length === 0 && !busy) {
        // Collect the study details first (#5) - the whole point of auto mode
        // is that it won't stop later, so this is the one chance to steer it.
        setStudyDetailsFor("auto")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAction, loading, activeDesign?.id])

  // Tier-3 long-context dump: pass the full design (all hypotheses, all
  // papers, all generated designs). buildDesignChatContext caps at
  // ~75k tokens; if oversize, RAG fallback would kick in (not yet wired).
  // Flatten the researcher's explicit presets so the chat honours them and
  // asks before overriding (e.g. a stated condition cap).
  const chatPresets = (() => {
    const parts: string[] = []
    if (constraintMaterial.trim())
      parts.push(`Material constraint: ${constraintMaterial.trim()}`)
    if (constraintTime.trim())
      parts.push(`Time constraint: ${constraintTime.trim()}`)
    if (constraintEquipment.trim())
      parts.push(`Equipment constraint: ${constraintEquipment.trim()}`)
    if (successCriteria.trim())
      parts.push(`Success criteria: ${successCriteria.trim()}`)
    if (includeReplicates)
      parts.push(
        `Replicates: ${includeReplicates === "yes" ? "include replicates" : "no replicates"}`
      )
    if (additionalDetails.trim())
      parts.push(`Additional details: ${additionalDetails.trim()}`)
    const cl = clarifications
    const clText = clarifyAnswersToText([
      ...(cl?.problem ?? []),
      ...(cl?.hypothesis ?? []),
      ...(cl?.design ?? [])
    ])
    if (clText.trim()) parts.push(`Refine answers:\n${clText.trim()}`)
    const lab = labStandardsToText()
    if (lab.trim()) parts.push(lab.trim())
    return parts.join("\n")
  })()

  const baseChatContextPrompt = buildDesignChatContext({
    title,
    problemStatement,
    objective,
    domain,
    phase,
    selectedHypotheses: hypotheses.filter(h => h.selected),
    hypotheses,
    papers,
    generatedDesigns,
    activeDesign,
    presets: chatPresets,
    validation,
    designVersions
  })
  // When the user asks for a change ("change the buffer to 20 mM",
  // "swap the readout method") we want the assistant to PROPOSE an edit
  // they can approve, not silently rewrite the design. The block below
  // teaches the LLM a structured `<design-patch>` format; the chat
  // renderer parses that block out and shows an Approve / Reject card
  // (see components/messages/design-patch-block.tsx). On Approve, the
  // card fires a `design:apply-patch` window event which the listener
  // below applies to generatedDesigns + persists.
  const chatContextPrompt = `${baseChatContextPrompt}

## When the user asks you to change the design

If the user requests an edit to the current design, do NOT silently rewrite it.
Instead, after a brief explanation, emit ONE proposed edit inside a
\`<design-patch>\` block containing valid JSON. Two shapes are supported:

Find / replace within a section:
<design-patch>
{ "sectionHeading": "Materials & Setup", "find": "5 mM phosphate buffer", "replace": "20 mM phosphate buffer" }
</design-patch>

Or replace the section body entirely:
<design-patch>
{ "sectionHeading": "Statistical Analysis", "newBody": "..." }
</design-patch>

Rules:
- NEVER claim an edit has been made. You cannot change the design yourself -
  the ONLY thing that changes it is the researcher clicking Approve on the
  patch card. So do not write "I've updated…", "the design now says…",
  "applied", "done" or anything in the past tense about the document. Describe
  the change you are PROPOSING, emit the block, and say it takes effect once
  they approve it. Saying you applied something you didn't is the single worst
  failure here: the researcher walks away believing their protocol changed when
  it did not.
- If you are answering a question, explaining, or declining, that is fine - but
  then do not imply the document changed either.
- A response that describes an edit MUST contain a \`<design-patch>\` block for
  every section it changes. Never describe an edit you did not emit a block for.
- \`sectionHeading\` MUST match exactly one of the section headings shown above.
- Either \`find\`+\`replace\` OR \`newBody\` - not both.
- MULTI-SECTION EDITS: when a request touches several sections, handle the WHOLE
  request in ONE response. Do not do one section and stop - being asked to
  "carry on" after every single section is the most tedious possible way to
  make a change, and the researcher has said so.
  1. Open with a short numbered PLAN naming each section you are about to
     change and, in a few words, what changes in it. This is the list they
     approve against, so it must be complete and match the blocks that follow.
  2. Then emit the blocks in that same order, ONE PER SECTION, each preceded by
     a one-line heading like \`**1. Conditions Table** - drop to 6 arms\` so
     each approve card is identifiable.
  3. Close by saying they can approve them individually, in any order, and that
     nothing changes until they do.
  Keep it to at most 6 sections per response; if the request genuinely touches
  more, do the 6 most important, then say plainly which remain and offer to
  continue.
- Keep every patch INDEPENDENT: each must stand on its own against the CURRENT
  section text, because the researcher may approve some and reject others. A
  patch whose \`find\` only matches after a different patch is approved will
  silently fail - so never chain them.
- Do not emit two blocks for the same \`sectionHeading\` in one response. Merge
  them into a single block for that section.
- IMPORTANT - researcher presets: if an edit would CHANGE or VIOLATE a preset
  listed under "Researcher presets & constraints" (e.g. they capped the design
  at 8 conditions and now ask to add a 9th), do NOT emit the \`<design-patch>\`
  yet. First remind them of the SPECIFIC preset and ask them to confirm they
  want to override it. Only emit the patch after they confirm in a reply.
- Wrap the JSON in the tags exactly as shown; do not add markdown fencing.`

  // ── Apply patches that the chat proposed and the user approved ────────
  // The DesignPatchBlock card fires `design:apply-patch` on the window when
  // the user clicks Approve. We listen for that and apply the patch to the
  // active design (or the design at `designIndex` if specified), then
  // persist + sync the shared context.
  useEffect(() => {
    const handler = (e: Event) => {
      const evt = e as CustomEvent<{
        sectionHeading: string
        find?: string
        replace?: string
        newBody?: string
        designIndex?: number
      }>
      const patch = evt.detail
      if (!patch?.sectionHeading) return
      // Read-only collaborators can chat, but can't apply AI-suggested edits.
      if (!canEdit) return

      // Apply against the LIVE designs (via ref), update state, then persist -
      // awaited with explicit error handling so a failed save can't silently
      // lose the edit. No side effects inside the setState updater.
      const res = applyDesignPatch(
        generatedDesignsRef.current,
        activeDesignId,
        patch
      )
      if (res.error || !res.designs) {
        toast({
          title: "Couldn't apply edit",
          description: res.error ?? "The edit couldn't be applied.",
          variant: "destructive"
        })
        return
      }
      const nextDesigns = res.designs
      pushUndoSnapshot(generatedDesignsRef.current) // snapshot pre-edit state
      generatedDesignsRef.current = nextDesigns
      setGeneratedDesigns(nextDesigns)
      // Close the chat and surface the updated design directly.
      setShowRail(false)
      setActiveTab("design")
      void persistContent({ designs: nextDesigns })
        .then(() =>
          toast({
            title: "Design updated",
            description: `Applied edit to "${res.sectionHeading}".`
          })
        )
        .catch(() =>
          toast({
            title: "Edit applied locally - save failed",
            description:
              "Your change is showing, but couldn't be saved. Try the edit again or reload.",
            variant: "destructive"
          })
        )
    }
    window.addEventListener("design:apply-patch", handler as EventListener)
    return () =>
      window.removeEventListener("design:apply-patch", handler as EventListener)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDesignId, canEdit])

  // Live-sync: when a chat patch was applied + persisted server-side (via the
  // apply-patch endpoint - e.g. approved from the full-screen chat), reflect it
  // in the open editor. No persist here; the server already saved it.
  useEffect(() => {
    const onUpdated = (e: Event) => {
      const detail = (
        e as CustomEvent<{ designId?: string; designs?: GeneratedDesign[] }>
      ).detail
      if (!detail || detail.designId !== designId) return
      if (Array.isArray(detail.designs)) {
        pushUndoSnapshot(generatedDesignsRef.current) // snapshot pre-edit state
        generatedDesignsRef.current = detail.designs
        setGeneratedDesigns(detail.designs)
        setActiveDesignId(prev => prev ?? detail.designs?.[0]?.id ?? null)
      }
      // Approving a change closes the chat and drops the user straight onto the
      // updated design so they see the edit applied, not the chat.
      setShowRail(false)
      setActiveTab("design")
    }
    window.addEventListener(
      "design:content-updated",
      onUpdated as EventListener
    )
    return () =>
      window.removeEventListener(
        "design:content-updated",
        onUpdated as EventListener
      )
  }, [designId, pushUndoSnapshot])

  if (loading) {
    return (
      <div className="bg-ink-50 flex h-full items-center justify-center">
        <div className="border-ink-200 border-t-teal-journey size-8 animate-spin rounded-full border-2" />
      </div>
    )
  }

  if (!design) {
    return (
      <div className="bg-ink-50 flex h-full items-center justify-center">
        <p className="text-ink-400">Design not found</p>
      </div>
    )
  }

  const handleTabChange = (key: string) => {
    const phase = key as PhaseKey
    if (getPhaseState(phase) === "locked") return
    setActiveTab(key)
  }

  // The design-scoped chat now lives in a right-side rail (ScopedChatRail)
  // rather than a full-screen route. The rail is only available once the
  // design has been generated. Toggled by the header "Chat" button.
  const designGenerated = generatedDesigns.length > 0
  const toggleChatRail = () => setShowRail(s => !s)
  // Drag-to-resize the chat rail horizontally. The rail sits on the LEFT, with
  // the drag handle on its right edge, so its width is simply the cursor's X
  // position. Clamp between a usable minimum and ~half the viewport.
  const startRailResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const onMove = (ev: MouseEvent) => {
      const next = ev.clientX
      const max = Math.min(560, Math.round(window.innerWidth * 0.5))
      setRailWidth(Math.max(260, Math.min(max, next)))
    }
    const onUp = () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
      document.body.style.userSelect = ""
    }
    document.body.style.userSelect = "none"
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }
  // A completed (Design-approved) design is locked - edits require duplicating.
  const designLocked = approvedPhases.includes("design")

  // Full-screen decision step after Design → Next. Two clearly-explained
  // paths: finalise the design now, or simulate it before spending bench time.
  if (showDesignGate) {
    return (
      <div className="bg-ink-50 h-full overflow-auto">
        <div className="mx-auto max-w-[760px] px-6 py-12">
          <div className="text-teal-journey flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em]">
            <IconFlask size={13} /> Design ready
          </div>
          <h1 className="text-ink-900 mt-1 text-2xl font-extrabold tracking-tight">
            What next?
          </h1>
          <p className="text-ink-500 mt-1 text-sm">
            Your design is written. You can take it to the bench as it stands,
            or have it stress-tested on the computer first.
          </p>

          <div className="mt-6 space-y-3">
            <div className="border-ink-200 rounded-2xl border bg-white p-5">
              <h2 className="text-ink-900 text-[15px] font-semibold">
                Use this design
              </h2>
              <p className="text-ink-500 mt-1 text-[13px] leading-relaxed">
                Finalise it as-is and go straight to downloads — protocol, SOP,
                material list, bench guide. Pick this when you&apos;re confident
                in the plan and ready to run it.
              </p>
              <Button
                onClick={() => void handleFinalizeDesign()}
                className="bg-brick hover:bg-brick-hover mt-3 gap-2"
              >
                <IconCheck size={16} /> Approve &amp; finalise design
              </Button>
            </div>

            <div className="border-ink-200 rounded-2xl border bg-white p-5">
              <h2 className="text-ink-900 text-[15px] font-semibold">
                Simulate the results first
              </h2>
              <p className="text-ink-500 mt-1 text-[13px] leading-relaxed">
                We run your design on the computer many times over to estimate
                what it would produce and how reliably it would hit your target
                — then flag the problems to fix and the changes most likely to
                get you there. Pick this to tighten the design before using up
                material and bench time.
              </p>
              <Button
                variant="outline"
                onClick={handleGoSimulate}
                className="mt-3 gap-2"
              >
                <IconSparkles size={16} /> Simulate before the bench
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDesignGate(false)}
            className="text-ink-400 hover:text-ink-700 mt-6 text-[13px]"
          >
            Back to the design
          </button>
        </div>
      </div>
    )
  }

  // Full-screen "Refine" clarifying-question step (hypothesis + design only).
  // Replaces the page while active; on complete/cancel it runs the gated phase
  // (or backs out).
  if (refineCheckpoint) {
    return (
      <div className="bg-ink-50 h-full">
        {/* ClarifyStep owns the FULL height itself (own header + scrolling
            question list + footer). Wrapping it in an extra header row made it
            overflow by that row's height, pushing its footer - and the Continue
            button - below the viewport with no way to scroll to it. The working
            title (item 10) is passed in and rendered inside its own header. */}
        <ClarifyStep
          designId={designId}
          checkpoint={refineCheckpoint}
          designTitle={title || design?.name || undefined}
          onComplete={handleClarifyComplete}
          onCancel={handleClarifyCancel}
        />
      </div>
    )
  }

  return (
    <div className="bg-ink-50 relative flex h-full overflow-hidden">
      {/* LEFT: design chat — overlays the page (does NOT shrink it), full
          height on the left with a dimmed click-to-close backdrop. */}
      {showRail && (
        <>
          <div
            className="absolute inset-0 z-30 bg-black/20"
            onClick={() => setShowRail(false)}
          />
          <div
            className="border-ink-200 absolute left-0 top-0 z-40 flex h-full flex-col border-r bg-white shadow-2xl"
            style={{ width: railWidth }}
          >
            {/* Starts BELOW the header: at full height it sat on top of the
                close button (z-20, translated half outside), so the two
                controls overlapped and the X was hard to hit. */}
            <div
              onMouseDown={startRailResize}
              className="hover:bg-brick/40 absolute right-0 top-[60px] z-20 h-[calc(100%-60px)] w-1.5 translate-x-1/2 cursor-col-resize"
              title="Drag to resize the chat"
            />
            <div className="min-h-0 min-w-0 flex-1">
              <ScopedChatRail
                scope="design"
                scopeId={designId}
                scopeName={title || design?.name || "Design"}
                scopeMeta={
                  generatedDesigns.length > 0
                    ? `Editing v${liveVersionNumber}${
                        isPhaseApproved("design") ? " · saved" : ""
                      }${
                        designVersions.length > 0
                          ? ` · ${designVersions.length} earlier version${designVersions.length === 1 ? "" : "s"}`
                          : ""
                      }`
                    : undefined
                }
                autoStart
                contextPrompt={chatContextPrompt}
                headerSlot={
                  <button
                    onClick={toggleChatRail}
                    title="Close chat"
                    className="text-ink-3 hover:bg-paper-2 hover:text-ink rounded p-1"
                  >
                    <IconX size={16} />
                  </button>
                }
              />
            </div>
          </div>
        </>
      )}

      {/* CENTER COLUMN: header + stepper + tab content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="border-ink-200 shrink-0 border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Return to wherever the user came from: an explicit ?ret=
                  // (set by the dashboard → dashboard, by a project → that
                  // project) wins, so a design opened from the dashboard goes
                  // back to the dashboard rather than its project folder. Falls
                  // back to the project page, then the workspace dashboard.
                  // Never router.back() (could land on /designs/new → sign-in).
                  const ret = searchParams?.get("ret")
                  if (ret && ret.startsWith("/")) {
                    router.push(ret)
                    return
                  }
                  const projectId = design?.project_id
                  router.push(
                    projectId
                      ? `/${locale}/${workspaceId}/projects/${projectId}`
                      : `/${locale}/${workspaceId}`
                  )
                }}
                className="text-ink-500 gap-1"
              >
                <IconArrowLeft size={16} />
                Back
              </Button>
              <div>
                <div className="text-ink-400 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em]">
                  <span>Design</span>
                  {designLocked && (
                    <span
                      className="rounded border border-[#1F4A2C]/20 bg-[#DDE9DF] px-2 py-0.5 normal-case tracking-normal text-[#1F4A2C]"
                      title="Completed designs are locked - duplicate to edit"
                    >
                      Locked
                    </span>
                  )}
                  {!canEdit && (
                    <span
                      className="border-ink-300 bg-ink-100 text-ink-600 rounded border px-2 py-0.5 normal-case tracking-normal"
                      title="You have view-only access - ask the owner for editor access to make changes"
                    >
                      Read-only
                    </span>
                  )}
                  {busy && (
                    <span className="bg-teal-journey-tint text-teal-journey border-teal-journey/30 rounded border px-2 py-0.5 normal-case tracking-normal">
                      Running {busy}...
                    </span>
                  )}
                  {/* How this design was built. Auto mode picked its own
                      papers, hypothesis and iterations, so which path produced
                      a design is worth knowing before reading it - and the two
                      were indistinguishable once open. */}
                  <span
                    className={cn(
                      "rounded border px-2 py-0.5 normal-case tracking-normal",
                      autoGenerated
                        ? "border-brick/30 bg-brick/10 text-brick"
                        : "border-ink-300 bg-ink-50 text-ink-600"
                    )}
                    title={
                      autoGenerated
                        ? "Built end-to-end by the automatic pipeline: it selected the papers, chose the hypothesis, and iterated on the design itself."
                        : "You drove each stage: you chose the papers and the hypothesis."
                    }
                  >
                    {autoGenerated ? "Auto mode" : "Built by you"}
                  </span>
                </div>
                <h1 className="text-ink-900 text-xl font-bold">
                  {title || design.name || "Untitled Design"}
                </h1>
                {/* Persistent context strip - problem statement is the
                    second most important piece of context after the title
                    and stays visible across every stage of the timeline.
                    During an agent run we expand it to the full statement
                    (issue #10) so the scientist sees exactly what the agent
                    is working on without flipping back to the Problem tab. */}
                {problemStatement?.trim() && (
                  <div
                    className={cn(
                      "text-ink-500 mt-0.5 max-w-3xl text-[12.5px]",
                      busy ? "" : "line-clamp-1"
                    )}
                    title={problemStatement}
                  >
                    <span className="text-ink-400 mr-1.5 font-medium uppercase tracking-wider">
                      Problem
                    </span>
                    {problemStatement}
                  </div>
                )}
              </div>
            </div>

            {/* ── Toolbar actions (right side) ───────────────── */}
            <div className="flex items-center gap-2">
              {designGenerated && canEdit && undoDepth > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  className="gap-1.5"
                  title="Undo the last applied change"
                >
                  <IconArrowBackUp size={14} /> Undo
                </Button>
              )}
              <button
                onClick={toggleChatRail}
                aria-pressed={showRail}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-4 text-xs font-semibold uppercase tracking-wide shadow-sm ring-1 ring-inset transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
                  showRail
                    ? "bg-ink text-paper ring-white/20"
                    : "from-brick to-brick-hover bg-gradient-to-r text-white ring-white/20"
                )}
                title="Chat with this design"
              >
                <IconSparkles size={14} className="shrink-0" />
                {showRail ? "Hide chat" : "Chat"}
              </button>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShareDialogOpen(true)}
                  className="gap-1.5"
                  title="Share this design or invite collaborators"
                >
                  <IconShare size={14} /> Share
                </Button>
              )}
              <Button
                variant={showLibrary ? "default" : "outline"}
                size="sm"
                onClick={() => setShowLibrary(s => !s)}
                className="gap-1.5"
                title="Open Export - generate reports, protocols, and documents from any design iteration"
              >
                <IconBooks size={14} /> Export
              </Button>
            </div>
          </div>
        </div>

        {/* Stage stepper — 5-stage rail (problem → … → validate) */}
        {(() => {
          const tabToStage: Record<string, DesignStageId> = {
            problem: "problem",
            literature: "lit",
            hypotheses: "hyp",
            design: "design",
            validate: "validate",
            iterate: "iterate"
          }
          const stageToTab: Record<DesignStageId, string> = {
            problem: "problem",
            lit: "literature",
            hyp: "hypotheses",
            design: "design",
            validate: "validate",
            iterate: "iterate"
          }
          const completedStages: DesignStageId[] = approvedPhases
            .filter(p => p !== "simulation")
            .map(p => {
              if (p === "literature") return "lit"
              if (p === "hypotheses") return "hyp"
              return p as DesignStageId
            })
          const meta: Partial<Record<DesignStageId, string>> = {
            problem: title ? "defined" : "not defined",
            lit:
              papers.length > 0
                ? `${papers.length} paper${papers.length === 1 ? "" : "s"}`
                : "no papers",
            hyp:
              hypotheses.length > 0
                ? `${hypotheses.length === 1 ? "1 hypothesis" : `${hypotheses.length} hypotheses`}`
                : "no hypotheses",
            design:
              generatedDesigns.length > 0
                ? `${generatedDesigns.length} design${generatedDesigns.length === 1 ? "" : "s"}`
                : "no designs",
            validate: validation.simulation
              ? validation.simulation.meetsTarget
                ? "predicted to hit"
                : "predicted short"
              : "not simulated",
            iterate:
              validation.iterations.length > 0
                ? `${validation.iterations.length} round${validation.iterations.length === 1 ? "" : "s"}`
                : "no lab data yet"
          }
          const currentStage = tabToStage[activeTab] || "problem"
          return (
            <Stepper
              current={currentStage}
              completed={completedStages}
              meta={meta}
              onGoto={id => handleTabChange(stageToTab[id] as any)}
            />
          )
        })()}

        {isAgentRunning && (
          <div className="flex shrink-0 items-center gap-2 border-b border-amber-300 bg-amber-50 px-6 py-2 text-[12.5px] text-amber-900">
            <IconAlertTriangle size={14} className="shrink-0" />
            <span>
              <b>Agent is working - keep this tab open.</b>{" "}
              {busy === "literature"
                ? "We're scouting the literature."
                : busy === "hypotheses"
                  ? "We're generating hypotheses."
                  : "We're drafting your design."}{" "}
              Closing or leaving this page will cancel the run and lose
              progress.
            </span>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          <div
            className={
              activeTab === "design" ? "w-full p-6" : "mx-auto max-w-4xl p-6"
            }
          >
            {activeTab === "problem" && (
              <ProblemTab
                title={title}
                setTitle={setTitle}
                problemStatement={problemStatement}
                setProblemStatement={setProblemStatement}
                domain={domain}
                setDomain={setDomain}
                phase={phase}
                setPhase={setPhase}
                objective={objective}
                setObjective={setObjective}
                constraintMaterial={constraintMaterial}
                setConstraintMaterial={setConstraintMaterial}
                constraintTime={constraintTime}
                setConstraintTime={setConstraintTime}
                constraintEquipment={constraintEquipment}
                setConstraintEquipment={setConstraintEquipment}
                variablesKnown={variablesKnown}
                setVariablesKnown={setVariablesKnown}
                variablesUnknown={variablesUnknown}
                setVariablesUnknown={setVariablesUnknown}
                successCriteria={successCriteria}
                setSuccessCriteria={setSuccessCriteria}
                additionalDetails={additionalDetails}
                setAdditionalDetails={setAdditionalDetails}
                includeReplicates={includeReplicates}
                setIncludeReplicates={setIncludeReplicates}
                onApproveAndGenerate={handleApproveAndGenerateLiterature}
                onAutoGenerate={handleAutoGenerateDesign}
                canSubmit={problemValid}
                isApproved={isPhaseApproved("problem")}
                canEdit={canEdit}
                isBusy={busy === "literature"}
                onRevise={() => handleRevisePhase("problem")}
              />
            )}

            {activeTab === "literature" && (
              <>
                <ClarifyAnswersBanner answers={clarifications.problem ?? []} />
                <LiteratureTab
                  papers={papers}
                  onTogglePaper={handleTogglePaper}
                  onUploadPdfs={handleUploadPdfs}
                  onApproveAndGenerate={handleApproveAndGenerateHypotheses}
                  onSearchMore={handleGenerateMoreLiterature}
                  canGenerate={selectedPapers.length > 0}
                  isApproved={isPhaseApproved("literature")}
                  canEdit={canEdit}
                  isBusy={busy === "hypotheses" || busy === "literature"}
                  isSearching={busy === "literature"}
                  progress={literatureProgress}
                  totalCandidates={literatureTotalCandidates}
                  rawCandidates={literatureRawCandidates}
                  onRevise={() => handleRevisePhase("literature")}
                  onSavePaper={handleSavePaper}
                  savedPaperIds={savedPaperIds}
                />
              </>
            )}

            {activeTab === "hypotheses" && (
              <>
                <ClarifyAnswersBanner
                  answers={clarifications.hypothesis ?? []}
                  onEdit={() => setRefineCheckpoint("hypothesis")}
                />
                <HypothesesTab
                  hypotheses={
                    autoGenerated && hypotheses.some(h => h.selected)
                      ? hypotheses.filter(h => h.selected)
                      : hypotheses
                  }
                  papers={papers}
                  onToggle={handleToggleHypothesis}
                  onEdit={handleEditHypothesis}
                  onApproveAndGenerate={handleApproveAndGenerateDesign}
                  onRegenerate={handleRegenerateHypotheses}
                  canGenerate={selectedHypotheses.length > 0}
                  isApproved={isPhaseApproved("hypotheses")}
                  canEdit={canEdit}
                  isBusy={busy === "design" || busy === "hypotheses"}
                  isGenerating={busy === "hypotheses"}
                  progress={hypothesesProgress}
                  onRevise={() => handleRevisePhase("hypotheses")}
                  genError={hypothesesError}
                  subTab={hypTab}
                  onSubTab={handleHypTab}
                  autoMode={autoGenerated}
                  onGenerateSuggested={handleGenerateSuggestedHypotheses}
                  onBuildOwn={() => setStudyDetailsFor("own-questions")}
                  onUseOwnText={handleUseOwnHypothesis}
                />
              </>
            )}

            {activeTab === "design" && (
              <>
                <ClarifyAnswersBanner
                  answers={[
                    ...(clarifications.problem ?? []),
                    ...(clarifications.hypothesis ?? []),
                    ...(clarifications.design ?? [])
                  ]}
                  onEdit={() => setRefineCheckpoint("design")}
                />
                <DesignTab
                  designs={
                    viewedVersion ? viewedVersion.designs : generatedDesigns
                  }
                  hypotheses={hypotheses}
                  activeId={
                    viewedVersion
                      ? (viewedVersion.designs[0]?.id ?? null)
                      : activeDesignId
                  }
                  onSelect={setActiveDesignId}
                  activeDesign={
                    viewedVersion ? viewedVersion.designs[0] : activeDesign
                  }
                  onApproveAndContinue={handleApproveDesignAndContinue}
                  onSaveNow={() => void handleFinalizeDesign()}
                  onValidateIterate={() => {
                    setValidateMode(
                      validation.iterations.length > 0 ? "iterate" : "simulate"
                    )
                    setValidateModalOpen(true)
                  }}
                  onRegenerate={handleRegenerateDesign}
                  isApproved={isPhaseApproved("design")}
                  canEdit={canEdit}
                  isBusy={busy === "design"}
                  isGenerating={busy === "design"}
                  progress={designProgress}
                  onRevise={() => handleRevisePhase("design")}
                  designVersions={designVersions}
                  liveVersionNumber={liveVersionNumber}
                  regenPlan={regenPlan}
                  onRateOutput={
                    generatedDesigns.length > 0 ? (
                      <OutputRating
                        subjectType="design"
                        subjectId={designId}
                        workspaceId={workspaceId}
                        label="How usable is this design?"
                        meta={{
                          effort,
                          autoGenerated,
                          versionNumber: liveVersionNumber,
                          sections: activeDesign?.sections?.length ?? 0
                        }}
                      />
                    ) : null
                  }
                  currentOrigin={designOrigin}
                  onRestoreVersion={handleRestoreDesignVersion}
                  viewingVersionId={viewingVersionId}
                  onViewVersion={handleViewDesignVersion}
                  /* Retired: the study-details step now asks BEFORE the design
                     is built, so re-confirming afterwards would ask twice and
                     pay for a second generation. handleResolveAssumptions and
                     the ledger stay in place - the generator still records what
                     it decided, we just don't gate on it. */
                  onResolveAssumptions={undefined}
                  onEditSection={handleEditSection}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <StudyDetailsModal
        open={studyDetailsFor !== null}
        onOpenChange={o => {
          if (!o) setStudyDetailsFor(null)
        }}
        initial={{
          successCriteria,
          includeReplicates,
          replicateCount,
          constraintMaterial,
          constraintTime,
          constraintEquipment,
          variablesKnown,
          variablesUnknown,
          additionalDetails
        }}
        nextStepLabel={
          studyDetailsFor === "auto"
            ? "Start the full run"
            : studyDetailsFor === "own-text"
              ? "Use my hypothesis"
              : studyDetailsFor === "own-questions"
                ? "Continue to the questions"
                : "Generate hypotheses"
        }
        onSubmit={d => void handleStudyDetails(d)}
      />

      {/* Validate & iterate modal - one entry point, two paths inside
          (simulate the results, or bring your own lab data), replacing the old
          Validate and Iterate tabs. Applying changes regenerates the design and
          closes the modal, so the researcher lands on the updated design with
          the iteration recorded in the version rail. */}
      <Dialog
        open={validateModalOpen}
        onOpenChange={o => {
          // Don't allow closing mid-regeneration - the apply path is writing.
          if (!o && busy === "design") return
          setValidateModalOpen(o)
        }}
      >
        <DialogContent className="flex h-[90vh] max-w-[min(1100px,96vw)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1100px,96vw)]">
          <div className="border-ink-200 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-white px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="text-ink-900 text-[15px] font-bold">
                Validate &amp; iterate
              </h2>
              <p className="text-ink-500 text-[12px]">
                Stress-test this design before or after the bench - the applied
                changes become a new design version.
              </p>
            </div>
            <div className="border-line inline-flex shrink-0 rounded-lg border p-0.5 text-[12px] font-semibold">
              {(["simulate", "iterate"] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setValidateMode(m)}
                  className={cn(
                    "rounded-md px-3 py-1.5 transition-colors",
                    validateMode === m
                      ? "bg-teal-journey text-white"
                      : "text-ink-500 hover:text-ink-800"
                  )}
                >
                  {m === "simulate"
                    ? "Simulate the results"
                    : "Use your own lab data"}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-5">
            <ValidateTab
              mode={validateMode}
              validation={validation}
              hasDesign={generatedDesigns.length > 0}
              canEdit={canEdit}
              isValidating={validating}
              onValidate={handleRunValidation}
              onApplyChanges={handleApplyIterationChanges}
              onSimulate={handleSimulate}
              onContinueToDesign={handleContinueToDesign}
              nextVersionNumber={nextNewVersionNumber}
              isSimulating={simulating}
              outcomePrefill={successCriteria || objective || ""}
              isGenerating={busy === "design"}
              designId={designId}
              userId={profile?.user_id ?? null}
              selectedWorkspace={selectedWorkspace}
              designVersions={designVersions}
              onOpenVersion={id => {
                setValidateModalOpen(false)
                handleViewDesignVersion(id)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* RIGHT: Library — overlays the page (does NOT shrink it). A click-
          catching backdrop dims the content; the panel slides in on the right. */}
      {showLibrary && (
        <>
          <div
            className="animate-in fade-in absolute inset-0 z-30 bg-black/20 duration-200"
            onClick={() => setShowLibrary(false)}
          />
          {/* Slides in rather than popping: approving the design opens this
              panel on its own, and an instant full-height column appearing next
              to the design read as a glitch. */}
          <div className="animate-in slide-in-from-right absolute right-0 top-0 z-40 h-full shadow-2xl duration-300 ease-out">
            <DesignLibrarySidebar
              ctx={{
                designId,
                designName: title || design?.name || "Design",
                workspaceId,
                locale,
                projectId: design?.project_id ?? null,
                userId: profile?.user_id ?? null,
                selectedWorkspace,
                chatSettings
              }}
              design={design}
              iterations={[
                {
                  id: "current",
                  label: `Latest (v${liveVersionNumber})`,
                  designs: generatedDesigns
                },
                ...designVersions.map(v => ({
                  id: v.id,
                  label: `Iteration v${v.versionNumber}`,
                  designs: v.designs
                }))
              ]}
              getExportable={(designsOverride?: GeneratedDesign[]) => ({
                id: designId,
                name: title || design?.name,
                description: design?.description,
                content:
                  designsOverride && latestContentRef.current
                    ? { ...latestContentRef.current, designs: designsOverride }
                    : latestContentRef.current
              })}
              onClose={() => setShowLibrary(false)}
            />
          </div>
        </>
      )}

      {/* Owner-only share/collaborate dialog (link visibility, invite editors
          by email, export). Non-owners can't manage sharing, so it's gated. */}
      {isOwner && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          designId={designId}
          design={{
            id: designId,
            name: title || design?.name,
            description: design?.description,
            content: design?.content,
            sharing: sharingState.sharing,
            share_token: sharingState.share_token
          }}
          onSharingChange={setSharingState}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Reusable phase UI components
// ─────────────────────────────────────────────────────────────────────────

function PhaseBanner(props: {
  isApproved: boolean
  phaseName: string
  onRevise: () => void
}) {
  if (!props.isApproved) return null
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
        <IconCheck size={16} />
        {props.phaseName} approved
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={props.onRevise}
        className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
      >
        <IconRefresh size={14} />
        Revise
      </Button>
    </div>
  )
}

function PhaseActionBar(props: {
  onApprove: () => void
  approveLabel: string
  approveDisabled: boolean
  onRegenerate?: () => void
  regenerateLabel?: string
  regenerateIcon?: React.ReactNode
  isBusy: boolean
  isApproved: boolean
}) {
  if (props.isApproved) return null
  return (
    <div className="border-ink-100 mt-6 flex items-center justify-between border-t pt-4">
      <div>
        {props.onRegenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={props.onRegenerate}
            disabled={props.isBusy}
            className="gap-1.5"
          >
            {props.regenerateIcon ?? <IconRefresh size={14} />}
            {props.regenerateLabel ?? "Regenerate"}
          </Button>
        )}
      </div>
      <Button
        onClick={props.onApprove}
        disabled={props.approveDisabled || props.isBusy}
        className="bg-brick hover:bg-brick-hover gap-2"
      >
        {props.isBusy ? (
          <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <IconArrowRight size={16} />
        )}
        {props.isBusy ? "Generating..." : props.approveLabel}
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab components
// ─────────────────────────────────────────────────────────────────────────

function ProblemTab(props: {
  title: string
  setTitle: (v: string) => void
  problemStatement: string
  setProblemStatement: (v: string) => void
  domain: DesignDomain | ""
  setDomain: (v: DesignDomain | "") => void
  phase: DesignPhase | ""
  setPhase: (v: DesignPhase | "") => void
  objective: string
  setObjective: (v: string) => void
  constraintMaterial: string
  setConstraintMaterial: (v: string) => void
  constraintTime: string
  setConstraintTime: (v: string) => void
  constraintEquipment: string
  setConstraintEquipment: (v: string) => void
  variablesKnown: string
  setVariablesKnown: (v: string) => void
  variablesUnknown: string
  setVariablesUnknown: (v: string) => void
  successCriteria: string
  setSuccessCriteria: (v: string) => void
  additionalDetails: string
  setAdditionalDetails: (v: string) => void
  includeReplicates: "" | "yes" | "no"
  setIncludeReplicates: (v: "" | "yes" | "no") => void
  onApproveAndGenerate: () => void
  onAutoGenerate: () => void
  canSubmit: boolean
  isApproved: boolean
  canEdit: boolean
  isBusy: boolean
  onRevise: () => void
}) {
  const {
    title,
    setTitle,
    problemStatement,
    setProblemStatement,
    domain,
    setDomain,
    phase,
    setPhase,
    objective,
    setObjective,
    constraintMaterial,
    setConstraintMaterial,
    constraintTime,
    setConstraintTime,
    constraintEquipment,
    setConstraintEquipment,
    variablesKnown,
    setVariablesKnown,
    variablesUnknown,
    setVariablesUnknown,
    successCriteria,
    setSuccessCriteria,
    additionalDetails,
    setAdditionalDetails,
    includeReplicates,
    setIncludeReplicates,
    onApproveAndGenerate,
    onAutoGenerate,
    canSubmit,
    isApproved,
    canEdit,
    isBusy,
    onRevise
  } = props

  return (
    <div className="space-y-5">
      <PhaseBanner
        isApproved={isApproved}
        phaseName="Research Problem"
        onRevise={onRevise}
      />

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-teal-journey text-lg">
            Research Problem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Short descriptive title"
              disabled={isApproved || !canEdit}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Problem Statement <span className="text-red-500">*</span>
            </Label>
            <Textarea
              data-tour="problem-statement"
              value={problemStatement}
              onChange={e => setProblemStatement(e.target.value)}
              placeholder="What is the specific research problem you're investigating?"
              rows={4}
              disabled={isApproved || !canEdit}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                Domain <span className="text-red-500">*</span>
              </Label>
              <Select
                value={domain || undefined}
                onValueChange={value => setDomain(value as DesignDomain)}
                disabled={isApproved || !canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scientific domain" />
                </SelectTrigger>
                <SelectContent>
                  {DESIGN_DOMAIN_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Phase <span className="text-red-500">*</span>
              </Label>
              <Select
                value={phase || undefined}
                onValueChange={value => setPhase(value as DesignPhase)}
                disabled={isApproved || !canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select development phase" />
                </SelectTrigger>
                <SelectContent>
                  {DESIGN_PHASE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Objective{" "}
              <span className="text-ink-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              value={objective}
              onChange={e => setObjective(e.target.value)}
              placeholder="What should this experiment achieve?"
              rows={3}
              disabled={isApproved || !canEdit}
            />
          </div>

          {/* Success criteria - issue #9. Optional; gives the hypothesis +
              design agents a concrete bar to aim for ("≥30% viscosity drop
              at 50 mg/mL"). Kept distinct from Objective on purpose - the
              objective is qualitative, success criteria are quantitative. */}
          <div className="space-y-1.5">
            {/* "optional" suffix dropped per scientist's spec - the
                label stands alone, the field still allows empty. */}
            <Label>Success criteria</Label>
            <Textarea
              value={successCriteria}
              onChange={e => setSuccessCriteria(e.target.value)}
              placeholder="What would count as a successful experiment? e.g. viscosity below 20 cP at 100 mg/mL; recovery > 95%."
              rows={2}
              disabled={isApproved || !canEdit}
            />
          </div>

          {/* Additional details — free-text operating parameters. Read by the
              literature (steering), hypotheses, and design prompts. Restored as
              a visible field when the Refine question flow was removed; that
              flow had been its only writer. Optional: keeping it non-blocking
              avoids stranding designs that predate it. */}
          <div className="space-y-1.5">
            <Label>Additional details</Label>
            <p className="text-ink-500 text-[12px] leading-relaxed">
              The more concrete you are here, the more exact the calculations
              and prep steps come out. Useful things to include: what you have
              and at what <b>stock concentration</b>; buffer/diluent and pH;
              available excipients or reagents; plate/tube format and working
              volumes; instruments and their settings; incubation time and
              temperature; controls you always run; replicate count; anything
              that must not change.
            </p>
            <Textarea
              value={additionalDetails}
              onChange={e => setAdditionalDetails(e.target.value)}
              placeholder="e.g. mAb at 150 mg/mL in 20 mM histidine pH 5.5, ~40 mg left; sucrose, trehalose, arginine-HCl and PS80 in stock; 96-well plate, 200 µL working volume; plate reader at 600 nm; 25 °C and 40 °C arms, 2 weeks; always run a buffer-only blank; n = 3."
              rows={4}
              disabled={isApproved || !canEdit}
            />
          </div>

          {/* Include replicates - issue #28. Yes/No dropdown so the design
              agent knows whether to bake replicates into its sample-budget
              math by default. Optional; the agent has a sensible default
              when unset. */}
          <div className="space-y-1.5 md:max-w-xs">
            <Label>Include replicates</Label>
            <Select
              value={includeReplicates || undefined}
              onValueChange={value =>
                setIncludeReplicates(value as "yes" | "no")
              }
              disabled={isApproved || !canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Constraints</Label>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Material
                </Label>
                <Textarea
                  value={constraintMaterial}
                  onChange={e => setConstraintMaterial(e.target.value)}
                  placeholder="e.g. ≤ 500 mg API total; max 30 runs total (including replicates)"
                  rows={2}
                  disabled={isApproved || !canEdit}
                />
                <p className="text-ink-3 text-[11.5px]">
                  Include replicates in any run / condition budget you specify -
                  the design agent treats this as the total including all
                  replicate conditions.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Time</Label>
                <Textarea
                  value={constraintTime}
                  onChange={e => setConstraintTime(e.target.value)}
                  placeholder="e.g. Must complete within 2 weeks of receipt"
                  rows={2}
                  disabled={isApproved || !canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Equipment
                </Label>
                <Textarea
                  value={constraintEquipment}
                  onChange={e => setConstraintEquipment(e.target.value)}
                  placeholder="e.g. UPLC, plate reader, no DLS available"
                  rows={2}
                  disabled={isApproved || !canEdit}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Variables</Label>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Known</Label>
                <Textarea
                  value={variablesKnown}
                  onChange={e => setVariablesKnown(e.target.value)}
                  placeholder="Variables you want to vary or control - one per line (e.g. pH 5–7, polymer concentration 0.1–0.6%)"
                  rows={3}
                  disabled={isApproved || !canEdit}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Unknown</Label>
                <Textarea
                  value={variablesUnknown}
                  onChange={e => setVariablesUnknown(e.target.value)}
                  placeholder="Variables you suspect matter but don't fully characterize yet - one per line"
                  rows={3}
                  disabled={isApproved || !canEdit}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div data-tour="problem-continue">
        <PhaseActionBar
          onApprove={onApproveAndGenerate}
          approveLabel="Approve & Start Literature Search"
          approveDisabled={!canSubmit || !canEdit}
          isBusy={isBusy}
          isApproved={isApproved}
        />
        {!isApproved && (
          <div className="border-ink-100 mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-ink-500 text-[12.5px]">
              In a hurry?{" "}
              <span className="text-ink-700 font-medium">
                Auto-generate the whole workflow
              </span>{" "}
              — literature, hypothesis, design, then simulate and iterate the
              design until it meets your success criteria. Refine it by chatting
              after.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onAutoGenerate}
              disabled={!canSubmit || !canEdit || isBusy}
              className="gap-1.5"
            >
              <IconSparkles size={15} /> Auto-generate design
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared progress view for long-running phase operations ──────────────
function PhaseProgressView(props: {
  accentClass?: string
  title: string
  subtitle?: string
  events: Array<{ step: string; message: string; detail?: string }>
  isDone?: boolean
}) {
  const { accentClass, title, subtitle, events, isDone } = props
  const activeIdx = events.length - 1
  return (
    <div
      className={cn(
        "rounded-xl border p-6",
        accentClass ?? "border-orange-product/30 bg-orange-product-tint"
      )}
    >
      <div className="mb-4">
        <p className="text-ink-900 text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-ink-500 mt-0.5 text-xs">{subtitle}</p>}
      </div>
      {events.length === 0 ? (
        <div className="text-ink-500 flex items-center gap-2 text-xs">
          <span className="border-ink-300 border-t-ink-700 size-3 animate-spin rounded-full border-2" />
          Starting…
        </div>
      ) : (
        <ol className="space-y-2">
          {events.map((ev, i) => {
            const status = isDone
              ? "done"
              : i < activeIdx
                ? "done"
                : i === activeIdx
                  ? "active"
                  : "pending"
            return (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                  {status === "done" ? (
                    <span className="bg-ink-800 flex size-4 items-center justify-center rounded-full">
                      <IconCheck size={10} className="text-white" />
                    </span>
                  ) : status === "active" ? (
                    <span className="border-ink-300 border-t-ink-700 size-3 animate-spin rounded-full border-2" />
                  ) : (
                    <span className="border-ink-300 size-3 rounded-full border-2" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      status === "pending" ? "text-ink-400" : "text-ink-900",
                      status === "active" && "font-semibold"
                    )}
                  >
                    {ev.message}
                  </span>
                  {ev.detail && (
                    <span className="text-ink-500 mt-0.5 block font-mono text-[11px]">
                      {ev.detail}
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

// Plain-language headlines for each stage of the literature search. The
// server emits terse/technical `message` strings; we override them here with
// clear, human descriptions so the scientist can see - and trust - exactly
// what the agent is doing at each step. The dynamic `detail` line (live
// counts, timings, queries) is kept underneath for credibility.
const FRIENDLY_STEP_MESSAGE: Record<string, string> = {
  optimizing_query: "Reading your problem to craft precise search queries",
  searching_sources:
    "Searching PubMed, arXiv, Semantic Scholar, Google Scholar, and the web",
  deduping: "Merging the same paper found across different sources",
  papers_found: "Gathering everything we found",
  searching_round: "Running deeper, angle-specific searches",
  filtering_reviews: "Setting aside reviews to keep original research",
  ranking: "Ranking each paper against your research problem",
  summarizing_papers: "Writing a short, problem-focused summary for each paper"
}

function progressToEvents(
  events: LiteratureProgress[]
): Array<{ step: string; message: string; detail?: string }> {
  return events.map(ev => {
    const message = FRIENDLY_STEP_MESSAGE[ev.step] ?? ev.message
    if (ev.step === "optimizing_query") {
      return {
        step: ev.step,
        message,
        detail: ev.primaryQuery
      }
    }
    if (ev.step === "searching_sources") {
      // Carries per-source count breakdown (PubMed: 8 · arXiv: 3 · …)
      // when the pre-warm completes, plain message before.
      return {
        step: ev.step,
        message,
        detail: ev.detail
      }
    }
    // Dedup funnel - raw count from all sources → unique after dedup.
    // Surfaces the "we considered N candidates, kept M unique" stage.
    if (ev.step === "deduping") {
      const raw = typeof ev.rawCount === "number" ? ev.rawCount : null
      const unique = typeof ev.uniqueCount === "number" ? ev.uniqueCount : null
      const dropped = raw !== null && unique !== null ? raw - unique : null
      return {
        step: ev.step,
        message,
        detail:
          dropped !== null && dropped > 0
            ? `${dropped} duplicate${dropped === 1 ? "" : "s"} merged across sources`
            : undefined
      }
    }
    if (ev.step === "papers_found") {
      const counts = Object.entries(ev.sourceCounts ?? {})
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${k}: ${n}`)
        .join("  ·  ")
      // When totalCandidates > delivered count, prepend the funnel
      // ratio so the user sees "Top 10 of 95 ranked · pubmed: 12 · …"
      const ratio =
        typeof ev.totalCandidates === "number" &&
        typeof ev.totalPapers === "number" &&
        ev.totalCandidates > ev.totalPapers
          ? `top ${ev.totalPapers} of ${ev.totalCandidates} ranked`
          : null
      const detail = [ratio, counts].filter(Boolean).join("  ·  ")
      return {
        step: ev.step,
        message,
        detail: detail || undefined
      }
    }
    // Per-round search ticker - surfaces "Round 2 of 5 - 7 papers so
    // far · 23.4s" so the scientist sees genuine progress instead of
    // a single static line. The agent emits TWO events per round (a
    // pre-call event without elapsedMs, then a post-call event with
    // elapsedMs), so the detail line composes the unique-count + the
    // (optional) elapsed time + the (optional) round-query.
    if (ev.step === "searching_round") {
      const parts: string[] = []
      parts.push(
        `${ev.uniqueSoFar} unique paper${ev.uniqueSoFar === 1 ? "" : "s"} so far`
      )
      if (typeof ev.elapsedMs === "number") {
        parts.push(`${(ev.elapsedMs / 1000).toFixed(1)}s`)
      }
      if (ev.intent && ev.intent !== "primary") {
        // LLM-assigned angle (mechanism / methods / applications /
        // recent_advances / comparative / failure_modes). Renders the
        // raw label - short, scientist-readable, no extra dictionary
        // lookup needed.
        parts.push(`angle: ${ev.intent.replace(/_/g, " ")}`)
      }
      if (ev.query) {
        parts.push(`q: "${ev.query}"`)
      }
      return {
        step: ev.step,
        message,
        detail: parts.join("  ·  ")
      }
    }
    if (ev.step === "filtering_reviews") {
      const dropped = ev.dropped ?? 0
      const remaining = ev.remaining ?? 0
      return {
        step: ev.step,
        message,
        detail:
          dropped > 0
            ? `${dropped} review${dropped === 1 ? "" : "s"} dropped, ${remaining} primary research kept`
            : undefined
      }
    }
    if (ev.step === "ranking") {
      // Cohere reranker over the post-filter pool. `remaining` is
      // populated by the agent with the input count.
      return {
        step: ev.step,
        message,
        detail:
          typeof ev.remaining === "number"
            ? `Scoring ${ev.remaining} candidate${ev.remaining === 1 ? "" : "s"} against your problem statement`
            : undefined
      }
    }
    if (ev.step === "summarizing_papers") {
      // Per-paper LLM summary pass that runs only over the top-N
      // post-rank papers, so the user sees "Summarising 10 papers
      // (~5s)" as a distinct phase from the broader rerank.
      return {
        step: ev.step,
        message,
        detail:
          typeof ev.papersCount === "number"
            ? `Writing problem-aware blurbs for the top ${ev.papersCount}`
            : undefined
      }
    }
    return { step: ev.step, message: ev.message }
  })
}

// ── Validate-and-iterate stage ────────────────────────────────────────────
/** Compact number formatter shared by the simulation readouts. */
function fmtSimNum(x?: number): string {
  if (typeof x !== "number" || !Number.isFinite(x)) return "—"
  const a = Math.abs(x)
  if (a !== 0 && (a < 0.01 || a >= 100000)) return x.toExponential(2)
  return String(Math.round(x * 1000) / 1000)
}

/**
 * A past version's simulation result: the one-line verdict always visible, the
 * full working folded behind an expander.
 *
 * The elaborate view - distribution, run count, guardrails, gotchas, gap
 * analysis, the changes it proposed - used to exist only for whichever
 * simulation was most recent. Once a version was superseded all that survived
 * was a sentence, so a researcher reading v1 could see the conclusion and never
 * what produced it. Both are kept now, and both are shown here, so every
 * version reads the same way whether it came from auto mode or a manual round.
 */
function SimulationOutcome(props: {
  outcome: NonNullable<DesignVersionSnapshot["outcome"]>
  /** Heading for the block, e.g. "v2 · Simulated version". */
  title?: string
  defaultOpen?: boolean
}) {
  const { outcome, title, defaultOpen = false } = props
  const sim = outcome.simulation
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-teal-journey/30 bg-teal-journey/5 space-y-2 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink-800 text-[12.5px] font-semibold">
          {title ?? "What this version showed"}
        </span>
        {typeof outcome.meetRate === "number" && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              outcome.metTarget
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            )}
          >
            hit the target in {Math.round(outcome.meetRate * 100)}% of runs
          </span>
        )}
        {sim && (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="text-teal-journey ml-auto text-[11.5px] font-medium hover:underline"
          >
            {open ? "Hide full simulation" : "Show full simulation"}
          </button>
        )}
      </div>

      {outcome.verdict && (
        <p className="text-ink-600 text-[12.5px] leading-relaxed">
          {outcome.verdict}
        </p>
      )}
      {(outcome.insights?.length ?? 0) > 0 && (
        <ul className="text-ink-600 list-disc space-y-0.5 pl-4 text-[12px]">
          {outcome.insights!.map(ins => (
            <li key={ins}>{ins}</li>
          ))}
        </ul>
      )}

      {sim && open && (
        <div className="border-teal-journey/20 mt-1 space-y-3 border-t pt-3">
          {sim.executed && (
            <div className="border-ink-200 rounded-lg border bg-white/70 p-3 text-[12px]">
              {sim.distribution && (
                <div className="text-ink-600">
                  Typical result:{" "}
                  <span className="text-ink-900 font-semibold">
                    {fmtSimNum(sim.distribution.mean)}
                    {sim.distribution.unit ? ` ${sim.distribution.unit}` : ""}
                  </span>
                  <span className="text-ink-500">
                    {" "}
                    (± {fmtSimNum(sim.distribution.sd)} run to run)
                  </span>
                </div>
              )}
              <div className="text-ink-500 mt-1.5 leading-relaxed">
                Ran{" "}
                <span className="text-ink-800 font-semibold tabular-nums">
                  {(sim.nTrials ?? 0).toLocaleString()}
                </span>{" "}
                simulated experiments
                {sim.distribution && (
                  <>
                    , spanning{" "}
                    <span className="text-ink-800 font-semibold tabular-nums">
                      {fmtSimNum(sim.distribution.p10)}
                    </span>{" "}
                    to{" "}
                    <span className="text-ink-800 font-semibold tabular-nums">
                      {fmtSimNum(sim.distribution.p90)}
                    </span>{" "}
                    {sim.distribution.unit ?? ""} in most runs
                  </>
                )}
                .
              </div>
            </div>
          )}

          {(sim.secondaryCriteria?.length ?? 0) > 0 && (
            <div>
              <div className="text-ink-400 mb-1 text-[10.5px] font-bold uppercase tracking-wider">
                Also checked (guardrails)
              </div>
              <ul className="space-y-1">
                {sim.secondaryCriteria!.map(c => {
                  const pct =
                    typeof c.passRate === "number"
                      ? Math.round(c.passRate * 100)
                      : null
                  return (
                    <li
                      key={c.metric}
                      className="flex items-baseline justify-between gap-3 text-[12px]"
                    >
                      <span className="text-ink-600 min-w-0">
                        {c.metric}{" "}
                        <span className="text-ink-400">
                          ({c.direction} {fmtSimNum(c.threshold)}
                          {c.unit ? ` ${c.unit}` : ""})
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-semibold tabular-nums",
                          pct === null
                            ? "text-ink-400"
                            : pct >= 80
                              ? "text-sage-brand"
                              : "text-amber-700"
                        )}
                      >
                        {pct === null ? "not scored" : `${pct}% of runs`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {(sim.gotchas?.length ?? 0) > 0 && (
            <div>
              <div className="text-ink-400 mb-1 text-[10.5px] font-bold uppercase tracking-wider">
                Gotchas flagged
              </div>
              <div className="space-y-1.5">
                {sim.gotchas!.map((g, i) => (
                  <div
                    key={i}
                    className="border-ink-100 flex items-start gap-2 rounded-lg border bg-white/70 p-2"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase",
                        g.severity === "high"
                          ? "bg-brick/10 text-brick"
                          : g.severity === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-ink-100 text-ink-500"
                      )}
                    >
                      {g.severity}
                    </span>
                    <div className="text-[12px] leading-snug">
                      <span className="text-ink-800">{g.issue}</span>{" "}
                      <span className="text-ink-500">— {g.fix}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sim.gapAnalysis && (
            <div>
              <div className="text-ink-400 mb-0.5 text-[10.5px] font-bold uppercase tracking-wider">
                Gap to target
              </div>
              <p className="text-ink-700 text-[12.5px] leading-relaxed">
                {sim.gapAnalysis}
              </p>
            </div>
          )}

          {(sim.optimizedChanges?.length ?? 0) > 0 && (
            <div>
              <div className="text-ink-400 mb-1 text-[10.5px] font-bold uppercase tracking-wider">
                Changes it proposed
              </div>
              <ul className="text-ink-600 list-disc space-y-0.5 pl-4 text-[12px]">
                {sim.optimizedChanges.map(c => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {(outcome.appliedChanges?.length ?? 0) > 0 && (
        <div className="border-teal-journey/20 border-t pt-2">
          <div className="text-ink-400 mb-1 text-[10.5px] font-bold uppercase tracking-wider">
            Carried forward
          </div>
          <ul className="text-ink-700 list-disc space-y-0.5 pl-4 text-[12px]">
            {outcome.appliedChanges!.map(c => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function verdictLabel(v: ValidationVerdict | undefined): string {
  switch (v) {
    case "supported":
      return "Supported"
    case "partially_supported":
      return "Partially supported"
    case "refuted":
      return "Refuted"
    case "inconclusive":
      return "Inconclusive"
    default:
      return "—"
  }
}

function verdictTone(v: ValidationVerdict | undefined): {
  bg: string
  text: string
  dot: string
} {
  switch (v) {
    case "supported":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        dot: "bg-emerald-500"
      }
    case "partially_supported":
      return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" }
    case "refuted":
      return { bg: "bg-rust-soft", text: "text-rust", dot: "bg-rust" }
    default:
      return { bg: "bg-ink-50", text: "text-ink-600", dot: "bg-ink-300" }
  }
}

type ValidateFile = { id?: string; name: string; size?: number; type?: string }

/**
 * Chart the parsed lab table. The first column is treated as the category
 * axis (condition / arm / timepoint) and every column that parses as numeric
 * across most rows becomes a series. Bars for a handful of discrete
 * conditions, lines once it looks like a series (many points / a numeric
 * x-axis) — which is the shape most bench readouts arrive in.
 * Renders nothing when the table has no numeric column, rather than an
 * empty axis.
 */
function ParsedDataChart({ parsed }: { parsed: ParsedLabData }) {
  const chart = useMemo(() => {
    if (!parsed?.rows?.length || !parsed?.columns?.length) return null
    const toNum = (v: string) => {
      // Tolerate "3.1 ± 0.2", "12%", "1,200", "< 0.05"
      const m = String(v ?? "")
        .replace(/,/g, "")
        .match(/-?\d+(\.\d+)?([eE][-+]?\d+)?/)
      return m ? Number(m[0]) : NaN
    }
    const numericCols = parsed.columns
      .map((c, i) => ({ name: c, i }))
      .slice(1)
      .filter(({ i }) => {
        const vals = parsed.rows.map(r => toNum(r[i]))
        const good = vals.filter(v => Number.isFinite(v)).length
        return good >= Math.max(2, Math.ceil(parsed.rows.length * 0.6))
      })
    if (numericCols.length === 0) return null
    const data = parsed.rows.map((r, ri) => {
      const point: Record<string, string | number> = {
        __label: String(r[0] ?? `Row ${ri + 1}`)
      }
      numericCols.forEach(({ name, i }) => {
        const v = toNum(r[i])
        if (Number.isFinite(v)) point[name] = v
      })
      return point
    })
    const xIsNumeric = parsed.rows.every(r => Number.isFinite(toNum(r[0])))
    return {
      data,
      series: numericCols.map(c => c.name),
      kind: (xIsNumeric || data.length > 8 ? "line" : "bar") as "line" | "bar"
    }
  }, [parsed])

  if (!chart) return null
  const COLORS = ["#B4462F", "#2F6F6B", "#8A6D3B", "#3D5A80", "#6B4E71"]

  return (
    <div className="border-ink-200 rounded-lg border p-3">
      <div className="text-ink-400 mb-2 text-[11px] font-semibold uppercase tracking-wider">
        Your data, charted
      </div>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          {chart.kind === "bar" ? (
            <BarChart data={chart.data} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E3DC" />
              <XAxis dataKey="__label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RTooltip />
              <RLegend wrapperStyle={{ fontSize: 11 }} />
              {chart.series.map((s, i) => (
                <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          ) : (
            <LineChart data={chart.data} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E3DC" />
              <XAxis dataKey="__label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RTooltip />
              <RLegend wrapperStyle={{ fontSize: 11 }} />
              {chart.series.map((s, i) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/**
 * Drives BOTH the Validate and Iterate tabs off one component:
 *  - mode="simulate" → pre-lab simulation only. No lab-data entry at all.
 *  - mode="iterate"  → real lab data: upload → parse → verdict → charts →
 *                      suggested changes.
 * They share the verdict/insight vocabulary and the apply-changes plumbing,
 * so one component with a mode switch beats two near-duplicates.
 */
function ValidateTab(props: {
  mode: "simulate" | "iterate"
  validation: ValidationState
  hasDesign: boolean
  canEdit: boolean
  isValidating: boolean
  onValidate: (
    raw: string,
    files: ValidateFile[],
    structured: ParsedLabData | null
  ) => void
  onApplyChanges: (
    changes: string[],
    revisedHypothesis?: string,
    origin?: "simulation" | "lab-data"
  ) => void
  onSimulate: (desiredOutcome: string) => void
  /** Leave the loop and go finalise/download the current design. */
  onContinueToDesign: () => void
  /** Version number an "apply changes" would create — shown on the button. */
  nextVersionNumber: number
  isSimulating: boolean
  outcomePrefill: string
  isGenerating: boolean
  designId: string
  userId: string | null
  selectedWorkspace: any
  /** Every earlier version, so this modal can show the whole round history
   *  rather than only the most recent verdict. */
  designVersions?: DesignVersionSnapshot[]
  /** Open a past version in the reading pane (closes the modal). */
  onOpenVersion?: (versionId: string) => void
}) {
  const {
    mode,
    validation,
    hasDesign,
    canEdit,
    isValidating,
    onValidate,
    onApplyChanges,
    onSimulate,
    onContinueToDesign,
    nextVersionNumber,
    isSimulating,
    outcomePrefill,
    isGenerating,
    designId,
    userId,
    selectedWorkspace,
    designVersions = [],
    onOpenVersion
  } = props
  const [desiredOutcome, setDesiredOutcome] = useState(
    validation.desiredOutcome || outcomePrefill || ""
  )
  const [raw, setRaw] = useState("")
  const [files, setFiles] = useState<ValidateFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedLabData | null>(null)
  // 5b: which suggested changes (by index) + the revised hypothesis the user
  // has ticked to roll into the next design iteration.
  const [pickedChanges, setPickedChanges] = useState<Set<number>>(new Set())
  const [pickHypothesis, setPickHypothesis] = useState(false)
  const [pickedSimChanges, setPickedSimChanges] = useState<Set<number>>(
    new Set()
  )
  const fileRef = useRef<HTMLInputElement>(null)

  // Compact number formatter for simulation stats (avoid 12-decimal noise).
  const fmtNum = (x?: number) => {
    if (typeof x !== "number" || !Number.isFinite(x)) return "—"
    const a = Math.abs(x)
    if (a !== 0 && (a < 0.01 || a >= 100000)) return x.toExponential(2)
    return String(Math.round(x * 1000) / 1000)
  }

  const iterations = validation.iterations
  const latest = iterations[iterations.length - 1]
  const nextRound = iterations.length + 1
  const hasData = raw.trim().length > 0 || files.length > 0

  // Step 1: parse the data into a reviewable table + summary (no persistence),
  // so the scientist SEES what was read before it drives a verdict.
  const doParse = async () => {
    if (!hasData || parsing) return
    setParsing(true)
    setParsed(null)
    try {
      const res = await fetch(`/api/design/${designId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "parse",
          raw: raw.trim(),
          dataFiles: files
        })
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        // Surface the real cause; the generic fallback hid server 500s.
        const msg =
          json?.error ??
          `Parse failed (HTTP ${res.status}). Check the server logs.`
        console.error("[validate/parse] failed", res.status, json)
        toast.error(msg)
        return
      }
      setParsed(json.structured as ParsedLabData)
      if (json.warning) toast.warning(json.warning)
    } catch (e) {
      console.error("[validate/parse] network error", e)
      toast.error("Couldn't reach the parser. Try again.")
    } finally {
      setParsing(false)
    }
  }

  const handleUpload = async (list: FileList | null) => {
    if (!list || list.length === 0) return
    if (!userId || !selectedWorkspace) {
      toast.error("Sign in and select a workspace before uploading.")
      return
    }
    setUploading(true)
    try {
      for (const file of Array.from(list)) {
        try {
          const created = await createFileBasedOnExtension(
            file,
            {
              user_id: userId,
              description: "",
              file_path: "",
              name: file.name,
              size: file.size,
              tokens: 0,
              type: file.type,
              sharing: "private"
            },
            selectedWorkspace.id,
            (selectedWorkspace.embeddings_provider as "openai" | "local") ??
              "openai"
          )
          setFiles(prev => [
            ...prev,
            {
              id: (created as any).id,
              name: file.name,
              size: file.size,
              type: file.type
            }
          ])
        } catch {
          toast.error(`Upload failed: ${file.name}`)
        }
      }
    } finally {
      setUploading(false)
    }
  }

  if (!hasDesign) {
    return (
      <div className="border-ink-200 mx-auto max-w-xl rounded-2xl border border-dashed bg-white p-8 text-center">
        <div className="bg-ink-50 text-ink-500 mx-auto mb-3 flex size-11 items-center justify-center rounded-full">
          <IconRefresh size={20} />
        </div>
        <h3 className="text-ink-900 text-[15px] font-semibold">
          Validate needs a design first
        </h3>
        <p className="text-ink-500 mt-1 text-[13px]">
          Generate and approve an experiment design, run it in the lab, then
          come back to test your hypothesis against the data.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-teal-journey flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em]">
          {mode === "simulate" ? (
            <>
              <IconChartBar size={13} /> Validate
            </>
          ) : (
            <>
              <IconRefresh size={13} /> Iterate
            </>
          )}
        </div>
        <h2 className="text-ink-900 mt-1 text-xl font-bold">
          {mode === "simulate"
            ? "Check the design before the bench"
            : iterations.length === 0
              ? "Test your hypothesis with real data"
              : `Iteration ${iterations.length} recorded`}
        </h2>
        <p className="text-ink-500 mt-1 max-w-2xl text-[13px]">
          {mode === "simulate"
            ? "We estimate what this design would produce and how reliably it reaches your target, so you can tighten it before using up material and bench time."
            : "Add the results you actually got. We read the data, judge it against your hypothesis, chart it, and suggest what to change next — carrying forward everything learned in earlier rounds."}
        </p>
      </div>

      {/* Every earlier round, oldest first.

          Two complaints landed on the same gap. In auto mode the pipeline
          simulates and iterates on its own, and opening this modal showed only
          the MOST RECENT simulation - the original design's result was
          nowhere, so there was no way to see what the iteration had actually
          bought. And on the iterate side the verdict and the suggested changes
          were only ever rendered for the latest round. Both now read as a
          series: each round's verdict, how often it hit, and precisely which
          changes were carried into the next version. */}
      {(() => {
        const rounds = [...designVersions]
          .filter(v => v.outcome)
          .sort((a, b) => a.versionNumber - b.versionNumber)
        if (rounds.length === 0) return null
        return (
          <div className="border-ink-200 rounded-2xl border bg-white p-5">
            <h3 className="text-ink-900 text-[14px] font-semibold">
              Earlier rounds
            </h3>
            <p className="text-ink-500 mt-0.5 text-[12.5px]">
              What each version showed, and what was carried forward.
            </p>
            <ol className="mt-3 space-y-3">
              {rounds.map(v => (
                <li key={v.id} className="relative">
                  <SimulationOutcome
                    outcome={v.outcome!}
                    title={`v${v.versionNumber} · ${originLabel(v.origin)}`}
                  />
                  {onOpenVersion && (
                    <button
                      type="button"
                      onClick={() => onOpenVersion(v.id)}
                      className="text-teal-journey mt-1 text-[11.5px] font-medium hover:underline"
                    >
                      Open v{v.versionNumber}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )
      })()}

      {/* 5a — pre-lab simulation & optimization */}
      {mode === "simulate" && canEdit && (
        <div className="border-ink-200 rounded-2xl border bg-white p-5">
          <h3 className="text-ink-900 text-[14px] font-semibold">
            Simulate before the bench
          </h3>
          <p className="text-ink-500 mt-0.5 text-[12.5px] leading-relaxed">
            Before you spend lab time, we run your design on the computer many
            times over — using the quantitative relationships from your
            literature and parameters — to estimate what it would produce and
            how reliably it would hit your target. You get a prediction, the
            problems to fix first, and the changes most likely to get you there.
          </p>
          <label className="text-ink-400 mt-3 block text-[11px] font-semibold uppercase tracking-wider">
            Desired outcome (target to optimize toward)
          </label>
          <textarea
            value={desiredOutcome}
            onChange={e => setDesiredOutcome(e.target.value)}
            rows={2}
            placeholder="e.g. ≥2× viscosity reduction vs control at ≤50 mM excipient, with p < 0.05 across n = 3"
            className="border-ink-200 focus:border-teal-journey mt-1.5 w-full rounded-lg border p-3 text-[13px] outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => onSimulate(desiredOutcome.trim())}
            disabled={isSimulating}
            className="bg-ink text-paper mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSimulating ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconSparkles size={15} />
            )}
            {isSimulating ? "Simulating…" : "Simulate & optimize design"}
          </button>

          {validation.simulation && (
            <div className="border-ink-100 mt-4 space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    validation.simulation.meetsTarget
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  )}
                >
                  {validation.simulation.meetsTarget ? (
                    <IconCheck size={12} />
                  ) : (
                    <IconAlertTriangle size={12} />
                  )}
                  {validation.simulation.meetsTarget
                    ? "Predicted to hit target"
                    : "Predicted to fall short"}
                </span>
                {/* This is confidence in the VERDICT, not the hit rate - "100%
                    confident it falls short" is a coherent thing to say, but
                    the bare "100% confidence" next to "Predicted to fall
                    short" read as a contradiction. */}
                <span
                  className="text-ink-400 text-[11px]"
                  title="How sure the simulation is about this verdict - not how often the design hit your target."
                >
                  <span className="font-mono tabular-nums">
                    {Math.round(validation.simulation.confidence * 100)}%
                  </span>{" "}
                  sure of this verdict
                </span>
              </div>

              {/* Simple readout: how often it hit the target + typical result.
                  No model name, no percentiles — bench-friendly. */}
              {validation.simulation.executed && (
                <div className="border-ink-200 bg-ink-50/50 rounded-xl border p-3.5">
                  {typeof validation.simulation.meetRate === "number" && (
                    <div>
                      <div className="text-ink-500 mb-1 flex items-center justify-between text-[11.5px]">
                        <span>How often the design hit your target</span>
                        <span className="text-ink-800 font-mono font-semibold tabular-nums">
                          {Math.round(validation.simulation.meetRate * 100)}%
                        </span>
                      </div>
                      <div className="bg-ink-200 h-2 w-full overflow-hidden rounded-full">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            validation.simulation.meetRate >= 0.8
                              ? "bg-emerald-500"
                              : validation.simulation.meetRate >= 0.5
                                ? "bg-amber-500"
                                : "bg-brick"
                          )}
                          style={{
                            width: `${Math.round(
                              validation.simulation.meetRate * 100
                            )}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {validation.simulation.distribution && (
                    <div className="text-ink-600 mt-3 text-[12px]">
                      Typical result:{" "}
                      <span className="text-ink-900 font-semibold">
                        {fmtNum(validation.simulation.distribution.mean)}
                        {validation.simulation.distribution.unit
                          ? ` ${validation.simulation.distribution.unit}`
                          : ""}
                      </span>
                      <span className="text-ink-500">
                        {" "}
                        (± {fmtNum(validation.simulation.distribution.sd)} run
                        to run)
                      </span>
                    </div>
                  )}
                  {/* What the simulation actually ran (item 12) — kept plain:
                      run count + the range it saw, no model machinery. */}
                  <div className="border-ink-200 text-ink-500 mt-3 border-t pt-2.5 text-[11.5px] leading-relaxed">
                    Ran{" "}
                    <span className="text-ink-800 font-semibold tabular-nums">
                      {(validation.simulation.nTrials ?? 0).toLocaleString()}
                    </span>{" "}
                    simulated experiments
                    {validation.simulation.iterationsReasoned > 1 && (
                      <>
                        {" "}
                        across{" "}
                        <span className="text-ink-800 font-semibold tabular-nums">
                          {validation.simulation.iterationsReasoned}
                        </span>{" "}
                        design variations
                      </>
                    )}
                    {validation.simulation.distribution && (
                      <>
                        , with results spanning{" "}
                        <span className="text-ink-800 font-semibold tabular-nums">
                          {fmtNum(validation.simulation.distribution.p10)}
                        </span>{" "}
                        to{" "}
                        <span className="text-ink-800 font-semibold tabular-nums">
                          {fmtNum(validation.simulation.distribution.p90)}
                        </span>{" "}
                        {validation.simulation.distribution.unit ?? ""} in most
                        runs
                      </>
                    )}
                    .
                  </div>
                  {/* Secondary GUARDRAILS, reported separately from the primary
                      objective. A guardrail that misses does NOT reduce the
                      headline confidence - only the researcher's main problem
                      is mandatory. */}
                  {(validation.simulation.secondaryCriteria?.length ?? 0) >
                    0 && (
                    <div className="border-ink-200 mt-3 border-t pt-2.5">
                      <div className="text-ink-400 mb-1.5 text-[11px] font-semibold uppercase tracking-wider">
                        Also checked (guardrails)
                      </div>
                      <ul className="space-y-1">
                        {validation.simulation.secondaryCriteria!.map(c => {
                          const pct =
                            typeof c.passRate === "number"
                              ? Math.round(c.passRate * 100)
                              : null
                          const ok = pct === null ? null : pct >= 80
                          return (
                            <li
                              key={c.metric}
                              className="flex items-baseline justify-between gap-3 text-[12px]"
                            >
                              <span className="text-ink-600 min-w-0">
                                {c.metric}{" "}
                                <span className="text-ink-400">
                                  ({c.direction} {fmtNum(c.threshold)}
                                  {c.unit ? ` ${c.unit}` : ""})
                                </span>
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 font-semibold tabular-nums",
                                  ok === null
                                    ? "text-ink-400"
                                    : ok
                                      ? "text-sage-brand"
                                      : "text-amber-700"
                                )}
                              >
                                {pct === null
                                  ? "not scored"
                                  : `${pct}% of runs`}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                      <p className="text-ink-400 mt-1.5 text-[11px] leading-snug">
                        These are tracked separately. A guardrail falling short
                        doesn&apos;t reduce confidence in the main objective
                        above - it just flags something to watch.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="text-ink-400 mb-0.5 text-[11px] font-semibold uppercase tracking-wider">
                  Predicted results
                </div>
                <p className="text-ink-700 text-[13px] leading-relaxed">
                  {validation.simulation.predictedResults}
                </p>
              </div>

              {/* Gotchas: feasibility / soundness flags */}
              {validation.simulation.gotchas &&
                validation.simulation.gotchas.length > 0 && (
                  <div>
                    <div className="text-ink-400 mb-1 text-[11px] font-semibold uppercase tracking-wider">
                      Gotchas to fix before the bench
                    </div>
                    <div className="space-y-1.5">
                      {validation.simulation.gotchas.map((g, i) => (
                        <div
                          key={i}
                          className="border-ink-100 flex items-start gap-2 rounded-lg border p-2.5"
                        >
                          <span
                            className={cn(
                              "mt-0.5 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase",
                              g.severity === "high"
                                ? "bg-brick/10 text-brick"
                                : g.severity === "medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-ink-100 text-ink-500"
                            )}
                          >
                            {g.severity}
                          </span>
                          <div className="text-[12.5px] leading-snug">
                            <span className="text-ink-800">{g.issue}</span>{" "}
                            <span className="text-ink-500">— {g.fix}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {validation.simulation.gapAnalysis && (
                <div>
                  <div className="text-ink-400 mb-0.5 text-[11px] font-semibold uppercase tracking-wider">
                    Gap to target
                  </div>
                  <p className="text-ink-700 text-[13px] leading-relaxed">
                    {validation.simulation.gapAnalysis}
                  </p>
                </div>
              )}
              {validation.simulation.optimizedChanges.length > 0 && (
                <div className="border-ink-200 rounded-xl border p-3.5">
                  <div className="text-ink-400 mb-2 text-[11px] font-semibold uppercase tracking-wider">
                    Pick changes → optimize the design
                  </div>
                  <div className="space-y-1.5">
                    {validation.simulation.optimizedChanges.map((c, i) => {
                      const on = pickedSimChanges.has(i)
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setPickedSimChanges(prev => {
                              const next = new Set(prev)
                              next.has(i) ? next.delete(i) : next.add(i)
                              return next
                            })
                          }
                          className="hover:bg-ink-50 flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left"
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                              on
                                ? "border-brick bg-brick text-white"
                                : "border-ink-300"
                            )}
                          >
                            {on && <IconCheck size={11} stroke={3} />}
                          </span>
                          <span className="text-ink-700 text-[13px] leading-snug">
                            {c}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {/* Item 14 — both exits are offered explicitly, and the
                      apply button names the version it will create. */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isGenerating || pickedSimChanges.size === 0}
                      onClick={() =>
                        onApplyChanges(
                          validation.simulation!.optimizedChanges.filter(
                            (_, i) => pickedSimChanges.has(i)
                          ),
                          undefined,
                          "simulation"
                        )
                      }
                      className="bg-brick hover:bg-brick-hover flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <IconLoader2 size={15} className="animate-spin" />
                      ) : (
                        <IconRefresh size={15} />
                      )}
                      {isGenerating
                        ? "Optimising…"
                        : `Apply ${pickedSimChanges.size} change${
                            pickedSimChanges.size === 1 ? "" : "s"
                          } → design v${nextVersionNumber}`}
                    </button>
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={onContinueToDesign}
                      className="border-ink-200 text-ink-700 hover:bg-ink-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-50"
                    >
                      Skip the changes, continue with this design
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cumulative memory */}
      {mode === "iterate" && validation.cumulativeInsights && (
        <div className="border-teal-journey/30 bg-teal-journey-tint/40 rounded-2xl border p-4">
          <div className="text-teal-journey mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
            <IconSparkles size={13} /> What we&apos;ve learned so far
            <span className="text-ink-400 font-medium normal-case tracking-normal">
              · across {iterations.length} round
              {iterations.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-ink-700 whitespace-pre-wrap text-[13px] leading-relaxed">
            {validation.cumulativeInsights}
          </p>
        </div>
      )}

      {/* Latest verdict */}
      {mode === "iterate" && latest && (
        <div className="border-ink-200 overflow-hidden rounded-2xl border bg-white">
          <div
            className={cn(
              "flex items-center justify-between px-5 py-3",
              verdictTone(latest.verdict).bg
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  verdictTone(latest.verdict).dot
                )}
              />
              <span
                className={cn(
                  "text-[14px] font-bold",
                  verdictTone(latest.verdict).text
                )}
              >
                Iteration {latest.index}: {verdictLabel(latest.verdict)}
              </span>
            </div>
            {typeof latest.confidence === "number" && (
              <span className="text-ink-500 font-mono text-[12px] tabular-nums">
                {Math.round(latest.confidence * 100)}% confidence
              </span>
            )}
          </div>
          <div className="space-y-4 p-5">
            {latest.reasoning && (
              <p className="text-ink-700 text-[13px] leading-relaxed">
                {latest.reasoning}
              </p>
            )}
            {latest.insights.length > 0 && (
              <div>
                <div className="text-ink-400 mb-1.5 text-[11px] font-semibold uppercase tracking-wider">
                  Insights this round
                </div>
                <ul className="space-y-1">
                  {latest.insights.map((ins, i) => (
                    <li
                      key={i}
                      className="text-ink-700 flex gap-2 text-[13px] leading-snug"
                    >
                      <IconBulb
                        size={14}
                        className="text-teal-journey mt-0.5 shrink-0"
                      />
                      {ins}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* 5b: pick which changes to roll into the next design iteration */}
            {(latest.suggestedChanges.length > 0 || latest.revisedHypothesis) &&
              canEdit && (
                <div className="border-ink-200 rounded-xl border p-3.5">
                  <div className="text-ink-400 mb-2 text-[11px] font-semibold uppercase tracking-wider">
                    Pick changes to apply → new design iteration
                  </div>
                  <div className="space-y-1.5">
                    {latest.suggestedChanges.map((c, i) => {
                      const on = pickedChanges.has(i)
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setPickedChanges(prev => {
                              const next = new Set(prev)
                              next.has(i) ? next.delete(i) : next.add(i)
                              return next
                            })
                          }
                          className="hover:bg-ink-50 flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left"
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                              on
                                ? "border-brick bg-brick text-white"
                                : "border-ink-300"
                            )}
                          >
                            {on && <IconCheck size={11} stroke={3} />}
                          </span>
                          <span className="text-ink-700 text-[13px] leading-snug">
                            {c}
                          </span>
                        </button>
                      )
                    })}
                    {latest.revisedHypothesis && (
                      <button
                        type="button"
                        onClick={() => setPickHypothesis(v => !v)}
                        className="hover:bg-ink-50 flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                            pickHypothesis
                              ? "border-brick bg-brick text-white"
                              : "border-ink-300"
                          )}
                        >
                          {pickHypothesis && <IconCheck size={11} stroke={3} />}
                        </span>
                        <span className="text-ink-700 text-[13px] leading-snug">
                          <span className="text-ink-400 font-medium">
                            Test sharper hypothesis:{" "}
                          </span>
                          {latest.revisedHypothesis}
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={
                        isGenerating ||
                        (pickedChanges.size === 0 && !pickHypothesis)
                      }
                      onClick={() =>
                        onApplyChanges(
                          latest.suggestedChanges.filter((_, i) =>
                            pickedChanges.has(i)
                          ),
                          pickHypothesis ? latest.revisedHypothesis : undefined,
                          "lab-data"
                        )
                      }
                      className="bg-brick hover:bg-brick-hover flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <IconLoader2 size={15} className="animate-spin" />
                      ) : (
                        <IconRefresh size={15} />
                      )}
                      {isGenerating
                        ? "Generating…"
                        : `Make these changes → design v${nextVersionNumber}`}
                    </button>
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={onContinueToDesign}
                      className="border-ink-200 text-ink-700 hover:bg-ink-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-50"
                    >
                      Continue without iterating
                    </button>
                  </div>
                </div>
              )}
            {latest.verdict === "supported" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[13px] font-medium text-emerald-700">
                  <IconCheck size={16} /> Hypothesis supported — you can take
                  this design forward, or push further with another round.
                </div>
                <button
                  type="button"
                  onClick={onContinueToDesign}
                  className="border-ink-200 text-ink-700 hover:bg-ink-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[13px] font-medium transition-colors"
                >
                  Continue with this design
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 1 — data entry + parse (Iterate only; item 13 removed it from
          Validate, which is now purely pre-lab simulation) */}
      {mode === "iterate" && canEdit && (
        <div className="border-ink-200 rounded-2xl border bg-white p-5">
          <h3 className="text-ink-900 text-[14px] font-semibold">
            {iterations.length === 0
              ? "Add your lab results"
              : `Log iteration ${nextRound} data`}
          </h3>
          <p className="text-ink-500 mt-0.5 text-[12.5px]">
            Paste measurements, attach a CSV/PDF, or upload a{" "}
            <b className="text-ink-700 font-medium">photo</b> — a gel, an
            instrument screenshot, or a snap of your notebook page. A vision
            model reads it into a table you can check before validating.
          </p>
          <textarea
            value={raw}
            onChange={e => {
              setRaw(e.target.value)
              setParsed(null)
            }}
            rows={5}
            placeholder="e.g. At 20 mM the readout rose to 3.1 ± 0.2 vs 1.0 control; 40 mM plateaued at 3.0 with higher variance. n = 3 per arm…"
            className="border-ink-200 focus:border-teal-journey mt-3 w-full rounded-lg border p-3 text-[13px] outline-none transition-colors"
          />
          {files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <span
                  key={i}
                  className="border-ink-200 text-ink-700 bg-ink-50 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]"
                >
                  {f.name}
                  <button
                    type="button"
                    onClick={() => {
                      setFiles(prev => prev.filter((_, j) => j !== i))
                      setParsed(null)
                    }}
                    className="text-ink-400 hover:text-ink-700"
                  >
                    <IconX size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.csv,.txt,.docx,.jpeg,.jpg,.png"
              multiple
              className="hidden"
              onChange={e => {
                void handleUpload(e.target.files)
                e.target.value = ""
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="border-ink-200 text-ink-700 hover:bg-ink-50 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-medium disabled:opacity-50"
            >
              {uploading ? (
                <IconLoader2 size={14} className="animate-spin" />
              ) : (
                <IconUpload size={14} />
              )}
              {uploading ? "Uploading…" : "Attach data file"}
            </button>
            <button
              type="button"
              onClick={doParse}
              disabled={!hasData || parsing || uploading}
              className="bg-ink text-paper flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {parsing ? (
                <IconLoader2 size={15} className="animate-spin" />
              ) : (
                <IconSparkles size={15} />
              )}
              {parsing ? "Reading data…" : "Parse data"}
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — parsed data review + validate */}
      {mode === "iterate" && parsed && canEdit && (
        <div className="border-ink-200 overflow-hidden rounded-2xl border bg-white">
          <div className="border-ink-100 flex items-center gap-2 border-b px-5 py-3">
            <IconClipboardText size={15} className="text-teal-journey" />
            <span className="text-ink-900 text-[14px] font-semibold">
              What we read from your data
            </span>
          </div>
          <div className="space-y-4 p-5">
            {parsed.summary && (
              <p className="text-ink-700 text-[13px] leading-relaxed">
                {parsed.summary}
              </p>
            )}
            {parsed.rows.length > 0 ? (
              <div className="border-ink-200 overflow-x-auto rounded-lg border">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="border-ink-200 bg-ink-50 border-b">
                      {parsed.columns.map((c, i) => (
                        <th
                          key={i}
                          className="text-ink-500 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-ink-100 border-b last:border-0"
                      >
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="text-ink-800 px-3 py-2 tabular-nums"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border-ink-200 text-ink-500 rounded-lg border border-dashed p-3 text-[12.5px]">
                No numeric rows extracted. You can still validate on the
                summary, or add clearer numbers above and re-parse.
              </div>
            )}
            {parsed.rows.length > 0 && <ParsedDataChart parsed={parsed} />}
            {parsed.caveats.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                  <IconAlertTriangle size={13} /> Data-quality notes
                </div>
                <ul className="space-y-0.5">
                  {parsed.caveats.map((c, i) => (
                    <li key={i} className="text-[12.5px] text-amber-800">
                      • {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={() => onValidate(raw.trim(), files, parsed)}
              disabled={isValidating}
              className="bg-brick hover:bg-brick-hover flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
            >
              {isValidating ? (
                <IconLoader2 size={15} className="animate-spin" />
              ) : (
                <IconRefresh size={15} />
              )}
              {isValidating
                ? "Validating…"
                : "Validate hypothesis against this data"}
            </button>
          </div>
        </div>
      )}

      {/* Iteration timeline */}
      {mode === "iterate" && iterations.length > 0 && (
        <div>
          <div className="text-ink-400 mb-2 text-[11px] font-semibold uppercase tracking-wider">
            Iteration history
          </div>
          <ol className="space-y-2">
            {[...iterations].reverse().map(it => (
              <li
                key={it.id}
                className="border-ink-200 rounded-xl border bg-white p-3.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        verdictTone(it.verdict).dot
                      )}
                    />
                    <span className="text-ink-900 text-[13px] font-semibold">
                      Iteration {it.index}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        verdictTone(it.verdict).bg,
                        verdictTone(it.verdict).text
                      )}
                    >
                      {verdictLabel(it.verdict)}
                    </span>
                  </div>
                  <span className="text-ink-400 font-mono text-[11px] tabular-nums">
                    {new Date(it.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {it.insights.length > 0 && (
                  <p className="text-ink-500 mt-1.5 line-clamp-2 text-[12.5px]">
                    {it.insights.join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

// ── Library sidebar ───────────────────────────────────────────────────────
// Full-height right panel (NotebookLM "Studio" style): a grid of artifact
// generators built from the current design. "Report" opens the existing
// generate-report modal (template + objective + data upload + completeness
// check) so that flow is unchanged. Media artifacts are flagged Beta.
// Each widget maps to a distinct artifact. "report" opens the data-aware
// report modal; the rest are client-side PDF exports built from the live
// design content (no extra round-trip).
type LibraryAction =
  | "report"
  | "overview"
  | "bench"
  | "citations"
  | "sop"
  | "materials"

type LibraryArtifact = {
  key: string
  label: string
  desc: string
  icon: React.ReactNode
  action: LibraryAction
  /** Actions that render the generated design's sections need one to exist. */
  needsDesign?: boolean
}

// Order follows how a scientist actually uses the outputs: understand it
// (Overview), run it (SOP → Material List → Bench Execution), then cite and
// write it up (Citations → Design Report).
const LIBRARY_ARTIFACTS: LibraryArtifact[] = [
  {
    key: "overview",
    label: "Overview",
    desc: "High-level summary",
    icon: <IconLayoutGrid size={16} />,
    action: "overview"
  },
  {
    key: "sop",
    label: "SOP",
    desc: "Full protocol PDF",
    icon: <IconClipboardText size={16} />,
    action: "sop",
    needsDesign: true
  },
  {
    key: "material-list",
    label: "Material List",
    desc: "Reagents & equipment",
    icon: <IconListDetails size={16} />,
    action: "materials",
    needsDesign: true
  },
  {
    key: "bench-execution",
    label: "Bench Execution",
    desc: "Step-by-step run guide",
    icon: <IconFlask size={16} />,
    action: "bench",
    needsDesign: true
  },
  {
    key: "citations",
    label: "Citations",
    desc: "Sources & rationale",
    icon: <IconQuote size={16} />,
    action: "citations"
  },
  {
    key: "design-report",
    label: "Design Report",
    desc: "Data-driven write-up",
    icon: <IconFileText size={16} />,
    action: "report"
  }
]

function DesignLibrarySidebar({
  ctx,
  design,
  iterations,
  getExportable,
  onClose
}: {
  ctx: DesignSubViewContext
  design: any
  /** The design's iteration series (latest first-of-list = "current", then
   *  each saved version) so the user can generate assets for whichever one. */
  iterations: { id: string; label: string; designs: GeneratedDesign[] }[]
  /** Builds an ExportableDesign from the LIVE design content at click time.
   *  Pass a version's designs to export THAT iteration instead of the latest. */
  getExportable: (designsOverride?: GeneratedDesign[]) => ExportableDesign
  onClose: () => void
}) {
  const [reportModalOpen, setReportModalOpen] = useState(false)
  // Reports generated FROM this design, listed as assets under the buttons.
  // Reports already carry source_design_id, so no new linkage is needed.
  const [reportAssets, setReportAssets] = useState<any[]>([])
  // Templates saved from finished reports. Listed alongside the reports so a
  // saved template is visible where the researcher expects to find it, rather
  // than only existing inside the generate-report dropdown.
  const [templateAssets, setTemplateAssets] = useState<
    Array<{ id: string; name: string; section_count?: number }>
  >([])
  const [presetTemplateId, setPresetTemplateId] = useState<string | null>(null)
  // Both lists are fetched when the rail opens, so for the first second or two
  // the panel rendered as though the design had no reports and no templates -
  // and then they appeared, which reads as a glitch. Track the first load so
  // the sections can hold a placeholder instead of asserting emptiness.
  const [assetsLoading, setAssetsLoading] = useState(true)
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [openAssetId, setOpenAssetId] = useState<string | null>(null)
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null)

  const refreshAssets = useCallback(async () => {
    if (!design?.id || !ctx.workspaceId) {
      setAssetsLoading(false)
      return
    }
    try {
      const all = await getReportsByWorkspaceId(ctx.workspaceId)
      setReportAssets(
        (all ?? [])
          // Only reports the researcher actually SAVED count as assets. The
          // generate flow creates a row per attempt (draft state), which made
          // one report show up 4 times.
          .filter((r: any) => r.source_design_id === design.id && r.is_saved)
          .sort((a: any, b: any) =>
            String(b.updated_at ?? b.created_at ?? "").localeCompare(
              String(a.updated_at ?? a.created_at ?? "")
            )
          )
      )
    } catch (err) {
      console.warn("Couldn't load report assets:", err)
    } finally {
      setAssetsLoading(false)
    }
  }, [design?.id, ctx.workspaceId])

  const refreshTemplates = useCallback(async () => {
    if (!ctx.workspaceId) {
      setTemplatesLoading(false)
      return
    }
    try {
      const res = await fetch(
        `/api/report-templates?workspaceId=${encodeURIComponent(ctx.workspaceId)}`
      )
      if (!res.ok) return
      const json = await res.json()
      setTemplateAssets(Array.isArray(json?.templates) ? json.templates : [])
    } catch (err) {
      console.warn("Couldn't load report templates:", err)
    } finally {
      setTemplatesLoading(false)
    }
  }, [ctx.workspaceId])

  useEffect(() => {
    void refreshAssets()
    void refreshTemplates()
  }, [refreshAssets, refreshTemplates])

  /** Delete an asset. Blocked once it has been filed to an ELN (#6). */
  const handleDeleteAsset = async (r: any) => {
    if (r.eln_uploaded_at) return
    if (
      !window.confirm(
        `Delete "${r.name || "Untitled report"}"? This is permanent.`
      )
    )
      return
    setDeletingAssetId(r.id)
    try {
      await deleteReport(r.id)
      setReportAssets(prev => prev.filter(x => x.id !== r.id))
      toast.success("Report deleted")
    } catch (e: any) {
      toast.error(`Couldn't delete: ${e?.message ?? "unknown error"}`)
    } finally {
      setDeletingAssetId(null)
    }
  }

  // Which iteration to generate assets from. Defaults to the latest design.
  const [selectedIterId, setSelectedIterId] = useState("current")
  const selectedIter =
    iterations.find(i => i.id === selectedIterId) ?? iterations[0]
  const hasIterations = iterations.length > 1

  const handleArtifact = async (a: LibraryArtifact) => {
    if (a.action === "report") {
      setReportModalOpen(true)
      return
    }
    // Export the SELECTED iteration's designs (latest = live content).
    const exportable = getExportable(
      selectedIter && selectedIter.id !== "current"
        ? selectedIter.designs
        : undefined
    )
    const hasDesign =
      Array.isArray((exportable.content as any)?.designs) &&
      (exportable.content as any).designs.length > 0
    if (a.needsDesign && !hasDesign) {
      toast.warning("Generate the design first — then download this.")
      return
    }
    const exporter = {
      overview: downloadOverview,
      bench: downloadBenchExecutionGuide,
      citations: downloadRationaleCitations,
      sop: downloadSOP,
      materials: downloadMaterialList
    }[a.action]
    if (!exporter) return
    try {
      await exporter(exportable)
      toast.success(`${a.label} downloaded`)
    } catch (err: any) {
      toast.error(err?.message || `Couldn't generate ${a.label}`)
    }
  }

  return (
    <div className="border-ink-200 flex h-full w-[340px] shrink-0 flex-col border-l bg-white">
      {/* Header */}
      <div className="border-ink-100 flex shrink-0 items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <IconBooks size={18} className="text-ink-700" />
          <span className="text-ink-900 text-[17px] font-semibold tracking-tight">
            Export
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-ink-400 hover:text-ink-700 rounded p-1"
        >
          <IconX size={17} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-auto p-5">
        <p className="text-ink-400 text-[11px] font-bold uppercase tracking-[0.14em]">
          Create
        </p>
        <h2 className="text-ink-900 mt-1.5 text-[22px] font-semibold leading-tight tracking-tight">
          Generate from this design
        </h2>
        <p className="text-ink-500 mt-1.5 text-[13px] leading-relaxed">
          Each artifact is built from this design&apos;s problem, literature,
          and locked protocol.
        </p>

        {/* Names the exact source of whatever gets exported. With several
            simulated versions in play, "Generate from this design" alone left
            it ambiguous which one an asset would be built from. Always shown,
            including the single-version case, so the answer is never inferred
            from the absence of a picker. */}
        <div className="border-ink-200 bg-ink-50/60 mt-3 rounded-xl border p-3">
          <div className="text-ink-400 text-[10px] font-bold uppercase tracking-[0.14em]">
            Exporting from
          </div>
          <div
            className="text-ink-900 mt-1 truncate text-[13px] font-semibold"
            title={ctx.designName}
          >
            {ctx.designName}
          </div>
          <div className="text-ink-600 mt-0.5 text-[12px]">
            {selectedIter?.label ?? "Latest version"}
            {selectedIter?.designs?.length
              ? ` · ${selectedIter.designs.length} design${
                  selectedIter.designs.length === 1 ? "" : "s"
                }`
              : ""}
          </div>
        </div>

        {/* Iteration picker: choose WHICH design version the assets are built
            from. Only shown once there's more than one iteration. */}
        {hasIterations && (
          <div className="mt-4">
            <p className="text-ink-400 mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em]">
              Iteration
            </p>
            <div className="flex flex-wrap gap-1.5">
              {iterations.map(it => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setSelectedIterId(it.id)}
                  className={`rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    selectedIter?.id === it.id
                      ? "border-ink-900 bg-ink-900 text-white"
                      : "border-ink-200 text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
            <p className="text-ink-400 mt-1.5 text-[11px] leading-snug">
              Assets below are generated from{" "}
              <span className="text-ink-600 font-medium">
                {selectedIter?.label}
              </span>
              .
            </p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {LIBRARY_ARTIFACTS.map(a => (
            <button
              key={a.key}
              type="button"
              onClick={() => void handleArtifact(a)}
              className="border-ink-200 hover:border-ink-300 group flex flex-col gap-2 rounded-xl border bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="bg-ink-50 text-ink-700 flex size-7 items-center justify-center rounded-lg">
                {a.icon}
              </span>
              <span>
                <span className="text-ink-900 block text-[13px] font-semibold">
                  {a.label}
                </span>
                <span className="text-ink-500 mt-0.5 block text-[11px] leading-snug">
                  {a.desc}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Saved report assets for this design. Click to reopen in the same
          modal; download as PDF or delete outright. */}
      {/* Placeholder while the first fetch runs, so the panel doesn't briefly
          assert there are no reports and then contradict itself. */}
      {assetsLoading && reportAssets.length === 0 && (
        <div className="border-ink-100 shrink-0 border-t p-3">
          <div className="text-ink-400 mb-2 text-[10px] font-bold uppercase tracking-[0.13em]">
            Reports
          </div>
          <div className="space-y-1.5">
            {[0, 1].map(i => (
              <div
                key={i}
                className="border-ink-100 bg-ink-50 h-[46px] animate-pulse rounded-lg border"
              />
            ))}
          </div>
        </div>
      )}

      {reportAssets.length > 0 && (
        <div className="border-ink-100 shrink-0 border-t p-3">
          <div className="text-ink-400 mb-2 text-[10px] font-bold uppercase tracking-[0.13em]">
            Reports ({reportAssets.length})
          </div>
          <ul className="space-y-1.5">
            {reportAssets.map(r => (
              <li
                key={r.id}
                className="border-ink-200 hover:border-ink-300 group flex items-start gap-2 rounded-lg border bg-white p-2 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenAssetId(r.id)
                    setReportModalOpen(true)
                  }}
                  className="min-w-0 flex-1 text-left"
                  title="Open this report"
                >
                  <span className="text-ink-800 block truncate text-[12.5px] font-medium">
                    {r.name || "Untitled report"}
                  </span>
                  {r.source_design_version && (
                    <span className="text-ink-400 block truncate text-[10.5px]">
                      from {r.source_design_version}
                    </span>
                  )}
                  {/* Date AND time of the last save (#5): with several
                      reports off one design, the date alone doesn't say which
                      is the newest. Falls back to created_at for older rows. */}
                  <span className="text-ink-400 block text-[10.5px]">
                    {(() => {
                      const ts = r.updated_at || r.created_at
                      if (!ts) return "Saved"
                      const d = new Date(ts)
                      return `Saved ${d.toLocaleDateString()} · ${d.toLocaleTimeString(
                        undefined,
                        { hour: "2-digit", minute: "2-digit" }
                      )}`
                    })()}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                  {r.eln_uploaded_at ? (
                    <span
                      title={`Filed to your ELN on ${new Date(r.eln_uploaded_at).toLocaleString()} - locked so it matches the filed record`}
                      className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-amber-800"
                    >
                      ELN
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenAssetId(r.id)
                          setReportModalOpen(true)
                        }}
                        title="Edit this report"
                        className="text-ink-400 hover:text-ink-800 hover:bg-ink-100 rounded p-1"
                      >
                        <IconPencil size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={deletingAssetId === r.id}
                        onClick={() => void handleDeleteAsset(r)}
                        title="Delete this report"
                        className="text-ink-400 rounded p-1 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <IconTrash size={14} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Templates saved from finished reports. A researcher who saved one had
          no way to see it afterwards - it existed only inside the generate
          dialog's dropdown - so it sits here beside the reports, named, and
          starts a new report pre-set to it. */}
      {templatesLoading && templateAssets.length === 0 && (
        <div className="border-ink-100 shrink-0 border-t p-3">
          <div className="text-ink-400 mb-2 text-[10px] font-bold uppercase tracking-[0.13em]">
            Templates
          </div>
          <div className="border-ink-100 bg-ink-50 h-[46px] animate-pulse rounded-lg border" />
        </div>
      )}

      {templateAssets.length > 0 && (
        <div className="border-ink-100 shrink-0 border-t p-3">
          <div className="text-ink-400 mb-2 text-[10px] font-bold uppercase tracking-[0.13em]">
            Templates ({templateAssets.length})
          </div>
          <ul className="space-y-1.5">
            {templateAssets.map(t => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenAssetId(null)
                    setPresetTemplateId(t.id)
                    setReportModalOpen(true)
                  }}
                  title="Start a new report from this template"
                  className="border-ink-200 hover:border-ink-300 hover:bg-ink-50 w-full rounded-lg border bg-white p-2 text-left transition-colors"
                >
                  <span className="text-ink-800 block truncate text-[12.5px] font-medium">
                    {t.name}
                  </span>
                  <span className="text-ink-400 block text-[10.5px]">
                    {typeof t.section_count === "number"
                      ? `${t.section_count} sections · new report from this`
                      : "New report from this"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer: Add note */}
      <div className="border-ink-100 shrink-0 border-t p-3">
        <button
          type="button"
          onClick={() => toast.info("Notes are coming soon.")}
          className="border-ink-200 text-ink-700 hover:bg-ink-50 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[13px] font-medium transition-colors"
        >
          <IconNote size={16} /> Add note
        </button>
      </div>

      <GenerateReportModal
        open={reportModalOpen}
        onOpenChange={o => {
          setReportModalOpen(o)
          if (!o) {
            setOpenAssetId(null)
            setPresetTemplateId(null)
            // A report may have been saved as a template while the modal was
            // open, so re-read the list rather than waiting for a remount.
            void refreshTemplates()
          }
        }}
        design={design}
        workspaceId={ctx.workspaceId}
        locale={ctx.locale}
        sourceVersionLabel={selectedIter?.label}
        initialReportId={openAssetId}
        initialSavedTemplateId={presetTemplateId}
        onSaved={() => {
          setOpenAssetId(null)
          setPresetTemplateId(null)
          void refreshAssets()
          void refreshTemplates()
        }}
      />
    </div>
  )
}

// ── Clarify-answers read-only banner (#5) ─────────────────────────────────
// Collapsed by default; user expands to see what they told the system.
// "Edit" re-opens the Refine step for that checkpoint; parent regenerates
// only if answers actually changed (handled by handleClarifyComplete comparing
// to previous clarifications - not yet implemented, future iteration).
function ClarifyAnswersBanner({
  answers,
  onEdit
}: {
  answers: ClarifyAnswer[]
  onEdit?: () => void
}) {
  const [open, setOpen] = useState(false)
  const answered = answers.filter(a => !a.skipped)
  if (answered.length === 0) return null
  return (
    <div className="border-ink-200 mb-4 rounded-xl border bg-white text-[13px]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-ink-600 flex w-full items-center justify-between gap-2 px-4 py-2.5 font-medium"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-teal-journey">✦</span>
          Refine answers used for this search
        </span>
        <span className="text-ink-400 text-xs">
          {open ? "▲ hide" : "▼ show"}
        </span>
      </button>
      {open && (
        <div className="border-ink-100 border-t px-4 pb-3 pt-2">
          <ul className="space-y-1">
            {answered.map((a, i) => (
              <li key={i} className="text-ink-600">
                <span className="text-ink-400 font-medium">{a.prompt}:</span>{" "}
                {[a.selected.join(", "), a.other].filter(Boolean).join(" · ")}
              </li>
            ))}
          </ul>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="text-teal-journey mt-2 text-[12px] underline underline-offset-2"
            >
              Edit &amp; regenerate
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function LiteratureTab(props: {
  papers: Paper[]
  onTogglePaper: (id: string) => void
  onUploadPdfs: (files: FileList | null) => void
  onApproveAndGenerate: () => void
  /**
   * Hook to kick off a fresh paper-finder pass when the user wants
   * more candidates than what was returned. Wired but NOT exposed
   * in the UI today - the "Show more" button paginates the existing
   * ranked pool instead. Kept on the props so a future "search
   * again from scratch" affordance can plug into it without re-
   * implementing the run.
   */
  onSearchMore: () => void
  canGenerate: boolean
  isApproved: boolean
  canEdit: boolean
  isBusy: boolean
  isSearching?: boolean
  progress?: LiteratureProgress[]
  /**
   * Total candidates the pipeline considered before the top-N cut.
   * Rendered as "from N searched" in the surfaced-papers header so
   * the scientist sees the funnel - we didn't just find 10 papers,
   * we sifted through 95.
   */
  totalCandidates?: number
  /** Pre-dedup hits across all sources - what "N examined" reports. */
  rawCandidates?: number
  onRevise: () => void
  /** Save the paper into this design's library (workspace paper library). */
  onSavePaper: (paper: Paper) => void
  /** Ids of papers already saved this session - flips the save icon state. */
  savedPaperIds: Set<string>
}) {
  const {
    papers,
    onTogglePaper,
    onUploadPdfs,
    onApproveAndGenerate,
    onSearchMore,
    canGenerate,
    isApproved,
    canEdit,
    isBusy,
    isSearching,
    progress,
    totalCandidates,
    rawCandidates,
    onRevise,
    onSavePaper,
    savedPaperIds
  } = props

  // Sort dropdown (issue #14). Default to relevance - that's what the
  // literature agent's scoring is for - but let the user flip to recency
  // when they need the latest work.
  const [sortMode, setSortMode] = useState<"relevance" | "recency">("relevance")

  // ── Show-more pagination ────────────────────────────────────────────
  // The lit-scout returns up to 40 ranked papers per run. We initially
  // surface 10 - enough to scan without overwhelming the scientist -
  // and let them click "Show more" to reveal the next 10 from the
  // already-ranked pool. Pure client-side pagination, no extra API call.
  //
  // Reset the page size only when the SET of papers actually changes (a real
  // re-search), keyed on the paper ids - NOT on every `papers` array identity
  // change. Toggling a paper's `selected` flag rebuilds the array with the same
  // ids; keying on identity used to collapse the list back to 10 on every
  // select, so a paper picked after "Show more" vanished until you paged again.
  const PAGE_SIZE = 10
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const paperIdsKey = useMemo(() => papers.map(p => p.id).join(","), [papers])
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [paperIdsKey])
  const handleShowMore = () => {
    setVisibleCount(c => Math.min(c + PAGE_SIZE, papers.length))
  }

  // Smart secondary action - paginate locally when there are still
  // un-shown papers in the pool; fall back to a fresh paper-finder
  // run when the pool is exhausted. Without this fallback, runs that
  // returned < 10 papers (or where the user has already paged through
  // everything) leave the user with no action button at all - they
  // can't ask the agent for MORE candidates. Always-on affordance.
  const morePaperFinderUnshown = visibleCount < papers.length
  const secondaryActionHandler = morePaperFinderUnshown
    ? handleShowMore
    : onSearchMore
  const secondaryActionLabel = morePaperFinderUnshown
    ? `Show more (${Math.min(PAGE_SIZE, papers.length - visibleCount)})`
    : "Search for more papers"

  return (
    <div className="space-y-4">
      <PhaseBanner
        isApproved={isApproved}
        phaseName="Literature Search"
        onRevise={onRevise}
      />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-orange-product text-sm font-bold uppercase tracking-widest">
            Relevant Literature
          </h3>
          <p className="text-ink-500 mt-0.5 text-xs">
            {isApproved
              ? "Literature approved. These papers were used to generate hypotheses."
              : "Review the papers surfaced by the literature agent. Select the ones to build hypotheses from."}
          </p>
          {!isApproved && (
            <p className="text-ink-400 mt-1 text-[11px] italic">
              Tip: select <b>at least 1 paper</b> (or several) - your picks
              become the basis for the hypotheses on the next step.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Sort dropdown (issue #14). Sits to the right of the header
              row so the action is right where the user is scanning the
              list. Hidden when there are no papers yet. */}
          {papers.length > 0 && (
            <Select
              value={sortMode}
              onValueChange={v => setSortMode(v as "relevance" | "recency")}
            >
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Ranked by relevance</SelectItem>
                <SelectItem value="recency">Ranked by latest</SelectItem>
              </SelectContent>
            </Select>
          )}
          {!isApproved && (
            <label className="cursor-pointer">
              <input
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={e => {
                  onUploadPdfs(e.target.files)
                  e.currentTarget.value = ""
                }}
              />
              <span className="border-orange-product/40 text-orange-product hover:bg-orange-product-tint inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold">
                <IconUpload size={14} />
                Upload PDFs
              </span>
            </label>
          )}
        </div>
      </div>

      {papers.length === 0 ? (
        isSearching ? (
          <PhaseProgressView
            title="Searching literature"
            subtitle="Querying PubMed, arXiv, Semantic Scholar, Scholar, and the web."
            events={progressToEvents(progress ?? [])}
          />
        ) : (
          // Single-CTA empty state. Replaces the older multi-option
          // fallback the scientist flagged ("says no papers found
          // then gives 4 options"). One primary action - upload your
          // own PDFs - and one secondary - go back and tweak the
          // problem so the next search has more signal. Both
          // approve/regenerate live in PhaseActionBar which is
          // suppressed in this branch (see below).
          <div className="border-line bg-paper-2 flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
            <div className="text-ink text-sm font-semibold">
              {isBusy
                ? "Searching literature…"
                : "No papers surfaced for this problem."}
            </div>
            {!isBusy && (
              <p className="text-ink-3 max-w-sm text-xs leading-relaxed">
                The literature agent couldn&apos;t find primary research
                matching your problem statement. Upload PDFs you already have,
                or revise the problem to broaden the search.
              </p>
            )}
            {!isBusy && (
              <div className="mt-2 flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    className="hidden"
                    onChange={e => {
                      onUploadPdfs(e.target.files)
                      e.currentTarget.value = ""
                    }}
                  />
                  <span className="bg-rust text-paper inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold hover:bg-[color:var(--rust-hover)]">
                    <IconUpload size={14} />
                    Upload PDFs
                  </span>
                </label>
                <button
                  type="button"
                  onClick={onRevise}
                  className="border-line text-ink-2 hover:bg-paper inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-xs font-semibold"
                >
                  Revise problem statement
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        (() => {
          // Sort mode controlled by the dropdown above the list.
          //   relevance → relevanceScore DESC, year DESC tiebreak
          //   recency   → year DESC,         relevanceScore DESC tiebreak
          // User-uploaded papers float to the top within a tie group.
          //
          // Papers without an explicit relevanceScore (pre-warm direct hits,
          // user-uploaded PDFs) get a fallback derived from their arrival
          // index - `1 - i/N` - so they sort in API order but DON'T all
          // collapse to a 0-tie. Without this fallback, "Ranked by relevance"
          // was a visible no-op whenever the lit-scout didn't run the LLM
          // relevance judgement, and the user couldn't see the sort working.
          const withFallbackScore = papers.map((p, i) => ({
            paper: p,
            score: p.relevanceScore ?? 1 - i / Math.max(papers.length, 1),
            year: Number(p.year) || 0,
            cites: p.citationCount ?? 0,
            // Web-arm (Tavily) hits are publisher landing pages: they score
            // high on relevance (the scraped page repeats the query terms) but
            // carry no citation count, so they used to crowd the top of the
            // list even though indexed literature made up ~80% of the pool.
            // Rank indexed records above web scrapes when relevance is close.
            indexed: p.source && p.source !== "tavily" ? 1 : 0
          }))
          // relevance → score, then citations, then year.
          // recency   → year, then citations, then score.
          // Citations is a real secondary signal so the two modes stay distinct
          // even when years tie or relevance scores are sparse.
          const ranked = [...withFallbackScore]
            .sort((a, b) => {
              if (sortMode === "recency") {
                if (b.year !== a.year) return b.year - a.year
                if (b.cites !== a.cites) return b.cites - a.cites
                if (b.score !== a.score) return b.score - a.score
              } else {
                // Bucket relevance to 0.05 so near-ties let the indexed-source
                // and citation signals decide, instead of a 0.01 scrape edge.
                const ba = Math.round(b.score / 0.05)
                const aa = Math.round(a.score / 0.05)
                if (ba !== aa) return ba - aa
                if (b.indexed !== a.indexed) return b.indexed - a.indexed
                if (b.cites !== a.cites) return b.cites - a.cites
                if (b.year !== a.year) return b.year - a.year
              }
              if (a.paper.userAdded !== b.paper.userAdded)
                return a.paper.userAdded ? -1 : 1
              return 0
            })
            .map(x => x.paper)
          const sourceLabel: Record<string, string> = {
            pubmed: "PubMed",
            arxiv: "arXiv",
            semantic_scholar: "Semantic Scholar",
            openalex: "OpenAlex",
            scholar: "Google Scholar",
            tavily: "Web",
            user: "Uploaded"
          }
          const selectedCount = ranked.filter(p => p.selected).length
          // Cap how many cards we render at once. The Paper[] from the
          // server can be up to 40; we surface the first `visibleCount`
          // and gate the rest behind the "Show more" button below the
          // list. `visiblePapers.length` is what the header displays so
          // the count matches what the user actually sees on screen.
          const visiblePapers = ranked.slice(0, visibleCount)
          const moreAvailable = visibleCount < ranked.length
          // Choose what "N searched" reflects: prefer the server-
          // reported `totalCandidates` (pre-truncation pool size,
          // typically much larger than ranked.length); fall back to
          // ranked.length when the run hasn't reported it (older
          // payloads, user-uploaded-only runs).
          const searchedTotal = Math.max(
            typeof rawCandidates === "number" ? rawCandidates : 0,
            typeof totalCandidates === "number" ? totalCandidates : 0,
            ranked.length
          )
          return (
            <div className="space-y-3">
              <div className="text-ink-3 flex items-center justify-between text-[12px]">
                <span>
                  <b className="text-ink">{visiblePapers.length}</b> of{" "}
                  <b className="text-ink">{ranked.length}</b> paper
                  {ranked.length === 1 ? "" : "s"} surfaced · ranked by{" "}
                  {sortMode === "recency" ? "latest" : "relevance"}
                  {" · "}
                  <b className="text-ink">{searchedTotal}</b> examined
                </span>
                {selectedCount > 0 && (
                  <span>
                    <b className="text-ink">{selectedCount}</b> selected
                  </span>
                )}
              </div>
              {visiblePapers.map((paper, idx) => (
                <div
                  key={paper.id}
                  className={cn(
                    "group flex items-start gap-3 rounded-xl border p-4 transition-colors",
                    paper.selected
                      ? "border-ink bg-paper-2"
                      : "border-line bg-surface hover:border-line-strong"
                  )}
                >
                  <Checkbox
                    checked={paper.selected}
                    onCheckedChange={() => onTogglePaper(paper.id)}
                    className="mt-1"
                    disabled={isApproved || !canEdit}
                  />
                  <div className="min-w-0 flex-1">
                    {/* Card layout per issue #15: an explicit, labelled
                        sequence (Paper / Authors / Year / Summary / Source
                        / Link) so the scientist can scan each field at a
                        glance instead of decoding a meta-line of dots. */}
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-rust font-mono text-[11px] font-semibold">
                        #{idx + 1}
                      </span>
                      {/* Cleaned at RENDER time as well as at fetch time:
                          papers stored before the cleanup shipped still carry
                          the publisher furniture ("… | Journal | Springer
                          Nature Link") in Firestore, and would otherwise keep
                          showing it forever. */}
                      <h4 className="text-ink flex-1 whitespace-normal break-words text-[14px] font-semibold leading-snug">
                        {cleanPaperTitle(paper.title)}
                      </h4>
                    </div>
                    {(() => {
                      const authorList = paper.authors ?? []
                      const authorStr =
                        authorList.length === 0
                          ? ""
                          : authorList.length <= 5
                            ? authorList.join(", ")
                            : `${authorList.slice(0, 5).join(", ")} et al.`
                      return authorStr ? (
                        <p className="text-ink-2 mt-1.5 text-[12px]">
                          <span className="text-ink-3 mr-1.5 font-mono text-[10.5px] uppercase tracking-wide">
                            Authors
                          </span>
                          {authorStr}
                        </p>
                      ) : null
                    })()}
                    {(paper.year ||
                      paper.journal ||
                      typeof paper.citationCount === "number") && (
                      <p className="text-ink-2 mt-1 text-[12px]">
                        <span className="text-ink-3 mr-1.5 font-mono text-[10.5px] uppercase tracking-wide">
                          Year
                        </span>
                        {paper.year || "n/a"}
                        {paper.journal ? ` · ${paper.journal}` : ""}
                        {typeof paper.citationCount === "number"
                          ? ` · ${paper.citationCount.toLocaleString()} citation${paper.citationCount === 1 ? "" : "s"}`
                          : ""}
                      </p>
                    )}
                    <p className="text-ink-2 mt-2 text-[12.5px] leading-relaxed">
                      <span className="text-ink-3 mr-1.5 font-mono text-[10.5px] uppercase tracking-wide">
                        Summary
                      </span>
                      {paper.summary ||
                        "Abstract not available - open the paper for details."}
                    </p>
                    <p className="text-ink-2 mt-2 text-[12px]">
                      <span className="text-ink-3 mr-1.5 font-mono text-[10.5px] uppercase tracking-wide">
                        Source
                      </span>
                      {paper.userAdded
                        ? "Uploaded by you"
                        : paper.source
                          ? (sourceLabel[paper.source] ?? paper.source)
                          : "Unknown"}
                    </p>
                    {paper.sourceUrl && (
                      <p className="mt-1 text-[12px]">
                        <span className="text-ink-3 mr-1.5 font-mono text-[10.5px] uppercase tracking-wide">
                          Link
                        </span>
                        <a
                          href={paper.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-rust inline-flex items-center gap-1 font-mono text-[11.5px] hover:underline"
                        >
                          {paper.sourceUrl
                            .replace(/^https?:\/\//, "")
                            .slice(0, 80)}
                          {" ↗"}
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {(() => {
                      const isSaved = savedPaperIds.has(paper.id)
                      return (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={e => {
                            e.stopPropagation()
                            if (!isSaved) onSavePaper(paper)
                          }}
                          className={
                            isSaved ? "text-rust" : "text-ink-3 hover:text-rust"
                          }
                          title={
                            isSaved
                              ? "Saved to this design's library"
                              : "Save to this design's library"
                          }
                        >
                          {isSaved ? (
                            <IconBookmarkFilled size={14} />
                          ) : (
                            <IconBookmark size={14} />
                          )}
                        </Button>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )
        })()
      )}

      {/* PhaseActionBar suppressed entirely in the no-papers branch -
          there's nothing to approve or regenerate, so showing it just
          adds dead buttons next to the empty-state CTA. Rendered as
          soon as the search has produced at least one paper.

          The secondary "Show more" button paginates the already-
          ranked pool by PAGE_SIZE (= 10) per click. Hidden once every
          paper is on screen so the user isn't left clicking a
          dead-end button. */}
      {papers.length > 0 && (
        <PhaseActionBar
          onApprove={onApproveAndGenerate}
          approveLabel="Approve & Generate Hypotheses"
          approveDisabled={!canGenerate || !canEdit}
          onRegenerate={secondaryActionHandler}
          regenerateLabel={secondaryActionLabel}
          regenerateIcon={
            morePaperFinderUnshown ? (
              <IconPlus size={14} />
            ) : (
              <IconRefresh size={14} />
            )
          }
          isBusy={isBusy}
          isApproved={isApproved}
        />
      )}
    </div>
  )
}

function HypothesesTab(props: {
  hypotheses: Hypothesis[]
  papers: Paper[]
  onToggle: (id: string) => void
  /** Persist scientist-edited hypothesis text (#2). */
  onEdit: (id: string, nextText: string) => void
  onApproveAndGenerate: () => void
  onRegenerate: () => void
  canGenerate: boolean
  isApproved: boolean
  canEdit: boolean
  isBusy: boolean
  isGenerating?: boolean
  progress?: PhaseProgress[]
  onRevise: () => void
  /** Set when the last generation attempt failed, so the empty state can show
   *  an accurate "generation failed - retry" message instead of the
   *  misleading "approve literature" prompt. */
  genError?: string | null
  /** Hypothesis stage sub-tab (Suggested vs Create your own) + controls. */
  subTab: "suggested" | "own"
  onSubTab: (t: "suggested" | "own") => void
  /** Auto mode runs the whole pipeline unattended, so "Create your own" is not
   *  a path that exists here - offering the tab only invited a dead end. */
  autoMode?: boolean
  /** Explicitly ask us to suggest hypotheses from the selected papers. */
  onGenerateSuggested: () => void
  /** Open the setup-questions flow to draft the researcher's own hypothesis. */
  onBuildOwn: () => void
  /** Adopt a hypothesis the researcher typed in the "own" tab. */
  onUseOwnText: (text: string) => void
}) {
  const {
    hypotheses,
    papers,
    onToggle,
    onEdit,
    onApproveAndGenerate,
    onRegenerate,
    canGenerate,
    isApproved,
    canEdit,
    isBusy,
    isGenerating,
    progress,
    onRevise,
    genError,
    subTab: rawSubTab,
    onSubTab,
    autoMode,
    onGenerateSuggested,
    onBuildOwn,
    onUseOwnText
  } = props

  // In auto mode the "own" panel is unreachable, so pin the view to the
  // generated list even if the tab state was left on "own" from an earlier run.
  const subTab = autoMode ? "suggested" : rawSubTab

  const [ownText, setOwnText] = useState("")

  const paperById = useMemo(() => {
    const m = new Map<string, Paper>()
    for (const p of papers) m.set(p.id, p)
    return m
  }, [papers])

  const selectedCount = hypotheses.filter(h => h.selected).length

  return (
    <div className="space-y-4">
      <PhaseBanner
        isApproved={isApproved}
        phaseName="Hypotheses"
        onRevise={onRevise}
      />

      {!isApproved && !autoMode && (
        <div className="border-line inline-flex rounded-lg border p-0.5 text-[12px] font-semibold">
          {(["suggested", "own"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => onSubTab(t)}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
                subTab === t
                  ? "bg-purple-persona text-white"
                  : "text-ink-500 hover:text-ink-800"
              )}
            >
              {t === "suggested" ? "Generated hypotheses" : "Create your own"}
            </button>
          ))}
        </div>
      )}

      {subTab === "own" && !isApproved ? (
        <OwnHypothesisPanel
          canEdit={canEdit}
          isBusy={isBusy}
          ownText={ownText}
          onOwnText={setOwnText}
          onBuildOwn={onBuildOwn}
          onUseOwnText={onUseOwnText}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-purple-persona text-sm font-bold uppercase tracking-widest">
                Review &amp; select hypotheses
              </h3>
              <p className="text-ink-500 mt-0.5 text-xs">
                {isApproved
                  ? "Hypotheses approved. The selected hypotheses were used to generate experiment designs."
                  : "Review the hypotheses below and select one or more to carry into experimental design."}
              </p>
              {!isApproved && (
                <p className="text-ink-400 mt-1 text-[11px] italic">
                  Tip: choose <b>at least 1 hypothesis</b> (or several) - your
                  picks drive the design that gets generated next.
                </p>
              )}
            </div>
            {hypotheses.length > 0 && (
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                  selectedCount > 0
                    ? "border-purple-persona bg-purple-persona-tint text-purple-persona"
                    : "border-ink-200 text-ink-500"
                )}
              >
                {selectedCount} of {hypotheses.length} selected
              </span>
            )}
          </div>

          {/* While a generation is in flight, show ONLY the progress view -
              never the previous list. Rendering the old (possibly selected)
              hypotheses next to a "generating" spinner read as if those cards
              were the new output, which was genuinely confusing when the
              researcher asked for their own hypothesis after picking a
              suggested one. */}
          {isGenerating ? (
            <PhaseProgressView
              accentClass="border-purple-persona/30 bg-purple-persona-tint"
              title={
                hypotheses.length > 0
                  ? "Generating your hypothesis"
                  : "Generating hypotheses"
              }
              subtitle="Five generation agents, then rank, reflect, evolve, and meta-review."
              events={progress ?? []}
            />
          ) : hypotheses.length === 0 ? (
            genError ? (
              <div className="space-y-3 rounded-xl border border-dashed border-red-300 bg-red-50 p-8 text-center">
                <p className="text-[13px] font-semibold text-red-700">
                  Hypothesis generation didn&apos;t complete
                </p>
                <p className="text-[12px] text-red-600">{genError}</p>
                <p className="text-ink-500 text-[11.5px]">
                  This is usually a transient hiccup - your literature is still
                  approved. Try generating again.
                </p>
                <Button
                  onClick={onRegenerate}
                  disabled={isBusy}
                  className="bg-purple-persona hover:bg-purple-persona/90 text-white"
                >
                  <IconRefresh size={14} className="mr-1.5" />
                  Try again
                </Button>
              </div>
            ) : (
              <div className="border-purple-persona/30 bg-purple-persona-tint space-y-3 rounded-xl border border-dashed p-8 text-center">
                <p className="text-ink-800 text-[13px] font-semibold">
                  Build hypotheses from the papers you selected
                </p>
                <p className="text-ink-500 mx-auto max-w-md text-[12px] leading-relaxed">
                  We&apos;ll propose a set of distinct, testable hypotheses
                  drawn across your selected papers.
                  {!autoMode && (
                    <>
                      {" "}
                      Prefer to start from your own idea? Switch to{" "}
                      <b>Create your own</b> above.
                    </>
                  )}
                </p>
                <Button
                  onClick={onGenerateSuggested}
                  disabled={isBusy || !canEdit}
                  className="bg-purple-persona hover:bg-purple-persona/90 text-white"
                >
                  <IconSparkles size={14} className="mr-1.5" />
                  Generate hypotheses
                </Button>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {hypotheses.map((h, hi) => (
                <div
                  key={h.id}
                  className="border-ink-200 flex items-start gap-3 rounded-xl border bg-white p-4"
                >
                  <Checkbox
                    checked={h.selected}
                    onCheckedChange={() => onToggle(h.id)}
                    className="mt-1"
                    disabled={isApproved || !canEdit}
                  />
                  <div className="min-w-0 flex-1">
                    {/* Issue #27 - render an auto-generated short title above
                    the full hypothesis text. `autoTitleFromHypothesis`
                    picks the first ~6 words so the scientist can scan a
                    list of hypotheses at a glance, then the full text
                    follows in EditableHypothesis. */}
                    <div className="text-purple-persona mb-1 text-[12px] font-bold uppercase tracking-wide">
                      Hypothesis #{hi + 1}:{" "}
                      {h.title || autoTitleFromHypothesis(h.text)}
                    </div>
                    <EditableHypothesis
                      text={h.text}
                      disabled={isApproved || !canEdit}
                      onSave={next => onEdit(h.id, next)}
                    />
                    {/* Cited-from chips: surface paper titles inline so the user
                    sees the evidence chain without opening the popover. */}
                    {h.basedOnPaperIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-ink-400 text-[10px] font-bold uppercase tracking-wide">
                          Cited from
                        </span>
                        {h.basedOnPaperIds.map(pid => {
                          const paper = paperById.get(pid)
                          const label = paper?.title ?? `Reference ${pid}`
                          return (
                            <span
                              key={pid}
                              title={paper?.title ?? pid}
                              className="text-ink-700 border-ink-200 bg-ink-50 inline-flex rounded-full border px-2 py-0.5 text-[10.5px]"
                            >
                              {label}
                            </span>
                          )
                        })}
                      </div>
                    )}
                    {/* Reasoning rendered inline so the user sees the "why"
                    without clicking. We split on blank lines so multi-
                    paragraph reasoning (premise → mechanism → prediction)
                    stays legible. Long reasoning is collapsed with a
                    "Show more" toggle to keep the list scannable. */}
                    <ReasoningInline reasoning={h.reasoning ?? ""} />

                    {/* "Based on" papers - full citation block - stays behind
                    a popover since the inline chips already surface the
                    paper names. The popover gives authors / year / journal /
                    source link without dominating the card. */}
                    {h.basedOnPaperIds.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-purple-persona hover:bg-purple-persona-tint mt-2 inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold">
                            <IconInfoCircle size={13} />
                            Reference details
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96 text-xs">
                          <div className="text-ink-400 text-[10px] font-bold uppercase tracking-wide">
                            Based on
                          </div>
                          <ul className="mt-1 space-y-2">
                            {h.basedOnPaperIds.map(pid => {
                              const paper = paperById.get(pid)
                              if (!paper) {
                                return (
                                  <li key={pid} className="text-ink-400 italic">
                                    Reference {pid} (not available)
                                  </li>
                                )
                              }
                              const authorLabel =
                                paper.authors && paper.authors.length
                                  ? paper.authors.length <= 3
                                    ? paper.authors.join(", ")
                                    : `${paper.authors.slice(0, 3).join(", ")} et al.`
                                  : ""
                              const meta = [
                                authorLabel,
                                paper.year,
                                paper.journal
                              ]
                                .filter(Boolean)
                                .join(" · ")
                              return (
                                <li
                                  key={pid}
                                  className="border-ink-100 bg-ink-50 rounded-md border p-2"
                                >
                                  <div className="text-ink-900 font-semibold leading-snug">
                                    {paper.title}
                                  </div>
                                  {meta && (
                                    <div className="text-ink-500 mt-0.5 text-[10px]">
                                      {meta}
                                    </div>
                                  )}
                                  {paper.sourceUrl && (
                                    <a
                                      href={paper.sourceUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-orange-product mt-1 inline-block text-[10px] underline"
                                    >
                                      Open source
                                    </a>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Write your own, right here, WITHOUT losing the generated set.
              The "Create your own" tab clears the suggestions on switch, so
              the one moment a researcher is best placed to write a sharper
              hypothesis - having just read four of ours - was also the moment
              acting on it meant throwing them away. This adds theirs alongside
              rather than instead. */}
          {!isApproved && !isGenerating && hypotheses.length > 0 && canEdit && (
            <details className="border-purple-persona/30 group rounded-xl border border-dashed bg-white p-4 open:pb-4">
              <summary className="text-purple-persona cursor-pointer list-none text-[12.5px] font-semibold">
                <span className="group-open:hidden">
                  + Write your own hypothesis instead
                </span>
                <span className="hidden group-open:inline">
                  Write your own hypothesis
                </span>
              </summary>
              <p className="text-ink-500 mt-2 text-[12px] leading-relaxed">
                Read something above you&apos;d sharpen, or have your own idea?
                Write it here. It joins the list as an extra option - nothing
                above is lost, and you can still pick whichever you prefer.
              </p>
              <textarea
                value={ownText}
                onChange={e => setOwnText(e.target.value)}
                rows={3}
                placeholder="e.g. Combining 50 mM lysine with 50 mM proline lowers viscosity at 150 mg/mL further than either alone, because they suppress different self-association contacts."
                className="border-ink-200 focus:border-purple-persona mt-3 w-full rounded-lg border p-3 text-[13px] outline-none transition-colors"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={isBusy || !ownText.trim()}
                  onClick={() => {
                    onUseOwnText(ownText.trim())
                    setOwnText("")
                  }}
                  className="bg-purple-persona hover:bg-purple-persona/90 text-white"
                >
                  Add to the list
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBusy}
                  onClick={onBuildOwn}
                >
                  Or answer a few questions and we&apos;ll draft it
                </Button>
              </div>
            </details>
          )}

          <PhaseActionBar
            onApprove={onApproveAndGenerate}
            approveLabel="Approve & Generate Design"
            approveDisabled={!canGenerate || !canEdit}
            onRegenerate={hypotheses.length > 0 ? onRegenerate : undefined}
            regenerateLabel="Regenerate Hypotheses"
            isBusy={isBusy}
            isApproved={isApproved}
          />
        </>
      )}
    </div>
  )
}

/**
 * "Create your own" tab body: answer setup questions to have the tool draft a
 * hypothesis steered by the answers, OR type your own directly. Either path
 * ends with a selected hypothesis carried into the design stage.
 */
function OwnHypothesisPanel(props: {
  canEdit: boolean
  isBusy: boolean
  ownText: string
  onOwnText: (v: string) => void
  onBuildOwn: () => void
  onUseOwnText: (text: string) => void
}) {
  const { canEdit, isBusy, ownText, onOwnText, onBuildOwn, onUseOwnText } =
    props
  return (
    <div className="space-y-4">
      <div className="border-purple-persona/30 bg-purple-persona-tint/40 rounded-xl border p-4">
        <h4 className="text-ink-800 text-[13px] font-semibold">
          Answer a few setup questions and we draft a hypothesis for you
          together
        </h4>
        <p className="text-ink-500 mt-1 text-[12px] leading-relaxed">
          A short, senior-bench-scientist set of questions about your system,
          working concentrations, readout and comparison - then we generate a
          sharp, testable hypothesis steered by your answers and the papers you
          selected.
        </p>
        <Button
          onClick={onBuildOwn}
          disabled={!canEdit || isBusy}
          className="bg-purple-persona hover:bg-purple-persona/90 mt-3 text-white"
        >
          <IconSparkles size={14} className="mr-1.5" />
          Answer questions &amp; generate
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-ink-100 h-px flex-1" />
        <span className="text-ink-400 text-[11px] font-semibold uppercase tracking-wide">
          or write your own
        </span>
        <div className="bg-ink-100 h-px flex-1" />
      </div>

      <div className="border-ink-200 space-y-2 rounded-xl border p-4">
        <Textarea
          value={ownText}
          onChange={e => onOwnText(e.target.value)}
          disabled={!canEdit || isBusy}
          rows={3}
          placeholder="Type your hypothesis. e.g. Raising arginine to 150 mM lowers the viscosity of the 150 mg/mL mAb formulation below 20 cP at 25 C without loss of monomer."
        />
        <div className="flex justify-end">
          <Button
            onClick={() => onUseOwnText(ownText)}
            disabled={!canEdit || isBusy || ownText.trim().length < 8}
            variant="outline"
          >
            Use my hypothesis →
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * ASSUMPTION LEDGER panel. The design generator logs every value it had to
 * assume; this asks the scientist to confirm or correct each one so the final
 * protocol rests on their judgement, not the model's defaults. Highest-impact
 * assumptions first - those are the ones that break the calculations.
 */
function AssumptionsPanel(props: {
  assumptions: DesignAssumption[]
  canEdit: boolean
  isBusy: boolean
  onResolve: (
    answers: { id: string; value: string; acceptedAssumption: boolean }[]
  ) => void
}) {
  const { assumptions, canEdit, isBusy, onResolve } = props
  const open = assumptions.filter(a => !a.resolution)
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [typed, setTyped] = useState<Record<string, string>>({})
  const [collapsed, setCollapsed] = useState(false)

  if (open.length === 0) return null

  const valueFor = (a: DesignAssumption) =>
    (typed[a.id] ?? "").trim() || picked[a.id] || ""
  const answeredCount = open.filter(a => valueFor(a)).length

  const submit = (acceptAll: boolean) => {
    onResolve(
      open.map(a => {
        const v = valueFor(a)
        return acceptAll || !v
          ? { id: a.id, value: a.assumedValue, acceptedAssumption: true }
          : {
              id: a.id,
              value: v,
              acceptedAssumption: v === a.assumedValue
            }
      })
    )
  }

  const tone = (impact: string) =>
    impact === "high"
      ? "border-rust/40 bg-rust/5"
      : impact === "medium"
        ? "border-line bg-paper-2"
        : "border-line bg-surface"

  return (
    <div className="border-rust/40 bg-rust/5 space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-ink flex items-center gap-1.5 text-[13px] font-bold">
            <IconAlertTriangle size={15} className="text-rust" />
            {open.length} choice{open.length === 1 ? "" : "s"} made for you
          </h4>
          <p className="text-ink-2 mt-1 max-w-2xl text-[12px] leading-relaxed">
            Each was picked from the literature and your inputs, with the
            reasoning shown. Confirm them or set your own values, and the
            protocol is rebuilt on your numbers - recomputing every dependent
            volume, count and total.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          className="text-ink-3 hover:text-ink shrink-0 text-[11px] font-semibold uppercase tracking-wide"
        >
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="space-y-2.5">
            {open.map(a => (
              <div
                key={a.id}
                className={cn(
                  "space-y-2 rounded-lg border p-3",
                  tone(a.impact)
                )}
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-ink text-[12.5px] font-semibold">
                    {a.parameter}
                  </span>
                  {a.impact === "high" && (
                    <span className="text-rust border-rust/40 rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase">
                      changes the calcs
                    </span>
                  )}
                  {a.section && (
                    <span className="text-ink-3 text-[10.5px]">
                      {a.section}
                    </span>
                  )}
                </div>
                <p className="text-ink-2 text-[12px] leading-relaxed">
                  Selected: <b className="text-ink">{a.assumedValue}</b>.{" "}
                  {a.whyItMatters}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {/* The chosen value is ALWAYS offered as an option and
                      flagged as the recommendation - the model often omitted
                      its own pick from the list, leaving no way to select the
                      thing it had already (usually correctly) decided on. */}
                  {(a.options.some(
                    o =>
                      o.trim().toLowerCase() ===
                      a.assumedValue.trim().toLowerCase()
                  )
                    ? a.options
                    : [a.assumedValue, ...a.options]
                  ).map(opt => {
                    const isRecommended =
                      opt.trim().toLowerCase() ===
                      a.assumedValue.trim().toLowerCase()
                    const isPicked =
                      (picked[a.id] ?? a.assumedValue) === opt &&
                      !(typed[a.id] ?? "").trim()
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!canEdit || isBusy}
                        onClick={() => {
                          setPicked(p => ({ ...p, [a.id]: opt }))
                          setTyped(t => ({ ...t, [a.id]: "" }))
                        }}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                          isPicked
                            ? "border-ink bg-ink text-white"
                            : isRecommended
                              ? "border-ink text-ink bg-surface font-medium"
                              : "border-line text-ink-2 hover:border-line-strong bg-surface"
                        )}
                      >
                        {opt}
                        {isRecommended && (
                          <span
                            className={cn(
                              "ml-1.5 text-[9.5px] font-bold uppercase tracking-wide",
                              isPicked ? "text-white/70" : "text-ink-3"
                            )}
                          >
                            chosen
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <Input
                  value={typed[a.id] ?? ""}
                  onChange={e =>
                    setTyped(t => ({ ...t, [a.id]: e.target.value }))
                  }
                  disabled={!canEdit || isBusy}
                  placeholder={`Or type the exact value (e.g. ${a.assumedValue})`}
                  className="h-8 text-[12px]"
                />
              </div>
            ))}
          </div>

          <div className="border-line/60 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <span className="text-ink-3 text-[11.5px]">
              {answeredCount} of {open.length} changed
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={!canEdit || isBusy}
                onClick={() => submit(true)}
                className="text-ink-2"
              >
                Confirm all
              </Button>
              <Button
                size="sm"
                disabled={!canEdit || isBusy || answeredCount === 0}
                onClick={() => submit(false)}
                className="bg-rust hover:bg-rust/90 text-white"
              >
                Apply my changes
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Inline editor for a single hypothesis text (#2). Click-to-edit; Save
 * persists via the parent `onSave`. Disabled when the phase is already
 * approved (text becomes plain read-only).
 */
function EditableHypothesis(props: {
  text: string
  disabled?: boolean
  onSave: (nextText: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(props.text)
  useEffect(() => {
    if (!editing) setDraft(props.text)
  }, [props.text, editing])
  if (!editing) {
    return (
      <div className="flex items-start gap-1.5">
        <p className="text-ink-900 flex-1 text-sm leading-relaxed">
          {props.text}
        </p>
        {!props.disabled && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              setEditing(true)
            }}
            className="text-ink-3 hover:text-ink hover:border-ink-300 flex shrink-0 items-center gap-1 rounded-md border border-transparent px-1.5 py-0.5 text-[11px] font-medium transition-colors"
            aria-label="Edit hypothesis"
            title="Edit hypothesis text"
          >
            <IconPencil size={13} /> Edit
          </button>
        )}
      </div>
    )
  }
  const trimmed = draft.trim()
  const dirty = trimmed.length > 0 && trimmed !== props.text.trim()
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onClick={e => e.stopPropagation()}
        autoFocus
        rows={3}
        className="text-ink-900 text-sm leading-relaxed"
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={e => {
            e.stopPropagation()
            setDraft(props.text)
            setEditing(false)
          }}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!dirty}
          onClick={e => {
            e.stopPropagation()
            props.onSave(trimmed)
            setEditing(false)
          }}
        >
          Save
        </Button>
      </div>
    </div>
  )
}

/**
 * Renders hypothesis reasoning inline (not behind a popover). Multi-paragraph
 * reasoning (premise → mechanism → prediction) is split on blank lines. The
 * first paragraph is always visible; the rest is collapsed with a Show-more
 * toggle so the hypothesis list stays scannable.
 */
function ReasoningInline({ reasoning }: { reasoning: string }) {
  const [expanded, setExpanded] = useState(false)
  const paragraphs = useMemo(
    () =>
      reasoning
        .split(/\n{2,}|\r{2,}/)
        .map(s => s.trim())
        .filter(Boolean),
    [reasoning]
  )

  if (paragraphs.length === 0) return null

  const visible = expanded ? paragraphs : paragraphs.slice(0, 1)
  const hasMore = paragraphs.length > 1

  return (
    <div className="mt-2">
      <div className="text-ink-400 text-[10px] font-bold uppercase tracking-wide">
        Why this hypothesis
      </div>
      <div className="text-ink-700 mt-1 space-y-2 text-[12.5px] leading-relaxed">
        {visible.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="text-purple-persona hover:text-purple-persona/80 mt-1 text-[11px] font-semibold"
        >
          {expanded ? "Show less" : `Show ${paragraphs.length - 1} more`}
        </button>
      )}
    </div>
  )
}

function slugifyHeading(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function DesignSectionIndex(props: {
  sections: { heading: string }[]
  containerId: string
}) {
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    const container = document.getElementById(props.containerId)
    if (!container) return
    const headings = Array.from(
      container.querySelectorAll<HTMLElement>("[data-section-id]")
    )
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) {
          setActiveId(visible[0].target.getAttribute("data-section-id") ?? "")
        }
      },
      {
        root: container,
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1]
      }
    )
    headings.forEach(h => observer.observe(h))
    return () => observer.disconnect()
  }, [props.containerId, props.sections])

  const handleClick = (id: string) => {
    const el = document.getElementById(id)
    const container = document.getElementById(props.containerId)
    if (!el || !container) return
    const top = el.offsetTop - container.offsetTop - 16
    container.scrollTo({ top, behavior: "smooth" })
  }

  return (
    <nav className="sticky top-0 space-y-1">
      <div className="text-ink-400 mb-3 text-[10px] font-bold uppercase tracking-[0.13em]">
        On this page
      </div>
      <ul className="space-y-1">
        {props.sections.map(sec => {
          const id = `section-${slugifyHeading(sec.heading)}`
          const isActive = id === activeId
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => handleClick(id)}
                className={cn(
                  "w-full border-l-2 py-1.5 pl-3 pr-2 text-left text-xs leading-snug transition-colors",
                  isActive
                    ? "border-sage-brand text-sage-brand font-semibold"
                    : "border-ink-200 text-ink-500 hover:border-sage-brand/60 hover:text-ink-900"
                )}
              >
                {sec.heading}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function DesignSectionContent(props: {
  section: DesignSection
  index?: number
  /** When true, hovering/click reveals an Edit affordance. */
  editable?: boolean
  /** Called when the user hits Save. Resolves once persisted. */
  onSave?: (nextBody: string) => Promise<void>
}) {
  const { section, index, editable, onSave } = props
  const id = `section-${slugifyHeading(section.heading)}`

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(section.body)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Re-sync the draft any time the section body changes from outside
  // (e.g. regenerate, or another device edited it). No-op while the user is
  // actively editing so we don't stomp in-flight changes.
  useEffect(() => {
    if (!isEditing) setDraft(section.body)
  }, [section.body, isEditing])

  const enterEdit = () => {
    if (!editable || !onSave) return
    setDraft(section.body)
    setIsEditing(true)
    // Focus the textarea after the swap. Use a microtask so it's in the DOM.
    queueMicrotask(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      // Fit to content on first open.
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
    })
  }

  const cancelEdit = () => {
    setDraft(section.body)
    setIsEditing(false)
  }

  const commitEdit = async () => {
    if (!onSave) return
    const next = draft.trim()
    if (next === section.body.trim()) {
      setIsEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(next)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const onTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      cancelEdit()
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      void commitEdit()
    }
  }

  // Promote any paragraph-embedded bullet markers onto their own line so the
  // markdown renderer turns them into a real list (fixes runs that squash
  // bullets into a wall of text).
  //
  // TABLE ROWS ARE EXEMPT. Applied blindly, these rules fire inside table
  // cells: a cell reading "20 mM - pH 6.0" or "1. Add buffer" contains the
  // same " - " / " 1. " pattern, so the row was split across several lines and
  // GFM stopped recognising the block as a table - which is why the conditions
  // and condition-prep sections came back as walls of pipes after an
  // iteration, where cells tend to carry more description. Rewriting per line,
  // skipping anything that looks like a table row or separator, keeps both
  // behaviours.
  const normalized = section.body
    .split("\n")
    .map(line => {
      const t = line.trim()
      const isTableRow = t.startsWith("|") || /^\|?[\s:|-]+\|[\s:|-]*$/.test(t)
      if (isTableRow) return line
      return line
        .replace(/\s+([-*•])\s+(?=\S)/g, "\n$1 ")
        .replace(/\s+(\d+\.)\s+(?=\S)/g, "\n$1 ")
    })
    .join("\n")
    // A table butted directly against the paragraph above it is parsed as part
    // of that paragraph, so it renders as literal pipes. Guarantee the blank
    // line GFM needs.
    .replace(/([^\n|])\n(\|)/g, "$1\n\n$2")

  return (
    <section
      id={id}
      data-section-id={id}
      className="group/section border-line scroll-mt-4 border-b pb-8 pt-1 last:border-b-0 last:pb-0"
    >
      <div className="mb-4 flex items-baseline gap-3">
        {typeof index === "number" && (
          <span className="text-ink-4 font-mono text-[12px] tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        <h3 className="font-display text-ink m-0 text-[22px] font-normal leading-tight tracking-[-0.01em]">
          {section.heading}
        </h3>
        {editable && !isEditing && (
          <button
            type="button"
            onClick={enterEdit}
            className="text-ink-3 hover:text-ink hover:bg-paper-2 border-line ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[12.5px] transition-colors"
            title="Edit section"
          >
            <IconPencil size={13} /> Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-3">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => {
              setDraft(e.target.value)
              const el = e.currentTarget
              el.style.height = "auto"
              el.style.height = `${el.scrollHeight}px`
            }}
            onKeyDown={onTextareaKeyDown}
            spellCheck
            disabled={saving}
            className={cn(
              "border-line bg-surface text-ink focus-visible:border-rust focus-visible:ring-rust-soft w-full resize-y rounded-md border px-3 py-2.5 font-mono text-[13px] leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring",
              saving && "cursor-not-allowed opacity-60"
            )}
            placeholder="Markdown. Bold **like this**. Lists start with -, 1. - tables use | …"
            style={{ minHeight: 180 }}
          />
          <div className="text-ink-3 flex items-center gap-2 text-[12px]">
            <span>
              Markdown. Hit <Kbd>⌘</Kbd> <Kbd>⏎</Kbd> to save, <Kbd>Esc</Kbd> to
              cancel.
            </span>
            <div className="flex-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={commitEdit}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        // SOP-styled markdown:
        //   - bold tags get rust-tinted ink + semibold to serve as lead-in labels
        //   - lists have roomy spacing, numbered lists use circled numerals
        //   - tables get warm-paper header + line borders
        //   - headings inside the body (H3/H4 from the prompt) are editorial
        <div
          className={cn(
            "text-ink-2 text-[14.5px] leading-[1.65]",
            "[&_p]:my-3",
            "[&_strong]:text-ink [&_strong]:font-semibold",
            "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
            "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
            "[&_li>p]:my-1 [&_li]:pl-1",
            "[&_h3]:font-display [&_h3]:text-ink [&_h3]:mt-6 [&_h3]:text-[18px] [&_h3]:font-normal [&_h3]:tracking-[-0.01em]",
            "[&_h4]:text-ink [&_h4]:mb-1 [&_h4]:mt-4 [&_h4]:text-[14px] [&_h4]:font-semibold",
            "[&_blockquote]:border-rust [&_blockquote]:text-ink-2 [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic",
            "[&_code]:bg-paper-2 [&_code]:text-ink [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12.5px]",
            "[&_table]:bg-surface [&_table]:border-line [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-md [&_table]:border [&_table]:text-[12.5px]",
            "[&_thead]:bg-paper-2",
            "[&_th]:text-ink-3 [&_th]:border-line [&_th]:border-b [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-mono [&_th]:text-[11px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-[0.08em]",
            "[&_td]:text-ink [&_td]:border-line [&_td]:border-b [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
            "[&_tbody_tr:last-child_td]:border-b-0"
          )}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {normalized}
          </ReactMarkdown>
        </div>
      )}
    </section>
  )
}

/**
 * Synthesize a short tab label from the full hypothesis text. We don't ask
 * the model for a title - the user is browsing several hypotheses side by
 * side and wants something quick to scan. ~6 words is enough to recognize
 * the hypothesis without dominating the tab strip.
 */
function autoTitleFromHypothesis(text?: string): string {
  if (!text) return "Untitled"
  const cleaned = text.trim().replace(/\s+/g, " ")
  if (!cleaned) return "Untitled"
  const words = cleaned.split(" ")
  const head = words.slice(0, 6).join(" ")
  return words.length > 6 ? `${head}…` : head
}

function DesignTab(props: {
  designs: GeneratedDesign[]
  hypotheses: Hypothesis[]
  activeId: string | null
  onSelect: (id: string) => void
  activeDesign?: GeneratedDesign
  onApproveAndContinue: () => void
  /** Open the Validate & iterate modal (simulate or bring lab data). */
  onValidateIterate?: () => void
  /** Finalise/save the design directly (was the bottom "Next" -> gate). */
  onSaveNow?: () => void
  onRegenerate: () => void
  isApproved: boolean
  canEdit: boolean
  isBusy: boolean
  isGenerating?: boolean
  progress?: PhaseProgress[]
  onRevise: () => void
  designVersions?: DesignVersionSnapshot[]
  /** What the LIVE design is called. Not always one above the highest in
   *  history: promoting an older version brings its own number forward. */
  liveVersionNumber?: number
  /** Set while a NEW version is being generated: which version, and the
   *  changes going into it. Replaces the superseded design with progress. */
  regenPlan?: { version: number; changes: string[]; hypothesis?: string } | null
  /** Rating strip, injected so this component stays free of eval plumbing. */
  onRateOutput?: React.ReactNode
  /** Provenance of the live design — labels the newest rail entry. */
  currentOrigin?: "original" | "simulation" | "lab-data" | "manual"
  onRestoreVersion?: (versionId: string) => void
  /** Resolve the assumption ledger (confirm or correct assumed values). */
  onResolveAssumptions?: (
    answers: { id: string; value: string; acceptedAssumption: boolean }[]
  ) => void
  /** Version currently being READ (null = the live design). */
  viewingVersionId?: string | null
  /** Move the read pointer. Browsing never mutates or renumbers history. */
  onViewVersion?: (versionId: string | null) => void
  onEditSection?: (
    designId: string,
    heading: string,
    nextBody: string
  ) => Promise<void>
}) {
  const {
    designs,
    hypotheses,
    activeId,
    onSelect,
    activeDesign,
    onApproveAndContinue,
    onValidateIterate,
    onSaveNow,
    onRegenerate,
    isApproved,
    canEdit,
    isBusy,
    isGenerating,
    progress,
    onRevise,
    designVersions = [],
    liveVersionNumber,
    regenPlan = null,
    onRateOutput,
    currentOrigin = "original",
    onRestoreVersion,
    onResolveAssumptions,
    viewingVersionId = null,
    onViewVersion,
    onEditSection
  } = props

  // Look up the hypothesis backing the active design so we can show its
  // statement under the experiment title (makes it clear what the experiment
  // is testing).
  const activeHypothesis = activeDesign
    ? hypotheses.find(h => h.id === activeDesign.hypothesisId)
    : undefined

  const scrollContainerId = "design-detail-scroll"

  // Iteration timeline (item 16). Oldest → newest, with the live design last.
  // designVersions is stored newest-first, so reverse it for the rail.
  const timeline: {
    key: string
    version: number
    label: string
    createdAt?: string
    isCurrent: boolean
    versionId?: string
    outcome?: DesignVersionSnapshot["outcome"]
  }[] = [
    ...[...designVersions].reverse().map(v => ({
      key: v.id,
      version: v.versionNumber,
      label: originLabel(v.origin),
      createdAt: v.createdAt,
      isCurrent: false,
      versionId: v.id,
      outcome: v.outcome
    })),
    {
      key: "current",
      version:
        regenPlan?.version ??
        liveVersionNumber ??
        designVersions.reduce((m, v) => Math.max(m, v.versionNumber), 0) + 1,
      label: regenPlan ? "Generating…" : originLabel(currentOrigin),
      isCurrent: true
    }
  ]

  // Which rail entry is being READ. The live design is the default view, so
  // "current" is highlighted whenever no version pointer is set.
  const isViewed = (t: { isCurrent: boolean; versionId?: string }): boolean =>
    viewingVersionId ? t.versionId === viewingVersionId : t.isCurrent
  const viewedEntry = timeline.find(t => isViewed(t))
  const viewedVersion = viewingVersionId
    ? (designVersions.find(v => v.id === viewingVersionId) ?? null)
    : null

  return (
    <div className="flex gap-5">
      {/* LEFT: sequential iteration rail. Only once there's more than one
          version — a single design doesn't need a timeline. */}
      {/* Shown whenever there IS history - it used to be hidden below the lg
          breakpoint, so saving (which opens the Export panel and squeezes the
          reading width) made the whole version list appear to vanish. */}
      {designs.length > 0 && timeline.length > 1 && (
        <aside className="w-40 shrink-0 lg:w-48">
          <div className="text-ink-400 mb-2 text-[11px] font-semibold uppercase tracking-wider">
            Design iterations
          </div>
          <ol className="relative space-y-1">
            {timeline.map((t, i) => (
              <li key={t.key} className="relative">
                {i < timeline.length - 1 && (
                  <span className="bg-ink-200 absolute left-[7px] top-[22px] h-[calc(100%-14px)] w-px" />
                )}
                <button
                  type="button"
                  disabled={!onViewVersion}
                  onClick={() => onViewVersion?.(t.versionId ?? null)}
                  title={
                    isViewed(t)
                      ? "You're reading this version"
                      : t.isCurrent
                        ? "Back to the current design"
                        : `Open v${t.version} (read-only)`
                  }
                  className={cn(
                    "group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                    isViewed(t)
                      ? "bg-ink-50 cursor-default"
                      : "hover:bg-ink-50 cursor-pointer"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 size-[15px] shrink-0 rounded-full border-2 bg-white",
                      isViewed(t) ? "border-brick" : "border-ink-300"
                    )}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-[12px] font-semibold",
                        isViewed(t) ? "text-ink-900" : "text-ink-700"
                      )}
                    >
                      v{t.version}
                      {t.isCurrent && (
                        <span className="text-brick ml-1 font-medium">
                          · current
                        </span>
                      )}
                    </span>
                    <span className="text-ink-500 block text-[11px] leading-snug">
                      {t.label}
                    </span>
                    {t.createdAt && (
                      <span className="text-ink-400 block font-mono text-[10px]">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    )}
                    {/* Auto mode iterates on its own, so a researcher opening
                        Validate only ever saw the LATEST simulation and had no
                        idea the earlier version had been simulated at all.
                        Each entry now advertises its own result, and clicking
                        the entry opens that version with its verdict panel. */}
                    {t.outcome &&
                      (typeof t.outcome.meetRate === "number" ||
                        t.outcome.verdict) && (
                        <span className="mt-1 block">
                          {typeof t.outcome.meetRate === "number" && (
                            <span
                              className={cn(
                                "inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                t.outcome.metTarget
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              )}
                            >
                              hit {Math.round(t.outcome.meetRate * 100)}%
                            </span>
                          )}
                          <span className="text-teal-journey mt-0.5 block text-[10px] font-medium underline-offset-2 group-hover:underline">
                            View simulation
                          </span>
                        </span>
                      )}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      )}

      <div className="min-w-0 flex-1 space-y-4">
        {/* Reading history: make it obvious this isn't the live design, and give
            both ways out - back to current, or promote this one. */}
        {/* Reading an OLD version: show the evidence that superseded it -
            the verdict at the time and the changes that produced the next
            version. Previously only the latest version had any of this, so
            stepping back showed a protocol with no reasoning attached. */}
        {viewedVersion?.outcome &&
          (viewedVersion.outcome.verdict ||
            viewedVersion.outcome.simulation ||
            (viewedVersion.outcome.appliedChanges?.length ?? 0) > 0) && (
            <SimulationOutcome
              outcome={viewedVersion.outcome}
              title={`v${viewedVersion.versionNumber} · what this version showed`}
            />
          )}

        {viewedVersion && (
          <div className="border-line bg-paper-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <p className="text-ink-2 text-[12px]">
              Reading <b className="text-ink">v{viewedVersion.versionNumber}</b>
              {viewedEntry ? ` · ${viewedEntry.label}` : ""} — read-only.
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewVersion?.(null)}
              >
                Back to current
              </Button>
              {onRestoreVersion && canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => onRestoreVersion(viewedVersion.id)}
                >
                  Make this the current design
                </Button>
              )}
            </div>
          </div>
        )}
        {/* Assumption ledger - only for the LIVE design (a historical version
            is read-only, and its assumptions were already settled). */}
        {!viewedVersion &&
          onResolveAssumptions &&
          (activeDesign?.assumptions?.length ?? 0) > 0 && (
            <AssumptionsPanel
              assumptions={activeDesign!.assumptions!}
              canEdit={canEdit}
              isBusy={isBusy}
              onResolve={onResolveAssumptions}
            />
          )}
        <PhaseBanner
          isApproved={isApproved}
          phaseName="Experiment Design"
          onRevise={onRevise}
        />

        {/* Validate & iterate lives at the TOP so it's visible without
            scrolling a long design (it used to sit under the protocol, below
            the fold). One button; inside the modal the researcher picks
            simulate-the-results or bring-your-own lab data. */}
        {/* Stays available AFTER saving too. It used to be hidden once the
            design was saved, on the reasoning that iterating would silently
            fork a finalised design - but saving then validating is the normal
            order of work, and hiding the button just stranded the researcher.
            Iterating writes a NEW version and leaves the saved one intact, so
            nothing is silently overwritten; the copy says so. */}
        {designs.length > 0 &&
          onValidateIterate &&
          !viewedVersion &&
          !regenPlan && (
            <div className="border-teal-journey/30 bg-teal-journey/5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
              <p className="text-ink-600 min-w-0 text-[12.5px]">
                <span className="text-ink-800 font-semibold">
                  Stress-test this design
                </span>{" "}
                {isApproved
                  ? "— simulate the outcome, or check it against your own lab data. Any changes land as a new version; the saved design stays as it is."
                  : "— simulate the outcome, or check it against your own lab data — or save it and head to downloads."}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onValidateIterate}
                  disabled={isBusy}
                  className="border-teal-journey/40 text-teal-journey hover:bg-teal-journey/10 gap-1.5"
                >
                  <IconChartHistogram size={15} /> Validate &amp; iterate
                </Button>
                {/* Keyed off UNSAVED WORK, not phase approval. Editing a section
                  after saving clears that design's `saved` flag, and gating
                  this on `!isApproved` meant the button never came back - the
                  edit was stranded with no way to commit it. */}
                {onSaveNow && (!isApproved || designs.some(d => !d.saved)) && (
                  <Button
                    size="sm"
                    onClick={onSaveNow}
                    disabled={isBusy}
                    className="bg-brick hover:bg-brick-hover gap-1.5"
                  >
                    <IconCheck size={15} />
                    {isApproved ? "Save changes" : "Save now"}
                  </Button>
                )}
              </div>
            </div>
          )}

        {/* A regeneration in flight takes over the reading pane. The old
            behaviour left the SUPERSEDED design on screen with every control
            disabled, so it looked as though the page had frozen on a protocol
            that was already on its way out. */}
        {regenPlan ? (
          <div className="space-y-4">
            <div className="border-teal-journey/30 bg-teal-journey/5 rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <IconLoader2
                  size={16}
                  className="text-teal-journey animate-spin"
                />
                <span className="text-ink-900 text-[13.5px] font-semibold">
                  Generating v{regenPlan.version}
                </span>
              </div>
              <p className="text-ink-600 mt-1 text-[12.5px]">
                v{liveVersionNumber ?? regenPlan.version - 1} is saved in the
                timeline on the left and stays readable while this builds.
              </p>
              {regenPlan.changes.length > 0 && (
                <div className="mt-3">
                  <div className="text-ink-400 mb-1 text-[10.5px] font-bold uppercase tracking-wider">
                    Changes going in
                  </div>
                  <ul className="text-ink-700 list-disc space-y-0.5 pl-4 text-[12.5px]">
                    {regenPlan.changes.map(c => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {regenPlan.hypothesis && (
                <div className="mt-3">
                  <div className="text-ink-400 mb-1 text-[10.5px] font-bold uppercase tracking-wider">
                    Revised hypothesis
                  </div>
                  <p className="text-ink-700 text-[12.5px] leading-relaxed">
                    {regenPlan.hypothesis}
                  </p>
                </div>
              )}
            </div>
            <PhaseProgressView
              accentClass="border-sage-brand/30 bg-sage-brand-tint"
              title={`Rebuilding the design as v${regenPlan.version}`}
              subtitle="Four phases per hypothesis: setup, materials, protocol, analysis."
              events={progress ?? []}
            />
          </div>
        ) : designs.length === 0 ? (
          isGenerating ? (
            <>
              {/* Issue #25 - while the design is being generated, the user
                should still see the hypotheses that drove it. We pull the
                selected hypotheses from the parent and render them as a
                pinned slab above the progress view so the scientist has
                continuous context during the (often slow) generation. */}
              {hypotheses.filter(h => h.selected).length > 0 && (
                <div className="border-purple-persona/30 bg-purple-persona-tint space-y-2 rounded-xl border p-4">
                  <div className="text-purple-persona text-[10.5px] font-bold uppercase tracking-widest">
                    Generating from {hypotheses.filter(h => h.selected).length}{" "}
                    hypothes
                    {hypotheses.filter(h => h.selected).length === 1
                      ? "is"
                      : "es"}
                  </div>
                  {hypotheses
                    .filter(h => h.selected)
                    .map((h, i) => (
                      <div
                        key={h.id}
                        className="border-purple-persona/20 rounded-lg border bg-white p-3"
                      >
                        <div className="text-purple-persona mb-1 text-[11.5px] font-bold uppercase tracking-wide">
                          Hypothesis #{i + 1}:{" "}
                          {h.title || autoTitleFromHypothesis(h.text)}
                        </div>
                        <p className="text-ink-900 text-[13px] leading-relaxed">
                          {h.text}
                        </p>
                      </div>
                    ))}
                </div>
              )}
              <PhaseProgressView
                accentClass="border-sage-brand/30 bg-sage-brand-tint"
                title="Generating experiment designs"
                subtitle="Four phases per hypothesis: setup, materials, protocol, analysis."
                events={progress ?? []}
              />
            </>
          ) : (
            <div className="border-sage-brand/30 bg-sage-brand-tint text-ink-500 rounded-xl border border-dashed p-8 text-center text-xs">
              {isBusy
                ? "Generating experiment designs..."
                : "No designs yet. Approve Hypotheses to generate designs."}
            </div>
          )
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {designs.map(d => {
                const isActive = d.id === (activeId ?? designs[0].id)
                const hyp = hypotheses.find(h => h.id === d.hypothesisId)
                const hypIdx = hyp
                  ? hypotheses.findIndex(h => h.id === hyp.id) + 1
                  : null
                const shortHyp = autoTitleFromHypothesis(hyp?.text)
                const tabLabel = hyp
                  ? `Hypothesis #${hypIdx}: ${shortHyp}`
                  : d.title
                return (
                  <button
                    key={d.id}
                    onClick={() => onSelect(d.id)}
                    title={hyp?.text ?? d.title}
                    className={
                      "flex max-w-full items-center gap-2 whitespace-normal break-words rounded-lg border px-3 py-1.5 text-left text-xs font-semibold transition-colors md:max-w-[360px] " +
                      (isActive
                        ? "border-sage-brand bg-sage-brand-active text-sage-brand"
                        : "border-ink-200 text-ink-500 hover:bg-ink-100")
                    }
                  >
                    <span className="min-w-0 flex-1">{tabLabel}</span>
                    {d.saved && (
                      <span
                        aria-label="Saved"
                        className="bg-sage-brand mt-0.5 inline-block size-1.5 shrink-0 rounded-full"
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {activeDesign && (
              <div className="grid grid-cols-[200px_minmax(0,1fr)] gap-6">
                <aside className="hidden md:block">
                  <DesignSectionIndex
                    sections={activeDesign.sections}
                    containerId={scrollContainerId}
                  />
                </aside>

                <Card className="rounded-2xl">
                  <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-ink-400 text-[10px] font-bold uppercase tracking-[0.13em]">
                        Experiment Design
                      </div>
                      <CardTitle
                        className="text-sage-brand mt-1 whitespace-normal break-words text-lg leading-tight"
                        title={activeDesign.title}
                      >
                        {activeDesign.title}
                      </CardTitle>
                      {activeHypothesis?.text && (
                        <div
                          className="text-ink-2 mt-2 border-l-2 border-[color:var(--rust)] pl-3 text-[13.5px] italic leading-relaxed"
                          title={activeHypothesis.text}
                        >
                          <span className="text-ink-3 mr-2 font-mono text-[11px] uppercase not-italic tracking-widest">
                            Hypothesis
                          </span>
                          {activeHypothesis.text}
                        </div>
                      )}
                    </div>
                    {/* Per-design "Check statistics" + "Make a plan" actions
                      were removed from this view. Both flows are now reached
                      via the dashboard "New design" dropdown using the
                      `check-stats` / `make-plan` modes against an existing
                      design. */}
                    {designVersions.length > 0 && onRestoreVersion && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 shrink-0 gap-1 text-xs"
                          >
                            <IconRefresh size={12} />v
                            {liveVersionNumber ??
                              designVersions.reduce(
                                (m, v) => Math.max(m, v.versionNumber),
                                0
                              ) + 1}{" "}
                            · history
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-72 p-2">
                          <div className="text-ink-400 mb-2 px-1 text-[10px] font-bold uppercase tracking-widest">
                            Prior versions
                          </div>
                          <ul className="space-y-1">
                            {designVersions.map(v => (
                              <li key={v.id}>
                                <button
                                  onClick={() => onViewVersion?.(v.id)}
                                  className="hover:bg-ink-100 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs"
                                >
                                  <span className="font-semibold">
                                    v{v.versionNumber}
                                  </span>
                                  <span className="text-ink-400">
                                    {new Date(v.createdAt).toLocaleDateString()}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                          <p className="text-ink-400 mt-2 px-1 text-[10px]">
                            Opens the version read-only. Numbering never
                            changes; use &ldquo;Make this the current
                            design&rdquo; to promote it.
                          </p>
                        </PopoverContent>
                      </Popover>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div
                      id={scrollContainerId}
                      className="max-h-[60vh] space-y-5 overflow-auto pr-2"
                    >
                      {activeDesign.sections.map((sec, i) => (
                        <DesignSectionContent
                          key={sec.heading}
                          section={sec}
                          index={i}
                          /* Editable AFTER saving too. Saving marks the design
                             approved, which used to strip every section's Edit
                             button and leave the chat as the only way to change
                             a word - the researcher asked for the same per-
                             section pencil the report has. Editing clears the
                             design's `saved` flag, so an edited design visibly
                             needs re-saving rather than quietly diverging. */
                          editable={canEdit && Boolean(onEditSection)}
                          onSave={
                            onEditSection
                              ? async next =>
                                  onEditSection(
                                    activeDesign.id,
                                    sec.heading,
                                    next
                                  )
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Asked once the researcher has actually read the design -
                    rating a document before scrolling it is noise. Collapses
                    permanently once answered so it never becomes wallpaper. */}
                {onRateOutput && !viewedVersion ? (
                  <div className="mt-3">{onRateOutput}</div>
                ) : null}
              </div>
            )}
          </>
        )}

        {/* The bottom "Next" moved to the top row as "Save now" - a long
            protocol buried it below the fold. Only Regenerate stays down here,
            next to the content it regenerates. */}
        {!isApproved && designs.length > 0 && (
          <div className="border-ink-100 mt-6 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isBusy}
              className="gap-1.5"
            >
              <IconRefresh size={14} /> Regenerate Designs
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Human label for a design version's provenance, used by the iteration rail. */
function originLabel(
  origin?: "original" | "simulation" | "lab-data" | "manual"
): string {
  switch (origin) {
    case "simulation":
      return "Simulated version"
    case "lab-data":
      return "From lab data"
    case "manual":
      return "Edited by hand"
    default:
      return "Original design"
  }
}

function OverviewTab(props: {
  title: string
  problemStatement: string
  domain: DesignDomain | ""
  phase: DesignPhase | ""
  objective: string
  constraintMaterial: string
  constraintTime: string
  constraintEquipment: string
  variablesKnown: string
  variablesUnknown: string
  papers: Paper[]
  hypotheses: Hypothesis[]
  designs: GeneratedDesign[]
  approvedPhases: PhaseKey[]
  activeDesign?: GeneratedDesign
  onGoToTab: (key: string) => void
}) {
  const {
    title,
    problemStatement,
    domain,
    phase,
    objective,
    constraintMaterial,
    constraintTime,
    constraintEquipment,
    variablesKnown,
    variablesUnknown,
    papers,
    hypotheses,
    designs,
    approvedPhases,
    activeDesign,
    onGoToTab
  } = props

  const domainLabel =
    DESIGN_DOMAIN_OPTIONS.find(option => option.value === domain)?.label ?? ""
  const phaseLabel =
    DESIGN_PHASE_OPTIONS.find(option => option.value === phase)?.label ?? ""
  const splitLines = (value: string) =>
    value
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
  const knownList = splitLines(variablesKnown)
  const unknownList = splitLines(variablesUnknown)
  const constraintRows = [
    { label: "Material", value: constraintMaterial },
    { label: "Time", value: constraintTime },
    { label: "Equipment", value: constraintEquipment }
  ].filter(row => row.value.trim().length > 0)

  const selectedPapers = papers.filter(p => p.selected)
  const selectedHypotheses = hypotheses.filter(h => h.selected)
  const scrollContainerId = "overview-detail-scroll"

  // Exportable view of this design for the "Create" actions (role-specific
  // PDFs). Reconstructed from the props the Overview already has.
  const exportableDesign = {
    name: title || activeDesign?.title || "design",
    content: {
      problem: { title, problemStatement, objective, domain, phase },
      papers,
      hypotheses,
      designs
    }
  }
  const hasDesign = designs.length > 0

  const sections: { id: string; heading: string }[] = [
    { id: "section-summary", heading: "Summary" },
    ...(hasDesign
      ? [{ id: "section-create", heading: "Create" }]
      : ([] as { id: string; heading: string }[])),
    { id: "section-problem", heading: "Problem & Goal" },
    { id: "section-variables", heading: "Variables & Constraints" },
    { id: "section-literature", heading: "Literature" },
    { id: "section-hypotheses", heading: "Hypotheses" },
    { id: "section-design", heading: "Experiment Design" }
  ]

  return (
    <div className="grid grid-cols-[200px_minmax(0,1fr)] gap-6">
      {/* Floating section index */}
      <aside className="hidden md:block">
        <OverviewIndex sections={sections} containerId={scrollContainerId} />
      </aside>

      {/* Right scrollable content */}
      <div
        id={scrollContainerId}
        className="max-h-[calc(100vh-220px)] space-y-5 overflow-auto pr-2"
      >
        {/* Summary */}
        <section
          id="section-summary"
          data-section-id="section-summary"
          className="scroll-mt-4"
        >
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <div className="text-ink-400 text-[10px] font-bold uppercase tracking-[0.13em]">
                Design Overview
              </div>
              <CardTitle className="text-ink-900 mt-1 text-xl">
                {title || "Untitled Design"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {PHASE_ORDER.filter(p => p !== "simulation").map(
                  pipelinePhase => {
                    const approved = approvedPhases.includes(pipelinePhase)
                    return (
                      <div
                        key={pipelinePhase}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold capitalize",
                          approved
                            ? "bg-[#DDE9DF] text-[#1F4A2C]"
                            : "bg-paper-2 text-ink-3"
                        )}
                      >
                        {approved && <IconCheck size={11} />}
                        {pipelinePhase}
                      </div>
                    )
                  }
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <OverviewStat
                  label="Papers reviewed"
                  value={`${selectedPapers.length}/${papers.length}`}
                />
                <OverviewStat
                  label="Hypotheses selected"
                  value={`${selectedHypotheses.length}/${hypotheses.length}`}
                />
                <OverviewStat label="Designs" value={`${designs.length}`} />
                <OverviewStat
                  label="Saved designs"
                  value={`${designs.filter(d => d.saved).length}`}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Create - role-specific downloadable PDFs built from this design */}
        {hasDesign && (
          <section
            id="section-create"
            data-section-id="section-create"
            className="scroll-mt-4"
          >
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <div className="text-ink-400 text-[10px] font-bold uppercase tracking-[0.13em]">
                  Create
                </div>
                <CardTitle className="text-ink-900 mt-1 text-xl">
                  Generate documents
                </CardTitle>
                <p className="text-ink-500 mt-1 text-sm">
                  Role-specific PDFs built from this design - each is
                  downloadable.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      icon: <IconFlask size={18} />,
                      title: "Bench execution guide",
                      desc: "Materials, calculations, preparation and method - the executable setup work, with a conditions overview.",
                      onClick: () => {
                        track("design_pdf_downloaded", { type: "bench_guide" })
                        downloadBenchExecutionGuide(exportableDesign)
                      }
                    },
                    {
                      icon: <IconBook size={18} />,
                      title: "Rationale & citations",
                      desc: "Literature, citations and the hypothesis rationale, with a conditions overview - defend your choices.",
                      onClick: () => {
                        track("design_pdf_downloaded", { type: "rationale" })
                        downloadRationaleCitations(exportableDesign)
                      }
                    },
                    {
                      icon: <IconClipboardText size={18} />,
                      title: "SOP",
                      desc: "A replicable protocol - short theory, then materials, methods, execution, safety and disposal.",
                      onClick: () => {
                        track("design_pdf_downloaded", { type: "sop" })
                        downloadSOP(exportableDesign)
                      }
                    }
                  ].map(a => (
                    <div
                      key={a.title}
                      className="border-ink-200 flex flex-col rounded-xl border bg-white p-4"
                    >
                      <div className="text-brick">{a.icon}</div>
                      <div className="text-ink-900 mt-2 text-[14px] font-semibold">
                        {a.title}
                      </div>
                      <p className="text-ink-500 mt-1 flex-1 text-[12.5px] leading-snug">
                        {a.desc}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={a.onClick}
                        className="mt-3 gap-1.5"
                      >
                        <IconDownload size={14} /> Download PDF
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Problem & Objective */}
        <section
          id="section-problem"
          data-section-id="section-problem"
          className="scroll-mt-4"
        >
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-teal-journey text-base font-bold uppercase tracking-widest">
                Problem & Objective
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGoToTab("problem")}
                className="text-ink-500 h-7 text-xs"
              >
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <OverviewField label="Domain">
                  {domainLabel || "\u2014"}
                </OverviewField>
                <OverviewField label="Phase">
                  {phaseLabel || "\u2014"}
                </OverviewField>
              </div>
              {(() => {
                const statement = (problemStatement || "").trim()
                const titleForCompare = (title || "").trim()
                const showStatement =
                  statement !== "" &&
                  statement.toLowerCase() !== titleForCompare.toLowerCase()
                return showStatement ? (
                  <OverviewField label="Problem Statement">
                    {statement}
                  </OverviewField>
                ) : null
              })()}
              <OverviewField label="Objective">
                {objective || "\u2014"}
              </OverviewField>
            </CardContent>
          </Card>
        </section>

        {/* Variables & Constraints - structured */}
        <section
          id="section-variables"
          data-section-id="section-variables"
          className="scroll-mt-4"
        >
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-teal-journey text-base font-bold uppercase tracking-widest">
                Variables & Constraints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-ink-400 mb-2 text-[10px] font-bold uppercase tracking-[0.13em]">
                    Known variables
                  </div>
                  {knownList.length > 0 ? (
                    <ul className="border-ink-200 divide-ink-100 divide-y overflow-hidden rounded-lg border bg-white text-sm">
                      {knownList.map((v, i) => (
                        <li
                          key={i}
                          className="text-ink-700 flex items-center gap-2 px-3 py-2"
                        >
                          <span className="text-ink-400 w-5 shrink-0 text-[11px]">
                            {i + 1}.
                          </span>
                          <span>{v}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-ink-400 text-xs">
                      No known variables specified.
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-ink-400 mb-2 text-[10px] font-bold uppercase tracking-[0.13em]">
                    Unknown variables
                  </div>
                  {unknownList.length > 0 ? (
                    <ul className="border-ink-200 divide-ink-100 divide-y overflow-hidden rounded-lg border bg-white text-sm">
                      {unknownList.map((v, i) => (
                        <li
                          key={i}
                          className="text-ink-700 flex items-center gap-2 px-3 py-2"
                        >
                          <span className="text-ink-400 w-5 shrink-0 text-[11px]">
                            {i + 1}.
                          </span>
                          <span>{v}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-ink-400 text-xs">
                      No unknown variables specified.
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <div className="text-ink-400 mb-2 text-[10px] font-bold uppercase tracking-[0.13em]">
                  Constraints
                </div>
                {constraintRows.length > 0 ? (
                  <ul className="border-ink-200 divide-ink-100 divide-y overflow-hidden rounded-lg border bg-white text-sm">
                    {constraintRows.map(row => (
                      <li
                        key={row.label}
                        className="text-ink-700 flex items-start gap-3 px-3 py-2"
                      >
                        <span className="text-ink-400 w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide">
                          {row.label}
                        </span>
                        <span>{row.value}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-ink-400 text-xs">
                    No constraints specified.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Literature table */}
        <section
          id="section-literature"
          data-section-id="section-literature"
          className="scroll-mt-4"
        >
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-orange-product text-base font-bold uppercase tracking-widest">
                Literature ({selectedPapers.length}/{papers.length} selected)
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGoToTab("literature")}
                className="text-ink-500 h-7 text-xs"
              >
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              {papers.length === 0 ? (
                <div className="text-ink-400 text-xs">No papers yet.</div>
              ) : (
                <div className="border-ink-200 overflow-hidden rounded-lg border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-ink-50 text-ink-500 text-[10px] font-bold uppercase tracking-wide">
                      <tr>
                        <th className="w-8 px-3 py-2">#</th>
                        <th className="px-3 py-2">Title</th>
                        <th className="w-20 px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-ink-100 divide-y bg-white">
                      {papers.map((p, i) => (
                        <tr key={p.id}>
                          <td className="text-ink-400 px-3 py-2 text-xs">
                            {i + 1}
                          </td>
                          <td className="text-ink-800 px-3 py-2">
                            <div className="font-medium">{p.title}</div>
                            {p.summary && (
                              <div className="text-ink-500 mt-0.5 line-clamp-2 text-xs">
                                {p.summary}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {p.selected ? (
                              <span className="text-orange-product bg-orange-product-tint rounded px-2 py-0.5 text-[10px] font-bold uppercase">
                                Selected
                              </span>
                            ) : (
                              <span className="text-ink-400 text-[10px]">
                                -
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Hypotheses */}
        <section
          id="section-hypotheses"
          data-section-id="section-hypotheses"
          className="scroll-mt-4"
        >
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-purple-persona text-base font-bold uppercase tracking-widest">
                Hypotheses ({selectedHypotheses.length}/{hypotheses.length}{" "}
                selected)
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGoToTab("hypotheses")}
                className="text-ink-500 h-7 text-xs"
              >
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              {hypotheses.length === 0 ? (
                <div className="text-ink-400 text-xs">No hypotheses yet.</div>
              ) : (
                <ol className="space-y-2">
                  {hypotheses.map((h, i) => (
                    <li
                      key={h.id}
                      className={cn(
                        "border-ink-200 flex items-start gap-3 rounded-lg border bg-white p-3 text-sm",
                        h.selected &&
                          "border-purple-persona bg-purple-persona-tint"
                      )}
                    >
                      <span className="text-ink-400 w-5 shrink-0 text-xs">
                        {i + 1}.
                      </span>
                      <span className="text-ink-800">{h.text}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Experiment Design sections */}
        <section
          id="section-design"
          data-section-id="section-design"
          className="scroll-mt-4"
        >
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sage-brand text-base font-bold uppercase tracking-widest">
                Experiment Design
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGoToTab("design")}
                className="text-ink-500 h-7 text-xs"
              >
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              {activeDesign ? (
                <DesignCompactCard
                  design={activeDesign}
                  designCount={designs.length}
                  onOpen={() => onGoToTab("design")}
                />
              ) : (
                <div className="text-ink-400 text-xs">
                  No design generated yet.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

function DesignCompactCard(props: {
  design: GeneratedDesign
  designCount: number
  onOpen: () => void
}) {
  const { design, designCount, onOpen } = props
  const sectionCount = design.sections.length
  const summarySection =
    design.sections.find(s => /summary|overview/i.test(s.heading)) ??
    design.sections[0]
  const preview = summarySection
    ? summarySection.body.trim().replace(/\s+/g, " ").slice(0, 280)
    : ""
  const truncated = summarySection
    ? summarySection.body.trim().length > 280
    : false

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-ink-400 text-[10px] font-bold uppercase tracking-[0.13em]">
            Active design {designCount > 1 ? `(1 of ${designCount})` : ""}
          </div>
          <div
            className="text-ink-900 mt-1 whitespace-normal break-words text-sm font-semibold leading-tight"
            title={design.title}
          >
            {design.title}
          </div>
        </div>
        {design.saved && (
          <span className="bg-sage-brand-tint text-sage-brand shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            Saved
          </span>
        )}
      </div>

      {preview && (
        <p className="text-ink-600 text-xs leading-relaxed">
          {preview}
          {truncated ? "…" : ""}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="border-ink-200 rounded-md border bg-white px-2.5 py-1.5">
          <div className="text-ink-400 text-[10px] font-bold uppercase tracking-wide">
            Sections
          </div>
          <div className="text-ink-900 mt-0.5 text-sm font-semibold">
            {sectionCount}
          </div>
        </div>
        <div className="border-ink-200 rounded-md border bg-white px-2.5 py-1.5">
          <div className="text-ink-400 text-[10px] font-bold uppercase tracking-wide">
            Hypothesis ref
          </div>
          <div className="text-ink-900 mt-0.5 truncate text-sm font-semibold">
            {design.hypothesisId.slice(0, 10)}…
          </div>
        </div>
      </div>

      {design.sections.length > 0 && (
        <div>
          <div className="text-ink-400 mb-1.5 text-[10px] font-bold uppercase tracking-wide">
            Sections included
          </div>
          <div className="flex flex-wrap gap-1.5">
            {design.sections.map(sec => (
              <span
                key={sec.heading}
                className="border-ink-200 bg-ink-50 text-ink-600 rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
              >
                {sec.heading}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpen}
          className="text-ink-700 h-8 text-xs"
        >
          Open full design
        </Button>
      </div>
    </div>
  )
}

function OverviewIndex(props: {
  sections: { id: string; heading: string }[]
  containerId: string
}) {
  const [activeId, setActiveId] = useState(props.sections[0]?.id ?? "")

  useEffect(() => {
    const container = document.getElementById(props.containerId)
    if (!container) return
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) {
          setActiveId(visible[0].target.getAttribute("data-section-id") ?? "")
        }
      },
      {
        root: container,
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1]
      }
    )
    props.sections.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [props.containerId, props.sections])

  const handleClick = (id: string) => {
    const el = document.getElementById(id)
    const container = document.getElementById(props.containerId)
    if (!el || !container) return
    const top = el.offsetTop - container.offsetTop - 8
    container.scrollTo({ top, behavior: "smooth" })
  }

  return (
    <nav className="sticky top-0 space-y-1">
      <div className="text-ink-400 mb-3 text-[10px] font-bold uppercase tracking-[0.13em]">
        On this page
      </div>
      <ul className="space-y-1">
        {props.sections.map(sec => {
          const isActive = sec.id === activeId
          return (
            <li key={sec.id}>
              <button
                type="button"
                onClick={() => handleClick(sec.id)}
                className={cn(
                  "w-full border-l-2 py-1.5 pl-3 pr-2 text-left text-xs leading-snug transition-colors",
                  isActive
                    ? "border-teal-journey text-teal-journey font-semibold"
                    : "border-ink-200 text-ink-500 hover:border-teal-journey/60 hover:text-ink-900"
                )}
              >
                {sec.heading}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function OverviewField(props: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-ink-400 text-[10px] font-bold uppercase tracking-[0.13em]">
        {props.label}
      </div>
      <div className="text-ink-700 mt-1 whitespace-pre-wrap">
        {props.children}
      </div>
    </div>
  )
}

function OverviewStat(props: { label: string; value: string }) {
  return (
    <div className="border-ink-200 rounded-xl border bg-white p-3">
      <div className="text-ink-400 text-[10px] font-bold uppercase tracking-wide">
        {props.label}
      </div>
      <div className="text-ink-900 mt-1 text-xl font-bold">{props.value}</div>
    </div>
  )
}
