import { Tables } from "@/supabase/types"
import { User } from "@supabase/supabase-js"
import { FC } from "react"
import { ShareItem } from "./share-item"

interface ShareAssistantProps {
  user: User | null
  assistant: Tables<"assistants">
}

export const ShareAssistant: FC<ShareAssistantProps> = ({
  user,
  assistant
}) => {
  return (
    <ShareItem
      user={user}
      item={assistant}
      contentType="assistants"
      renderContent={() => <div>{assistant.name}</div>}
    />
  )
}
