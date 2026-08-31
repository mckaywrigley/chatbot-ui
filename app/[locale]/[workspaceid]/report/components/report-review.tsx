"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader } from "@/components/ui/loader"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ChevronRight,
  Edit,
  X,
  Check,
  RefreshCcw,
  CopyIcon,
  ChevronUp,
  Sparkles,
  DownloadIcon,
  FileDown,
  Upload
} from "lucide-react"
import { getReportFilesByReportId } from "@/db/report-files-firestore"
import Loading from "@/app/[locale]/loading"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import PptxGenJS from "pptxgenjs"
import { getContentSlide, getIntroSlide } from "./utils"
import { getReportWithDetails, updateReport } from "@/db/reports-firestore"
import { ReportChart } from "./report-chart"

type ChartDataState = {
  chartTitle?: string
  yAxisLabel?: string
  data: Array<{ label: string; value: number }>
}

// Static outline metadata - hoisted to module scope so it has a stable
// identity across renders. Previously these were component-local consts,
// which fooled exhaustive-deps into demanding `defaultOutlineOrder` in
// useCallback deps even though the array never actually changed.
const OUTLINE_MAPPING: Record<string, string> = {
  aim: "Aim",
  introduction: "Introduction",
  principle: "Principle",
  material: "Materials Needed",
  preparation: "Preparation",
  procedure: "Procedure",
  setup: "Setup and Layout",
  dataAnalysis: "Data Analysis",
  charts: "Charts",
  results: "Results",
  discussion: "Discussion",
  conclusion: "Conclusion",
  nextSteps: "Next Steps"
}

const DEFAULT_OUTLINE_ORDER = [
  "aim",
  "introduction",
  "principle",
  "material",
  "preparation",
  "procedure",
  "setup",
  "dataAnalysis",
  "charts",
  "results",
  "discussion",
  "conclusion",
  "nextSteps"
]

/** Normalize chart data from DB (may be old array format) or API (new object format). */
function normalizeChartData(raw: any): ChartDataState | null {
  if (!raw) return null
  // New format: { chartTitle, yAxisLabel, data: [...] }
  if (raw.data && Array.isArray(raw.data)) {
    return {
      chartTitle: raw.chartTitle || undefined,
      yAxisLabel: raw.yAxisLabel || undefined,
      data: raw.data
    }
  }
  // Old format: plain array [{label, value}, ...]
  if (Array.isArray(raw) && raw.length > 0) {
    return { data: raw }
  }
  return null
}

/**
 * Strip the leading markdown heading from content if it matches the section title.
 * e.g. section "Aim" with content "### Aim\n- point" → "- point"
 * This prevents the heading from appearing twice (once from the UI, once from the LLM).
 */
