/* eslint-disable tailwindcss/migration-from-tailwind-2 */
/* eslint-disable react-hooks/exhaustive-deps */
import { ChatbotUIContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLM_LIST } from "@/lib/models/llm/llm-list"

import { IconBolt } from "@tabler/icons-react"
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
import { faArrowUp, faRobot, faSquare } from "@fortawesome/free-solid-svg-icons"
import { faPaperclipVertical } from "@fortawesome/pro-regular-svg-icons"
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

  const [stream, setStream] = useState<MediaStream | null>(null)

  const [auxContent, setAuxContent] = useState<string>()

  const [isRecording, setIsRecording] = useState<boolean>(false)

  const [content, setContent] = useState<string>()

  const [time, setTime] = useState("")

  const [timeSeconds, setTimeSeconds] = useState(0)

  const [transcriptionLoading, setTranscriptionLoading] = useState(false)

  const [startProcessingAudio, setStartProcessingAudio] = useState(false)

  const [sendDirectFromButton, setSendDirectFromButton] = useState(false)

  const [chunks, setChunks] = useState<Blob[]>([])

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
    handleFocusChatInput,
    processTranscription
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
    if (!isGenerating) {
      if (!isTyping && event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        setIsPromptPickerOpen(false)
        handleSendMessage(userInput, chatMessages, false)
      }
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
      // Check if mediaDevices loaded.
      if (navigator.mediaDevices != undefined) {
        //Req microphone permissions
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then(function (stream) {
            // Mic permissions granted, handle however you wish
            console.log(
              "window.navigator.userAgent",
              window.navigator.userAgent
            )
            const isSafari =
              window.navigator.userAgent.search("Safari") >= 0 &&
              window.navigator.userAgent.search("Chrome") < 0
            let mimeType = "audio/webm;codecs=opus" // default mimeType

            if (isSafari) {
              if (MediaRecorder.isTypeSupported("audio/mp4;codecs=h264")) {
                console.log("Safari detected, using mp4")
                mimeType = "audio/mp4;codecs=h264"
              } else if (MediaRecorder.isTypeSupported("audio/x-m4a")) {
                console.log("Safari detected, using m4a")
                mimeType = "audio/x-m4a"
              }
            }

            console.log("mimeType", mimeType)

            const mediaRecorder = new window.MediaRecorder(stream, {
              mimeType: "video/mp4"
            })

            setStream(stream)
            setVoiceRecorder(mediaRecorder)
            setAuxContent(content)
            setContent("")
            setIsRecording(true)
          })
          .catch(function (err) {
            // Mic permissions denied, handle however you wish
            console.log("Microphone permissions error: ", err)
            console.log("Microphone permissions denied")
          })
      } else {
        // Out of luck at this point, handle however you wish.
        console.log("mediaDevices is not available")
      }
    } catch (e) {
      console.log("Unexpected error: ", e)
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

  useEffect(() => {
    async function fetchTranscription(audio: any) {
      try {
        setTranscriptionLoading(true)
        const result = await processTranscription(audio)
        // TODO: Implement error handling
        const error = result?.error

        const transcription = result?.transcription

        if (transcription) {
          handleInputChange(transcription)
        }

        setStartProcessingAudio(false)
        setVoiceRecorder(null)
        setTranscriptionLoading(false)
        setTime("")
      } catch (error) {
        console.log("error", error)
        setStartProcessingAudio(false)
        setVoiceRecorder(null)
        setTranscriptionLoading(false)
        setTime("")
      }
    }
    if (startProcessingAudio && timeSeconds > 1) {
      const audio = new Blob(chunks, { type: voiceRecorder!.mimeType })
      void fetchTranscription(audio)
    } else {
      setSendDirectFromButton(false)
      setStartProcessingAudio(false)
      setVoiceRecorder(null)
      setTranscriptionLoading(false)
      setTime("")
    }
  }, [startProcessingAudio])

  useEffect(() => {
    if (!isRecording || !voiceRecorder) return
    voiceRecorder.start(800)

    voiceRecorder.ondataavailable = ({ data }) => {
      chunks.push(data)
    }
  }, [isRecording, voiceRecorder, chunks])

  useEffect(() => {
    if (isRecording || !chunks || !stream) return

    setStream(null)
    setChunks([])
  }, [isRecording, stream, chunks])

  return (
    <>
      <div className="flex flex-col flex-wrap gap-2">
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
              <div className="bg-pixelspace-teal-500 flex h-10 cursor-pointer items-center justify-center space-x-1 rounded-full px-4 py-1 hover:opacity-50">
                <div className="text-pixelspace-gray-90 font-inter text-center text-sm font-medium">
                  {tool.name}
                </div>
                <i
                  className={`fa-regular fa-bolt text-pixelspace-gray-90`}
                  style={{ fontSize: 14 }}
                ></i>
              </div>
            </div>
          ))}
        {selectedAssistant && (
          <div className=" bg-pixelspace-gray-90 hover:bg-pixelspace-gray-80 mx-auto flex w-fit items-center space-x-[10px] rounded-full p-2">
            {selectedAssistant.image_path ? (
              <Image
                style={{ width: "24px", height: "24px" }}
                className="rounded-full "
                src={
                  assistantImages.find(
                    img => img.path === selectedAssistant.image_path
                  )?.base64
                }
                width={24}
                height={24}
                alt={selectedAssistant.name}
              />
            ) : (
              <i
                className="fa-regular fa-robot text-pixelspace-gray-20"
                style={{ fontSize: 14 }}
              ></i>
            )}
            <div className="font-inter text-sm font-medium">
              Talking to {selectedAssistant.name}
            </div>
          </div>
        )}
      </div>
      <div
        style={{
          paddingTop: 10,
          paddingBottom: 10
        }}
        className="border-input bg-pixelspace-gray-60 mt-3 flex min-h-[56px] w-[714px] justify-center rounded-[50px] border-2"
      >
        <div className="absolute bottom-[76px] left-0 max-h-[300px] w-full overflow-auto rounded-xl dark:border-none">
          <ChatCommandInput />
        </div>
        <div className="flex items-end justify-center">
          {/* Hidden input to select files from device */}
          <div
            className={`flex items-center ${transcriptionLoading && "mr-[365px]"}`}
          >
            <button
              className="border-pixelspace-gray-50 mr-3 inline-flex size-6 items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <FontAwesomeIcon
                className="text-pixelspace-gray-20 hover:text-pixelspace-gray-3"
                icon={faPaperclipVertical}
              />
            </button>
            <div
              className={`h-8 border-l ${
                !voiceRecorder && !isRecording ? "" : null
              } flex items-center border-gray-600 py-2 pl-3`}
            >
              <button
                disabled={transcriptionLoading}
                onClick={!isRecording ? onAudioClick : onStopRecording}
                className={`dark:text-pixelspace-gray-20 dark:hover:text-pixelspace-gray-3  px-1 hover:text-neutral-900 dark:bg-opacity-60  `}
              >
                {isRecording ? (
                  <div className="bg-pixelspace-pink flex size-6 items-center justify-center rounded-full">
                    <FontAwesomeIcon
                      icon={faSquare}
                      style={{ fontSize: 11 }}
                      className="text-pixelspace-gray-3"
                    />
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center">
                    <i
                      style={{ fontSize: 16, display: "flex" }}
                      className={`fa-solid fa-microphone flex items-center justify-center ${
                        transcriptionLoading ? "0 text-pixelspace-gray-20 " : ""
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
                <div className="ml-2 w-[200px]">
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
        </div>
        <div
          className={`${transcriptionLoading && "hidden"} flex items-center justify-center`}
        >
          <TextareaAutosize
            textareaRef={chatInputRef}
            className={`bg-pixelspace-gray-60 ${isRecording || voiceRecorder ? "placeholder:text-pixelspace-gray-60" : "placeholder:text-pixelspace-gray-40"} placeholder:font-libre-franklin focus-visible:ring-ring mx-3 flex ${isRecording || transcriptionLoading ? "w-[509px]" : "w-[550px]"} resize-none rounded-md border-none bg-transparent text-sm  focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50`}
            placeholder={t(
              `${isRecording ? "" : "Ask anything. Type “@” for assistants, “/” for prompts, “#” for files & “!” for actions"}`
            )}
            onValueChange={handleInputChange}
            value={userInput}
            minRows={1}
            maxRows={18}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCompositionStart={() => setIsTyping(true)}
            onCompositionEnd={() => setIsTyping(false)}
            isDisabled={isRecording || transcriptionLoading}
          />
        </div>

        <div className="flex cursor-pointer items-end justify-center hover:opacity-50">
          {isGenerating ? (
            <button
              className="bg-pixelspace-pink size-8 rounded-full"
              onClick={handleStopMessage}
            >
              <FontAwesomeIcon icon={faSquare} />
            </button>
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
