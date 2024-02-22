import { ChatbotUIContext } from "@/context/context"
import { cn } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { useParams, useRouter } from "next/navigation"
import { FC, useContext, useRef } from "react"
import { DeleteChat } from "./delete-chat"
import { UpdateChat } from "./update-chat"
import DynamicPieChart from "../../../icons/dynamic-pie-chart"
import * as ebisu from "ebisu-js"

interface ChatItemProps {
  chat: Tables<"chats">
}

export const ChatItem: FC<ChatItemProps> = ({ chat }) => {
  const { selectedWorkspace, selectedChat } = useContext(ChatbotUIContext)

  const router = useRouter()
  const params = useParams()
  const isActive = params.chatid === chat.id || selectedChat?.id === chat.id

  const itemRef = useRef<HTMLDivElement>(null)

  const handleClick = () => {
    if (!selectedWorkspace) return
    return router.push(`/${selectedWorkspace.id}/chat/${chat.id}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.stopPropagation()
      itemRef.current?.click()
    }
  }

  // Ebisu
  const updated_at = (chat?.updated_at || chat?.created_at) as string

  const chatEbisuModel = chat?.ebisu_model || [4, 4, 24]
  const [arg1, arg2, arg3] = chatEbisuModel

  const model = ebisu.defaultModel(arg3, arg1, arg2)

  // elapsed time in hours from last update to now
  var elapsed = (Date.now() - new Date(updated_at).getTime()) / 1000 / 60 / 60

  const predictedRecall = ebisu.predictRecall(model, elapsed, true)

  return (
    <div
      ref={itemRef}
      className={cn(
        "hover:bg-accent focus:bg-accent group flex w-full cursor-pointer items-center rounded p-2 hover:opacity-50 focus:outline-none",
        isActive && "bg-accent"
      )}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
    >
      <DynamicPieChart value={predictedRecall * 100} scale={0.6} />

      <div className="ml-3 flex-1 truncate text-sm font-semibold">
        {chat.name}
      </div>

      <div
        onClick={e => {
          e.stopPropagation()
          e.preventDefault()
        }}
        className={`ml-2 flex space-x-2 ${!isActive && "w-11 opacity-0 group-hover:opacity-100"}`}
      >
        <UpdateChat chat={chat} />

        <DeleteChat chat={chat} />
      </div>
    </div>
  )
}
