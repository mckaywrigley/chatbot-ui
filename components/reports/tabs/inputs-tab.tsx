"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getFileFromStorage } from "@/db/storage/files"
import { Tables } from "@/supabase/types"
import {
  IconFileText,
  IconLoader2,
  IconPlus,
  IconRefresh,
  IconSparkles,
  IconTrash,
  IconUpload
} from "@tabler/icons-react"
import { FC, useContext, useRef, useState } from "react"
import { toast } from "sonner"
import { ChatbotUIContext } from "@/context/context"
import { createFileBasedOnExtension } from "@/db/files"
import { ReportRetrievalSelect } from "../report-retrieval-select"
import { DEFAULT_TEMPLATE_ID, REPORT_TEMPLATES } from "@/lib/report/templates"

/**
 * One scientist-added section. `name` is the heading; `description`
 * tells the generation agent what to put in it. Both required at the
 * UI layer; the server treats `description` as a hint.
 */
export interface CustomSectionInput {
  id: string
  name: string
  description: string
}

interface InputsTabProps {
  objective: string
  onObjectiveChange: (value: string) => void
  protocol: Tables<"files">[]
  papers: Tables<"files">[]
  dataFiles: Tables<"files">[]
  onToggleFile: (
    type: "protocol" | "papers" | "dataFiles",
    item: Tables<"files">
  ) => void
  isGenerating: boolean
  hasDraft: boolean
  onGenerate: () => void
  generationError: string | null
  templateId: string
  onTemplateChange: (id: string) => void
  customSections: CustomSectionInput[]
  onCustomSectionsChange: (sections: CustomSectionInput[]) => void
  /**
   * When the report was spawned from a design, the design itself supplies the
   * protocol/method, so a protocol file isn't required to generate.
   */
  protocolOptional?: boolean
}

// Accepted upload formats per the scientist's spec: pdf / docx / csv / jpeg.
// `.jpg` is the same MIME family as `.jpeg`; both are allowed.
const ACCEPTED_FILE_EXTS = ".pdf,.docx,.csv,.jpeg,.jpg"