function stripDuplicateHeading(content: string, sectionTitle: string): string {
  if (!content) return content
  const trimmed = content.trimStart()
  // Match leading markdown heading: # Title, ## Title, ### Title, etc.
  const headingMatch = trimmed.match(/^(#{1,6})\s+(.+?)(\n|$)/)
  if (!headingMatch) return content
  const headingText = headingMatch[2].trim()
  // Compare case-insensitively and ignore trailing punctuation/whitespace
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
  if (normalize(headingText) === normalize(sectionTitle)) {
    // Remove the heading line
    return trimmed.slice(headingMatch[0].length)
  }
  return content
}

interface ReportReviewProps {
  onSave: () => void
  reportId: string
}

export function ReportReviewComponent({ onSave, reportId }: ReportReviewProps) {
  const [loading, setLoading] = useState(true)
  const [isRegenerateLoading, setRegenerateLoading] = useState(false)
  const [generatedOutline, setGeneratedOutline] = useState<string[]>([])
  const [activeSection, setActiveSection] = useState<number>(0)
  const [sectionContents, setSectionContents] = useState<
    Record<string, string>
  >({})
  const [question, setQuestion] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState("")
  const [chartImage, setChartImage] = useState<string | null>(null)
  const [chartData, setChartData] = useState<{
    chartTitle?: string
    yAxisLabel?: string
    data: Array<{ label: string; value: number }>
  } | null>(null)
  const [isQuestionSectionVisible, setIsQuestionSectionVisible] = useState(true)
  const [canGenerate, setCanGenerate] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<any | null>(null)
  const [pendingObjective, setPendingObjective] = useState<string>("")
  const [generationStatus, setGenerationStatus] = useState<
    "generating" | "ready" | "error" | null
  >(null)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const reportContentRef = useRef<HTMLDivElement>(null)

  const handleDownloadPDF = useCallback(async () => {
    if (!reportContentRef.current) return

    try {
      const html2canvas = (await import("html2canvas")).default
      const { jsPDF } = await import("jspdf")

      const element = reportContentRef.current

      // Temporarily force standard black text colors for PDF export
      const pdfStyleOverride = document.createElement("style")
      pdfStyleOverride.id = "pdf-export-override"
      pdfStyleOverride.textContent = `
        [data-pdf-capture] * {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
        [data-pdf-capture] h1, [data-pdf-capture] h2, [data-pdf-capture] h3,
        [data-pdf-capture] h4, [data-pdf-capture] h5, [data-pdf-capture] h6 {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
        [data-pdf-capture] p, [data-pdf-capture] li, [data-pdf-capture] td,
        [data-pdf-capture] th, [data-pdf-capture] span, [data-pdf-capture] div {
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
        }
        [data-pdf-capture] table {
          border-color: #d1d5db !important;
        }
        [data-pdf-capture] th {
          background-color: #f3f4f6 !important;
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
      `
      document.head.appendChild(pdfStyleOverride)
      element.setAttribute("data-pdf-capture", "true")

      // Wait a frame for styles to apply
      await new Promise(resolve => requestAnimationFrame(resolve))

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      })

      // Remove temporary styles
      element.removeAttribute("data-pdf-capture")
      pdfStyleOverride.remove()

      const imgWidth = 190 // A4 usable width in mm
      const pageHeight = 277 // A4 usable height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF("p", "mm", "a4")
      let heightLeft = imgHeight
      let position = 10

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        10,
        position,
        imgWidth,
        imgHeight
      )
      heightLeft -= pageHeight

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

      pdf.save("Report Draft.pdf")
    } catch (error) {
      console.error("[REPORT] Failed to generate PDF:", error)
      // Cleanup override styles on error
      reportContentRef.current?.removeAttribute("data-pdf-capture")
      document.getElementById("pdf-export-override")?.remove()
    }
  }, [])

  // outlineMapping / defaultOutlineOrder live at module scope as
  // OUTLINE_MAPPING / DEFAULT_OUTLINE_ORDER - see top of file.
  const outlineMapping = OUTLINE_MAPPING

  const hasSavedDraft = useMemo(() => {
    return (
      generatedOutline.length > 0 && Object.keys(sectionContents).length > 0
    )
  }, [generatedOutline, sectionContents])

  const refreshReportData = useCallback(async () => {
    if (!reportId) return

    try {
      const [groupedFiles, report] = await Promise.all([
        getReportFilesByReportId(reportId),
        getReportWithDetails(reportId)
      ])

      const status = ((report as any)?.generation_status ||
        null) as typeof generationStatus
      const error = ((report as any)?.generation_error || null) as string | null

      setGenerationStatus(status)
      setGenerationError(error)

      // If saved content exists, load it
      const savedOutline = (report as any).report_outline as string[] | null
      const savedDraft = (report as any).report_draft as Record<
        string,
        string
      > | null
      const savedChartImage = (report as any).chart_image as string | null
      const savedChartDataRaw = (report as any).chart_data as any | null
      // Fallback: extract chart data embedded inside report_draft._chartData
      const draftChartDataRaw =
        savedChartDataRaw ||
        ((report as any).report_draft as any)?._chartData ||
        null
      const savedChartData = normalizeChartData(draftChartDataRaw)

      // Case 1: we have explicit saved outline + draft
      if (savedOutline && savedOutline.length && savedDraft) {
        setGeneratedOutline(savedOutline)
        setSectionContents(savedDraft)
        setChartImage(savedChartImage || savedDraft["charts"] || null)
        if (savedChartData) setChartData(savedChartData)
        setCanGenerate(false)
        return
      }

      // Case 2: outline missing but draft exists – derive outline from draft keys
      if (savedDraft && Object.keys(savedDraft).length > 0) {
        const derived = Object.keys(savedDraft).filter(k => !k.startsWith("_"))
        // Order derived keys by our default ordering
        const ordered = derived.sort(
          (a, b) =>
            DEFAULT_OUTLINE_ORDER.indexOf(a) - DEFAULT_OUTLINE_ORDER.indexOf(b)
        )
        setGeneratedOutline(ordered)
        setSectionContents(savedDraft)
        setChartImage(savedChartImage || savedDraft["charts"] || null)
        if (savedChartData) setChartData(savedChartData)

        // Persist outline so future loads are straightforward
        updateReport(reportId, { report_outline: ordered } as any).catch(
          () => {}
        )

        setCanGenerate(false)
        return
      }

      // Else do not auto-generate here; allow manual generation if files are linked
      if (Object.values(groupedFiles).some(files => files.length > 0)) {
        setPendingFiles(groupedFiles)
        setPendingObjective((report as any)?.description || "")

        // If background generation is running, we show a loader instead of the empty UI.
        if (status === "generating") {
          setCanGenerate(false)
        } else {
          setCanGenerate(true)
        }
      }
    } catch (error) {
      console.error("Error fetching report data:", error)
    }
    // generationStatus appears only in a `typeof` type assertion above
    // (compile-time), not as a real runtime dependency - keeping it here
    // tripped exhaustive-deps. DEFAULT_OUTLINE_ORDER is module-scope so
    // it doesn't need to be listed.
  }, [reportId])

  useEffect(() => {
    const loadReportData = async () => {
      setLoading(true)
      try {
        await refreshReportData()
      } catch (error) {
        console.error("Error loading report files:", error)
      } finally {
        setLoading(false)
      }
    }

    loadReportData()
  }, [reportId, refreshReportData])

  // Poll while background generation is running, so we swap from loader -> content as soon
  // as `report_draft` is persisted.
  useEffect(() => {
    if (generationStatus !== "generating" || hasSavedDraft) return
    const interval = setInterval(() => {
      void refreshReportData()
    }, 3000)
    return () => clearInterval(interval)
  }, [generationStatus, hasSavedDraft, refreshReportData])

  const generateDraft = async (files: any, reportObjective: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/report/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentObjective: reportObjective,
          protocol: (files?.protocol || []).map((file: any) => file.id),
          papers: (files?.papers || []).map((file: any) => file.id),
          dataFiles: (files?.dataFiles || []).map((file: any) => file.id)
        })
      })
      const data = await response.json()
      if (data.reportOutline && data.reportDraft) {
        console.log("report draft: " + data.reportDraft)
        setGeneratedOutline(data.reportOutline)
        setSectionContents(data.reportDraft)
        setChartImage(data.chartImage)
        if (data.chartData) setChartData(normalizeChartData(data.chartData))

        // Persist to DB
        try {
          await updateReport(reportId, {
            report_outline: data.reportOutline,
            report_draft: data.reportDraft,
            chart_image: data.chartImage,
            chart_data: data.chartData
          } as any)
        } catch (e) {
          console.error("Failed to save generated report content:", e)
        }
      } else {
        throw new Error("No outline or draft data received")
      }
    } catch (error) {
      console.error("Error generating draft:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  if (generationStatus === "generating" && !hasSavedDraft) {
    return (
      <div className="flex h-[calc(100vh-60px)] w-full flex-col overflow-hidden">
        <div className="flex items-center justify-center border-b px-4 py-3">
          <h1 className="text-2xl font-bold">Report Generation in Progress</h1>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <Loader text="Generating report draft" />
        </div>
      </div>
    )
  }

  if (generationStatus === "error" && generationError && !hasSavedDraft) {
    // Fall back to manual generation, but make the failure obvious.
    // `canGenerate` will be true if the report has attachments.
    console.error("Report generation failed:", generationError)
  }

  const handleSave = () => {
    // Simulate saving data
    console.log("Saving draft:", sectionContents)
    onSave()
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditedContent(sectionContents[generatedOutline[activeSection]] || "")
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedContent("")
  }

  const handleSaveEdit = () => {
    setSectionContents(prev => ({
      ...prev,
      [generatedOutline[activeSection]]: editedContent
    }))
    setIsEditing(false)
    setEditedContent("")

    // Persist to DB
    const updated = {
      ...sectionContents,
      [generatedOutline[activeSection]]: editedContent
    }
    updateReport(reportId, {
      report_draft: updated
    } as any).catch(err => console.error("Failed to save edited section:", err))
  }

  const handleRegenerateSection = async () => {
    try {
      setRegenerateLoading(true)
      const currentSectionName = generatedOutline[activeSection]
      const currentContent = sectionContents[currentSectionName]

      if (!currentSectionName || !currentContent || !question) {
        console.error("Missing required fields:", {
          currentSectionName,
          currentContent,
          question
        })
        throw new Error("Missing required fields for regeneration")
      }

      const response = await fetch("/api/report/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sectionName: currentSectionName,
          currentContent: currentContent,
          userFeedback: question
        })
      })

      const result = await response.json()
      if (result.success) {
        setSectionContents(prev => ({
          ...prev,
          [generatedOutline[activeSection]]: result.regeneratedContent
        }))

        // Persist regenerated section to DB
        const updated = {
          ...sectionContents,
          [generatedOutline[activeSection]]: result.regeneratedContent
        }
        updateReport(reportId, {
          report_draft: updated
        } as any).catch(err =>
          console.error("Failed to save regenerated section:", err)
        )
      } else {
        throw new Error("Failed to regenerate content")
      }
    } catch (error) {
      console.error("Error regenerating content:", error)
      // You might want to add error handling UI here
    } finally {
      setQuestion("")
      setRegenerateLoading(false)
    }
  }

  const handleDownload = () => {
    setLoading(true)
    let pptx = new PptxGenJS()
    getIntroSlide(pptx, "Report")
    // playtestSelected
    // Iterate through all sections and create content slides
    generatedOutline.forEach((section, index) => {
      const content = sectionContents[section] || ""
      const title = outlineMapping[section] || section

      // Assuming getContentSlide is a function similar to getIntroSlide
      getContentSlide(pptx, title, content)
    })

    pptx.writeFile({ fileName: "Report Draft.pptx" }).then(() => {
      setLoading(false)
    })
    setQuestion("")
  }

  const toggleQuestionSection = () => {
    setIsQuestionSectionVisible(!isQuestionSectionVisible)
  }

  return (
    <div className="bg-foreground flex size-full max-h-[calc(100vh-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg shadow-lg">
      {loading ? (
        <div className="my-48 w-full text-center">
          <Loader text="Generating report draft" />
        </div>
      ) : (
        <>
          <div className="bg-secondary flex w-1/4 flex-col pt-4">
            <div className="px-4 py-2 text-sm text-gray-500"></div>
            <ScrollArea className="grow">
              <div className="space-y-2 p-4">
                {generatedOutline.map((item, index) => (
                  <button
                    key={index}
                    className={`flex w-full items-center space-x-2 rounded-md px-4 py-2 text-left transition-colors ${
                      activeSection === index
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-primary/10"
                    }`}
                    onClick={() => {
                      setActiveSection(index)
                      sectionRefs.current[item]?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                      })
                    }}
                  >
                    <span>{outlineMapping[item] || item}</span>
                    {activeSection === index && (
                      <ChevronRight className="ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
          <Separator orientation="vertical" className="bg-white" />
          <div
            style={{ maxWidth: "100%" }}
            className="bg-secondary flex w-3/4 min-w-0 flex-col"
          >
            <div
              className={`transition-all duration-300 ease-in-out ${isQuestionSectionVisible ? "max-h-40" : "max-h-0 overflow-hidden"}`}
            >
              <div className="p-6">
                <h3 className="mb-2 text-lg font-semibold">
                  Would you like to change anything?
                </h3>
                <div className="mt-4 flex w-full items-center">
                  <Input
                    type="text"
                    placeholder="Type your prompt here..."
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    className="mr-4 h-12 grow"
                  />
                  <Button
                    onClick={handleRegenerateSection}
                    className="bg-foreground text-background"
                  >
                    Go <Sparkles className="ml-2 size-4" />
                  </Button>
                  {canGenerate && (
                    <Button
                      onClick={() => {
                        if (pendingFiles) {
                          generateDraft(pendingFiles, pendingObjective)
                          setCanGenerate(false)
                        }
                      }}
                      className="text-background ml-4 bg-green-600"
                    >
                      Generate Draft
                    </Button>
                  )}
                  <Button
                    onClick={handleDownload}
                    className="text-background ml-4 bg-blue-500"
                  >
                    Download Report <DownloadIcon className="ml-2 size-4" />
                  </Button>
                  <Button
                    onClick={handleDownloadPDF}
                    variant="outline"
                    className="ml-2"
                  >
                    <FileDown className="mr-2 size-4" />
                    Download as PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="ml-2"
                    onClick={() => {
                      // ELN upload - not yet functional
                    }}
                  >
                    <Upload className="mr-2 size-4" />
                    Upload to ELN
                  </Button>
                </div>
              </div>
              <Separator className="bg-foreground my-4" />
            </div>
            <div className="mt-6 flex items-center justify-end px-6">
              {/* <h2 className="text-primary text-3xl font-bold">
                {outlineMapping[generatedOutline[activeSection]]}
              </h2> */}
              <div className="flex items-center space-x-2">
                {!isEditing && (
                  <>
                    <Button variant="outline" size="icon" onClick={handleEdit}>
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      title="Copy to clipboard"
                      variant="outline"
                      size="icon"
                      onClick={handleEdit}
                    >
                      <CopyIcon className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleQuestionSection}
                      title={
                        isQuestionSectionVisible
                          ? "Hide question section"
                          : "Show question section"
                      }
                    >
                      {isQuestionSectionVisible ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <ScrollArea className="mt-6 grow px-6">
              <div ref={reportContentRef} className="space-y-10">
                {generatedOutline.map((section, index) => (
                  <div
                    key={section}
                    ref={el => {
                      sectionRefs.current[section] = el
                    }}
                    className="pb-4"
                  >
                    <h2
                      className={`mb-3 text-2xl font-bold ${
                        activeSection === index ? "text-primary" : ""
                      }`}
                    >
                      {outlineMapping[section] || section}
                    </h2>

                    {section === "charts" ? (
                      <div className="max-w-none overflow-x-auto break-words pb-4">
                        {chartData &&
                        chartData.data &&
                        chartData.data.length > 0 ? (
                          <ReportChart
                            data={chartData.data}
                            chartTitle={chartData.chartTitle}
                            yAxisLabel={chartData.yAxisLabel}
                          />
                        ) : chartImage ? (
                          <div>
                            {chartData?.chartTitle && (
                              <h3 className="mb-4 text-center text-lg font-semibold">
                                {chartData.chartTitle}
                              </h3>
                            )}
                            {/* chartImage is a base64 data URI from the
                                chart-generation backend - next/image doesn't
                                support data URIs. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={chartImage}
                              alt="Data visualization chart"
                              className="h-auto max-w-full rounded-lg shadow-lg"
                            />
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            No visualization data available.
                          </p>
                        )}
                      </div>
                    ) : isEditing && activeSection === index ? (
                      <textarea
                        className="h-[calc(100vh-20rem)] w-full rounded border p-2"
                        value={editedContent}
                        onChange={e => setEditedContent(e.target.value)}
                      />
                    ) : isRegenerateLoading && activeSection === index ? (
                      <Loader text="Regenerating content" />
                    ) : (
                      <div className="prose dark:prose-invert max-w-none overflow-x-auto break-words pb-4 [&>*:first-child]:mt-0 [&_li]:my-0 [&_ol]:my-1 [&_p]:my-1 [&_ul]:my-1">
                        <ReactMarkdown
                          className="whitespace-pre-wrap break-words"
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ children }) => (
                              <div className="my-4 overflow-x-auto rounded-lg border">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                  {children}
                                </table>
                              </div>
                            ),
                            thead: ({ children }) => (
                              <thead className="bg-muted/50">{children}</thead>
                            ),
                            tbody: ({ children }) => (
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {children}
                              </tbody>
                            ),
                            tr: ({ children }) => (
                              <tr className="hover:bg-muted/30 transition-colors">
                                {children}
                              </tr>
                            ),
                            th: ({ children }) => (
                              <th className="text-foreground px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="text-muted-foreground whitespace-nowrap px-4 py-3 text-sm">
                                {children}
                              </td>
                            )
                          }}
                        >
                          {stripDuplicateHeading(
                            (sectionContents[section] || "")
                              .trim()
                              .replace(/\n{3,}/g, "\n\n"),
                            outlineMapping[section] || section
                          )}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            {isEditing && (
              <div className="bg-secondary mt-auto flex justify-center space-x-4 p-4">
                <Button
                  className="bg-foreground h-10 w-28 opacity-70"
                  onClick={handleCancel}
                >
                  <X className="mr-2 size-4" />
                  Cancel
                </Button>
                <Button className="h-10 w-28" onClick={handleSaveEdit}>
                  <Check className="mr-2 size-4" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ReportReviewComponent
