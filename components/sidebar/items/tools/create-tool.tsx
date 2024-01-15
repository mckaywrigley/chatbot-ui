import { SidebarCreateItem } from "@/components/sidebar/items/all/sidebar-create-item"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChatbotUIContext } from "@/context/context"
import { TOOL_NAME_MAX } from "@/db/limits"
import { TablesInsert } from "@/supabase/types"
import { FC, useContext, useState } from "react"

interface CreateToolProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const CreateTool: FC<CreateToolProps> = ({ isOpen, onOpenChange }) => {
  const { profile, selectedWorkspace } = useContext(ChatbotUIContext)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  if (!profile || !selectedWorkspace) return null

  return (
    <SidebarCreateItem
      contentType="tools"
      createState={
        {
          user_id: profile.user_id,
          name,
          description
        } as TablesInsert<"tools">
      }
      isOpen={isOpen}
      renderInputs={() => (
        <>
          <div className="space-y-1">
            <Label>Name</Label>

            <Input
              placeholder="Tool name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={TOOL_NAME_MAX}
            />
          </div>

          {/* <div className="space-y-1">
            <Label>Description (optional)</Label>

            <Input
              placeholder="Tool description..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={TOOL_DESCRIPTION_MAX}
            />
          </div> */}
        </>
      )}
      onOpenChange={onOpenChange}
    />
  )
}
