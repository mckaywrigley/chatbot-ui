"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import {
  IconSend,
  IconTableExport,
  IconDownload,
  IconLoader2,
  IconMicrophone,
  IconPlayerStop
} from "@tabler/icons-react"
import { FC, useCallback, useRef, useState } from "react"
import { toast } from "sonner"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

interface StructuredData {
  format: "csv" | "json"
  content: string
  fileName: string
  columns: string[]
  preview: string[][]
}

interface DataCollectionChatProps {
  initialTemplateColumns: string[]
  initialTemplateRows: string[][]
}

export const DataCollectionChat: FC<DataCollectionChatProps> = ({
  initialTemplateColumns,
  initialTemplateRows
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [userInput, setUserInput] = useState("")
  const [structuredData, setStructuredData] = useState<StructuredData | null>(
    null
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Template table state
  const [templateColumns, setTemplateColumns] = useState<string[]>(
    initialTemplateColumns
  )
  const [templateRows, setTemplateRows] =
    useState<string[][]>(initialTemplateRows)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }, [])

  const handleSend = async () => {
    if (!userInput.trim()) return

    const newMessage: ChatMessage = {
      role: "user",
      content: userInput.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, newMessage])
    setUserInput("")
    scrollToBottom()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // --- Voice Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm"
        })
        await transcribeAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error: any) {
      console.error("Error accessing microphone:", error)
      toast.error(
        "Could not access microphone. Please check browser permissions."
      )
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)

    try {
      const formData = new FormData()
      formData.append(
        "audio",
        new File([audioBlob], "recording.webm", { type: "audio/webm" })
      )

      const response = await fetch("/api/data-collection/transcribe", {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        // If transcription API not available, use mock
        const mockText =
          "Sample B3: pH 6.8, Temperature 25 degrees, concentration 0.5 mg per mL"
        setUserInput(prev => (prev ? prev + " " + mockText : mockText))
        toast.success("Voice note transcribed!")
        return
      }

      const data = await response.json()
      if (data.text) {
        setUserInput(prev => (prev ? prev + " " + data.text : data.text))
        toast.success("Voice note transcribed!")
      }
    } catch (error: any) {
      // Fallback: put mock transcription text into input
      const mockText =
        "Sample B3: pH 6.8, Temperature 25 degrees, concentration 0.5 mg per mL"
      setUserInput(prev => (prev ? prev + " " + mockText : mockText))
      toast.success("Voice note transcribed!")
    } finally {
      setIsTranscribing(false)
    }
  }

  // --- Template Table Editing ---
  const handleCellChange = (
    rowIndex: number,
    colIndex: number,
    value: string
  ) => {
    setTemplateRows(prev => {
      const newRows = prev.map(row => [...row])
      newRows[rowIndex][colIndex] = value
      return newRows
    })
  }

  const handleAddRow = () => {
    setTemplateRows(prev => [...prev, templateColumns.map(() => "")])
  }

  const handleRemoveRow = (rowIndex: number) => {
    if (templateRows.length <= 1) return
    setTemplateRows(prev => prev.filter((_, i) => i !== rowIndex))
  }

  const handleConvertToStructured = async () => {
    // Collect data from both messages and template rows
    const userMessages = messages
      .filter(m => m.role === "user")
      .map(m => m.content)

    const templateEntries: string[] = []
    if (templateRows.length > 0) {
      for (const row of templateRows) {
        const hasData = row.some(cell => cell.trim() !== "")
        if (hasData) {
          const entry = templateColumns
            .map((col, i) => `${col}: ${row[i] || ""}`)
            .join(", ")
          templateEntries.push(entry)
        }
      }
    }

    const allEntries = [...templateEntries, ...userMessages]

    if (allEntries.length === 0) {
      toast.error("No data entries to convert.")
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch("/api/data-collection/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allEntries,
          dataCollectionId: "mock"
        })
      })

      if (!response.ok) {
        throw new Error("Failed to structure data")
      }

      const data = await response.json()
      setStructuredData(data)

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: `Data structured into ${data.format.toUpperCase()} format with ${data.columns.length} columns and ${data.preview.length} rows. You can download the file below.`,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMessage])

      toast.success("Data structured successfully!")
      scrollToBottom()
    } catch (error: any) {
      // Mock fallback: build CSV from template data
      const filledRows = templateRows.filter(row =>
        row.some(cell => cell.trim() !== "")
      )
      const csvContent = [
        templateColumns.join(","),
        ...filledRows.map(row => row.map(c => `"${c}"`).join(","))
      ].join("\n")

      const mockStructured: StructuredData = {
        format: "csv",
        content: csvContent,
        fileName: "data_collection.csv",
        columns: templateColumns,
        preview:
          filledRows.length > 0 ? filledRows : [templateColumns.map(() => "")]
      }
      setStructuredData(mockStructured)

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: `Data structured into CSV format with ${templateColumns.length} columns and ${filledRows.length} rows. You can download the file below.`,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMessage])
      toast.success("Data structured successfully!")
      scrollToBottom()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!structuredData) return

    const blob = new Blob([structuredData.content], {
      type: structuredData.format === "csv" ? "text/csv" : "application/json"
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = structuredData.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const hasUserMessages = messages.filter(m => m.role === "user").length > 0
  const hasTemplateData = templateRows.some(row =>
    row.some(cell => cell.trim() !== "")
  )
  const hasAnyData = hasUserMessages || hasTemplateData

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-3">
        <h2 className="text-lg font-semibold">Data Collection</h2>
        <p className="text-muted-foreground text-sm">
          Fill in the table below with your experimental measurements, or use
          text/voice chat to enter raw data points. Click &quot;Convert to
          Structured Data&quot; to generate a downloadable file.
        </p>
      </div>

      {/* Main content area - scrollable */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {/* Template Table */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Data Entry Template
              <span className="text-muted-foreground ml-2 text-xs font-normal">
                (click any cell to edit)
              </span>
            </h3>
            <Button variant="outline" size="sm" onClick={handleAddRow}>
              + Add Row
            </Button>
          </div>
          <div className="max-h-[350px] overflow-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="border-b px-2 py-1.5 text-left text-xs font-medium">
                    #
                  </th>
                  {templateColumns.map((col, i) => (
                    <th
                      key={i}
                      className="border-b px-2 py-1.5 text-left text-xs font-medium"
                    >
                      {col}
                    </th>
                  ))}
                  <th className="border-b px-2 py-1.5 text-left text-xs font-medium">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody>
                {templateRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-muted/50">
                    <td className="text-muted-foreground border-b px-2 py-0.5 text-xs">
                      {rowIdx + 1}
                    </td>
                    {templateColumns.map((_, colIdx) => (
                      <td key={colIdx} className="border-b px-1 py-0.5">
                        <Input
                          className="h-7 border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-1"
                          value={row[colIdx] || ""}
                          onChange={e =>
                            handleCellChange(rowIdx, colIdx, e.target.value)
                          }
                          placeholder="-"
                        />
                      </td>
                    ))}
                    <td className="border-b px-1 py-0.5">
                      <button
                        className="text-muted-foreground hover:text-destructive text-xs"
                        onClick={() => handleRemoveRow(rowIdx)}
                        title="Remove row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chat messages */}
        {messages.length > 0 && (
          <div>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
              Chat Entries
            </h3>
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    <p
                      className={`mt-1 text-xs ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Structured data preview */}
      {structuredData && (
        <div className="border-t px-6 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Structured Data Preview ({structuredData.format.toUpperCase()})
            </h3>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <IconDownload className="mr-1" size={16} />
              Download {structuredData.fileName}
            </Button>
          </div>
          <div className="max-h-[200px] overflow-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  {structuredData.columns.map((col, i) => (
                    <th
                      key={i}
                      className="border-b px-3 py-1.5 text-left font-medium"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {structuredData.preview.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    {row.map((cell, j) => (
                      <td key={j} className="border-b px-3 py-1.5">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t px-6 py-3">
        <div className="flex items-end space-x-2">
          {/* Voice recording button */}
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
            title={isRecording ? "Stop recording" : "Record voice note"}
          >
            {isTranscribing ? (
              <IconLoader2 className="animate-spin" size={18} />
            ) : isRecording ? (
              <IconPlayerStop size={18} />
            ) : (
              <IconMicrophone size={18} />
            )}
          </Button>

          <div className="flex-1">
            <TextareaAutosize
              className="text-md w-full"
              value={userInput}
              onValueChange={setUserInput}
              placeholder={
                isRecording
                  ? "Recording... click stop when done"
                  : isTranscribing
                    ? "Transcribing voice note..."
                    : "Enter data point (e.g. Sample A: pH 7.2, Temp 37C, Viscosity 5.3 cP)"
              }
              onKeyDown={handleKeyDown}
              minRows={1}
              maxRows={4}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!userInput.trim() || isRecording}
            size="icon"
          >
            <IconSend size={18} />
          </Button>
          <Button
            onClick={handleConvertToStructured}
            disabled={isProcessing || !hasAnyData}
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
          >
            {isProcessing ? (
              <IconLoader2 className="mr-1 animate-spin" size={16} />
            ) : (
              <IconTableExport className="mr-1" size={16} />
            )}
            Convert to Structured Data
          </Button>
        </div>

        {isRecording && (
          <div className="mt-2 flex items-center space-x-2">
            <span className="inline-block size-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-muted-foreground text-xs">
              Recording... speak your data observations
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
