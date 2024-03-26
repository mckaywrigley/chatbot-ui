import { SidebarCreateItem } from "@/components/sidebar/items/all/sidebar-create-item"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { ChatbotUIContext } from "@/context/context"
import { PROMPT_NAME_MAX } from "@/db/limits"
import { TablesInsert } from "@/supabase/types"
import { FC, useContext, useState } from "react"

interface CreatePromptProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const CreatePrompt: FC<CreatePromptProps> = ({
  isOpen,
  onOpenChange
}) => {
  const { profile, selectedWorkspace } = useContext(ChatbotUIContext)
  const [isTyping, setIsTyping] = useState(false)
  const [name, setName] = useState("")
  const [content, setContent] = useState("")

  if (!profile) return null
  if (!selectedWorkspace) return null

  return (
    <SidebarCreateItem
      contentType="prompts"
      isOpen={isOpen}
      isTyping={isTyping}
      onOpenChange={onOpenChange}
      createState={
        {
          user_id: profile.user_id,
          name,
          content
        } as TablesInsert<"prompts">
      }
      renderInputs={() => (
        <>
          <div className="text-pixelspace-gray-3  space-y-1 text-sm font-normal leading-[25.20px]">
            <Label>Name</Label>

            <Input
              className={`bg-pixelspace-gray-70 border-pixelspace-gray-50 focus:border-pixelspace-gray-40 text-pixelspace-gray-20 h-[42px] border`}
              placeholder="Prompt name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={PROMPT_NAME_MAX}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
            />
          </div>

          <div className="text-pixelspace-gray-3  space-y-1 text-sm font-normal leading-[25.20px]">
            <Label>Prompt</Label>

            <TextareaAutosize
              className={`bg-pixelspace-gray-70 border-pixelspace-gray-50 focus:border-pixelspace-gray-40 text-pixelspace-gray-20 w-full border p-3`}
              placeholder="Prompt content..."
              value={content}
              onValueChange={setContent}
              minRows={19}
              maxRows={30}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
            />
          </div>
        </>
      )}
    />
  )
}
