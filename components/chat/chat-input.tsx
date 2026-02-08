import { useChatbotUI } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import { updateProfile } from "@/db/profile"
import {
  IconArrowUp,
  IconBolt,
  IconBrandGoogleDrive,
  IconCirclePlus,
  IconLoader2,
  IconPlayerStopFilled,
  IconSend,
  IconSparkles,
  IconWaveSine,
  IconWorld,
  IconX
} from "@tabler/icons-react"
import Image from "next/image"
import Link from "next/link"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Input } from "../ui/input"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { ChatCommandInput } from "./chat-command-input"
import { ChatFilesDisplay } from "./chat-files-display"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { useChatHistoryHandler } from "./chat-hooks/use-chat-history"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { useSelectFileHandler } from "./chat-hooks/use-select-file-handler"
// Add import for property message handler
import { PropertyMessageHandler } from "@/lib/property/property-message-handler"
import { nanoid } from "nanoid"
// Import the ReportLoading component
import { ReportLoading } from "@/components/property/report-loading"
import { FilePickerDropdown } from "./file-picker-dropdown"
import { WebSearchToggle } from "./web-search-toggle"
import { ModelSelector } from "./model-selector"
import { PipedreamDataSources } from "./pipedream-data-sources"
import { FeatureTabs } from "@/components/ui/feature-tabs"

// Feature flag - hide connectors for launch
const SHOW_CONNECTORS = false

interface ChatInputProps {
  onVoiceModeClick?: () => void
}

