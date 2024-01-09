import {
  IconCircleArrowDownFilled,
  IconCircleArrowUpFilled
} from "@tabler/icons-react"
import { FC } from "react"

interface ChatScrollButtonsProps {
  isAtTop: boolean
  isAtBottom: boolean
  isOverflowing: boolean
  scrollToTop: () => void
  scrollToBottom: () => void
}

export const ChatScrollButtons: FC<ChatScrollButtonsProps> = ({
  isAtTop,
  isAtBottom,
  isOverflowing,
  scrollToTop,
  scrollToBottom
}) => {
  return (
    <>
      {!isAtTop && isOverflowing && (
        <IconCircleArrowUpFilled
          className="cursor-pointer opacity-50 hover:opacity-100"
          size={32}
          onClick={scrollToTop}
        />
      )}

      {!isAtBottom && isOverflowing && (
        <IconCircleArrowDownFilled
          className="cursor-pointer opacity-50 hover:opacity-100"
          size={32}
          onClick={scrollToBottom}
        />
      )}
    </>
  )
}
