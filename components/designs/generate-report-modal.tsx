"use client"

/**
 * Generate-report modal, launched from a completed design's slab.
 *
 * Collects the inputs needed to spin a report off a design:
 *  1. Report format (mandatory, shown first) + optionally one of the
 *     researcher's saved templates
 *  2. Objective (pre-filled from the design's objective, editable)
 *  3. Three upload slots (protocol / reference docs / data) - the parent
 *     design already supplies the method + literature context, so only the
 *     data files are mandatory.
 *
 * Two actions:
 *  - Save: persist an in-progress report (no generation) linked to the design.
 *  - Generate: run the AI data-completeness check; if the uploaded data
 *    doesn't cover the design's intended measurements, block with the
 *    "I do not have the complete data set" warning. Otherwise create the
 *    report in a "generating" state and open it - the report page resumes
 *    generation and streams in the draft.
 */

import { ChatbotUIContext } from "@/context/context"
import { createFileBasedOnExtension } from "@/db/files"
import { createReport } from "@/db/reports-firestore"
import {
  buildDesignReportContext,
  type DesignReportContext
} from "@/lib/design/report-context"
import { DEFAULT_TEMPLATE_ID, REPORT_TEMPLATES } from "@/lib/report/templates"
import { Tables } from "@/supabase/types"
import {
  IconAlertTriangle,
  IconFlask,
  IconLoader2,
  IconSparkles,
  IconUpload
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { FC, useContext, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ReportRetrievalSelect } from "@/components/reports/report-retrieval-select"
import { ReportEditor } from "@/components/reports/report-editor"

interface GenerateReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  design: any
  workspaceId: string
  locale: string
  /** Called after an in-progress report is saved so the caller can refresh. */
  onSaved?: (report: any) => void
  /** Which design iteration this report is being generated FROM. */
  sourceVersionLabel?: string
  /**
   * Open directly into an EXISTING report's editor, skipping the setup form.
   * Used when the researcher clicks a saved report asset in the Export rail.
   */
  initialReportId?: string | null
  /**
   * Pre-select one of the researcher's saved templates. Set when the flow is
   * started by clicking a template in the Export rail's Templates list.
   */
  initialSavedTemplateId?: string | null
}

const ACCEPTED_FILE_EXTS = ".pdf,.docx,.csv,.jpeg,.jpg"

