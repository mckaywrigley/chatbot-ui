import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { PROMPT_NAME_MAX } from "@/db/limits"
import { Tables } from "@/supabase/types"
import { IconPencil } from "@tabler/icons-react"
import { FC, useContext, useState } from "react"
import { SidebarItem } from "../all/sidebar-display-item"
import { ChatbotUIContext } from "@/context/context"

interface PromptItemProps {
  prompt: Tables<"prompts">
}

export const PromptItem: FC<PromptItemProps> = ({ prompt }) => {
  const { isMobile } = useContext(ChatbotUIContext)
  const [name, setName] = useState(prompt.name)
  const [content, setContent] = useState(prompt.content)
  const [isTyping, setIsTyping] = useState(false)
  return (
    <SidebarItem
      item={prompt}
      isTyping={isTyping}
      contentType="prompts"
      icon={<IconPencil size={30} />}
      updateState={{ name, content }}
      renderInputs={() => (
        <>
          <div className="space-y-1">
            <Label>Name</Label>

            <Input
              placeholder="Prompt name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={PROMPT_NAME_MAX}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
            />
          </div>

          <div className="space-y-1">
            <Label>Prompt</Label>

            <TextareaAutosize
              placeholder="Prompt..."
              value={content}
              onValueChange={setContent}
              minRows={6}
              maxRows={isMobile ? 6 : 12}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
            />
          </div>
        </>
      )}
    />
  )
}