export const ChatInput: FC<ChatInputProps> = ({ onVoiceModeClick }) => {
  const { t } = useTranslation()

  // Create property message handler
  const propertyHandler = new PropertyMessageHandler()

  // Add state for property report loading animation
  const [isGeneratingPropertyReport, setIsGeneratingPropertyReport] =
    useState(false)

  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const [isTyping, setIsTyping] = useState<boolean>(false)
  const [attachedDriveFile, setAttachedDriveFile] = useState<string | null>(
    null
  )

  // Check for attached Drive file on mount and when sessionStorage changes
  useEffect(() => {
    const checkAttachedFile = () => {
      const fileName = sessionStorage.getItem("pendingFileName")
      setAttachedDriveFile(fileName)
    }

    checkAttachedFile()

    // Listen for storage events to update when file is attached
    window.addEventListener("storage", checkAttachedFile)

    // Check periodically since sessionStorage doesn't fire events in same window
    const interval = setInterval(checkAttachedFile, 500)

    return () => {
      window.removeEventListener("storage", checkAttachedFile)
      clearInterval(interval)
    }
  }, [])

  const handleRemoveAttachedFile = () => {
    sessionStorage.removeItem("pendingFileContext")
    sessionStorage.removeItem("pendingFileName")
    setAttachedDriveFile(null)
    toast.success("File removed")
  }

  const handleToggleWebSearch = async () => {
    if (!profile) return

    try {
      const updatedProfile = await updateProfile(profile.id, {
        web_search_enabled: false
      })
      setProfile(updatedProfile)
      toast.success("Web search disabled")
    } catch (error) {
      console.error("Failed to disable web search:", error)
      toast.error("Failed to disable web search")
    }
  }

  const {
    isAssistantPickerOpen,
    focusAssistant,
    setFocusAssistant,
    userInput,
    chatMessages,
    isGenerating,
    selectedPreset,
    selectedAssistant,
    focusPrompt,
    setFocusPrompt,
    focusFile,
    focusTool,
    setFocusTool,
    isToolPickerOpen,
    isPromptPickerOpen,
    setIsPromptPickerOpen,
    isFilePickerOpen,
    setFocusFile,
    chatSettings,
    selectedTools,
    setSelectedTools,
    assistantImages,
    setChatMessages,
    setIsGenerating,
    profile,
    setProfile,
    selectedChat,
    selectedWorkspace,
    userSubscription
  } = useChatbotUI()

  const {
    chatInputRef,
    handleSendMessage: originalHandleSendMessage,
    handleStopMessage,
    handleFocusChatInput
  } = useChatHandler()

  // Function to check if text likely contains an address
  const containsAddress = (text: string): boolean => {
    // Check for common address patterns
    const addressPatterns = [
      /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Place|Pl|Court|Ct)\b/i,
      /\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\b/,
      /property\s+at\s+.+/i,
      /address\s+.+/i
    ]

    return addressPatterns.some(pattern => pattern.test(text))
  }

  // Override handleSendMessage to include property detection
  const handleSendMessage = async (
    content: string,
    messages: any[],
    isRegeneration: boolean
  ) => {
    // Clear input immediately for better UX
    handleInputChange("")

    // Only check for property if this is a new message (not regeneration)
    if (!isRegeneration && content.trim()) {
      // Check if the content likely contains an address - but don't block on it
      if (containsAddress(content)) {
        // Show property report loading animation
        setIsGeneratingPropertyReport(true)

        // Run property detection in the background
        propertyHandler
          .handleMessage(content)
          .then(propertyResult => {
            setIsGeneratingPropertyReport(false)

            if (propertyResult) {
              // Get chat details from existing messages
              const chatId =
                messages.length > 0 ? messages[0].message.chat_id : ""
              const userId =
                messages.length > 0 ? messages[0].message.user_id : ""

              // Get next sequence number
              const lastSequenceNumber =
                messages.length > 0
                  ? messages[messages.length - 1].message.sequence_number
                  : -1

              // Create a user message to show what was asked
              const userMessage = {
                id: nanoid(),
                chat_id: chatId,
                role: "user",
                content,
                model: chatSettings?.model || "gpt-4",
                image_paths: [],
                sequence_number: lastSequenceNumber + 1,
                user_id: userId,
                assistant_id: selectedAssistant?.id || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }

              // Create an assistant message with the property report
              const assistantMessage = {
                id: nanoid(),
                chat_id: chatId,
                role: "assistant",
                content: propertyResult.content,
                model: chatSettings?.model || "gpt-4",
                image_paths: [],
                sequence_number: lastSequenceNumber + 2,
                user_id: userId,
                assistant_id: selectedAssistant?.id || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                reportData: propertyResult.reportData
              }

              // Add these messages to the chat
              setChatMessages(prevMessages => [
                ...prevMessages,
                { message: userMessage, fileItems: [] },
                { message: assistantMessage, fileItems: [] }
              ])
            }
          })
          .catch(error => {
            console.error("Error detecting property:", error)
            setIsGeneratingPropertyReport(false)
          })

        // Don't wait for property detection - continue with normal flow
      }
    }

    // Proceed with original message handling immediately
    originalHandleSendMessage(content, messages, isRegeneration)
  }

  const { handleInputChange } = usePromptAndCommand()

  const { filesToAccept, handleSelectDeviceFile } = useSelectFileHandler()

  const {
    setNewMessageContentToNextUserMessage,
    setNewMessageContentToPreviousUserMessage
  } = useChatHistoryHandler()

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => {
      handleFocusChatInput()
    }, 200) // FIX: hacky
  }, [selectedPreset, selectedAssistant])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isTyping && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      setIsPromptPickerOpen(false)
      handleSendMessage(userInput, chatMessages, false)
    }

    // Consolidate conditions to avoid TypeScript error
    if (
      isPromptPickerOpen ||
      isFilePickerOpen ||
      isToolPickerOpen ||
      isAssistantPickerOpen
    ) {
      if (
        event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault()
        // Toggle focus based on picker type
        if (isPromptPickerOpen) setFocusPrompt(!focusPrompt)
        if (isFilePickerOpen) setFocusFile(!focusFile)
        if (isToolPickerOpen) setFocusTool(!focusTool)
        if (isAssistantPickerOpen) setFocusAssistant(!focusAssistant)
      }
    }

    if (event.key === "ArrowUp" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToPreviousUserMessage()
    }

    if (event.key === "ArrowDown" && event.shiftKey && event.ctrlKey) {
      event.preventDefault()
      setNewMessageContentToNextUserMessage()
    }

    if (
      isAssistantPickerOpen &&
      (event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown")
    ) {
      event.preventDefault()
      setFocusAssistant(!focusAssistant)
    }
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    const imagesAllowed = LLM_LIST.find(
      llm => llm.modelId === chatSettings?.model
    )?.imageInput

    const items = event.clipboardData.items
    for (const item of items) {
      if (item.type.indexOf("image") === 0) {
        if (!imagesAllowed) {
          toast.error(
            `Images are not supported for this model. Use models like GPT-4 Vision instead.`
          )
          return
        }
        const file = item.getAsFile()
        if (!file) return
        handleSelectDeviceFile(file)
      }
    }
  }

  return (
    <>
      <div className="flex flex-col flex-wrap justify-center gap-2">
        {/* Only show file display when not generating (i.e., before sending message) */}
        {!isGenerating && <ChatFilesDisplay />}

        {/* Show the loading animation when generating a property report */}
        {isGeneratingPropertyReport && <ReportLoading />}

        {/* Show attached Google Drive file indicator */}
        {attachedDriveFile && (
          <div className="flex justify-center">
            <div className="flex items-center space-x-2 rounded-lg border border-blue-500/50 bg-blue-50 px-3 py-1.5 dark:bg-blue-950/30">
              <IconBrandGoogleDrive
                size={16}
                className="text-blue-600 dark:text-blue-400"
              />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {attachedDriveFile}
              </span>
              <button
                onClick={handleRemoveAttachedFile}
                className="ml-1 rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900"
                aria-label="Remove file"
              >
                <IconX size={14} className="text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          </div>
        )}

        {selectedTools &&
          selectedTools.map((tool, index) => (
            <div
              key={index}
              className="flex justify-center"
              onClick={() =>
                setSelectedTools(
                  selectedTools.filter(
                    selectedTool => selectedTool.id !== tool.id
                  )
                )
              }
            >
              <div className="flex cursor-pointer items-center justify-center space-x-1 rounded-lg bg-purple-600 px-3 py-1 hover:opacity-50">
                <IconBolt size={20} />

                <div>{tool.name}</div>
              </div>
            </div>
          ))}

        {selectedAssistant && (
          <div className="border-primary mx-auto flex w-fit items-center space-x-2 rounded-lg border p-1.5">
            {selectedAssistant.image_path && (
              <Image
                className="rounded"
                src={
                  assistantImages.find(
                    img => img.path === selectedAssistant.image_path
                  )?.base64
                }
                width={28}
                height={28}
                alt={selectedAssistant.name}
              />
            )}

            <div className="text-sm font-bold">
              Talking to {selectedAssistant.name}
            </div>
          </div>
        )}
      </div>

      {/* Claude-like input container */}
      <div className="relative mt-3 w-full">
        {/* Command Input (above main container) */}
        <div className="absolute bottom-[calc(100%+8px)] left-0 max-h-[300px] w-full overflow-auto rounded-xl">
          <ChatCommandInput />
        </div>

        {/* Navigation Tabs */}
        <FeatureTabs activeTab="chat" className="pl-2 sm:pl-4" />

        {/* Main input container with gradient border effect */}
        <div className="gradient-border relative z-0 rounded-2xl p-[1px] shadow-lg">
          <div className="bg-background flex w-full flex-col rounded-[15px]">
            {/* Web Search Pill Indicator */}
            {profile?.web_search_enabled && (
              <div className="px-4 pt-3">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-gray-700"
                  style={{ backgroundColor: "rgb(184 191 206)" }}
                >
                  <IconWorld size={16} />
                  <span className="text-sm font-medium">Web Search On</span>
                  <button
                    onClick={handleToggleWebSearch}
                    className="ml-1 rounded-full p-0.5 hover:bg-gray-400/50"
                    aria-label="Disable web search"
                  >
                    <IconX size={14} className="text-gray-700" />
                  </button>
                </div>
              </div>
            )}

            {/* Text input row */}
            <div className="relative flex items-center">
              <TextareaAutosize
                textareaRef={chatInputRef}
                className="ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring text-md flex w-full resize-none border-none bg-transparent px-4 py-3 pr-14 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={t(`Ask me anything...`)}
                onValueChange={handleInputChange}
                value={userInput}
                minRows={1}
                maxRows={18}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onCompositionStart={() => setIsTyping(true)}
                onCompositionEnd={() => setIsTyping(false)}
              />

              {/* Voice/Submit buttons (aligned with textarea) */}
              <div className="absolute right-3 top-3 cursor-pointer hover:opacity-50">
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <IconLoader2
                      className="animate-spin text-[#60A5FA]"
                      size={30}
                      strokeWidth={2.5}
                    />
                  </div>
                ) : !userInput && onVoiceModeClick ? (
                  <button
                    onClick={onVoiceModeClick}
                    className="flex items-center gap-2 rounded-full bg-black px-3 py-1.5 text-white transition-colors hover:bg-gray-800"
                  >
                    <IconWaveSine size={20} />
                    <span className="text-sm font-medium">Voice</span>
                  </button>
                ) : (
                  <IconArrowUp
                    className={cn(
                      "rounded-full bg-black p-1 text-white",
                      !userInput && "cursor-not-allowed opacity-50"
                    )}
                    onClick={() => {
                      if (!userInput) return
                      handleSendMessage(userInput, chatMessages, false)
                    }}
                    size={30}
                  />
                )}
              </div>
            </div>

            {/* Bottom toolbar row */}
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                {/* File Picker */}
                <FilePickerDropdown
                  onLocalFileClick={() => fileInputRef.current?.click()}
                  filesToAccept={filesToAccept}
                />

                {/* Web Search Toggle */}
                <WebSearchToggle />

                {/* Pipedream Data Sources - hidden for launch */}
                {SHOW_CONNECTORS && (
                  <PipedreamDataSources chatId={selectedChat?.id} />
                )}

                {/* Model Selector */}
                <ModelSelector />

                {/* Trial CTA for free users */}
                {(!userSubscription ||
                  userSubscription.plan_type === "free" ||
                  (!userSubscription.plan_type && !userSubscription.tier)) && (
                  <Link
                    href="/pricing"
                    className="ml-auto hidden shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-cyan-500/10 to-green-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 transition-colors hover:from-cyan-500/20 hover:to-green-500/20 sm:flex"
                  >
                    <IconSparkles size={14} />
                    Try Pro Free
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hidden input to select files from device */}
        <Input
          ref={fileInputRef}
          className="hidden"
          type="file"
          onChange={e => {
            if (!e.target.files) return
            handleSelectDeviceFile(e.target.files[0])
          }}
          accept={filesToAccept}
        />
      </div>
    </>
  )
}
