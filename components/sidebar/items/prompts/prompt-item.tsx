import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { PROMPT_NAME_MAX } from "@/db/limits"
import { Tables } from "@/supabase/types"
import { IconPencil } from "@tabler/icons-react"
import { FC, useState } from "react"
import { SidebarItem } from "../all/sidebar-display-item"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPen } from "@fortawesome/pro-regular-svg-icons"

interface PromptItemProps {
  prompt: Tables<"prompts">
}

export const PromptItem: FC<PromptItemProps> = ({ prompt }) => {
  const [name, setName] = useState(prompt.name)
  const [content, setContent] = useState(prompt.content)
  const [isTyping, setIsTyping] = useState(false)
  return (
    <SidebarItem
      item={prompt}
      isTyping={isTyping}
      contentType="prompts"
      updateState={{ name, content }}
      renderInputs={() => (
        <>
          <div className="text-pixelspace-gray-3  space-y-1 text-sm font-normal leading-[25.20px]">
            <Label>Name</Label>

            <Input
              className={`bg-pixelspace-gray-70 border-pixelspace-gray-50 focus:border-pixelspace-gray-40 text-pixelspace-gray-20 h-[42px] border`}
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
              placeholder="Prompt..."
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
