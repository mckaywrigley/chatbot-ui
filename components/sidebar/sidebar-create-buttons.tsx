import { IconFolderPlus, IconPlus } from "@tabler/icons-react"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { createFolder } from "@/db/folders"
import { ContentType } from "@/types"
import { FC, useContext, useState } from "react"
import { Button } from "../ui/button"
import { CreateAssistant } from "./items/assistants/create-assistant"
import { CreateCollection } from "./items/collections/create-collection"
import { CreateFile } from "./items/files/create-file"
import { CreateReport } from "../reports/create-report"
import { CreateDesign } from "../designs/create-design"
import { CreateDataCollection } from "../data-collections/create-data-collection"

interface SidebarCreateButtonsProps {
  contentType: ContentType
  hasData: boolean
}

export const SidebarCreateButtons: FC<SidebarCreateButtonsProps> = ({
  contentType,
  hasData
}) => {
  const { profile, selectedWorkspace, folders, setFolders } =
    useContext(ChatbotUIContext)
  const { handleNewChat } = useChatHandler()

  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)
  const [isCreatingAssistant, setIsCreatingAssistant] = useState(false)
  const [isCreatingReport, setIsCreatingReport] = useState(false)
  const [isCreatingDesign, setIsCreatingDesign] = useState(false)
  const [isCreatingDataCollection, setIsCreatingDataCollection] =
    useState(false)

  const handleCreateFolder = async () => {
    if (!profile) return
    if (!selectedWorkspace) return

    const createdFolder = await createFolder({
      user_id: profile.user_id,
      workspace_id: selectedWorkspace.id,
      name: "New Folder",
      description: "",
      type: contentType
    })
    setFolders([...folders, createdFolder])
  }

  const getCreateFunction = () => {
    switch (contentType) {
      case "chats":
        return async () => {
          handleNewChat()
        }

      case "files":
        return async () => {
          setIsCreatingFile(true)
        }

      case "collections":
        return async () => {
          setIsCreatingCollection(true)
        }

      case "assistants":
        return async () => {
          setIsCreatingAssistant(true)
        }
      case "reports":
        return async () => {
          setIsCreatingReport(true)
        }
      case "designs":
        return async () => {
          setIsCreatingDesign(true)
        }
      case "data-collections":
        return async () => {
          setIsCreatingDataCollection(true)
        }

      default:
        break
    }
  }

  return (
    <div className="flex w-full space-x-2">
      <Button className="flex h-[36px] grow" onClick={getCreateFunction()}>
        <IconPlus className="mr-1" size={20} />
        New{" "}
        {contentType === "data-collections"
          ? "Data Collection"
          : contentType.charAt(0).toUpperCase() +
            contentType.slice(1, contentType.length - 1)}
      </Button>

      {hasData && (
        <Button className="size-[36px] p-1" onClick={handleCreateFolder}>
          <IconFolderPlus size={20} />
        </Button>
      )}

      {isCreatingFile && (
        <CreateFile isOpen={isCreatingFile} onOpenChange={setIsCreatingFile} />
      )}

      {isCreatingCollection && (
        <CreateCollection
          isOpen={isCreatingCollection}
          onOpenChange={setIsCreatingCollection}
        />
      )}

      {isCreatingAssistant && (
        <CreateAssistant
          isOpen={isCreatingAssistant}
          onOpenChange={setIsCreatingAssistant}
        />
      )}

      {isCreatingReport && (
        <CreateReport
          isOpen={isCreatingReport}
          onOpenChange={setIsCreatingReport}
        />
      )}

      {isCreatingDesign && (
        <CreateDesign
          isOpen={isCreatingDesign}
          onOpenChange={setIsCreatingDesign}
        />
      )}

      {isCreatingDataCollection && (
        <CreateDataCollection
          isOpen={isCreatingDataCollection}
          onOpenChange={setIsCreatingDataCollection}
        />
      )}
    </div>
  )
}
