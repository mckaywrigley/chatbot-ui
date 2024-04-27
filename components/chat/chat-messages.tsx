import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { FC, useContext, useState } from "react"
import { Message } from "../messages/message"
import { ChatMessage } from "@/types"

interface ChatMessagesProps {}

export const ChatMessages: FC<ChatMessagesProps> = ({}) => {
  const { chatMessages } = useContext(ChatbotUIContext)

  const { handleSendEdit, handleSendFeedback } = useChatHandler()

  const onSendFeedback = (
    chatMessage: ChatMessage,
    feedback: "good" | "bad",
    reason?: string,
    detailedFeedback?: string,
    allowSharing?: boolean,
    allowEmail?: boolean
  ) => {
    handleSendFeedback(
      chatMessage,
      feedback,
      reason,
      detailedFeedback,
      allowSharing,
      allowEmail
    )
  }

  const [editingMessage, setEditingMessage] = useState<Tables<"messages">>()

  return chatMessages
    .sort((a, b) => a.message.sequence_number - b.message.sequence_number)
    .map((chatMessage, index, array) => {
      return (
        <Message
          key={chatMessage.message.sequence_number}
          message={chatMessage.message}
          fileItems={chatMessage.fileItems}
          feedback={chatMessage.feedback}
          isEditing={editingMessage?.id === chatMessage.message.id}
          isLast={index === array.length - 1}
          onStartEdit={setEditingMessage}
          onCancelEdit={() => setEditingMessage(undefined)}
          onSubmitEdit={handleSendEdit}
          onSendFeedback={(
            feedback: "good" | "bad",
            reason?: string,
            detailedFeedback?: string,
            allowSharing?: boolean,
            allowEmail?: boolean
          ) =>
            onSendFeedback(
              chatMessage,
              feedback,
              reason,
              detailedFeedback,
              allowSharing,
              allowEmail
            )
          }
        />
      )
    })
}
