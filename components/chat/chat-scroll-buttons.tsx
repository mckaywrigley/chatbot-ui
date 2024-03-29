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
        <div
          onClick={scrollToTop}
          role="button"
          className="bg-pixelspace-gray-90 flex size-6 items-center justify-center rounded-full border"
        >
          <i
            className="fa-solid fa-arrow-up text-pixelspace-gray-20"
            style={{ fontSize: 14 }}
          ></i>
        </div>
      )}

      {!isAtBottom && isOverflowing && (
        <div
          onClick={scrollToBottom}
          role="button"
          className="bg-pixelspace-gray-90 flex size-6 items-center justify-center rounded-full border"
        >
          <i
            className="fa-solid fa-arrow-down text-pixelspace-gray-20"
            style={{ fontSize: 14 }}
          ></i>
        </div>
      )}
    </>
  )
}
