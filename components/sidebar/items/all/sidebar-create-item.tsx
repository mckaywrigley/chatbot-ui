import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import { ChatbotUIContext } from "@/context/context"
import { createAssistantCollections } from "@/db/assistant-collections"
import { createAssistantFiles } from "@/db/assistant-files"
import { createAssistantTools } from "@/db/assistant-tools"
import { createAssistant, updateAssistant } from "@/db/assistants"
import { createChat } from "@/db/chats"
import { createCollectionFiles } from "@/db/collection-files"
import { createCollection } from "@/db/collections"
import { createFileBasedOnExtension } from "@/db/files"
import { createModel } from "@/db/models"
import { createPreset } from "@/db/presets"
import { createPrompt } from "@/db/prompts"
import {
  getAssistantImageFromStorage,
  uploadAssistantImage
} from "@/db/storage/assistant-images"
import { createTool } from "@/db/tools"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import { Tables, TablesInsert } from "@/supabase/types"
import { ContentType } from "@/types"
import { FC, useContext, useRef, useState } from "react"
import { toast } from "sonner"

interface SidebarCreateItemProps {
  isOpen: boolean
  isTyping: boolean
  onOpenChange: (isOpen: boolean) => void
  contentType: ContentType
  renderInputs: () => JSX.Element
  createState: any
}

export const SidebarCreateItem: FC<SidebarCreateItemProps> = ({
  isOpen,
  onOpenChange,
  contentType,
  renderInputs,
  createState,
  isTyping
}) => {
  const {
    selectedWorkspace,
    setChats,
    setPresets,
    setPrompts,
    setFiles,
    setCollections,
    setAssistants,
    setAssistantImages,
    setTools,
    setModels
  } = useContext(ChatbotUIContext)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [creating, setCreating] = useState(false)

  const createFunctions = {
    chats: createChat,
    presets: createPreset,
    prompts: createPrompt,
    files: async (
      createState: { file: File } & TablesInsert<"files">,
      workspaceId: string
    ) => {
      if (!selectedWorkspace) return

      const { file, ...rest } = createState

      const createdFile = await createFileBasedOnExtension(
        file,
        rest,
        workspaceId,
        selectedWorkspace.embeddings_provider as "openai" | "local"
      )

      return createdFile
    },
    
  }

  const stateUpdateFunctions = {
    chats: setChats,
    presets: setPresets,
    prompts: setPrompts,
    files: setFiles,
  }

  const handleCreate = async () => {
    try {
      if (!selectedWorkspace) return
      if (isTyping) return // Prevent creation while typing

      const createFunction = createFunctions[contentType]
      const setStateFunction = stateUpdateFunctions[contentType]

      if (!createFunction || !setStateFunction) return

      setCreating(true)

      const newItem = await createFunction(createState, selectedWorkspace.id)

      setStateFunction((prevItems: any) => [...prevItems, newItem])

      onOpenChange(false)
      setCreating(false)
    } catch (error) {
      toast.error(`Error creating ${contentType.slice(0, -1)}. ${error}.`)
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isTyping && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      buttonRef.current?.click()
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex min-w-[450px] flex-col justify-between"
        side="left"
        onKeyDown={handleKeyDown}
      >
        <div className="grow">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">
              Create{" "}
              {contentType.charAt(0).toUpperCase() + contentType.slice(1, -1)}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-3">{renderInputs()}</div>
        </div>

        <SheetFooter className="mt-2 flex justify-between">
          <div className="flex grow justify-end space-x-2">
            <Button
              disabled={creating}
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button disabled={creating} ref={buttonRef} onClick={handleCreate}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
