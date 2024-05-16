import { IconArrowDown } from "@tabler/icons-react"
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
      {/* {!isAtTop && isOverflowing && (
        <IconCircleArrowUpFilled
          className="cursor-pointer opacity-75 hover:opacity-100"
          size={32}
          onClick={scrollToTop}
        />
      )} */}

      {!isAtBottom && isOverflowing && (
        <div
          className="border-secondary-foreground bg-secondary cursor-pointer rounded-full border-2 p-1 opacity-75 hover:opacity-100"
          onClick={scrollToBottom}
        >
          <IconArrowDown size={18} />
        </div>
      )}
    </>
  )
}
