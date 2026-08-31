import { SidebarCreateItem } from "../sidebar/items/all/sidebar-create-item"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { ReportRetrievalSelect } from "../reports/report-retrieval-select"
import { FC, useContext, useRef, useState } from "react"

interface CreateDataCollectionProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const CreateDataCollection: FC<CreateDataCollectionProps> = ({
  isOpen,
  onOpenChange
}) => {
  const { profile, selectedWorkspace } = useContext(ChatbotUIContext)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedProtocol, setSelectedProtocol] = useState<Tables<"files">[]>(
    []
  )

  const nameInputRef = useRef<HTMLInputElement>(null)

  if (!profile || !selectedWorkspace) return null

  const handleProtocolSelect = (item: Tables<"files">) => {
    // Only allow one protocol file
    setSelectedProtocol([item])
  }

  const createState = {
    user_id: profile.user_id || "",
    name: name || "Untitled Data Collection",
    description,
    sharing: "private" as const,
    protocol_file_id:
      selectedProtocol.length > 0 ? selectedProtocol[0].id : null,
    protocol_file_name:
      selectedProtocol.length > 0 ? selectedProtocol[0].name : null
  }

  return (
    <SidebarCreateItem
      contentType="data-collections"
      isTyping={false}
      createState={createState}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      renderInputs={() => (
        <>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              ref={nameInputRef}
              placeholder="e.g. Viscosity Measurements Batch 3"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1 pt-2">
            <Label>Description (optional)</Label>
            <Input
              placeholder="Brief description of the data..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1 pt-2">
            <Label>Protocol File (optional)</Label>
            <p className="text-muted-foreground text-xs">
              Select a protocol file to auto-generate a data entry template with
              the expected columns and structure.
            </p>
            <ReportRetrievalSelect
              selectedRetrievalItems={selectedProtocol}
              onRetrievalItemSelect={handleProtocolSelect}
              fileType="protocol"
            />
          </div>
        </>
      )}
    />
  )
}
