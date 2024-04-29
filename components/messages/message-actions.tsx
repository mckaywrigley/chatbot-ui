/* eslint-disable react-hooks/exhaustive-deps */
import { ChatbotUIContext } from "@/context/context"
import { IconCheck, IconCopy, IconEdit, IconRepeat } from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { WithTooltip } from "../ui/with-tooltip"
import { MessageDownload } from "./message-download"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { Button } from "../ui/button"
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
import { Dialog, DialogContent, DialogTrigger } from "@radix-ui/react-dialog"
import {
  Position,
  shouldRenderMenuOnTop
} from "@/Core/Utils/context-menu-helper"
import { DownloadChat } from "../sidebar/items/chat/download-chat"
import toast from "react-hot-toast"

const notify = () =>
  toast.success(`The audio has been successfully downloaded`, {
    duration: 2000,
    iconTheme: {
      primary: "#14B8A6",
      secondary: "#191617"
    }
  })

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

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [renderOnTop, setRenderOnTop] = useState(false)
  const [isDownloadMessageMenuOpen, setIsDownloadMessageMenuOpen] =
    useState(false)

  const menuRef = useRef<any>(null)

  const handleMenuButtonClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()

    setIsMenuOpen(!isMenuOpen)
    const rect = e.currentTarget.getBoundingClientRect()

    const menuHeight = 150
    const menuWidth = 200 // Adjust this according to your side menu width

    let offsetX = -1050 // Default offset x when menu is closed
    let offsetY = -190 // Default offset y when menu is closed

    if (isMenuOpen) {
      // Adjust offsetX and offsetY when menu is open
      offsetX = -menuWidth // Adjust this according to your side menu width
      offsetY = 0 // Adjust this according to your layout
    }

    let menuPositionY

    if (rect.bottom + menuHeight > window.innerHeight) {
      menuPositionY = rect.top - menuHeight
      offsetY = -menuHeight // Adjust this according to your layout
    } else {
      menuPositionY = rect.bottom + offsetY
    }

    const menuPosition = {
      x: rect.left + offsetX,
      y: menuPositionY
    }

    setPosition(menuPosition)
  }

  useEffect(() => {
    setRenderOnTop(shouldRenderMenuOnTop(position))
  }, [position])

  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
  //       if (isDownloadMessageMenuOpen) {
  //         setIsMenuOpen(true)
  //       } else {
  //         setIsMenuOpen(false)
  //       }
  //     }
  //   }

  //   document.addEventListener("mousedown", handleClickOutside)

  //   return () => {
  //     document.removeEventListener("mousedown", handleClickOutside)
  //   }
  // }, [])

  const itemRef = useRef<HTMLDivElement>(null)

  const handleCopy = () => {
    onCopy()
    setShowCheckmark(true)
  }

  const handleForkChat = async () => {}

  async function downloadAudio() {
    try {
      setIsMenuOpen(false)
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
          // Fetch the audio file
          const response = await fetch(blobUri)
          if (!response.ok) {
            throw new Error("Failed to download audio")
          }
          const audioBlob = await response.blob()

          // Create a URL for the downloaded audio
          const audioUrl = URL.createObjectURL(audioBlob)

          console.log("message", message)

          const a = document.createElement("a")
          a.href = audioUrl
          a.download = selectedChat?.name ?? "thread message"
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

      {isLast && renderPlayAudioButton}

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

      {(isHovering || isLast) && (
        <div className="flex space-x-1">
          <div
            className="flex cursor-pointer items-center"
            onClick={e => {
              e.stopPropagation()
              handleMenuButtonClick(e)
            }}
          >
            <i className="fa-regular fa-arrow-down-to-line text-pixelspace-gray-40"></i>
          </div>

          {/* {hasData && (
          <Button className="size-[36px] p-1" onClick={handleCreateFolder}>
            <IconFolderPlus size={20} />
          </Button>
        )} */}

          {isMenuOpen && (
            <div
              ref={menuRef}
              style={{
                top: `${position.y}px`,
                left: `${position.x}px`
              }}
              className={`bg-pixelspace-gray-60 absolute z-20 w-44 divide-y rounded text-right shadow dark:divide-gray-600 `}
            >
              <ul
                className="text-sm text-gray-200 dark:text-gray-200"
                aria-labelledby="dropdownMenuIconHorizontalButton"
              >
                <MessageDownload
                  message={message}
                  handleSetIsOpen={() => {
                    setIsDownloadMessageMenuOpen(true)
                  }}
                  handleIsClose={() => {
                    setIsDownloadMessageMenuOpen(false)
                  }}
                />
                <li>
                  <div
                    role="button"
                    onClick={() => downloadAudio()}
                    className="hover:bg-pixelspace-gray-70 dark:hover:bg-pixelspace-gray-70 text-pixelspace-gray-20 block w-full cursor-pointer rounded-t  p-[10px]  text-left text-sm font-normal dark:hover:text-white"
                  >
                    Download as audio
                  </div>
                </li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* {1 > 0 && isAssistant && <MessageReplies />} */}
    </div>
  )
}
