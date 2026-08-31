import { ChatbotUIContext } from "@/context/context"
import {
  IconBookmark,
  IconBookmarkFilled,
  IconCheck,
  IconCopy,
  IconEdit,
  IconRepeat
} from "@tabler/icons-react"
import { FC, useContext, useEffect, useState } from "react"
import { WithTooltip } from "../ui/with-tooltip"

export const MESSAGE_ICON_SIZE = 18

interface MessageActionsProps {
  isAssistant: boolean
  isLast: boolean
  isEditing: boolean
  isHovering: boolean
  onCopy: () => void
  onEdit: () => void
  onRegenerate: () => void
  onBookmark?: () => void
  isBookmarked?: boolean
}

export const MessageActions: FC<MessageActionsProps> = ({
  isAssistant,
  isLast,
  isEditing,
  isHovering,
  onCopy,
  onEdit,
  onRegenerate,
  onBookmark,
  isBookmarked = false
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

  // `gap-2` (vs the older `space-x-2`) plays nicer with `shrink-0`
  // on each icon so the row keeps a stable height even when the
  // message above wraps onto multiple lines (#29 - copy/regenerate
  // icons were drifting). Adding `min-h-[24px]` reserves the line so
  // messages with no actions still leave space, preventing the layout
  // jump the scientist flagged.
  return (isLast && isGenerating) || isEditing ? null : (
    <div className="text-muted-foreground flex min-h-[24px] items-center gap-2">
      {/* {((isAssistant && isHovering) || isLast) && (
        <WithTooltip
          delayDuration={1000}
          side="bottom"
          display={<div>Fork Chat</div>}
          trigger={
            <IconGitFork
              className="shrink-0 cursor-pointer hover:opacity-50"
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
              className="shrink-0 cursor-pointer hover:opacity-50"
              size={MESSAGE_ICON_SIZE}
              onClick={onEdit}
            />
          }
        />
      )}

      {onBookmark && (isHovering || isLast) && (
        <WithTooltip
          delayDuration={1000}
          side="bottom"
          display={<div>{isBookmarked ? "Remove Bookmark" : "Bookmark"}</div>}
          trigger={
            isBookmarked ? (
              <IconBookmarkFilled
                className="shrink-0 cursor-pointer text-blue-500 hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={onBookmark}
              />
            ) : (
              <IconBookmark
                className="shrink-0 cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={onBookmark}
              />
            )
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
              <IconCopy
                className="shrink-0 cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={handleCopy}
              />
            )
          }
        />
      )}

      {isLast && (
        <WithTooltip
          delayDuration={1000}
          side="bottom"
          display={<div>Regenerate</div>}
          trigger={
            <IconRepeat
              className="shrink-0 cursor-pointer hover:opacity-50"
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
