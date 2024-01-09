import { Tables } from "@/supabase/types"
import { User } from "@supabase/supabase-js"
import { FC } from "react"
import { ShareItem } from "./share-item"

interface SharePromptProps {
  user: User | null
  prompt: Tables<"prompts">
}

export const SharePrompt: FC<SharePromptProps> = ({ user, prompt }) => {
  return (
    <ShareItem
      user={user}
      item={prompt}
      contentType="prompts"
      renderContent={() => (
        <div className="space-y-3">
          <div className="text-2xl font-bold">{prompt.name}</div>

          <div className="font-light">{prompt.content}</div>
        </div>
      )}
    />
  )
}
