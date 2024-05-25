import { availablePlugins } from "@/lib/plugins/available-plugins"
import { ChatMessage } from "@/types"
import { ChatStarter, PluginID } from "@/types/plugins"
import React, { memo, useContext } from "react"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { dragHelper } from "@/components/chat/chat-helpers/drag"
import { ChatbotUIContext } from "@/context/context"

interface InfoCardProps {
  title: string
  description: string
}

const InfoCard: React.FC<{
  title: string
  description: string
  onClick: () => void
}> = ({ title, description, onClick }) => {
  return (
    <button
      className="hover:bg-secondary min-w-72 rounded-xl border-2 p-3 text-left duration-300 ease-in-out focus:outline-none"
      onClick={onClick}
    >
      <div className="pb-1 text-sm font-bold">{title}</div>
      <div className="text-xs opacity-75">{description}</div>
    </button>
  )
}

interface ChatStartersProps {
  selectedPlugin: PluginID
  chatMessages: ChatMessage[]
}

const ChatStarters: React.FC<ChatStartersProps> = ({
  selectedPlugin,
  chatMessages
}) => {
  const { userInput, showFilesDisplay } = useContext(ChatbotUIContext)
  const chatHandler = useChatHandler()
  const pluginStarters = availablePlugins.find(
    (plugin: { value: PluginID }) => plugin.value === selectedPlugin
  )?.starters

  const handleSendMessage = chatHandler.handleSendMessage

  if (userInput || showFilesDisplay) {
    return null
  }

  return (
    <div className="flex w-full items-center justify-start">
      <div
        className="scrollbar-hide flex w-screen flex-nowrap gap-2 overflow-x-auto lg:grid lg:grid-cols-2"
        style={{ cursor: "grab" }}
        onMouseDown={dragHelper}
      >
        {selectedPlugin &&
          pluginStarters?.map((starter: ChatStarter, index) => (
            <InfoCard
              title={starter.title}
              description={starter.description}
              key={`${selectedPlugin} ${starter.title} ${index}`}
              onClick={() =>
                handleSendMessage(starter.chatMessage, chatMessages, false)
              }
            />
          ))}
      </div>
    </div>
  )
}

export default memo(ChatStarters)
