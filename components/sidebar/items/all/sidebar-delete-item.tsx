import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { deleteAssistant } from "@/db/assistants"
import { deleteChat } from "@/db/chats"
import { deleteCollection } from "@/db/collections"
import { deleteFile } from "@/db/files"
import { deleteModel } from "@/db/models"
import { deletePreset } from "@/db/presets"
import { deletePrompt } from "@/db/prompts"
import { deleteFileFromStorage } from "@/db/storage/files"
import { deleteTool } from "@/db/tools"
import { Tables } from "@/supabase/types"
import { ContentType, DataItemType } from "@/types"
import { FC, useRef, useState } from "react"

interface SidebarDeleteItemProps {
  item: DataItemType
  contentType: ContentType
}

export const SidebarDeleteItem: FC<SidebarDeleteItemProps> = ({
  item,
  contentType
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showDialog, setShowDialog] = useState(false)

  const deleteFunctions = {
    chats: async (chat: Tables<"chats">) => {
      await deleteChat(chat.id)
    },
    presets: async (preset: Tables<"presets">) => {
      await deletePreset(preset.id)
    },
    prompts: async (prompt: Tables<"prompts">) => {
      await deletePrompt(prompt.id)
    },
    files: async (file: Tables<"files">) => {
      await deleteFileFromStorage(file.file_path)
      await deleteFile(file.id)
    },
    collections: async (collection: Tables<"collections">) => {
      await deleteCollection(collection.id)
    },
    assistants: async (assistant: Tables<"assistants">) => {
      await deleteAssistant(assistant.id)
    },
    tools: async (tool: Tables<"tools">) => {
      await deleteTool(tool.id)
    },
    models: async (model: Tables<"models">) => {
      await deleteModel(model.id)
    }
  }

  const handleDelete = async () => {
    const deleteFunction = deleteFunctions[contentType]

    if (!deleteFunction) return

    await deleteFunction(item as any)

    setShowDialog(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.stopPropagation()
      buttonRef.current?.click()
    }
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button className="text-red-500" variant="ghost">
          Delete
        </Button>
      </DialogTrigger>

      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Delete {contentType.slice(0, -1)}</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete {item.name}?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowDialog(false)}>
            Cancel
          </Button>

          <Button ref={buttonRef} variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
