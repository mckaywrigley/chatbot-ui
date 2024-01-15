import { ChatbotUIContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import {
  IconCirclePlus,
  IconPlayerStopFilled,
  IconSend
} from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { Input } from "../ui/input"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { ChatCommandInput } from "./chat-command-input"
import { ChatFilesDisplay } from "./chat-files-display"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { useSelectFileHandler } from "./chat-hooks/use-select-file-handler"

interface ChatInputProps {}

export const ChatInput: FC<ChatInputProps> = ({}) => {
  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const [isTyping, setIsTyping] = useState<boolean>(false)

  const {
    userInput,
    chatMessages,
    isGenerating,
    selectedPreset,
    selectedAssistant,
    focusPrompt,
    setFocusPrompt,
    focusFile,
    isPromptPickerOpen,
    setIsPromptPickerOpen,
    isAtPickerOpen,
    setFocusFile,
    chatSettings
  } = useContext(ChatbotUIContext)

  const {
    chatInputRef,
    handleSendMessage,
    handleStopMessage,
    handleFocusChatInput
  } = useChatHandler()

  const { handleInputChange } = usePromptAndCommand()

  const { filesToAccept, handleSelectDeviceFile } = useSelectFileHandler()

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => {
      handleFocusChatInput()
    }, 200) // FIX: hacky
  }, [selectedPreset, selectedAssistant])

  useEffect(() => {
    const textarea = chatInputRef.current
    if (textarea) {
      const handleCompositionStart = () => setIsTyping(true)
      const handleCompositionEnd = () => setIsTyping(false)

      textarea.addEventListener("compositionstart", handleCompositionStart)
      textarea.addEventListener("compositionend", handleCompositionEnd)

      return () => {
        textarea.removeEventListener("compositionstart", handleCompositionStart)
        textarea.removeEventListener("compositionend", handleCompositionEnd)
      }
    }
  }, [chatInputRef])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isTyping && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      setIsPromptPickerOpen(false)
      handleSendMessage(userInput, chatMessages, false)
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
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    const imagesAllowed = LLM_LIST.find(
      llm => llm.modelId === chatSettings?.model
    )?.imageInput
    if (!imagesAllowed) return

    const items = event.clipboardData.items
    for (const item of items) {
      if (item.type.indexOf("image") === 0) {
        const file = item.getAsFile()
        if (!file) return
        handleSelectDeviceFile(file)
      }
    }
  }

  return (
    <>
      <ChatFilesDisplay />

      <div className="border-input relative mt-3 flex min-h-[60px] w-full items-center justify-center rounded-xl border-2">
        <div className="absolute bottom-[76px] left-0 max-h-[300px] w-full overflow-auto rounded-xl dark:border-none">
          <ChatCommandInput />
        </div>

        <>
          <IconCirclePlus
            className="absolute bottom-[12px] left-3 cursor-pointer p-1 hover:opacity-50"
            size={32}
            onClick={() => fileInputRef.current?.click()}
          />

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
        </>

        <TextareaAutosize
          textareaRef={chatInputRef}
          className="ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring text-md flex w-full resize-none rounded-md border-none bg-transparent px-14 py-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={`Ask anything. Type "@" for files. Type "/" for prompts.`}
          onValueChange={handleInputChange}
          value={userInput}
          minRows={1}
          maxRows={18}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
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
