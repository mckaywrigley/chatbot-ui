import { ChatbotUIContext } from "@/context/context"
import {
  type UIEventHandler,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react"

export const useScroll = () => {
  const { isGenerating, chatMessages } = useContext(ChatbotUIContext)

  const messagesStartRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isAutoScrolling = useRef(false)

  const [isAtTop, setIsAtTop] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [userScrolled, setUserScrolled] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    setUserScrolled(false)

    if (!isGenerating && userScrolled) {
      setUserScrolled(false)
    }
    // Intentionally fires only when `isGenerating` flips. Reading
    // `userScrolled` from the body is fine - we don't want the effect to
    // re-run when the user scrolls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating])

  useEffect(() => {
    if (isGenerating && !userScrolled) {
      scrollToBottom()
    }
    // Drives auto-scroll on every new chat message during generation.
    // The other reads (isGenerating, userScrolled, scrollToBottom) are
    // intentional snapshots; including them would cause spurious scrolls
    // when the user manually scrolls back up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages])

  const handleScroll: UIEventHandler<HTMLDivElement> = useCallback(e => {
    const target = e.target as HTMLDivElement
    const bottom =
      Math.round(target.scrollHeight) - Math.round(target.scrollTop) ===
      Math.round(target.clientHeight)
    setIsAtBottom(bottom)

    const top = target.scrollTop === 0
    setIsAtTop(top)

    if (!bottom && !isAutoScrolling.current) {
      setUserScrolled(true)
    } else {
      setUserScrolled(false)
    }

    const isOverflow = target.scrollHeight > target.clientHeight
    setIsOverflowing(isOverflow)
  }, [])

  const scrollToTop = useCallback(() => {
    if (messagesStartRef.current) {
      messagesStartRef.current.scrollIntoView({ behavior: "instant" })
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    isAutoScrolling.current = true

    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "instant" })
      }

      isAutoScrolling.current = false
    }, 100)
  }, [])

  return {
    messagesStartRef,
    messagesEndRef,
    isAtTop,
    isAtBottom,
    userScrolled,
    isOverflowing,
    handleScroll,
    scrollToTop,
    scrollToBottom,
    setIsAtBottom
  }
}
