/* eslint-disable react-hooks/exhaustive-deps */
import { ChatbotUIContext } from "@/context/context"
import { IconCheck, IconCopy, IconEdit, IconRepeat } from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { WithTooltip } from "../ui/with-tooltip"
import { MessageDownload } from "./message-download"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCircleStop,
  faEllipsisH,
  faPlus,
  faVolume
} from "@fortawesome/pro-regular-svg-icons"
import AudioSpinner from "../ui/audio-spinner"
import { useChatHandler } from "../chat/chat-hooks/use-chat-handler"
import generateBlobUriFromBase64String from "@/lib/get-blob-uri-from-base64-string"
import { PlayAudioButton } from "../ui/play-audio-button"
import { DialogContent, DialogTrigger } from "@radix-ui/react-dialog"
import {
  Position,
  shouldRenderMenuOnTop
} from "@/Core/Utils/context-menu-helper"
import { DownloadChat } from "../sidebar/items/chat/download-chat"
import toast from "react-hot-toast"
import {
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
  DialogHeader,
  DialogBody,
  Dialog,
  DialogFooter
} from "@material-tailwind/react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"

const notify = () =>
  toast.success(`The audio has been successfully downloaded`, {
    duration: 2000,
    iconTheme: {
      primary: "#14B8A6",
      secondary: "#191617"
    }
  })

const notifyDownload = (filename: string) =>
  toast.success(
    `The message has been successfully downloaded as ${filename}.txt`,
    {
      duration: 2000,
      iconTheme: {
        primary: "#14B8A6",
        secondary: "#191617"
      }
    }
  )

export const MESSAGE_ICON_SIZE = 18

interface MessageActionsProps {
  isAssistant: boolean
  isLast: boolean
  isEditing: boolean
  isHovering: boolean
  message: any
  onCopy: () => void
  onEdit: () => void
  onRegenerate: () => void
}

