import { ChatbotUIContext } from "@/context/context"
import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconFlag,
  IconRepeat,
  IconThumbDown,
  IconThumbDownFilled,
  IconThumbUp,
  IconThumbUpFilled
} from "@tabler/icons-react"
import { FC, useContext, useEffect, useState } from "react"
import { WithTooltip } from "../ui/with-tooltip"

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
  messageHasImage
}) => {
  const { isGenerating } = useContext(ChatbotUIContext)
  const [showCheckmark, setShowCheckmark] = useState(false)

  const handleCopy = () => {
    onCopy()
    setShowCheckmark(true)
  }

  const handleForkChat = async () => {}

  useEffect(() => {
    if (showCheckmark) {
      const timer = setTimeout(() => {
        setShowCheckmark(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [showCheckmark])

  return (isLast && isGenerating) || isEditing ? null : (
    <div className="text-muted-foreground flex items-center space-x-2">
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

      {!isAssistant && isHovering && !messageHasImage && (
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

      {isHovering && (
        <WithTooltip
          delayDuration={1000}
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

      {isAssistant && isHovering && (
        <WithTooltip
          delayDuration={1000}
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

      {isAssistant && isHovering && (
        <WithTooltip
          delayDuration={1000}
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

      {isHovering && isLast && (
        <WithTooltip
          delayDuration={1000}
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
