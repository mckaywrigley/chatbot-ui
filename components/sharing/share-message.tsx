import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { Tables } from "@/supabase/types"
import { IconMoodSmile } from "@tabler/icons-react"
import { FC } from "react"
import { MessageMarkdown } from "../messages/message-markdown"
import { ModelIcon } from "../models/model-icon"

interface MessageProps {
  username: string
  message: Tables<"messages">
}

export const ShareMessage: FC<MessageProps> = ({ username, message }) => {
  const modelData = LLM_LIST.find(
    llmModel => llmModel.modelId === message.model
  )

  const isUser = message.role === "user"
  const ICON_SIZE = 28
  const icon = isUser ? (
    <IconMoodSmile
      className="bg-primary text-secondary border-primary rounded border-[1px] p-1"
      size={ICON_SIZE}
    />
  ) : (
    <ModelIcon modelId={message.model} height={ICON_SIZE} width={ICON_SIZE} />
  )
  const label = isUser ? "User" : modelData?.modelName
  const bgClass = isUser ? "bg-muted/50" : "bg-muted"

  return (
    <div className={`${bgClass} space-y-3 border-b p-5`}>
      <div className="flex w-fit items-center">
        {icon}

        <div className="ml-3 font-bold">{label}</div>
      </div>

      <MessageMarkdown content={message.content} />
    </div>
  )
}
