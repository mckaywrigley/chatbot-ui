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
    if (isGenerating) {
      setUserScrolled(false)
    }
  }, [isGenerating])

  useEffect(() => {
    if (isGenerating && !userScrolled) {
      scrollToBottom()
    }
  }, [chatMessages, isGenerating, userScrolled])

  const handleScroll: UIEventHandler<HTMLDivElement> = useCallback(e => {
    const target = e.target as HTMLDivElement
    const bottom =
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) <
      50
    const top = target.scrollTop < 250

    setIsAtBottom(bottom)
    setIsAtTop(top)

    if (bottom) {
      setUserScrolled(false) // Reset userScrolled when at the bottom
    } else if (!isAutoScrolling.current && target.scrollTop > 50) {
      setUserScrolled(true) // Set userScrolled to true when scrolled up significantly and not autoscrolling
    }

    const isOverflow = target.scrollHeight > target.clientHeight
    setIsOverflowing(isOverflow)
  }, [])

  const scrollToTop = useCallback(() => {
    if (messagesStartRef.current) {
      messagesStartRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  const scrollToBottom = useCallback(
    (forced: boolean = false) => {
      if (forced) {
        setUserScrolled(false)
      }
      if (!userScrolled || forced) {
        isAutoScrolling.current = true

        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "auto" })
        }

        setTimeout(() => {
          isAutoScrolling.current = false
        }, 100)
      }
    },
    [userScrolled]
  )

  useEffect(() => {
    if (!userScrolled) {
      scrollToBottom()
    }
  }, [chatMessages, scrollToBottom])

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
