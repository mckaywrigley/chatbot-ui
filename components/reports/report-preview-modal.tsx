"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { IconEdit, IconX } from "@tabler/icons-react"
import { FC, useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  getSectionGroups,
  getTemplate,
  ReportTemplate
} from "@/lib/report/templates"
import {
  ReportChart,
  type ChartType
} from "@/app/[locale]/[workspaceid]/report/components/report-chart"

interface ChartDataShape {
  chartTitle?: string
  yAxisLabel?: string
  chartType?: ChartType
  data?: Array<{ label: string; value: number }>
}

interface ReportPreviewModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  draft: Record<string, any> | null
  chartImage: string | null
  /** Live chart-data payload so the preview reflects whichever viz
   * the user is looking at in the editor (#22 in the bug list). */
  chartData?: ChartDataShape | null
  onEditContent: (sectionKey: string, value: string) => void
  templateId?: string | null
  /** When true, the preview is read-only - no Edit button per section. */
  isLocked?: boolean
}

const sectionAnchor = (key: string) => `preview-${key}`

export const ReportPreviewModal: FC<ReportPreviewModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  draft,
  chartImage,
  chartData,
  onEditContent,
  templateId,
  isLocked = false
}) => {
  const template: ReportTemplate = getTemplate(templateId)
  const sectionGroups = getSectionGroups(template)

  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  useEffect(() => {
    if (!isOpen) {
      setEditingKey(null)
      setEditValue("")
    }
  }, [isOpen])

  const contentFor = (key: string) => {
    const raw = draft?.[key]
    if (typeof raw === "string") return raw
    return raw ? JSON.stringify(raw, null, 2) : ""
  }

  const handleStartEdit = (key: string) => {
    setEditValue(contentFor(key))
    setEditingKey(key)
  }

  const handleSaveEdit = () => {
    if (editingKey) onEditContent(editingKey, editValue)
    setEditingKey(null)
    setEditValue("")
  }

  const scrollTo = (anchor: string) => {
    const el = document.getElementById(anchor)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="h-[calc(100vh-40px)] max-h-none w-[calc(100vw-40px)] max-w-none gap-0 overflow-hidden p-0">
        <div className="border-ink-200 flex shrink-0 items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <div className="text-ink-400 text-[11px] font-bold uppercase tracking-[0.13em]">
              Preview · {template.name}
            </div>
            <h2 className="text-ink-900 text-lg font-bold">{title}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => onOpenChange(false)}
          >
            <IconX size={16} />
            Close
          </Button>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="border-ink-200 hidden w-56 shrink-0 overflow-y-auto border-r bg-white/60 p-3 text-sm md:block">
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
                {group.sections.map(section => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => scrollTo(sectionAnchor(section.key))}
                    className="text-ink-700 hover:bg-ink-50 block w-full rounded-lg px-2 py-1.5 text-left"
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            ))}
          </aside>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white">
            <div className="mx-auto max-w-3xl space-y-8 p-10">
              <header className="border-ink-100 border-b pb-6">
                <div className="text-ink-400 mb-2 text-[11px] font-bold uppercase tracking-[0.13em]">
                  Report · {template.name}
                </div>
                <h1 className="text-ink-900 text-4xl font-bold leading-tight">
                  {title || "Untitled Report"}
                </h1>
              </header>

              {template.sections.map(section => {
                const content = contentFor(section.key)
                const isEditing = editingKey === section.key
                const isDataAnalysis = section.key === "dataAnalysis"
                return (
                  <section
                    key={section.key}
                    id={sectionAnchor(section.key)}
                    className="scroll-mt-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3
                        className={
                          "text-xl font-bold " + section.accentClassName
                        }
                      >
                        {section.title}
                      </h3>
                      {/* Edit controls disappear when the report is
                          locked - preview becomes a read-only render
                          of the saved structure. */}
                      {!isLocked &&
                        (isEditing ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingKey(null)
                                setEditValue("")
                              }}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveEdit}>
                              Save
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleStartEdit(section.key)}
                          >
                            <IconEdit size={14} />
                            Edit
                          </Button>
                        ))}
                    </div>

                    {isEditing ? (
                      <Textarea
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        rows={Math.max(
                          6,
                          Math.min(24, editValue.split("\n").length + 1)
                        )}
                        className="font-mono text-sm"
                      />
                    ) : content ? (
                      <div className="prose prose-sm text-ink-800 max-w-none leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-ink-400 text-sm italic">
                        No content generated yet.
                      </p>
                    )}

                    {isDataAnalysis && template.includeChart && !isEditing && (
                      <div className="border-ink-100 mt-4 rounded-xl border bg-white/80 p-4">
                        <div className="text-ink-500 mb-2 text-[11px] font-bold uppercase tracking-widest">
                          Visualization
                        </div>
                        {/* Preview reflects the live chartType the
                              user selected in the editor (bar / line /
                              pie). Falls back to the static
                              chart_image only when raw chartData isn't
                              available (legacy reports). */}
                        {chartData?.data && chartData.data.length > 0 ? (
                          <ReportChart
                            data={chartData.data}
                            chartTitle={chartData.chartTitle}
                            yAxisLabel={chartData.yAxisLabel}
                            chartType={
                              (chartData.chartType as ChartType) ?? "bar"
                            }
                          />
                        ) : chartImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={chartImage}
                            alt="Report chart"
                            className="border-ink-100 max-w-full rounded-lg border"
                          />
                        ) : (
                          <p className="text-ink-400 text-sm italic">
                            No chart yet.
                          </p>
                        )}
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