export const MessageActions: FC<MessageActionsProps> = ({
  isAssistant,
  isLast,
  isEditing,
  isHovering,
  message,
  onCopy,
  onEdit,
  onRegenerate
}) => {
  const { isGenerating, profile, selectedChat } = useContext(ChatbotUIContext)
  const { processTextToSpeech } = useChatHandler()

  const [showCheckmark, setShowCheckmark] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  )
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [fileName, setFileName] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [open, setOpen] = useState(false)

  const handleOpen = () => setOpen(!open)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleDownload = () => {
    handleOpen()
    let fileType = "text/plain" // Default to text type if extension is not defined

    // Check if filename has an extension
    const fileExtension = fileName.split(".").pop()
    if (fileExtension) {
      switch (fileExtension.toLowerCase()) {
        case "json":
          fileType = "application/json"
          break
        case "txt":
          fileType = "text/plain"
          break
        case "csv":
          fileType = "text/csv"
          break
        case "xml":
          fileType = "application/xml"
          break
        case "html":
          fileType = "text/html"
          break
        case "md":
          fileType = "text/markdown"
          break
        case "js":
          fileType = "application/javascript"
          break
        case "css":
          fileType = "text/css"
          break
        // Add more cases for other file types if needed
        default:
          fileType = "text/plain" // Default to text type for unknown extensions
          break
      }
    }

    const blob = new Blob([message.content], { type: fileType })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    if (notifyDownload) {
      notifyDownload(fileName)
    }
  }

  const handleCopy = () => {
    onCopy()
    setShowCheckmark(true)
  }

  async function downloadAudio() {
    try {
      const messageContent = message.content
      const voice = selectedChat?.voice ?? profile?.voice

      if (!messageContent || !voice) {
        return
      }

      setIsProcessing(true)

      const result = await processTextToSpeech(messageContent, voice)

      let base64Buffer = result

      if (base64Buffer) {
        const blobUri = generateBlobUriFromBase64String(base64Buffer)

        if (blobUri) {
          // Fetch the audio file
          const response = await fetch(blobUri)
          if (!response.ok) {
            throw new Error("Failed to download audio")
          }
          const audioBlob = await response.blob()

          // Create a URL for the downloaded audio
          const audioUrl = URL.createObjectURL(audioBlob)

          console.log("audioBlob", audioBlob)

          console.log("message", message)
          console.log("selectedChat?.name", selectedChat?.name)
          console.log("audioUrl", audioUrl)

          const name = `message - ${message.chat_id}`

          const a = document.createElement("a")
          a.href = audioUrl
          a.download = name ?? "thread message"
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(audioUrl)
          document.body.removeChild(a)

          // Return the URL of the downloaded audio
          if (notify) {
            notify()
          }
        }
      }
    } catch (error) {
      console.log("error", error)
    } finally {
      setIsProcessing(false)
    }
  }

  async function fetchTranscription() {
    try {
      const messageContent = message.content
      const voice = profile?.voice

      if (!messageContent || !voice) {
        return
      }

      setIsProcessing(true)

      const result = await processTextToSpeech(messageContent, voice)

      let base64Buffer = result

      if (base64Buffer) {
        const blobUri = generateBlobUriFromBase64String(base64Buffer)

        if (blobUri) {
          const audioEl = new Audio(blobUri)
          audioEl.addEventListener("ended", () => handleAudioEnded())
          setAudioElement(audioEl)
          audioEl.play()
          setIsPlaying(true)
        }
      }
    } catch (error) {
      console.log("error", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAudioEnded = () => {
    // When audio ends, reset states
    setIsPlaying(false)
  }

  useEffect(() => {
    if (showCheckmark) {
      const timer = setTimeout(() => {
        setShowCheckmark(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [showCheckmark])

  useEffect(() => {
    console.log("isPlaying", isPlaying)
  }, [isPlaying])

  const renderPlayAudioButton = isPlaying ? (
    <div
      className="cursor-pointer"
      onClick={() => {
        if (audioElement && isPlaying) {
          audioElement.pause()
          audioElement.currentTime = 0
          setIsPlaying(false)
          setIsProcessing(false)
        }
      }}
    >
      <FontAwesomeIcon
        className="text-pixelspace-gray-40"
        icon={faCircleStop}
      />
    </div>
  ) : (
    <div className="cursor-pointer" onClick={() => fetchTranscription()}>
      <PlayAudioButton isProcessing={isProcessing} />
    </div>
  )

  return (isLast && isGenerating) || isEditing ? null : (
    <div className="text-muted-foreground relative flex items-center space-x-3">
      {/* {((isAssistant && isHovering) || isLast) && (
        <WithTooltip
          delayDuration={1000}
          side="bottom"
          display={<div>Fork Chat</div>}
          trigger={
            <IconGitFork
              className="cursor-pointer hover:opacity-50"
              size={MESSAGE_ICON_SIZE}
              onClick={handleForkChat}
            />
          }
        />
      )} */}

      {!isAssistant && isHovering && (
        <WithTooltip
          delayDuration={1000}
          side="bottom"
          display={<div>Edit</div>}
          trigger={
            <IconEdit
              className="cursor-pointer hover:opacity-50"
              size={MESSAGE_ICON_SIZE}
              onClick={onEdit}
            />
          }
        />
      )}

      {(isHovering || isLast) && (
        <WithTooltip
          delayDuration={1000}
          side="bottom"
          display={<div>Copy</div>}
          trigger={
            showCheckmark ? (
              <IconCheck size={MESSAGE_ICON_SIZE} />
            ) : (
              <div onClick={handleCopy}>
                <i className="fa-regular fa-copy text-pixelspace-gray-40"></i>
              </div>
            )
          }
        />
      )}

      {renderPlayAudioButton}

      {isLast && (
        <WithTooltip
          delayDuration={1000}
          side="bottom"
          display={<div>Regenerate</div>}
          trigger={
            <div onClick={onRegenerate}>
              <i className="fa-sharp fa-light fa-rotate-right text-pixelspace-gray-40"></i>
            </div>
          }
        />
      )}

      {/* {(isHovering || isLast) && <MessageDownload message={message} />} */}

      {isHovering && (
        <div className="flex space-x-1">
          <div className="flex cursor-pointer items-center">
            <Menu>
              <MenuHandler>
                <i className="fa-regular fa-arrow-down-to-line text-pixelspace-gray-40"></i>
              </MenuHandler>
              <MenuList
                className="bg-pixelspace-gray-60 border-0 p-0 text-white"
                placeholder={""}
              >
                <MenuItem
                  className="hover:bg-pixelspace-gray-55 dark:hover:bg-pixelspace-gray-70 text-pixelspace-gray-20 rounded-b text-left text-sm font-normal dark:hover:text-white"
                  placeholder={""}
                  onClick={handleOpen}
                >
                  Download message
                </MenuItem>
                <MenuItem
                  className="hover:bg-pixelspace-gray-55 dark:hover:bg-pixelspace-gray-70 text-pixelspace-gray-20 rounded-b text-left text-sm font-normal dark:hover:text-white"
                  placeholder={""}
                  onClick={downloadAudio}
                >
                  Download as audio
                </MenuItem>
              </MenuList>
            </Menu>
          </div>

          {/* {hasData && (
          <Button className="size-[36px] p-1" onClick={handleCreateFolder}>
            <IconFolderPlus size={20} />
          </Button>
        )} */}
        </div>
      )}

      {/* {1 > 0 && isAssistant && <MessageReplies />} */}
      <Dialog
        className="bg-background/80 border-pixelspace-gray-40 border"
        placeholder={""}
        open={open}
        handler={handleOpen}
      >
        <DialogHeader
          className="font-helvetica-now text-lg font-semibold leading-none tracking-tight text-white"
          placeholder={""}
        >
          Download message
        </DialogHeader>
        <DialogBody className="bg-background/80" placeholder={""}>
          <div className="label flex h-7 flex-col justify-center text-sm font-normal leading-[180%] text-[#e6e4e5]">
            Save message as (e.g., filename.txt, filename.json)
          </div>
          <div
            className={`bg-pixelspace-gray-70 focus:border-pixelspace-gray-40 flex h-[42px] w-full items-center rounded-md border px-2 py-3  ${!isFocused || fileName.length > 0 ? "border-pixelspace-gray-50" : "border-pixelspace-gray-40"} mb-2`}
          >
            <Input
              style={{ border: "none", outline: "none" }}
              placeholder={`Type your filename`}
              className={`bg-pixelspace-gray-70  text-sm ${fileName.length > 0 ? "text-pixelspace-gray-3" : "text-pixelspace-gray-20 "} h-[40px] w-full border-none font-normal`}
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </div>
        </DialogBody>
        <DialogFooter
          className="flex flex-row items-center justify-end gap-2 text-white"
          placeholder={""}
        >
          <Button
            size={"cancelPrompt"}
            variant="ghost2"
            onClick={() => {
              handleOpen()
            }}
          >
            Cancel
          </Button>
          <Button
            ref={buttonRef}
            size={"cancelPrompt"}
            variant="download"
            onClick={handleDownload}
          >
            Download
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
