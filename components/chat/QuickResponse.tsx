import { useContext } from "react"
import { ChatbotUIContext } from "@/context/context"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"

const QuickResponse = () => {
  const {
    chatMessages,
    chatStudyState,
    setChatStudyState,
    setChatMessages,
    selectedChat,
    selectedAssistant,
    assistants,
    setSelectedAssistant,
    setSelectedTools
  } = useContext(ChatbotUIContext)

  const { handleSendMessage } = useChatHandler()

  const handleQuickResponse = async (message: string) => {
    handleSendMessage(message, chatMessages, false)
  }

  let buttonConfigs = {
    button1: {
      text: "",
      onClick: handleQuickResponse // Default onClick handler
    },
    button2: {
      text: "",
      onClick: handleQuickResponse // Default onClick handler
    }
  }

  if (chatStudyState === "recall_ready") {
    buttonConfigs.button1.text = "Start a new free recall session."
    buttonConfigs.button1.onClick = async () => {
      // Custom onClick handler
      await setChatStudyState("recall_first_attempt")
      const promptMessage = {
        message: {
          id: "1",
          user_id: "1",
          content: `Try to recall as much as possible about the topic ${selectedChat!.name}.`,
          created_at: new Date().toISOString(),
          image_paths: [],
          model: "",
          role: "assistant",
          sequence_number: 0,
          updated_at: null,
          assistant_id: selectedAssistant!.id,
          chat_id: selectedChat!.id
        },
        fileItems: []
      }

      setChatMessages([promptMessage])

      // const feedbackAssistant = assistants.find(
      //   assistant => assistant.name === "feedback"
      // )

      // if (feedbackAssistant) {
      //   setSelectedAssistant(feedbackAssistant)

      //   const assistantTools = (
      //     await getAssistantToolsByAssistantId(feedbackAssistant.id)
      //   ).tools
      //   setSelectedTools(assistantTools)
      // }
    }
    buttonConfigs.button2.text = "Edit topic description."
  } else if (chatStudyState === "recall_hinting") {
    buttonConfigs.button1.text = "Proceed to scoring."
    buttonConfigs.button2.text = "More hints."
  } else if (chatStudyState === "score_updated") {
    buttonConfigs.button1.text = "Show full topic description."
    buttonConfigs.button1.onClick = async () => {
      await setChatStudyState("reviewing")
      const promptMessage = {
        message: {
          id: "1",
          user_id: "1",
          content: selectedChat!.topic_description || "",
          created_at: new Date().toISOString(),
          image_paths: [],
          model: "",
          role: "assistant",
          sequence_number: chatMessages.length + 2,
          updated_at: null,
          assistant_id: selectedAssistant!.id,
          chat_id: selectedChat!.id
        },
        fileItems: []
      }

      setChatMessages(prevMessages => [...prevMessages, promptMessage])
    }
  }

  // Render buttons based on the configuration
  return (
    <div className="flex justify-between space-x-4">
      {buttonConfigs.button1.text && (
        <div className="w-1/2">
          <button
            className="w-full rounded-md border border-blue-500 px-4 py-2 text-left text-blue-500 transition-colors hover:bg-blue-500 hover:text-white"
            onClick={() =>
              buttonConfigs.button1.onClick(buttonConfigs.button1.text)
            }
          >
            {buttonConfigs.button1.text}
          </button>
        </div>
      )}
      {buttonConfigs.button2.text && (
        <div className="w-1/2">
          <button
            className="w-full rounded-md border border-blue-500 px-4 py-2 text-left text-blue-500 transition-colors hover:bg-blue-500 hover:text-white"
            onClick={() =>
              buttonConfigs.button2.onClick(buttonConfigs.button2.text)
            }
          >
            {buttonConfigs.button2.text}
          </button>
        </div>
      )}
    </div>
  )
}

export default QuickResponse