export const InputsTab: FC<InputsTabProps> = ({
  objective,
  onObjectiveChange,
  papers,
  dataFiles,
  onToggleFile,
  isGenerating,
  hasDraft,
  onGenerate,
  generationError,
  templateId,
  onTemplateChange,
  customSections,
  onCustomSectionsChange
}) => {
  // Data files are now mandatory alongside the design + objective so
  // the analysis agent always has something to work from (#11 in the
  // bug-list). Falling back to "report with no data" was producing
  // thin sections that read like marketing copy. The protocol file is
  // optional for design-sourced reports (the design is the protocol).
  // The design supplies the protocol/method, so generation only needs an
  // objective + data files. (Protocol upload field removed from the viewer.)
  const canGenerate =
    !!objective.trim() && dataFiles.length > 0 && !isGenerating
  const activeTemplateId = templateId || DEFAULT_TEMPLATE_ID

  const { profile, selectedWorkspace } = useContext(ChatbotUIContext)
  const [uploadingType, setUploadingType] = useState<
    "protocol" | "papers" | "dataFiles" | null
  >(null)

  // One hidden <input type="file"> per field so the Upload buttons can
  // trigger their own picker. Refs are kept stable across renders.
  const papersUploadRef = useRef<HTMLInputElement>(null)
  const dataFilesUploadRef = useRef<HTMLInputElement>(null)

  // Shared upload handler. Drives `createFileBasedOnExtension`, which
  // both uploads to storage and emits the `files.process` event so the
  // file becomes part of the RAG corpus. Once persisted we feed the
  // resulting row straight into `onToggleFile` so the new file shows up
  // as selected (no separate "now pick the file you just uploaded"
  // step).
  const handleUploadFiles = async (
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
          // `createFileBasedOnExtension` returns a Promise<Tables<"files">>
          // shape on success.
          onToggleFile(type, created as Tables<"files">)
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

  // Helper that renders the dropdown picker, the upload-button row, the
  // hidden file input, and a tiny caption underneath. Centralises the
  // three near-identical fields without forcing a separate component
  // file. The label / caption are passed in so each field stays
  // self-explanatory.
  /**
   * The files already attached, as an openable list. The tab used to lead with
   * Template + Objective - both already collected in the setup modal - so the
   * thing the researcher came here to check (what data is actually attached)
   * was buried under a duplicate of the setup form, and the files couldn't be
   * opened at all.
   */
  const renderAttachedFiles = (label: string, items: Tables<"files">[]) => {
    if (items.length === 0) return null
    const open = async (f: Tables<"files">) => {
      try {
        const url = await getFileFromStorage(f.file_path)
        if (url) window.open(url, "_blank", "noopener,noreferrer")
      } catch {
        /* opening is best-effort - the row stays listed either way */
      }
    }
    return (
      <div className="space-y-1.5">
        <Label className="text-[12.5px]">{label}</Label>
        <ul className="space-y-1">
          {items.map(f => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => void open(f)}
                title="Open this file"
                className="border-line hover:border-line-strong hover:bg-paper-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors"
              >
                <IconFileText size={15} className="text-ink-3 shrink-0" />
                <span className="text-ink-800 min-w-0 flex-1 truncate text-[12.5px]">
                  {f.name}
                </span>
                <span className="text-ink-400 shrink-0 text-[10.5px] uppercase">
                  {(f.type || "").replace("application/", "") || "file"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const renderFileField = (params: {
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
        <Label>
          {params.label}{" "}
          {params.required ? <span className="text-red-500">*</span> : null}
        </Label>
        <ReportRetrievalSelect
          selectedRetrievalItems={params.selected}
          onRetrievalItemSelect={item =>
            onToggleFile(params.type, item as Tables<"files">)
          }
          fileType={params.type}
        />
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-ink-400 text-xs">{params.caption}</p>
          <div>
            <input
              ref={params.uploadRef}
              type="file"
              accept={ACCEPTED_FILE_EXTS}
              multiple
              className="hidden"
              onChange={e => {
                void handleUploadFiles(params.type, e.target.files)
                // Reset value so re-picking the same file fires the
                // change event again.
                e.target.value = ""
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => params.uploadRef.current?.click()}
              disabled={isUploading || isGenerating}
            >
              {isUploading ? (
                <>
                  <IconLoader2 size={14} className="animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <IconUpload size={14} />
                  Upload file
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {(dataFiles.length > 0 || papers.length > 0) && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-ink-900 text-lg">
              Files in this report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderAttachedFiles("Data", dataFiles)}
            {renderAttachedFiles("Reference documents", papers)}
            <p className="text-ink-400 text-xs">
              Click a file to open it. Add or remove files below.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-ink-900 text-lg">Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-ink-500 text-sm">
            Choose the structure for this report.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {REPORT_TEMPLATES.map(t => {
              const selected = activeTemplateId === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => onTemplateChange(t.id)}
                  className={
                    "rounded-xl border p-3 text-left transition-colors " +
                    (selected
                      ? "border-teal-journey bg-teal-journey-tint/30"
                      : "border-ink-200 bg-white hover:bg-ink-50")
                  }
                >
                  <div
                    className={
                      "text-sm font-semibold " +
                      (selected ? "text-teal-journey" : "text-ink-900")
                    }
                  >
                    {t.name}
                  </div>
                  <div className="text-ink-500 mt-1 text-xs leading-snug">
                    {t.description}
                  </div>
                  <div className="text-ink-400 mt-2 text-[11px] font-bold uppercase tracking-widest">
                    {t.sections.length} sections
                    {/* "Visualization" replaces the old "chart" label so
                        the template card reads consistently with the
                        section heading inside the report. */}
                    {t.includeChart ? " · visualization" : ""}
                  </div>
                  {/* Use-case caption - tells a PhD/postdoc *when* to
                      pick this template. Kept to 3-5 words by spec. */}
                  <div className="text-ink-700 mt-1 text-[11px] italic">
                    {t.useCase}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-ink-900 text-lg">Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>
              Objective <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={objective}
              onChange={e => onObjectiveChange(e.target.value)}
              placeholder="Describe what this report should investigate and report on."
              rows={3}
              disabled={isGenerating}
            />
            <p className="text-ink-400 text-xs">
              One short paragraph that frames the question this report answers -
              used by the agents to focus the analysis.
            </p>
          </div>

          {/* Data files first (mandatory) - the analysis agent works
              directly from these. The design already supplies the
              protocol/method, so no protocol upload field here. */}
          {renderFileField({
            label: "Data Files",
            required: true,
            type: "dataFiles",
            selected: dataFiles,
            uploadRef: dataFilesUploadRef,
            caption: "Experimental data the analysis agent should work from."
          })}

          {/* Reference documents (optional) - supporting context to cite. */}
          {renderFileField({
            label: "Reference Documents / Other Files",
            type: "papers",
            selected: papers,
            uploadRef: papersUploadRef,
            caption:
              "Supporting papers, prior reports, SOPs, or notes the report should cite or draw context from."
          })}

          {/* Optional custom sections - scientist's ask. Lets the user
              add ad-hoc sections beyond the template (e.g. "Internal
              SOPs cited", "Open questions for PI"). Each row carries a
              name + brief description so the generation agent knows
              what to write. Persisted on report.custom_sections; the
              generation pipeline appends them to the section list. */}
          <div className="border-line space-y-3 rounded-xl border border-dashed p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label>Custom sections</Label>
                <p className="text-ink-400 mt-0.5 text-[11.5px]">
                  Optional. Add extra sections on top of the template - the
                  generation agent will write them too.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onCustomSectionsChange([
                    ...customSections,
                    {
                      id: `cs-${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2, 6)}`,
                      name: "",
                      description: ""
                    }
                  ])
                }
                disabled={isGenerating}
                className="gap-1"
              >
                <IconPlus size={13} />
                Add section
              </Button>
            </div>
            {customSections.length === 0 ? (
              <p className="text-ink-3 text-[12px]">
                No custom sections yet. Click <b>Add section</b> to introduce
                one.
              </p>
            ) : (
              <ul className="space-y-3">
                {customSections.map((sec, idx) => (
                  <li
                    key={sec.id}
                    className="border-line bg-surface space-y-2 rounded-md border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-ink-2 text-[11.5px] font-medium">
                        Section {idx + 1}
                      </Label>
                      <button
                        type="button"
                        onClick={() =>
                          onCustomSectionsChange(
                            customSections.filter((_, i) => i !== idx)
                          )
                        }
                        disabled={isGenerating}
                        title="Remove section"
                        className="text-ink-3 hover:text-destructive rounded p-1"
                      >
                        <IconTrash size={13} />
                      </button>
                    </div>
                    <Input
                      value={sec.name}
                      onChange={e =>
                        onCustomSectionsChange(
                          customSections.map((s, i) =>
                            i === idx ? { ...s, name: e.target.value } : s
                          )
                        )
                      }
                      placeholder="Section name (e.g. Open questions for PI)"
                      disabled={isGenerating}
                      maxLength={120}
                    />
                    <Textarea
                      value={sec.description}
                      onChange={e =>
                        onCustomSectionsChange(
                          customSections.map((s, i) =>
                            i === idx
                              ? { ...s, description: e.target.value }
                              : s
                          )
                        )
                      }
                      placeholder="What should this section contain? (1-2 sentences)"
                      rows={2}
                      disabled={isGenerating}
                      maxLength={600}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {generationError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {generationError}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="border-ink-100 flex items-center justify-end border-t pt-4">
        <Button
          onClick={onGenerate}
          disabled={!canGenerate}
          className="bg-brick hover:bg-brick-hover gap-1.5"
        >
          {isGenerating ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              Generating…
            </>
          ) : hasDraft ? (
            <>
              <IconRefresh size={16} />
              Regenerate Report
            </>
          ) : (
            <>
              <IconSparkles size={16} />
              Generate Report
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
