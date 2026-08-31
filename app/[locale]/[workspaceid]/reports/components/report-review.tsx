"use client"

import { useState, useEffect, useContext } from "react"
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
  Download,
  DownloadIcon,
  FlaskConical,
  Plus
} from "lucide-react"
import { useReportContext } from "@/context/reportcontext"
import { ChatbotUIContext } from "@/context/context"
import { ELNExportModal } from "@/components/eln/eln-export-modal"
import { ELNConnectModal } from "@/components/eln/eln-connect-modal"
import { ELNConnection } from "@/types/eln"
import { getELNConnections } from "@/db/eln-connections"
import { toast } from "sonner"

interface ReportReviewProps {
  onSave: () => void
  onCancel: () => void
  colorId: string
}

export function ReportReviewComponent({
  onCancel,
  onSave,
  colorId
}: ReportReviewProps) {
  const [isLoading, setLoading] = useState(true)
  const [generatedOutline, setGeneratedOutline] = useState<string[]>([])
  const [activeSection, setActiveSection] = useState<number>(0)
  const [sectionContents, setSectionContents] = useState<
    Record<string, string>
  >({})
  const [question, setQuestion] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState("")
  const { selectedFiles } = useReportContext()
  const [chartImage, setChartImage] = useState<string | null>(null)
  const [isQuestionSectionVisible, setIsQuestionSectionVisible] = useState(true)

  // ELN Integration state
  const { profile } = useContext(ChatbotUIContext)
  const [elnConnections, setElnConnections] = useState<ELNConnection[]>([])
  const [showELNExportModal, setShowELNExportModal] = useState(false)
  const [showELNConnectModal, setShowELNConnectModal] = useState(false)
  const [loadingConnections, setLoadingConnections] = useState(false)

  useEffect(() => {
    const generateDraft = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/report/outline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(selectedFiles)
        })
        const data = await response.json()
        console.log("Received data from API:", data)
        if (data.reportOutline && data.reportDraft) {
          setGeneratedOutline(data.reportOutline)
          setSectionContents(data.reportDraft)
          setChartImage(data.chartImage)
        } else {
          throw new Error("No outline or draft data received")
        }
      } catch (error) {
        console.error("Error generating draft:", error)
      } finally {
        setLoading(false)
      }
    }

    if (
      selectedFiles.protocol ||
      selectedFiles.papers ||
      selectedFiles.dataFiles
    ) {
      generateDraft()
    }
  }, [selectedFiles])

  // Load ELN connections on component mount
  useEffect(() => {
    const loadELNConnections = async () => {
      if (!profile?.user_id) return

      setLoadingConnections(true)
      try {
        const connections = await getELNConnections(profile.user_id)
        setElnConnections(connections)
      } catch (error) {
        console.error("Failed to load ELN connections:", error)
      } finally {
        setLoadingConnections(false)
      }
    }

    loadELNConnections()
  }, [profile?.user_id])

  const handleSave = () => {
    // Simulate saving data
    console.log("Saving draft:", sectionContents)
    onSave()
  }

  const handleSectionClick = (index: number) => {
    setActiveSection(index)
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
  }

  const handleAskQuestion = () => {
    // Simulate asking a question
    console.log("Asking question:", question)
    // Here you would typically make an API call to get the answer
    // For now, we'll just clear the input
    setQuestion("")
  }

  const handleDownload = () => {
    // Simulate asking a question
    console.log("Asking question:", question)
    // Here you would typically make an API call to get the answer
    // For now, we'll just clear the input
    setQuestion("")
  }

  const toggleQuestionSection = () => {
    setIsQuestionSectionVisible(!isQuestionSectionVisible)
  }

  const handleELNExport = () => {
    if (elnConnections.length === 0) {
      setShowELNConnectModal(true)
    } else {
      setShowELNExportModal(true)
    }
  }

  const handleConnectionCreated = (connection: ELNConnection) => {
    setElnConnections(prev => [...prev, connection])
    setShowELNExportModal(true) // Open export modal after connection created
  }

  const getFullReportContent = (): string => {
    const sections = generatedOutline
      .map(section => {
        const content = sectionContents[section] || ""
        return `## ${section}\n\n${content}\n\n`
      })
      .join("")

    return `# Shadow AI Generated Report\n\nGenerated on: ${new Date().toLocaleDateString()}\n\n${sections}`
  }

  const getReportTitle = (): string => {
    return generatedOutline[0] || "Shadow AI Report"
  }

  return (
    <div className="bg-foreground flex max-h-[calc(100vh-6rem)] overflow-hidden rounded-lg shadow-lg">
      {isLoading ? (
        <div className="my-48 w-full text-center">
          <Loader text="Generating report draft" />
        </div>
      ) : (
        <>
          <div className="bg-secondary flex w-1/3 flex-col pt-4">
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
                    onClick={() => setActiveSection(index)}
                  >
                    <span>{item}</span>
                    {activeSection === index && (
                      <ChevronRight className="ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
          <Separator orientation="vertical" />
          <div className="bg-secondary flex w-2/3 flex-col">
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
                    onClick={handleAskQuestion}
                    className="bg-foreground text-background"
                  >
                    Go <Sparkles className="ml-2 size-4" />
                  </Button>
                  <Button
                    onClick={handleDownload}
                    className="text-background ml-4 bg-blue-500"
                  >
                    Download Report <DownloadIcon className="ml-2 size-4" />
                  </Button>
                  <Button
                    onClick={handleELNExport}
                    className="text-background ml-2 bg-emerald-500"
                    disabled={loadingConnections}
                  >
                    Export to ELN <FlaskConical className="ml-2 size-4" />
                  </Button>
                </div>
              </div>
              <Separator className="bg-foreground my-4" />
            </div>
            <div className="mt-6 flex items-center justify-between px-6">
              <h2 className="text-primary text-3xl font-bold">
                {generatedOutline[activeSection]}
              </h2>
              <div className="flex items-center space-x-2">
                {!isEditing && (
                  <>
                    <Button variant="outline" size="icon" onClick={handleEdit}>
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      title="Regenerate"
                      variant="outline"
                      size="icon"
                      onClick={handleEdit}
                    >
                      <RefreshCcw className="size-4" />
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
              <div className="prose dark:prose-invert max-w-none">
                {isEditing ? (
                  <textarea
                    className="h-[calc(100vh-20rem)] w-full rounded border p-2"
                    value={editedContent}
                    onChange={e => setEditedContent(e.target.value)}
                  />
                ) : (
                  <div className="whitespace-pre-wrap">
                    {sectionContents[generatedOutline[activeSection]] || ""}
                  </div>
                )}
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
                <Button className="h-10 w-28" onClick={handleSave}>
                  <Check className="mr-2 size-4" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ELN Export Modal */}
      <ELNExportModal
        isOpen={showELNExportModal}
        onOpenChange={setShowELNExportModal}
        connections={elnConnections}
        reportContent={getFullReportContent()}
        reportTitle={getReportTitle()}
        onExportSuccess={result => {
          if (result.success) {
            toast.success("Report exported to ELN successfully!")
          }
        }}
      />

      {/* ELN Connect Modal */}
      <ELNConnectModal
        isOpen={showELNConnectModal}
        onOpenChange={setShowELNConnectModal}
        userId={profile?.user_id || ""}
        onConnectionCreated={handleConnectionCreated}
      />
    </div>
  )
}

export default ReportReviewComponent
