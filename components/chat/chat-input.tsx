import Modal from "@/components/chat/dialog-portal"
import { ChatbotUIContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import { PluginID } from "@/types/plugins"
import {
  IconBolt,
  IconBook,
  IconBookOff,
  IconHelp,
  IconPaperclip,
  IconPlayerStopFilled,
  IconCirclePlus,
  IconPuzzle,
  IconPuzzleOff,
  IconSend
} from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Input } from "../ui/input"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { WithTooltip } from "../ui/with-tooltip"
import { ChatCommandInput } from "./chat-command-input"
import { ChatFilesDisplay } from "./chat-files-display"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { useSelectFileHandler } from "./chat-hooks/use-select-file-handler"
import { EnhancedMenuPicker } from "./enhance-menu"

interface ChatInputProps {}

export const ChatInput: FC<ChatInputProps> = ({}) => {
  const { t } = useTranslation()
  const TOOLTIP_DELAY = 1000

  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const [isTyping, setIsTyping] = useState<boolean>(false)
  const [showConfirmationDialog, setShowConfirmationDialog] =
    useState<boolean>(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)

  const [optionsCollapsed, setOptionsCollapsed] = useState(false)
  const [showMobileHelp, setShowMobileHelp] = useState(false)

  const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)

    useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth <= 640)
      }

      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }, [])

    return isMobile
  }
  const isMobile = useIsMobile()

  const {
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
    showFilesDisplay,
    isAtPickerOpen,
    setFocusFile,
    chatSettings,
    selectedTools,
    setSelectedTools,
    isEnhancedMenuOpen,
    setIsEnhancedMenuOpen,
    selectedPlugin,
    isRagEnabled: isRagEnabled,
    setIsRagEnabled: setIsRagEnabled,
    subscription
  } = useContext(ChatbotUIContext)

  const {
    chatInputRef,
    handleSendMessage,
    handleStopMessage,
    handleFocusChatInput
  } = useChatHandler()

  const handleToggleEnhancedMenu = () => {
    setIsEnhancedMenuOpen(!isEnhancedMenuOpen)
  }

  const handleToggleRAG = (e: React.MouseEvent) => {
    setIsRagEnabled(!isRagEnabled)
  }

  const divRef = useRef<HTMLDivElement>(null)
  const [bottomSpacingPx, setBottomSpacingPx] = useState(20)

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { height } = entry.contentRect
        setBottomSpacingPx(height + 20)
      }
    })

    if (divRef.current) {
      observer.observe(divRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const { handleInputChange } = usePromptAndCommand()

  const { filesToAccept, handleSelectDeviceFile } = useSelectFileHandler()

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => {
      handleFocusChatInput()
    }, 200) // FIX: hacky
  }, [selectedPreset, selectedAssistant])

  useEffect(() => {
    if (isTyping) {
      setOptionsCollapsed(true)
    }
  }, [isTyping])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    setOptionsCollapsed(true)

    if (!isTyping && event.key === "Enter" && !event.shiftKey && !isMobile) {
      event.preventDefault()
      if (!isGenerating) {
        setIsPromptPickerOpen(false)
        handleSendMessage(userInput, chatMessages, false, false)
      }
    }

    if (
      isPromptPickerOpen &&
      (event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown")
    ) {
      event.preventDefault()
      setFocusPrompt(!focusPrompt)
    }

    if (
      isAtPickerOpen &&
      (event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown")
    ) {
      event.preventDefault()
      setFocusFile(!focusFile)
    }

    if (
      isToolPickerOpen &&
      (event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown")
    ) {
      event.preventDefault()
      setFocusTool(!focusTool)
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
          toast.error(`Images are not supported for this model.`)
          return
        }
        const file = item.getAsFile()
        if (!file) return
        handleSelectDeviceFile(file)
      }
    }
  }

  const handleConversionConfirmation = () => {
    if (currentFile) {
      handleSelectDeviceFile(currentFile)
      setShowConfirmationDialog(false)
    }
  }

  const handleCancel = () => {
    setCurrentFile(null)
    setShowConfirmationDialog(false)
  }

  const handleFileUpload = (file: File) => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || ""

    const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg"]

    const videoExtensions = ["mp4", "avi", "mov", "wmv", "flv"]

    if (imageExtensions.includes(fileExtension)) {
      alert("HackerGPT does not support image files yet.")
      return
    } else if (videoExtensions.includes(fileExtension)) {
      alert("HackerGPT does not support video files yet.")
      return
    }

    if (
      fileExtension &&
      !["csv", "json", "md", "pdf", "txt", "html", "htm"].includes(
        fileExtension
      )
    ) {
      setShowConfirmationDialog(true)
      setCurrentFile(file)
      return
    } else {
      handleSelectDeviceFile(file)
    }
  }

  const ToolOptions = () => (
    <>
      <div
        className="flex flex-row items-center"
        onClick={() => fileInputRef.current?.click()}
      >
        {subscription && (
          <WithTooltip
            delayDuration={TOOLTIP_DELAY}
            side="top"
            display={
              <div className="flex flex-col">
                <p className="font-medium">Upload a File</p>
              </div>
            }
            trigger={
              <IconPaperclip
                className="bottom-[12px] left-3 cursor-pointer p-1 hover:opacity-50"
                size={32}
              />
            }
          />
        )}
      </div>
      <div
        className="flex flex-row items-center"
        onClick={handleToggleEnhancedMenu}
      >
        <WithTooltip
          delayDuration={TOOLTIP_DELAY}
          side="top"
          display={
            <div className="flex flex-col">
              <p className="font-medium">Show/Hide Plugins Menu</p>
            </div>
          }
          trigger={
            isEnhancedMenuOpen ? (
              <IconPuzzle
                className="bottom-[12px] left-12 cursor-pointer p-1 hover:opacity-50"
                size={32}
              />
            ) : (
              <IconPuzzleOff
                className="bottom-[12px] left-12 cursor-pointer p-1 opacity-50 hover:opacity-100"
                size={32}
              />
            )
          }
        />
      </div>
      <div className="flex flex-row items-center" onClick={handleToggleRAG}>
        <WithTooltip
          delayDuration={TOOLTIP_DELAY}
          side="top"
          display={
            <div className="flex flex-col">
              <p className="font-medium">Enable/Disable Enhanced Search</p>
              <p className="text-sm opacity-80">
                Enhanced Search adds curated
                <br />
                HackerGPT knowledge to the Model
              </p>
            </div>
          }
          trigger={
            isRagEnabled &&
            chatSettings?.model &&
            chatSettings?.model !== "gpt-4-turbo-preview" ? (
              <IconBook
                className="bottom-[12px] cursor-pointer p-1 hover:opacity-50"
                size={32}
              />
            ) : (
              <IconBookOff
                className="bottom-[12px] cursor-pointer p-1 opacity-50 hover:opacity-100"
                size={32}
              />
            )
          }
        />
      </div>
      {isMobile && (
        <IconHelp
          className="bottom-[12px] cursor-pointer p-1 hover:opacity-50"
          size={32}
          onClick={() => setShowMobileHelp(true)}
        />
      )}
    </>
  )

  return (
    <>
      <Modal isOpen={showConfirmationDialog}>
        <div className="size-screen fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm dark:bg-opacity-75"></div>

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-background w-full max-w-lg rounded-md p-10 text-center">
            <p>
              The file extension{" "}
              <b>.{currentFile?.name.split(".").pop()?.toLowerCase()}</b> is
              currently not supported.
            </p>
            <p>Would you like to convert its content into a text format?</p>
            <div className="mt-5 flex justify-center gap-5">
              <button
                onClick={handleCancel}
                className="ring-offset-background focus-visible:ring-ring bg-input text-primary hover:bg-input/90 flex h-[36px] items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConversionConfirmation}
                className="ring-offset-background focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 flex h-[36px] items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Convert
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showMobileHelp}>
        <div className="size-screen fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm dark:bg-opacity-75"></div>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-background w-full max-w-md rounded-md p-6 text-center">
            <h3 className="mb-4 text-lg font-semibold">Chat Input Options</h3>
            <div className="flex flex-col text-left">
              <div
                className="flex flex-row items-center"
                onClick={() => fileInputRef.current?.click()}
              >
                {subscription && (
                  <div className="ml-2 flex flex-col">
                    <span className="mb-1 flex flex-row items-center">
                      <IconPaperclip size={32} />
                      <span className="ml-2">Upload a file</span>
                    </span>
                  </div>
                )}
              </div>
              <div
                className="mt-4 flex flex-row items-center"
                onClick={handleToggleEnhancedMenu}
              >
                <div className="ml-2 flex flex-col">
                  <span className="mb-1 flex flex-row items-center">
                    {isEnhancedMenuOpen ? (
                      <IconPuzzle size={32} />
                    ) : (
                      <IconPuzzleOff size={32} />
                    )}
                    <span className="ml-2">Show/Hide the plugins menu</span>
                  </span>
                </div>
              </div>
              <div
                className="mt-4 flex flex-row items-center"
                onClick={handleToggleRAG}
              >
                <div className="ml-2 flex flex-col">
                  <span className="mb-1 flex  flex-row items-center">
                    {isRagEnabled &&
                    chatSettings?.model &&
                    chatSettings?.model !== "gpt-4-turbo-preview" ? (
                      <IconBook size={32} />
                    ) : (
                      <IconBookOff size={32} />
                    )}
                    <span className="ml-2">Enable/Disable Enhanced Search</span>
                  </span>
                  <p className="text-sm opacity-90">
                    The enhanced search adds curated HackerGPT knowledge to the
                    Model improving the answers
                  </p>
                </div>
              </div>
            </div>
            <button
              className="mt-4 rounded-md bg-gray-300 px-4 py-2 text-black hover:bg-gray-400"
              onClick={() => setShowMobileHelp(false)}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <div className="flex flex-col flex-wrap justify-center gap-2">
        <ChatFilesDisplay />

        {isEnhancedMenuOpen && <EnhancedMenuPicker />}

        {selectedTools &&
          selectedTools.map((tool, index) => (
            <div
              key={index}
              className="mt-2 flex justify-center"
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
      </div>

      <div
        className={`border-input relative mt-3 flex min-h-[60px] w-full items-center justify-center rounded-xl border-2 ${selectedPlugin && selectedPlugin !== PluginID.NONE ? "border-primary" : ""}`}
        ref={divRef}
      >
        <div
          className={`absolute left-0 w-full overflow-auto rounded-xl dark:border-none`}
          style={{ bottom: `${bottomSpacingPx}px` }}
        >
          <ChatCommandInput />
        </div>

        <div className="ml-3 flex flex-row">
          <Input
            ref={fileInputRef}
            className="hidden w-0"
            type="file"
            onChange={e => {
              if (!e.target.files) return
              handleFileUpload(e.target.files[0])
            }}
            accept={filesToAccept}
          />

          {isMobile && optionsCollapsed && (
            <div className="flex flex-row items-center">
              <IconCirclePlus
                className="cursor-pointer p-1 hover:opacity-50"
                onClick={() => setOptionsCollapsed(false)}
                size={34}
              />
            </div>
          )}

          {(!isMobile || !optionsCollapsed) && <ToolOptions />}
        </div>

        <TextareaAutosize
          textareaRef={chatInputRef}
          className="ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring text-md flex w-full resize-none rounded-md border-none bg-transparent py-2 pl-4 pr-14 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={
            isMobile
              ? t(`Message`) + (!subscription ? "" : t(`. Type "#" for files.`))
              : t(`Message HackerGPT`) +
                (!subscription ? "" : t(`. Type "#" for files.`))
          }
          onValueChange={handleInputChange}
          value={userInput}
          minRows={1}
          maxRows={isMobile ? 6 : 12}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => setIsTyping(true)}
          onCompositionEnd={() => setIsTyping(false)}
          onClick={() => setOptionsCollapsed(true)}
        />

        <div className="absolute bottom-[14px] right-3 cursor-pointer hover:opacity-50">
          {isGenerating ? (
            <IconPlayerStopFilled
              className="hover:bg-background animate-pulse rounded bg-transparent p-1"
              onClick={handleStopMessage}
              size={30}
            />
          ) : (
            <IconSend
              className={cn(
                "bg-primary text-secondary rounded p-1",
                !userInput && "cursor-not-allowed opacity-50"
              )}
              onClick={() => {
                if (isTyping) setOptionsCollapsed(true)
                if (!userInput) return
                handleSendMessage(userInput, chatMessages, false)
              }}
              size={30}
            />
          )}
        </div>
      </div>
    </>
  )
}
