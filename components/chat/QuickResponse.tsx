import { studyStates } from "@/lib/assistants"
import { useContext } from "react"
import { ChatbotUIContext } from "@/context/context"
import { useChatHandler } from "./chat-hooks/use-chat-handler"

const QuickResponse = () => {
  const { chatMessages, chatStudyState } = useContext(ChatbotUIContext)

  const { handleSendMessage } = useChatHandler()

  const handleQuickResponse = async (message: string) => {
    handleSendMessage(message, chatMessages, false)
  }

  // Find the current study state object
  const currentStudyState = studyStates.find(
    state => state.name === chatStudyState
  )

  // Initialize quickResponses with the values from the current study state
  let quickResponses =
    currentStudyState && currentStudyState.quickResponses
      ? currentStudyState.quickResponses
      : []

  // Render buttons based on the available quickResponses
  return (
    <div className="flex justify-between space-x-4">
      {quickResponses.map((text, index) => (
        <div key={index} className="w-1/2">
          <button
            className="w-full rounded-md border border-blue-500 px-4 py-2 text-left text-blue-500 transition-colors hover:bg-blue-500 hover:text-white"
            onClick={() => handleQuickResponse(text)}
          >
            {text}
          </button>
        </div>
      ))}
    </div>
  )
}

export default QuickResponse
