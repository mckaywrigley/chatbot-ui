import { ChatbotUIContext } from "@/context/context"
import { updateAssistant } from "@/db/assistants"
import { updateChat } from "@/db/chats"
import { updateCollection } from "@/db/collections"
import { updateFile } from "@/db/files"
import { updatePreset } from "@/db/presets"
import { updatePrompt } from "@/db/prompts"
import { updateTool } from "@/db/tools"
import { ContentType, DataItemType } from "@/types"
import { IconCheck, IconShare2 } from "@tabler/icons-react"
import { FC, useContext } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"

export type ShareStatus = "private" | "unlisted" | "public"

interface ShareMenuProps {
  item: DataItemType | null
  contentType: ContentType
  size?: number
}

export const ShareMenu: FC<ShareMenuProps> = ({
  item,
  contentType,
  size = 28
}) => {
  const {
    setChats,
    setPresets,
    setPrompts,
    setFiles,
    setCollections,
    setAssistants,
    setSelectedChat,
    setTools
  } = useContext(ChatbotUIContext)

  const updateFunctions = {
    chats: updateChat,
    presets: updatePreset,
    prompts: updatePrompt,
    files: updateFile,
    collections: updateCollection,
    assistants: updateAssistant,
    tools: updateTool
  }

  const stateUpdateFunctions = {
    chats: setChats,
    presets: setPresets,
    prompts: setPrompts,
    files: setFiles,
    collections: setCollections,
    assistants: setAssistants,
    tools: setTools
  }

  const handleShareChange = async (shareStatus: ShareStatus) => {
    if (!item) return null

    const contentName = contentType.slice(0, -1)

    const updateFunction = updateFunctions[contentType]
    const setStateFunction = stateUpdateFunctions[contentType]

    if (!updateFunction || !setStateFunction) return

    const updatedItem: any = await updateFunction(item.id, {
      ...(item as any),
      sharing: shareStatus
    })

    if (navigator.clipboard && shareStatus !== "private") {
      navigator.clipboard.writeText(
        `${window.location.origin}/share/${contentName}/${item.id}`
      )
    }

    if (contentType === "chats") {
      setSelectedChat(updatedItem)
    }

    setStateFunction((items: any) =>
      items.map((item: any) =>
        item.id === updatedItem.id ? updatedItem : item
      )
    )

    if (shareStatus === "private") {
      toast.success(`${contentName} is now private`)
    } else {
      toast.success(`Copied share link to clipboard!`)
    }
  }

  if (!item) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <IconShare2 size={size} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Share Menu</DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex cursor-pointer hover:opacity-50"
          onClick={() => handleShareChange("private")}
        >
          {item.sharing === "private" && (
            <IconCheck className="mr-1" size={20} />
          )}
          <div>Private</div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex cursor-pointer hover:opacity-50"
          onClick={() => handleShareChange("unlisted")}
        >
          {item.sharing === "unlisted" && (
            <IconCheck className="mr-1" size={20} />
          )}
          <div>Unlisted</div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex cursor-pointer hover:opacity-50"
          onClick={() => handleShareChange("public")}
        >
          {item.sharing === "public" && (
            <IconCheck className="mr-1" size={20} />
          )}
          <div>Public</div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
