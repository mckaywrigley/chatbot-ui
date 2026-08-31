"use client"

import { useContext, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AccentTabs, type TabStatus } from "@/components/canvas/accent-tabs"
import { ReportClarifyStep } from "@/components/reports/report-clarify-step"
// ChatbotUIContext was used for the ELN profile lookup - removed in
// favour of pure prop drilling now that ELN export is gone.
import { useToast } from "@/app/hooks/use-toast"
// ELN export removed for the B2C launch (#21). The lib/eln/* clients +
// modals are kept in the repo so we can flip the surface back on for an
// enterprise SKU without rewriting the integration.
import {
  createReport,
  getReportById,
  updateReport
} from "@/db/reports-firestore"
import { Tables } from "@/supabase/types"
import { toast as sonnerToast } from "sonner"
import {
  IconArrowLeft,
  IconClock,
  IconFileText,
  IconLayoutGrid,
  IconUpload
} from "@tabler/icons-react"
import { FlaskConical, FileText, Save as SaveIcon } from "lucide-react"
import {
  OverviewTab,
  type ReportTab
} from "@/components/reports/tabs/overview-tab"
import { InputsTab } from "@/components/reports/tabs/inputs-tab"
import { ReportTab as ReportTabView } from "@/components/reports/tabs/report-tab"
import { ReportPreviewModal } from "@/components/reports/report-preview-modal"
import { ReportGeneratingView } from "@/components/reports/report-generating-view"
import {
  ReportChart,
  type ChartType
} from "@/app/[locale]/[workspaceid]/report/components/report-chart"
import { ELNExportModal } from "@/components/eln/eln-export-modal"
import { ELNConnectModal } from "@/components/eln/eln-connect-modal"
import { ELNConnection } from "@/types/eln"
import { getELNConnections } from "@/db/eln-connections"
import { ChatbotUIContext } from "@/context/context"
import { exportReportToPDF } from "@/lib/report/export"
import { getTemplate, DEFAULT_TEMPLATE_ID } from "@/lib/report/templates"
import { createReportTemplate } from "@/db/report-templates-firestore"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { track } from "@/lib/analytics"

type Draft = Record<string, any>

type GenerationStatus = "idle" | "generating" | "ready" | "error"

function getGenerationStatus(report: any): GenerationStatus {
  const raw = report?.generation_status
  if (raw === "generating") return "generating"
  if (raw === "error") return "error"
  if (report?.report_draft) return "ready"
  if (raw === "ready") return "ready"
  return "idle"
}

function draftToText(draft: Draft | null): string {
  if (!draft) return ""
  return Object.entries(draft)
    .filter(([key, value]) => value && key !== "_chartData")
    .map(([key, value]) => {
      const title = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, s => s.toUpperCase())
      const text =
        typeof value === "string" ? value : JSON.stringify(value, null, 2)
      return `## ${title}\n\n${text}`
    })
    .join("\n\n")
}

export interface ReportEditorProps {
  reportId: string
  workspaceId: string
  locale: string
  /**
   * "page" keeps the standalone route's chrome (Back button, full-height
   * shell). "modal" drops the Back button and lets the host dialog own the
   * outer frame, so the same editor renders inside the design Export modal
   * with every editing affordance intact.
   */
  mode?: "page" | "modal"
  /** Called after a successful save - the modal host closes and refreshes. */
  onSaved?: (report: any) => void
  /** Called when the editor wants to dismiss itself (modal host closes). */
  onRequestClose?: () => void
}