export const GenerateReportModal: FC<GenerateReportModalProps> = ({
  open,
  onOpenChange,
  design,
  workspaceId,
  locale,
  onSaved,
  sourceVersionLabel,
  initialReportId = null,
  initialSavedTemplateId = null
}) => {
  const router = useRouter()
  const { profile, selectedWorkspace, setReports } =
    useContext(ChatbotUIContext)
  // When set, the modal stops being a setup form and becomes the report editor
  // itself. Generation no longer navigates to /reports/[id] - the draft is
  // written, shown and edited right here.
  const [openReportId, setOpenReportId] = useState<string | null>(
    initialReportId
  )
  useEffect(() => {
    if (open) setOpenReportId(initialReportId)
  }, [open, initialReportId])

  const ctx: DesignReportContext = useMemo(
    () => buildDesignReportContext(design ?? {}),
    [design]
  )

  const [objective, setObjective] = useState("")
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID)
  // Templates the researcher saved from an earlier finished report. Separate
  // from the three built-in FORMATS above: a saved template carries an exact
  // section list, and picking one overrides the format's default sections.
  const [savedTemplates, setSavedTemplates] = useState<
    Array<{ id: string; name: string; section_count?: number }>
  >([])
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null)
  // The list is fetched when the modal opens, so the picker used to appear a
  // second or two after everything else - the form visibly re-laying out under
  // the cursor. Hold the space while it loads.
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [protocol, setProtocol] = useState<Tables<"files">[]>([])
  const [papers, setPapers] = useState<Tables<"files">[]>([])
  const [dataFiles, setDataFiles] = useState<Tables<"files">[]>([])
  const [uploadingType, setUploadingType] = useState<
    "protocol" | "papers" | "dataFiles" | null
  >(null)
  const [busy, setBusy] = useState<null | "save" | "generate">(null)
  const [warning, setWarning] = useState<{
    reason: string
    missing: string[]
  } | null>(null)

  const papersRef = useRef<HTMLInputElement>(null)
  const dataRef = useRef<HTMLInputElement>(null)

  // Reset the form to the design's defaults each time the modal opens.
  useEffect(() => {
    if (!open) return
    setObjective(ctx.objective)
    setTemplateId(DEFAULT_TEMPLATE_ID)
    setSavedTemplateId(initialSavedTemplateId)
    setProtocol([])
    setPapers([])
    setDataFiles([])
    setWarning(null)
    setBusy(null)
  }, [open, ctx.objective, initialSavedTemplateId])

  // Load the researcher's saved templates when the modal opens. Best-effort:
  // a failure just means the dropdown stays hidden and the formats still work.
  useEffect(() => {
    if (!open || !workspaceId) return
    let cancelled = false
    setTemplatesLoading(true)
    void fetch(
      `/api/report-templates?workspaceId=${encodeURIComponent(workspaceId)}`
    )
      .then(r => (r.ok ? r.json() : { templates: [] }))
      .then(json => {
        if (cancelled) return
        setSavedTemplates(Array.isArray(json?.templates) ? json.templates : [])
      })
      .catch(err =>
        console.warn("[GenerateReportModal] couldn't load templates:", err)
      )
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, workspaceId])

  const toggleFile = (
    type: "protocol" | "papers" | "dataFiles",
    item: Tables<"files">
  ) => {
    const [current, setter] =
      type === "protocol"
        ? [protocol, setProtocol]
        : type === "papers"
          ? [papers, setPapers]
          : [dataFiles, setDataFiles]
    const exists = current.some(f => f.id === item.id)
    setter(exists ? current.filter(f => f.id !== item.id) : [...current, item])
  }

  const handleUpload = async (
    type: "protocol" | "papers" | "dataFiles",
    fileList: FileList | null
  ) => {
    if (!fileList || fileList.length === 0) return
    if (!profile || !selectedWorkspace) {
      toast.error("Sign in and select a workspace before uploading.")
      return
    }
    setUploadingType(type)
    try {
      for (const file of Array.from(fileList)) {
        try {
          const created = await createFileBasedOnExtension(
            file,
            {
              user_id: profile.user_id,
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
          toggleFile(type, created as Tables<"files">)
        } catch (err: any) {
          console.error("Upload failed for file:", file.name, err)
          toast.error(`Upload failed: ${file.name}`)
        }
      }
      toast.success("File(s) uploaded")
    } finally {
      setUploadingType(null)
    }
  }

  const renderSlot = (params: {
    label: string
    required?: boolean
    type: "protocol" | "papers" | "dataFiles"
    selected: Tables<"files">[]
    uploadRef: React.RefObject<HTMLInputElement>
    caption: string
  }) => {
    const isUploading = uploadingType === params.type
    return (
      <div className="space-y-1.5">
        <Label className="text-[12.5px]">
          {params.label}{" "}
          {params.required ? <span className="text-red-500">*</span> : null}
        </Label>
        <ReportRetrievalSelect
          selectedRetrievalItems={params.selected}
          onRetrievalItemSelect={item =>
            toggleFile(params.type, item as Tables<"files">)
          }
          fileType={params.type}
        />
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <p className="text-ink-400 text-[11px]">{params.caption}</p>
          <input
            ref={params.uploadRef}
            type="file"
            accept={ACCEPTED_FILE_EXTS}
            multiple
            className="hidden"
            onChange={e => {
              void handleUpload(params.type, e.target.files)
              e.target.value = ""
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => params.uploadRef.current?.click()}
            disabled={isUploading || busy !== null}
          >
            {isUploading ? (
              <>
                <IconLoader2 size={13} className="animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <IconUpload size={13} /> Add file
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  /**
   * The custom sections carried by a picked saved template. A saved template
   * stores its whole section list; the built-in ones already come from the
   * chosen format, so only the entries flagged `custom` need seeding onto the
   * new report - those are the additions the researcher deliberately made.
   */
  const savedTemplateCustomSections = () => {
    if (!savedTemplateId) return null
    const t = savedTemplates.find(x => x.id === savedTemplateId) as
      | { sections?: Array<Record<string, unknown>> }
      | undefined
    const custom = (t?.sections ?? []).filter(s => s?.custom)
    if (custom.length === 0) return null
    return custom.map((s, i) => ({
      id: typeof s.key === "string" && s.key ? s.key : `tpl-${i}`,
      name: typeof s.title === "string" ? s.title : "Untitled section",
      description: typeof s.description === "string" ? s.description : ""
    }))
  }

  const baseReportPayload = (generationStatus: "idle" | "generating") => ({
    user_id: profile!.user_id,
    name: design?.name ? `${design.name} - report` : "Untitled report",
    description: objective.trim(),
    sharing: "private",
    source_design_id: design?.id ?? null,
    source_design_name: design?.name ?? null,
    // Which iteration of the design this report documents, and when it was
    // taken - with several versions in play, "from this design" isn't enough
    // to know what the report actually describes.
    source_design_version: sourceVersionLabel ?? null,
    source_captured_at: new Date().toISOString(),
    design_context: ctx.summary,
    template_id: templateId,
    // The saved template, when one is picked, is what the report's sections
    // actually come from; the format stays recorded as the fallback shape.
    saved_template_id: savedTemplateId,
    custom_sections: savedTemplateCustomSections(),
    generation_status: generationStatus
  })

  const handleSave = async () => {
    if (!profile || !selectedWorkspace) return
    setBusy("save")
    try {
      const report = await createReport(
        baseReportPayload("idle"),
        workspaceId,
        { protocol, papers, dataFiles },
        []
      )
      setReports(prev => [report, ...prev])
      onSaved?.(report)
      toast.success("Saved as an in-progress report")
      onOpenChange(false)
    } catch (e: any) {
      toast.error(`Couldn't save report: ${e?.message ?? "unknown error"}`)
    } finally {
      setBusy(null)
    }
  }

  const handleGenerate = async () => {
    if (!profile || !selectedWorkspace) return
    if (!objective.trim()) {
      toast.error("Add an objective first.")
      return
    }
    if (dataFiles.length === 0) {
      toast.error("Upload at least one data file to generate a report.")
      return
    }
    setBusy("generate")
    setWarning(null)
    try {
      // 1) Data-completeness gate.
      const check = await fetch("/api/report/data-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective: objective.trim(),
          measuredOutcomes: ctx.measuredOutcomes,
          designSummary: ctx.summary,
          dataFiles: dataFiles.map(f => f.id)
        })
      })
        .then(r => r.json())
        .catch(() => ({ complete: true, missing: [], reason: "" }))

      if (check && check.complete === false) {
        setWarning({
          reason:
            check.reason ||
            "The uploaded data doesn't cover everything this design set out to measure.",
          missing: Array.isArray(check.missing) ? check.missing : []
        })
        setBusy(null)
        return
      }

      // 2) Create the report in a generating state and open it - the report
      //    page resumes generation from here.
      const report = await createReport(
        baseReportPayload("generating"),
        workspaceId,
        { protocol, papers, dataFiles },
        []
      )
      setReports(prev => [report, ...prev])
      // Hand straight over to the in-modal editor. It sees
      // generation_status === "generating" and runs the outline pass itself,
      // showing per-stage progress while it works.
      setOpenReportId(report.id)
      setBusy(null)
    } catch (e: any) {
      toast.error(`Couldn't generate report: ${e?.message ?? "unknown error"}`)
      setBusy(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => (busy ? null : onOpenChange(o))}>
      {/* Two shapes, one dialog: the compact SETUP form, and - once generation
          starts - an EXPANDED frame hosting the full report editor. The modal
          never hands off to another page. */}
      {openReportId ? (
        <DialogContent className="flex h-[92vh] max-w-[min(1200px,96vw)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1200px,96vw)]">
          <ReportEditor
            reportId={openReportId}
            workspaceId={workspaceId}
            locale={locale}
            mode="modal"
            onSaved={report => {
              onSaved?.(report)
              setOpenReportId(null)
              onOpenChange(false)
            }}
            onRequestClose={() => {
              setOpenReportId(null)
              onOpenChange(false)
            }}
          />
        </DialogContent>
      ) : (
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate report</DialogTitle>
            <DialogDescription className="flex items-center gap-1.5">
              <IconFlask size={13} className="text-teal-journey" />
              From design:{" "}
              <span className="text-ink font-medium">
                {design?.name ?? "Untitled design"}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* 1 - Report format (mandatory, first).

                These three are FORMATS - the built-in shapes a report can
                take. Calling them "templates" collided with the templates a
                researcher saves from a finished report, which are a different
                thing and now have their own picker below. */}
            <div className="space-y-2">
              <Label className="text-[12.5px]">
                Report format <span className="text-red-500">*</span>
              </Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {REPORT_TEMPLATES.map(t => {
                  const selected = templateId === t.id && !savedTemplateId
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        setTemplateId(t.id)
                        setSavedTemplateId(null)
                      }}
                      className={
                        "rounded-xl border p-2.5 text-left transition-colors " +
                        (selected
                          ? "border-teal-journey bg-teal-journey-tint/30"
                          : "border-ink-200 bg-white hover:bg-ink-50")
                      }
                    >
                      <div
                        className={
                          "text-[12.5px] font-semibold " +
                          (selected ? "text-teal-journey" : "text-ink-900")
                        }
                      >
                        {t.name}
                      </div>
                      <div className="text-ink-500 mt-0.5 text-[11px] leading-snug">
                        {t.description}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 1b - Saved templates. A report saved as a template captures its
                section list; reusing one was previously impossible from here,
                so the structure a researcher had deliberately built could only
                be recreated by hand. Only rendered when they have some. */}
            {templatesLoading && savedTemplates.length === 0 && (
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Template (optional)</Label>
                <div className="border-ink-200 bg-ink-50 h-9 animate-pulse rounded-md border" />
              </div>
            )}

            {savedTemplates.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Template (optional)</Label>
                <Select
                  value={savedTemplateId ?? "none"}
                  onValueChange={v =>
                    setSavedTemplateId(v === "none" ? null : v)
                  }
                  disabled={busy !== null}
                >
                  <SelectTrigger className="h-9 text-[12.5px]">
                    <SelectValue placeholder="Use one of your saved templates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      No template — use the format above
                    </SelectItem>
                    {savedTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {typeof t.section_count === "number"
                          ? ` · ${t.section_count} sections`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-ink-500 text-[11px] leading-snug">
                  {savedTemplateId
                    ? "The report will follow this saved template's sections instead of the format above."
                    : "Saved from a finished report. Picking one reuses its exact section list."}
                </p>
              </div>
            )}

            {/* 2 - Objective (pre-filled from design) */}
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">
                Objective <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={objective}
                onChange={e => setObjective(e.target.value)}
                placeholder="What this report should investigate and report on."
                rows={3}
                disabled={busy !== null}
              />
              <p className="text-ink-400 text-[11px]">
                Pre-filled from the design&apos;s objective - edit if needed.
              </p>
            </div>

            {/* 3 - Uploads. The design supplies method + literature context, so
              only data files are mandatory. */}
            <div className="border-line bg-paper-2/60 text-ink-2 rounded-lg border p-3 text-[11.5px]">
              The design supplies the method and literature context for this
              report. You only need to upload the experiment&apos;s data files.
            </div>
            {renderSlot({
              label: "Data files",
              required: true,
              type: "dataFiles",
              selected: dataFiles,
              uploadRef: dataRef,
              caption: "Experimental data the analysis agent works from."
            })}
            {renderSlot({
              label: "Reference documents (optional)",
              type: "papers",
              selected: papers,
              uploadRef: papersRef,
              caption: "Supporting papers, SOPs, or notes to cite."
            })}

            {warning && (
              <div className="space-y-1.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12.5px] text-amber-800">
                <div className="flex items-center gap-1.5 font-semibold">
                  <IconAlertTriangle size={15} />I do not have the complete data
                  set to generate a report
                </div>
                {warning.reason && <p>{warning.reason}</p>}
                {warning.missing.length > 0 && (
                  <ul className="ml-4 list-disc">
                    {warning.missing.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                )}
                <p className="text-amber-700">
                  Add the missing data and try again, or Save and finish later.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={busy !== null || !objective.trim()}
            >
              {busy === "save" ? "Saving…" : "Save"}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={
                busy !== null || !objective.trim() || dataFiles.length === 0
              }
              className="bg-brick hover:bg-brick-hover gap-1.5"
            >
              {busy === "generate" ? (
                <>
                  <IconLoader2 size={15} className="animate-spin" /> Checking…
                </>
              ) : (
                <>
                  <IconSparkles size={15} /> Generate report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}
