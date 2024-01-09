import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { IconMessagePlus } from "@tabler/icons-react"
import { FC, useContext } from "react"
import { WithTooltip } from "../ui/with-tooltip"

interface ChatSecondaryButtonsProps {}

export const ChatSecondaryButtons: FC<ChatSecondaryButtonsProps> = ({}) => {
  const { selectedChat } = useContext(ChatbotUIContext)

  const { handleNewChat } = useChatHandler()

  return (
    <>
      {selectedChat && (
        <WithTooltip
          display={<div>Start a new chat</div>}
          trigger={
            <div className="mt-1">
              <IconMessagePlus
                className="cursor-pointer hover:opacity-50"
                size={24}
                onClick={handleNewChat}
              />
            </div>
          }
        />
      )}

      {/* TODO */}
      {/* <ShareMenu item={selectedChat} contentType="chats" /> */}
    </>
  )
}