export function ReportEditor({
  reportId,
  workspaceId,
  locale,
  mode = "page",
  onSaved,
  onRequestClose
}: ReportEditorProps) {
  const router = useRouter()
  const { toast } = useToast()
  const isModal = mode === "modal"

  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ReportTab>("overview")

  const [objective, setObjective] = useState("")
  const [protocolFiles, setProtocolFiles] = useState<Tables<"files">[]>([])
  const [paperFiles, setPaperFiles] = useState<Tables<"files">[]>([])
  const [dataFiles, setDataFilesState] = useState<Tables<"files">[]>([])
  const [templateId, setTemplateId] = useState<string>(DEFAULT_TEMPLATE_ID)
  // Optional scientist-added sections. Persisted on the Firestore
  // report row as `custom_sections`. Each entry feeds into the report
  // generation prompt + the saved-template export.
  const [customSections, setCustomSections] = useState<
    Array<{ id: string; name: string; description: string }>
  >([])

  const [isGenerating, setIsGenerating] = useState(false)
  // ELN export restored: Upload to ELN replaces the old PPT download.
  const { profile } = useContext(ChatbotUIContext)
  const [elnConnections, setElnConnections] = useState<ELNConnection[]>([])
  const [showELNExportModal, setShowELNExportModal] = useState(false)
  const [showELNConnectModal, setShowELNConnectModal] = useState(false)
  const [loadingConnections, setLoadingConnections] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!profile?.user_id) return
      setLoadingConnections(true)
      try {
        setElnConnections(await getELNConnections(profile.user_id))
      } catch (error) {
        console.error("Failed to load ELN connections:", error)
      } finally {
        setLoadingConnections(false)
      }
    }
    void load()
  }, [profile?.user_id])

  const [creatingRevision, setCreatingRevision] = useState(false)

  /**
   * Clone a locked (ELN-filed) report into a fresh, editable one. The filed
   * copy is left exactly as it was so it keeps matching the ELN entry; the
   * revision carries a link back to it and uploads as its own new entry.
   */
  const handleCreateRevision = async () => {
    if (!report || creatingRevision) return
    setCreatingRevision(true)
    try {
      const revision = await createReport(
        {
          user_id: report.user_id,
          name: `${report.name || "Report"} (revised)`,
          description: report.description ?? null,
          folder_id: report.folder_id ?? null,
          sharing: report.sharing ?? "private",
          source_design_id: report.source_design_id ?? null,
          source_design_name: report.source_design_name ?? null,
          source_design_version: report.source_design_version ?? null,
          design_context: report.design_context ?? null,
          template_id: report.template_id ?? null,
          report_draft: report.report_draft ?? null,
          chart_image: report.chart_image ?? null,
          chart_data: report.chart_data ?? null,
          custom_sections: report.custom_sections ?? null,
          generation_status: "idle",
          is_saved: false,
          revision_of: reportId
        } as any,
        workspaceId,
        { protocol: [], papers: [], dataFiles: [] },
        []
      )
      sonnerToast.success("Revised copy created")
      if (onSaved) onSaved(revision)
      else router.push(`/${locale}/${workspaceId}/reports/${revision.id}`)
    } catch (e: any) {
      sonnerToast.error(
        `Couldn't create a revision: ${e?.message ?? "unknown error"}`
      )
    } finally {
      setCreatingRevision(false)
    }
  }

  const handleELNExport = () => {
    if (elnConnections.length === 0) setShowELNConnectModal(true)
    else setShowELNExportModal(true)
  }
  const [clarifyOpen, setClarifyOpen] = useState(false)
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null)
  const [regeneratingChart, setRegeneratingChart] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showViz, setShowViz] = useState(false)
  const [vizSeries, setVizSeries] = useState(0)
  const [isSavingNow, setIsSavingNow] = useState(false)
  const sectionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const objectiveSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Reports opened in a "generating" state (created by the Generate-report
  // modal) resume generation here. Tracked per-report so it fires only once.
  const autoGenRef = useRef<Set<string>>(new Set())

  // Save-as-template + add-section dialogs. Both share the simple
  // {name, description} payload shape - we render them as separate
  // <Dialog>s for clarity.
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)

  const [addSectionDialogOpen, setAddSectionDialogOpen] = useState(false)
  const [newSectionName, setNewSectionName] = useState("")
  const [newSectionDescription, setNewSectionDescription] = useState("")

  useEffect(() => {
    if (reportId) void fetchReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId])

  // ELN connection loader removed (#21) - "Export to ELN" is hidden
  // for the B2C launch. The connections code stays under db/eln-* so we
  // can flip the surface back on without re-implementing it.

  // Poll while generation is running so sublabels / tab content update.
  useEffect(() => {
    if (report?.generation_status !== "generating") return
    const interval = setInterval(() => {
      void fetchReport({ silent: true })
    }, 3000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.generation_status])

  const fetchReport = async ({ silent }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true)
      const data = await getReportById(reportId)
      if (!data) {
        toast({
          title: "Not found",
          description: "Report not found.",
          variant: "destructive"
        })
        router.push(`/${locale}/${workspaceId}/reports`)
        return
      }
      setReport(data)
      setObjective(data.description ?? "")
      setProtocolFiles(data.files?.protocol ?? [])
      setPaperFiles(data.files?.papers ?? [])
      setDataFilesState(data.files?.dataFiles ?? [])
      setTemplateId(data.template_id ?? DEFAULT_TEMPLATE_ID)
      // Custom sections are persisted as an array of {id, name,
      // description} on the report doc. Empty array when missing so
      // the inputs tab renders a clean "+ Add section" affordance.
      const cs = Array.isArray(data.custom_sections) ? data.custom_sections : []
      setCustomSections(
        cs
          .filter((s: any) => s && typeof s === "object")
          .map((s: any, i: number) => ({
            id: typeof s.id === "string" ? s.id : `cs-${i}`,
            name: typeof s.name === "string" ? s.name : "",
            description: typeof s.description === "string" ? s.description : ""
          }))
      )
    } catch (error) {
      console.error("Error fetching report:", error)
      toast({
        title: "Error",
        description: "Failed to load report.",
        variant: "destructive"
      })
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const generationStatus = getGenerationStatus(report)
  const draft: Draft | null =
    report?.report_draft && typeof report.report_draft === "object"
      ? (report.report_draft as Draft)
      : null
  const hasDraft = !!draft
  /** Draft is being written and there's nothing to show yet. */
  const busyGenerating =
    !hasDraft && (isGenerating || generationStatus === "generating")
  // A report becomes "saved" once the user explicitly saves it as a
  // template (the Save-as-Template dialog flips this). Drives the
  // ReportTab + ReportSection lockdown so locked reports can't be
  // re-edited.
  const isReportSaved = !!report?.is_saved

  // Working copy of the report title so the field stays responsive while
  // typing; committed on blur/Enter.
  const [titleDraft, setTitleDraft] = useState("")
  useEffect(() => {
    setTitleDraft(report?.name ?? "")
  }, [report?.name])

  const commitTitle = async () => {
    const next = titleDraft.trim()
    const current = (report?.name ?? "").trim()
    if (!next || next === current) {
      setTitleDraft(current)
      return
    }
    setReport((prev: any) => ({ ...prev, name: next }))
    try {
      await updateReport(reportId, { name: next })
    } catch (err: any) {
      setReport((prev: any) => ({ ...prev, name: current }))
      setTitleDraft(current)
      sonnerToast.error(`Couldn't rename: ${err?.message ?? "unknown error"}`)
    }
  }
  /**
   * Uploaded to an ELN = LOCKED. An ELN entry is a quasi-regulatory record; if
   * our copy could still be edited it would silently drift from what the lab
   * actually filed. Changes go through "Create revised version" instead, which
   * clones this report and uploads as a NEW entry, leaving an audit trail.
   */
  const elnUploadedAt: string | null = report?.eln_uploaded_at ?? null
  const isELNLocked = !!elnUploadedAt
  const fileCount = protocolFiles.length + paperFiles.length + dataFiles.length

  const handleObjectiveChange = (value: string) => {
    setObjective(value)
    if (objectiveSaveTimer.current) clearTimeout(objectiveSaveTimer.current)
    objectiveSaveTimer.current = setTimeout(() => {
      updateReport(reportId, { description: value }).catch(err => {
        console.warn("Failed to save objective:", err)
      })
    }, 600)
  }

  const handleTemplateChange = (id: string) => {
    setTemplateId(id)
    setReport((prev: any) => ({ ...prev, template_id: id }))
    updateReport(reportId, { template_id: id }).catch(err => {
      console.warn("Failed to save template:", err)
    })
  }

  const persistFiles = (next: {
    protocol: Tables<"files">[]
    papers: Tables<"files">[]
    dataFiles: Tables<"files">[]
  }) => {
    updateReport(reportId, { files: next }).catch(err => {
      console.warn("Failed to save files:", err)
    })
  }

  const handleToggleFile = (
    type: "protocol" | "papers" | "dataFiles",
    item: Tables<"files">
  ) => {
    if (type === "protocol") {
      const next = [item]
      setProtocolFiles(next)
      persistFiles({ protocol: next, papers: paperFiles, dataFiles })
      return
    }
    const current = type === "papers" ? paperFiles : dataFiles
    const setter = type === "papers" ? setPaperFiles : setDataFilesState
    const exists = current.some(f => f.id === item.id)
    const next = exists
      ? current.filter(f => f.id !== item.id)
      : [...current, item]
    setter(next)
    persistFiles({
      protocol: protocolFiles,
      papers: type === "papers" ? next : paperFiles,
      dataFiles: type === "dataFiles" ? next : dataFiles
    })
  }

  /**
   * Persist custom sections on every change with a tiny debounce. Same
   * 800ms pattern as section-content saves so a typing burst maps to
   * one Firestore write.
   */
  const customSectionsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const handleCustomSectionsChange = (
    next: Array<{ id: string; name: string; description: string }>
  ) => {
    setCustomSections(next)
    if (customSectionsSaveTimer.current)
      clearTimeout(customSectionsSaveTimer.current)
    customSectionsSaveTimer.current = setTimeout(() => {
      updateReport(reportId, { custom_sections: next }).catch(err => {
        console.warn("[reports] persist custom_sections failed:", err)
      })
    }, 800)
  }

  // Open the pre-generation Refine step (clarifying questions) before running.
  const handleGenerate = () => {
    const hasProtocolContext =
      protocolFiles.length > 0 || !!report?.design_context
    if (!objective.trim() || !hasProtocolContext) return
    track("report_generation_started")
    setClarifyOpen(true)
  }

  const runGeneration = async (reportSpec?: string) => {
    // Design-sourced reports use the design itself as the protocol, so a
    // protocol *file* isn't required when we have a design_context snapshot.
    const hasProtocolContext =
      protocolFiles.length > 0 || !!report?.design_context
    if (!objective.trim() || !hasProtocolContext) return
    if (reportSpec) track("report_clarify_completed")
    setIsGenerating(true)
    const toastId = `report-generate-${reportId}`
    sonnerToast.loading("Generating report draft…", {
      id: toastId,
      duration: Infinity
    })
    try {
      await updateReport(reportId, {
        description: objective,
        template_id: templateId,
        files: {
          protocol: protocolFiles,
          papers: paperFiles,
          dataFiles
        },
        generation_status: "generating",
        generation_started_at: new Date().toISOString(),
        generation_error: null
      })
      setReport((prev: any) => ({
        ...prev,
        description: objective,
        generation_status: "generating"
      }))

      const response = await fetch("/api/report/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentObjective: objective,
          protocol: protocolFiles.map(f => f.id),
          papers: paperFiles.map(f => f.id),
          dataFiles: dataFiles.map(f => f.id),
          designContext: report?.design_context ?? undefined,
          reportSpec: reportSpec || undefined
        })
      })
      if (!response.ok) {
        throw new Error(`Generation failed (${response.status})`)
      }
      const data = await response.json()
      if (!data?.reportOutline || !data?.reportDraft) {
        throw new Error("Generation returned no output")
      }

      await updateReport(reportId, {
        report_outline: data.reportOutline,
        report_draft: data.reportDraft,
        chart_image: data.chartImage || null,
        chart_data: data.chartData || null,
        generation_status: "ready",
        generation_completed_at: new Date().toISOString(),
        generation_error: null
      })
      await fetchReport({ silent: true })

      sonnerToast.success("Report draft generated.", {
        id: toastId,
        duration: 5000
      })
      setActiveTab("report")
    } catch (error: any) {
      console.error("Report generation failed:", error)
      const message = error?.message || "Unknown error"
      await updateReport(reportId, {
        generation_status: "error",
        generation_error: message,
        generation_completed_at: new Date().toISOString()
      }).catch(() => {})
      await fetchReport({ silent: true })
      sonnerToast.error(`Report generation failed: ${message}`, {
        id: toastId,
        duration: 7000
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Resume generation for a report the modal created in a "generating"
  // state. Fires once per report, once the inputs have loaded.
  useEffect(() => {
    if (!report || autoGenRef.current.has(report.id)) return
    if (report.generation_status !== "generating" || hasDraft || isGenerating)
      return
    const hasInputs =
      dataFiles.length > 0 &&
      (protocolFiles.length > 0 || !!report.design_context)
    if (!objective.trim() || !hasInputs) return
    autoGenRef.current.add(report.id)
    void runGeneration()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    report?.id,
    report?.generation_status,
    hasDraft,
    isGenerating,
    objective,
    dataFiles.length,
    protocolFiles.length
  ])

  const handleRegenerateSection = async (
    sectionKey: string,
    feedback: string
  ) => {
    if (!draft) return
    setRegeneratingKey(sectionKey)
    try {
      const response = await fetch("/api/report/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionName: sectionKey,
          currentContent: draft[sectionKey] ?? "",
          userFeedback: feedback
        })
      })
      if (!response.ok) {
        const detail = await response
          .json()
          .catch(() => ({ error: response.statusText }))
        throw new Error(
          detail.error || `Regeneration failed (${response.status})`
        )
      }
      const data = await response.json()
      const nextDraft = {
        ...draft,
        [sectionKey]: data.regeneratedContent ?? draft[sectionKey]
      }
      await updateReport(reportId, { report_draft: nextDraft })
      setReport((prev: any) => ({ ...prev, report_draft: nextDraft }))
      sonnerToast.success("Section regenerated.")
    } catch (error: any) {
      console.error("Section regenerate failed:", error)
      sonnerToast.error(
        `Regeneration failed: ${error?.message || "Unknown error"}`
      )
    } finally {
      setRegeneratingKey(null)
    }
  }

  /**
   * Explicit "Save now" - flushes any pending autosave timer and writes the
   * latest draft + objective immediately. Useful before navigating away or
   * exporting, when the 800ms debounce hasn't fired yet.
   */
  const handleSaveNow = async () => {
    if (isSavingNow) return
    setIsSavingNow(true)
    if (sectionSaveTimer.current) {
      clearTimeout(sectionSaveTimer.current)
      sectionSaveTimer.current = null
    }
    if (objectiveSaveTimer.current) {
      clearTimeout(objectiveSaveTimer.current)
      objectiveSaveTimer.current = null
    }
    try {
      const saved = await updateReport(reportId, {
        report_draft: report?.report_draft ?? null,
        description: objective,
        // Mark it complete so it shows as a finished asset in the design's
        // Export rail rather than an in-progress draft.
        is_saved: true
      })
      setReport((prev: any) => ({ ...prev, is_saved: true }))
      sonnerToast.success("Saved")
      // In modal mode the host closes and lists this report as an asset.
      onSaved?.(saved ?? { ...report, id: reportId, is_saved: true })
    } catch (error: any) {
      console.error("Save failed:", error)
      sonnerToast.error(`Save failed: ${error?.message ?? "Unknown error"}`)
    } finally {
      setIsSavingNow(false)
    }
  }

  const handleSectionContentChange = (sectionKey: string, value: string) => {
    const baseDraft = draft ?? {}
    const nextDraft = { ...baseDraft, [sectionKey]: value }
    setReport((prev: any) => ({ ...prev, report_draft: nextDraft }))
    if (sectionSaveTimer.current) clearTimeout(sectionSaveTimer.current)
    sectionSaveTimer.current = setTimeout(() => {
      updateReport(reportId, { report_draft: nextDraft }).catch(err => {
        console.warn("Failed to save section edit:", err)
      })
    }, 600)
  }

  /**
   * Optimistic chart-type toggle - flips `chart_data.chartType` locally
   * so the recharts surface re-renders immediately, then persists. The
   * static `chart_image` (used for PDF/PPT export) is left as-is until
   * the user explicitly hits "Edit chart with AI", which regenerates
   * the PNG to match.
   */
  const handleChartTypeChange = (chartType: "bar" | "line" | "pie") => {
    const current = report?.chart_data
    if (!current) return
    const nextChartData = { ...current, chartType }
    setReport((prev: any) => ({ ...prev, chart_data: nextChartData }))
    updateReport(reportId, { chart_data: nextChartData }).catch(err => {
      console.warn("Failed to persist chart type:", err)
    })
  }

  /**
   * Which datasets from the uploaded file belong in the report. Same optimistic
   * write as the type toggle: local first so the charts appear immediately,
   * then persisted, so the choice survives a reload and travels with the report
   * into export and the ELN.
   */
  const handleSelectedSeriesChange = (indices: number[]) => {
    const current = report?.chart_data
    if (!current) return
    const nextChartData = { ...current, selectedSeries: indices }
    setReport((prev: any) => ({ ...prev, chart_data: nextChartData }))
    updateReport(reportId, { chart_data: nextChartData }).catch(err => {
      console.warn("Failed to persist dataset selection:", err)
    })
  }

  const handleChartRegenerate = async (feedback: string) => {
    const trimmed = feedback.trim()
    if (!trimmed) return
    setRegeneratingChart(true)
    try {
      const response = await fetch("/api/report/regenerate-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentChartData: report?.chart_data ?? null,
          userFeedback: trimmed
        })
      })
      if (!response.ok) {
        throw new Error(`Chart regeneration failed (${response.status})`)
      }
      const data = await response.json()
      await updateReport(reportId, {
        chart_image: data.chartImage || null,
        chart_data: data.chartData || null
      })
      setReport((prev: any) => ({
        ...prev,
        chart_image: data.chartImage || null,
        chart_data: data.chartData || null
      }))
      sonnerToast.success("Chart regenerated.")
    } catch (error: any) {
      console.error("Chart regenerate failed:", error)
      sonnerToast.error(
        `Chart regeneration failed: ${error?.message || "Unknown error"}`
      )
    } finally {
      setRegeneratingChart(false)
    }
  }

  // ELN export handlers removed (#21).
  const handleOpenAddSection = () => {
    setNewSectionName("")
    setNewSectionDescription("")
    setAddSectionDialogOpen(true)
  }

  const handleConfirmAddSection = () => {
    const name = newSectionName.trim()
    if (!name) {
      sonnerToast.error("Section name is required.")
      return
    }
    handleCustomSectionsChange([
      ...customSections,
      {
        id: `cs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        description: newSectionDescription.trim()
      }
    ])
    setAddSectionDialogOpen(false)
  }

  const handleOpenSaveAsTemplate = () => {
    setTemplateName(report?.name ?? "")
    setTemplateDescription(report?.description ?? "")
    setTemplateDialogOpen(true)
  }

  const handleConfirmSaveAsTemplate = async () => {
    const trimmed = templateName.trim()
    if (!trimmed) {
      sonnerToast.error("Template name is required.")
      return
    }
    setSavingTemplate(true)
    try {
      // Combine the active template's built-in sections with the
      // user's custom additions so the persisted template captures
      // both the structure and the scientist's bespoke pieces.
      const tpl = getTemplate(templateId)
      const sections = [
        ...tpl.sections.map(s => ({
          key: s.key,
          title: s.title,
          group: s.group
        })),
        ...customSections.map(cs => ({
          key: cs.id,
          title: cs.name || "Untitled section",
          description: cs.description,
          group: "Custom",
          custom: true
        }))
      ]
      await createReportTemplate(workspaceId, {
        name: trimmed,
        description: templateDescription.trim(),
        sections,
        chart_type:
          ((report?.chart_data as Record<string, unknown> | undefined)
            ?.chartType as "bar" | "line" | "pie" | undefined) ?? null
      })
      // Flip the report into the "saved" state so the chrome locks.
      await updateReport(reportId, { is_saved: true })
      setReport((prev: any) => ({ ...prev, is_saved: true }))
      sonnerToast.success("Saved as template")
      setTemplateDialogOpen(false)
    } catch (e: any) {
      sonnerToast.error(
        `Couldn't save template: ${e?.message ?? "unknown error"}`
      )
    } finally {
      setSavingTemplate(false)
    }
  }

  // Every editing affordance keys off this, not is_saved alone.
  //
  // Saving a report is a checkpoint, not a freeze. Treating is_saved as a lock
  // meant reopening a report with the edit icon produced a read-only preview -
  // no title field, no per-section pencil, nothing to change. Only an ELN
  // upload genuinely locks the record, because at that point it has left the
  // building and must match what was filed.
  const editsLocked = isELNLocked

  const draftText = draftToText(draft)
  // `draftText` is still computed for parity with the old surface;
  // unused now that ELN export is gone, but cheap to keep so we don't
  // ship a partial rip while the lib/eln integration is still around.
  void draftText

  const template = getTemplate(templateId ?? DEFAULT_TEMPLATE_ID)

  const handleDownloadPDF = async () => {
    if (!report || !draft) return
    try {
      await exportReportToPDF({
        title: report.name || "Report",
        draft,
        sections: template.sections,
        chartImage: report?.chart_image ?? null
      })
    } catch (err: any) {
      console.error("PDF export failed:", err)
      toast({
        title: "Export failed",
        description: err?.message || "Could not generate PDF.",
        variant: "destructive"
      })
    }
  }

  const getTimeAgo = (date: string): string => {
    if (!date) return ""
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return new Date(date).toLocaleDateString()
  }

  const tabDefs = useMemo(() => {
    const sublabelForContent = (keys: string[]) => {
      if (generationStatus === "generating") return "Generating…"
      if (!draft) return "Pending"
      return keys.some(k => draft[k]) ? "Ready" : "Empty"
    }

    return [
      {
        key: "overview",
        label: "Overview",
        sublabel: report?.name || "Untitled report",
        accent: "teal-journey" as const,
        icon: <IconLayoutGrid size={20} />,
        // Locked while the draft is being written: switching tabs mid-run just
        // showed the same progress view under a different heading.
        disabled: busyGenerating,
        status: undefined as TabStatus | undefined,
        primary: true
      },
      {
        key: "inputs",
        label: "Inputs",
        sublabel: fileCount
          ? `${fileCount} file${fileCount === 1 ? "" : "s"}`
          : "Add inputs",
        accent: "neutral" as const,
        icon: <IconUpload size={18} />,
        disabled: busyGenerating,
        status: (protocolFiles.length > 0 && objective.trim()
          ? "review"
          : "active") as TabStatus
      },
      {
        key: "report",
        label: "Report",
        sublabel: sublabelForContent([
          "aim",
          "introduction",
          "principle",
          "material",
          "preparation",
          "procedure",
          "setup",
          "dataAnalysis",
          "results",
          "discussion",
          "conclusion",
          "nextSteps"
        ]),
        accent: "teal-journey" as const,
        icon: <IconFileText size={18} />,
        disabled: busyGenerating,
        status: (draft &&
        (draft.aim ||
          draft.introduction ||
          draft.principle ||
          draft.material ||
          draft.preparation ||
          draft.procedure ||
          draft.setup ||
          draft.dataAnalysis ||
          draft.results ||
          draft.discussion ||
          draft.conclusion ||
          draft.nextSteps ||
          report?.chart_image)
          ? "review"
          : "active") as TabStatus
      }
    ]
  }, [
    report,
    draft,
    fileCount,
    generationStatus,
    busyGenerating,
    protocolFiles.length,
    objective
  ])

  if (loading) {
    return (
      <div className="bg-ink-50 flex h-full items-center justify-center">
        <div className="border-ink-200 border-t-teal-journey size-8 animate-spin rounded-full border-2" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="bg-ink-50 flex h-full items-center justify-center">
        <p className="text-ink-400">Report not found</p>
      </div>
    )
  }

  // Pre-generation Refine: full-screen clarifying questions before we run.
  if (clarifyOpen) {
    return (
      <ReportClarifyStep
        onComplete={spec => {
          setClarifyOpen(false)
          void runGeneration(spec)
        }}
        onCancel={() => setClarifyOpen(false)}
      />
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        isModal ? "h-full min-h-0" : "bg-ink-50 h-full"
      )}
    >
      {/* Header */}
      <div className="border-ink-200 shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isModal && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onRequestClose
                    ? onRequestClose()
                    : router.push(`/${locale}/${workspaceId}/reports`)
                }
                className="text-ink-500 gap-1"
              >
                <IconArrowLeft size={16} />
                Back
              </Button>
            )}
            <div>
              <div className="text-ink-400 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em]">
                <span>Report</span>
                {generationStatus === "generating" && (
                  <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 normal-case tracking-normal text-amber-700">
                    Generating…
                  </span>
                )}
              </div>
              {/* Editable in place. The title was a plain heading, so there
                  was no way to rename a report after generation - the name
                  the generator picked was the name you kept. Blur or Enter
                  commits; Escape reverts. Locked only once filed to an ELN. */}
              {editsLocked ? (
                <h1 className="text-ink-900 text-xl font-bold">
                  {report.name || "Untitled Report"}
                </h1>
              ) : (
                <input
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={() => void commitTitle()}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      e.currentTarget.blur()
                    }
                    if (e.key === "Escape") {
                      setTitleDraft(report.name || "")
                      e.currentTarget.blur()
                    }
                  }}
                  placeholder="Untitled Report"
                  aria-label="Report title"
                  className="text-ink-900 hover:border-ink-200 focus:border-ink-400 -mx-1.5 w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 text-xl font-bold outline-none transition-colors"
                />
              )}
              <div className="text-ink-500 mt-1 flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <IconClock size={14} />
                  Created {getTimeAgo(report.created_at)}
                </span>
                {report.updated_at &&
                  report.updated_at !== report.created_at && (
                    <span>Updated {getTimeAgo(report.updated_at)}</span>
                  )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasDraft && (
              <>
                {/* Available for as long as the report can be edited. It used
                    to disappear the moment the report was first saved, which
                    left later edits with no way to be committed. Only an ELN
                    upload takes it away, because that record is final. */}
                {!editsLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleSaveNow}
                    disabled={isSavingNow}
                    title="Flush any pending edits to the server"
                  >
                    <SaveIcon className="size-4" />
                    {isSavingNow
                      ? "Saving…"
                      : isReportSaved
                        ? "Save changes"
                        : "Save"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleDownloadPDF}
                >
                  <FileText className="size-4" />
                  Download as PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleELNExport}
                  disabled={loadingConnections}
                >
                  <FlaskConical className="size-4" />
                  Upload to ELN
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body: tabs + content on the left, parent-design rail on the right
          (the rail appears only for reports spawned from a design). */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Tabs */}
          {isELNLocked && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-6 py-2.5 text-[12.5px] text-amber-900">
              <span>
                <b>Locked.</b> Uploaded to your ELN on{" "}
                {new Date(elnUploadedAt!).toLocaleDateString()} ·{" "}
                {new Date(elnUploadedAt!).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
                . It stays exactly as filed — create a revised version to make
                changes.
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {report?.eln_entry_url && (
                  <a
                    href={report.eln_entry_url as string}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline"
                  >
                    Open in ELN
                  </a>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={creatingRevision}
                  onClick={() => void handleCreateRevision()}
                >
                  {creatingRevision ? "Creating…" : "Create revised version"}
                </Button>
              </div>
            </div>
          )}

          <AccentTabs
            activeKey={activeTab}
            onChange={key => setActiveTab(key as ReportTab)}
            tabs={tabDefs}
          />

          {/* Tab content. Inputs + Overview keep a comfortable
          max-width; the Report tab gets the full 6xl so the index +
          body grid has more room to breathe (scientist asked for the
          main content to widen so the chart and tables don't need so
          much horizontal scrolling). */}
          <div className="min-h-0 flex-1 overflow-auto">
            <div
              className={cn(
                "mx-auto p-6",
                activeTab === "report" ? "max-w-6xl" : "max-w-4xl"
              )}
            >
              {/* While the draft is being written, the whole content area
                  becomes the progress view - a bare spinner on an empty
                  Overview tab read as "nothing is happening". */}
              {busyGenerating ? (
                <ReportGeneratingView objective={objective} />
              ) : (
                <>
                  {activeTab === "overview" && (
                    <OverviewTab
                      report={report}
                      fileCount={fileCount}
                      generationStatus={generationStatus}
                      generationError={report?.generation_error ?? null}
                      onGoToTab={setActiveTab}
                      onOpenVisualization={() => setShowViz(true)}
                      sourceDesignName={report?.source_design_name ?? null}
                      onOpenDesign={
                        report?.source_design_id
                          ? () =>
                              router.push(
                                `/${locale}/${workspaceId}/designs/${report.source_design_id}`
                              )
                          : undefined
                      }
                    />
                  )}
                  {activeTab === "inputs" && (
                    <InputsTab
                      objective={objective}
                      onObjectiveChange={handleObjectiveChange}
                      protocol={protocolFiles}
                      papers={paperFiles}
                      dataFiles={dataFiles}
                      onToggleFile={handleToggleFile}
                      isGenerating={
                        isGenerating || generationStatus === "generating"
                      }
                      hasDraft={hasDraft}
                      onGenerate={handleGenerate}
                      customSections={customSections}
                      onCustomSectionsChange={handleCustomSectionsChange}
                      generationError={
                        generationStatus === "error"
                          ? (report?.generation_error ?? null)
                          : null
                      }
                      templateId={templateId}
                      onTemplateChange={handleTemplateChange}
                      protocolOptional={!!report?.source_design_id}
                    />
                  )}
                  {activeTab === "report" && (
                    <ReportTabView
                      draft={draft}
                      chartImage={report?.chart_image ?? null}
                      chartData={report?.chart_data ?? null}
                      regenerating={regeneratingKey}
                      onRegenerate={handleRegenerateSection}
                      onEditContent={handleSectionContentChange}
                      onRegenerateChart={handleChartRegenerate}
                      onChartTypeChange={handleChartTypeChange}
                      onSelectedSeriesChange={handleSelectedSeriesChange}
                      regeneratingChart={regeneratingChart}
                      onOpenPreview={() => setShowPreview(true)}
                      templateId={templateId}
                      reportTitle={report?.name || "Untitled Report"}
                      isSaved={editsLocked}
                      onSaveAsTemplate={handleOpenSaveAsTemplate}
                      customSections={customSections}
                      onAddCustomSection={handleOpenAddSection}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {/* The parent-design / files rail was removed - that information already
            lives in the main content (Overview links to the design; Inputs lists
            the files), so the right column was redundant. */}
      </div>

      {/* Full-size, titled visualization. At poster scale inside Overview the
          axis labels were unreadable, so it explained nothing; here it gets the
          room to be legible. */}
      <Dialog open={showViz} onOpenChange={setShowViz}>
        <DialogContent className="max-w-[min(1000px,95vw)] sm:max-w-[min(1000px,95vw)]">
          <DialogHeader>
            <DialogTitle>
              {report?.name ? `${report.name} — results` : "Result data"}
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const cd = (report?.chart_data ?? null) as any
            // Primary metric first, then every other metric the outline found.
            // The generator used to be told to pick ONE metric and discard the
            // rest, so uploads with several readouts only ever charted one.
            const series: Array<{
              metric: string
              yAxisLabel?: string
              chartType?: ChartType
              data: { label: string; value: number }[]
            }> = []
            if (Array.isArray(cd?.data) && cd.data.length) {
              series.push({
                metric: cd.chartTitle || "Primary result",
                yAxisLabel: cd.yAxisLabel,
                chartType: cd.chartType,
                data: cd.data
              })
            }
            for (const extra of cd?.additionalSeries ?? []) {
              if (Array.isArray(extra?.data) && extra.data.length) {
                series.push({
                  metric: extra.metric || "Metric",
                  yAxisLabel: extra.yAxisLabel,
                  chartType: extra.chartType,
                  data: extra.data
                })
              }
            }
            const active = series[Math.min(vizSeries, series.length - 1)]
            if (!active) {
              return report?.chart_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={report.chart_image as string}
                  alt="Result visualization"
                  className="border-ink-200 max-h-[70vh] w-full rounded-lg border bg-white object-contain"
                />
              ) : (
                <p className="text-ink-500 py-8 text-center text-sm">
                  No chart has been generated for this report yet.
                </p>
              )
            }
            return (
              <div className="space-y-3">
                {series.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {series.map((sr, i) => (
                      <button
                        key={sr.metric + i}
                        type="button"
                        onClick={() => setVizSeries(i)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-[12px] transition-colors",
                          i === vizSeries
                            ? "border-ink bg-ink text-white"
                            : "border-line text-ink-2 hover:border-line-strong"
                        )}
                      >
                        {sr.metric}
                      </button>
                    ))}
                  </div>
                )}
                <ReportChart
                  data={active.data}
                  chartTitle={active.metric}
                  yAxisLabel={active.yAxisLabel}
                  chartType={active.chartType ?? "bar"}
                />
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      <ELNExportModal
        isOpen={showELNExportModal}
        onOpenChange={setShowELNExportModal}
        connections={elnConnections}
        reportContent={draftText}
        reportTitle={report?.name || "Shadow AI Report"}
        onExportSuccess={(result: any) => {
          if (!result?.success) return
          const at = new Date().toISOString()
          const url = result?.entryUrl ?? result?.url ?? null
          setReport((prev: any) => ({
            ...prev,
            eln_uploaded_at: at,
            eln_entry_url: url
          }))
          void updateReport(reportId, {
            eln_uploaded_at: at,
            ...(url ? { eln_entry_url: url } : {})
          }).catch(err => console.warn("Couldn't record ELN upload:", err))
          toast({
            title: "Uploaded to ELN",
            description:
              "This report is now locked so it matches the filed record."
          })
        }}
      />
      <ELNConnectModal
        isOpen={showELNConnectModal}
        onOpenChange={setShowELNConnectModal}
        userId={profile?.user_id || ""}
        onConnectionCreated={(c: ELNConnection) => {
          setElnConnections(prev => [...prev, c])
          setShowELNConnectModal(false)
          setShowELNExportModal(true)
        }}
      />

      <ReportPreviewModal
        isOpen={showPreview}
        onOpenChange={setShowPreview}
        title={report?.name || "Untitled Report"}
        draft={draft}
        chartImage={report?.chart_image ?? null}
        chartData={report?.chart_data ?? null}
        onEditContent={handleSectionContentChange}
        templateId={templateId}
        isLocked={editsLocked}
      />

      {/* Add-section dialog. Asks for a name + brief description; the
          generation agent fills the body once the user re-runs the
          report (or types into the section themselves). */}
      <Dialog
        open={addSectionDialogOpen}
        onOpenChange={setAddSectionDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a section</DialogTitle>
            <DialogDescription>
              Name the section and write 1-2 sentences telling the generation
              agent what to put in it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-section-name">Section name</Label>
              <Input
                id="add-section-name"
                value={newSectionName}
                onChange={e => setNewSectionName(e.target.value)}
                placeholder="e.g. Open questions for PI"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-section-desc">What goes here</Label>
              <Textarea
                id="add-section-desc"
                value={newSectionDescription}
                onChange={e => setNewSectionDescription(e.target.value)}
                placeholder="Briefly describe what this section should contain."
                rows={3}
                maxLength={600}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddSectionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmAddSection}>Add section</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save-as-template dialog. Persists the active section list +
          chart type to report_templates so the user can spawn future
          reports from the same skeleton. Flips the current report to
          is_saved=true on success, which locks the editor. */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save report as template</DialogTitle>
            <DialogDescription>
              Captures the structure of this report (sections + chart type) so a
              future report can reuse it. Also locks this report from further
              edits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Template name</Label>
              <Input
                id="tpl-name"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="e.g. PI weekly update"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc">
                Description{" "}
                <span className="text-ink-3 text-[11px] font-normal">
                  optional
                </span>
              </Label>
              <Textarea
                id="tpl-desc"
                value={templateDescription}
                onChange={e => setTemplateDescription(e.target.value)}
                placeholder="When should someone reach for this template?"
                rows={3}
                maxLength={600}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTemplateDialogOpen(false)}
              disabled={savingTemplate}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSaveAsTemplate}
              disabled={savingTemplate || !templateName.trim()}
            >
              {savingTemplate ? "Saving…" : "Save template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
