import { ChatbotUIContext } from "@/context/context"
import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconVolume,
  IconRepeat,
  IconThumbDown,
  IconThumbDownFilled,
  IconThumbUp,
  IconThumbUpFilled,
  IconPlayerStop,
  IconLoader
} from "@tabler/icons-react"
import { FC, useContext, useEffect, useState } from "react"
import { WithTooltip } from "../ui/with-tooltip"
import { useAudioPlayer } from "@/components/chat/chat-hooks/use-audio-player"

export const MESSAGE_ICON_SIZE = 20

interface MessageActionsProps {
  isAssistant: boolean
  isLast: boolean
  isEditing: boolean
  isHovering: boolean
  isGoodResponse: boolean
  isBadResponse: boolean
  onCopy: () => void
  onEdit: () => void
  onRegenerate: () => void
  onGoodResponse: () => void
  onBadResponse: () => void
  messageHasImage: boolean
  messageContent: string
  messageSequenceNumber: number
}

export const MessageActions: FC<MessageActionsProps> = ({
  isAssistant,
  isLast,
  isEditing,
  isHovering,
  isGoodResponse,
  isBadResponse,
  onCopy,
  onEdit,
  onRegenerate,
  onGoodResponse,
  onBadResponse,
  messageHasImage,
  messageContent,
  messageSequenceNumber
}) => {
  const {
    isGenerating,
    currentPlayingMessageId,
    setCurrentPlayingMessageId,
    selectedChat,
    isMobile
  } = useContext(ChatbotUIContext)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const { playAudio, stopAudio, isLoading, isPlaying } = useAudioPlayer()

  const BELOW_MAX_LENGTH = messageContent.length < 4096

  useEffect(() => {
    if (showCheckmark) {
      const timer = setTimeout(() => {
        setShowCheckmark(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [showCheckmark])

  const handleCopy = () => {
    onCopy()
    setShowCheckmark(true)
  }

  const handlePlayClick = () => {
    if (currentPlayingMessageId === messageSequenceNumber.toString()) {
      stopAudio()
      setCurrentPlayingMessageId(null)
    } else {
      playAudio(messageContent)
      setCurrentPlayingMessageId(messageSequenceNumber.toString())
    }
  }

  useEffect(() => {
    if (currentPlayingMessageId && selectedChat) {
      stopAudio()
      setCurrentPlayingMessageId(null)
    }
  }, [selectedChat])

  useEffect(() => {
    return () => {
      stopAudio()
      setCurrentPlayingMessageId(null)
    }
  }, [])

  return (isLast && isGenerating) || isEditing ? null : (
    <div
      className={`text-muted-foreground flex items-center space-x-3 ${isMobile ? "ml-3" : ""}`}
    >
      {!isAssistant && !messageHasImage && (
        <WithTooltip
          delayDuration={0}
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

      {isAssistant && BELOW_MAX_LENGTH && (
        <WithTooltip
          delayDuration={0}
          side="bottom"
          display={
            <div>
              {isLoading
                ? "Loading..."
                : isPlaying &&
                    currentPlayingMessageId === messageSequenceNumber.toString()
                  ? "Stop"
                  : "Read Aloud"}
            </div>
          }
          trigger={
            isLoading ? (
              <IconLoader className="animate-spin" size={MESSAGE_ICON_SIZE} />
            ) : isPlaying &&
              currentPlayingMessageId === messageSequenceNumber.toString() ? (
              <IconPlayerStop
                className="cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={handlePlayClick}
              />
            ) : (
              <IconVolume
                className="cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={handlePlayClick}
              />
            )
          }
        />
      )}

      {!messageHasImage && (
        <WithTooltip
          delayDuration={0}
          side="bottom"
          display={<div>Copy</div>}
          trigger={
            showCheckmark ? (
              <IconCheck size={MESSAGE_ICON_SIZE} />
            ) : (
              <IconCopy
                className="cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={handleCopy}
              />
            )
          }
        />
      )}

      {isAssistant && (
        <WithTooltip
          delayDuration={0}
          side="bottom"
          display={<div>Good Response</div>}
          trigger={
            isGoodResponse ? (
              <IconThumbUpFilled
                className="cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={onGoodResponse}
              />
            ) : (
              <IconThumbUp
                className="cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={onGoodResponse}
              />
            )
          }
        />
      )}

      {isAssistant && (
        <WithTooltip
          delayDuration={0}
          side="bottom"
          display={<div>Bad Response</div>}
          trigger={
            isBadResponse ? (
              <IconThumbDownFilled
                className="cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={onBadResponse}
              />
            ) : (
              <IconThumbDown
                className="cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={onBadResponse}
              />
            )
          }
        />
      )}

      {isLast && (
        <WithTooltip
          delayDuration={0}
          side="bottom"
          display={<div>Regenerate</div>}
          trigger={
            <IconRepeat
              className="cursor-pointer hover:opacity-50"
              size={MESSAGE_ICON_SIZE}
              onClick={onRegenerate}
            />
          }
        />
      )}

      {/* {1 > 0 && isAssistant && <MessageReplies />} */}
    </div>
  )
}
