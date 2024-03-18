import { ChatbotUIContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import {
  IconBolt,
  IconCirclePlus,
  IconPlayerStopFilled,
  IconSend
} from "@tabler/icons-react"
import Image from "next/image"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "../ui/input"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { ChatCommandInput } from "./chat-command-input"
import { ChatFilesDisplay } from "./chat-files-display"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { useChatHistoryHandler } from "./chat-hooks/use-chat-history"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { useSelectFileHandler } from "./chat-hooks/use-select-file-handler"
import { toast } from "sonner"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faArrowUp,
  faBox,
  faMicrophone
} from "@fortawesome/free-solid-svg-icons"
import {
  faPaperclipVertical,
  faSquare
} from "@fortawesome/pro-regular-svg-icons"
// import { LiveAudioVisualizer } from "react-audio-visualize"
import RecordingTimer, {
  getMinutesAndSeconds
} from "@/components/chat/RecordingTimer"

interface ChatInputProps {}

export const ChatInput: FC<ChatInputProps> = ({}) => {
  const { t } = useTranslation()

  useHotkey("l", () => {
    handleFocusChatInput()
  })

  const [isTyping, setIsTyping] = useState<boolean>(false)

  const [voiceRecorder, setVoiceRecorder] = useState<MediaRecorder | null>(null)

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder>()

  const [stream, setStream] = useState<MediaStream | null>(null)

  const [auxContent, setAuxContent] = useState<string>()

  const [isRecording, setIsRecording] = useState<boolean>(false)

  const [content, setContent] = useState<string>()

  const [time, setTime] = useState("")

  const [timeSeconds, setTimeSeconds] = useState(0)

  const [transcriptionLoading, setTranscriptionLoading] = useState(false)

  const [startProcessingAudio, setStartProcessingAudio] = useState(false)

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
    assistantImages
  } = useContext(ChatbotUIContext)

  const {
    chatInputRef,
    handleSendMessage,
    handleStopMessage,
    handleFocusChatInput
  } = useChatHandler()

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

    //use shift+ctrl+up and shift+ctrl+down to navigate through chat history
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

  // Lógica del AudioRecorder
  const onAudioClick = async () => {
    setContent(content ? content : "")
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      })

      const isSafari =
        window.navigator.userAgent.search("Safari") >= 0 &&
        window.navigator.userAgent.search("Chrome") < 0
      let mimeType = "audio/webm;codecs=opus"

      if (isSafari) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4"
        } else if (MediaRecorder.isTypeSupported("audio/x-m4a")) {
          mimeType = "audio/x-m4a"
        }
      }

      const mediaRecorder = new window.MediaRecorder(audioStream, {
        mimeType: mimeType
      })

      setStream(audioStream)
      setVoiceRecorder(mediaRecorder)
      setAuxContent(content)
      setContent("")
      setIsRecording(true)
    } catch (e) {
      console.log(e)
      console.log("No se otorgó permiso para acceder al micrófono.")
    }
  }

  const onStopRecording = () => {
    if (!isRecording || !stream || !voiceRecorder) return
    const tracks = stream.getAudioTracks()

    for (const track of tracks) {
      track.stop()
    }
    voiceRecorder.stop()
    setContent(auxContent)
    setAuxContent("")
    setIsRecording(false)
    setStartProcessingAudio(true)
  }

  const handleSetTime = (time: number) => {
    setTime(getMinutesAndSeconds(time))
    setTimeSeconds(time)
  }

  return (
    <>
      <div className="flex flex-col flex-wrap  gap-2">
        <ChatFilesDisplay />

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
              <div className="flex cursor-pointer items-center justify-center space-x-1 rounded-lg bg-purple-600 py-1 pr-3 hover:opacity-50">
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

      <div className="border-input bg-pixelspace-gray-60 relative mt-3 flex min-h-[56px] w-[714px] items-center rounded-[50px] border-2 px-[14px] py-[6px]">
        <div className="absolute bottom-[76px] left-0 max-h-[300px] w-full overflow-auto rounded-xl dark:border-none">
          <ChatCommandInput />
        </div>

        <>
          {/* Hidden input to select files from device */}

          <div className="flex items-center">
            <button
              className="border-pixelspace-gray-50 mr-3 inline-flex size-6 items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <FontAwesomeIcon icon={faPaperclipVertical} />
            </button>
            <div
              className={`h-8 border-l ${
                !voiceRecorder && !isRecording ? "" : null
              } flex items-center border-gray-600 py-2 pl-3`}
            >
              <button
                disabled={transcriptionLoading}
                onClick={!isRecording ? onAudioClick : onStopRecording}
                className={`px-1 hover:text-neutral-900 hover:opacity-60 dark:bg-opacity-60 dark:text-white dark:hover:text-neutral-200  `}
              >
                {isRecording ? (
                  <FontAwesomeIcon
                    icon={faSquare}
                    className="text-pixelspace-red-500"
                  />
                ) : (
                  <div className="relative flex items-center justify-center">
                    <FontAwesomeIcon icon={faMicrophone} />
                    <i
                      style={{ fontSize: 16, display: "flex" }}
                      className={`fa-solid fa-microphone flex items-center justify-center ${
                        transcriptionLoading ? "0 text-pixelspace-gray-3 " : ""
                      }`}
                    >
                      {transcriptionLoading ? (
                        <div className="absolute size-4 animate-spin rounded-full border-t-2 border-neutral-800 p-4 dark:border-neutral-100"></div>
                      ) : null}
                    </i>
                  </div>
                )}
              </button>
              {voiceRecorder && isRecording && (
                <RecordingTimer
                  handleSetTime={handleSetTime}
                  isRunning={isRecording}
                />
              )}
              {transcriptionLoading ? (
                <div className="w-[200px]">
                  <span className="text-sm text-[#F6F6F9]">{time} </span>
                  <span className="text-sm text-[#F6F6F9]">total duration</span>
                </div>
              ) : null}{" "}
            </div>
            {voiceRecorder && isRecording && (
              <div className="w-auto shrink-0">
                {/* <LiveAudioVisualizer
                  mediaRecorder={mediaRecorder}
                  width={200}
                  height={75}
                /> */}
              </div>
            )}
          </div>

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
          className="ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-[550px] resize-none rounded-md border-none bg-transparent text-sm  focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={t(
            `${isRecording ? "" : "Ask anything. Type “@” for assistants, “/” for prompts, “#” for files, and “!” for tools."}`
          )}
          onValueChange={handleInputChange}
          value={userInput}
          minRows={1}
          maxRows={18}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => setIsTyping(true)}
          onCompositionEnd={() => setIsTyping(false)}
        />

        <div className="cursor-pointer hover:opacity-50">
          {isGenerating ? (
            <IconPlayerStopFilled
              className="hover:bg-background animate-pulse rounded bg-transparent p-1"
              onClick={handleStopMessage}
              size={30}
            />
          ) : (
            <button
              className="bg-pixelspace-pink size-8 rounded-full"
              onClick={() => {
                if (!userInput) return

                handleSendMessage(userInput, chatMessages, false)
              }}
            >
              <FontAwesomeIcon icon={faArrowUp} />
            </button>
          )}
        </div>
      </div>
    </>
  )
}
