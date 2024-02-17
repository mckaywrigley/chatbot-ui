import { createFolder } from "@/actions/folders"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { Tables } from "@/supabase/types"
import { ContentType } from "@/types"
import { IconFolderPlus, IconPlus } from "@tabler/icons-react"
import { FC, useState } from "react"
import { Button } from "../ui/button"
import { CreateAssistant } from "./items/assistants/create-assistant"
import { CreateCollection } from "./items/collections/create-collection"
import { CreateFile } from "./items/files/create-file"
import { CreateModel } from "./items/models/create-model"
import { CreatePreset } from "./items/presets/create-preset"
import { CreatePrompt } from "./items/prompts/create-prompt"
import { CreateTool } from "./items/tools/create-tool"

interface SidebarCreateButtonsProps {
  profile: Tables<"profiles">
  files: Tables<"files">[]
  collections: Tables<"collections">[]
  models: Tables<"models">[]
  tools: Tables<"tools">[]
  workspaceId: string
  contentType: ContentType
  hasData: boolean
}

export const SidebarCreateButtons: FC<SidebarCreateButtonsProps> = ({
  profile,
  files,
  collections,
  models,
  tools,
  workspaceId,
  contentType,
  hasData
}) => {
  const { handleNewChat } = useChatHandler({
    profile,
    models
  })

  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false)
  const [isCreatingPreset, setIsCreatingPreset] = useState(false)
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)
  const [isCreatingAssistant, setIsCreatingAssistant] = useState(false)
  const [isCreatingTool, setIsCreatingTool] = useState(false)
  const [isCreatingModel, setIsCreatingModel] = useState(false)

  const handleCreateFolder = async () => {
    const createdFolder = await createFolder({
      user_id: profile.user_id,
      workspace_id: workspaceId,
      name: "New Folder",
      description: "",
      type: contentType
    })
  }

  const getCreateFunction = () => {
    switch (contentType) {
      case "chats":
        return async () => {
          handleNewChat(workspaceId)
        }

      case "presets":
        return async () => {
          setIsCreatingPreset(true)
        }

      case "prompts":
        return async () => {
          setIsCreatingPrompt(true)
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

      case "tools":
        return async () => {
          setIsCreatingTool(true)
        }

      case "models":
        return async () => {
          setIsCreatingModel(true)
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
        {contentType.charAt(0).toUpperCase() +
          contentType.slice(1, contentType.length - 1)}
      </Button>

      {hasData && (
        <Button className="size-[36px] p-1" onClick={handleCreateFolder}>
          <IconFolderPlus size={20} />
        </Button>
      )}

      {isCreatingPrompt && (
        <CreatePrompt
          profile={profile}
          isOpen={isCreatingPrompt}
          onOpenChange={setIsCreatingPrompt}
        />
      )}

      {isCreatingPreset && (
        <CreatePreset
          profile={profile}
          models={models}
          isOpen={isCreatingPreset}
          onOpenChange={setIsCreatingPreset}
        />
      )}

      {isCreatingFile && (
        <CreateFile
          profile={profile}
          isOpen={isCreatingFile}
          onOpenChange={setIsCreatingFile}
        />
      )}

      {isCreatingCollection && (
        <CreateCollection
          profile={profile}
          files={files}
          isOpen={isCreatingCollection}
          onOpenChange={setIsCreatingCollection}
        />
      )}

      {isCreatingAssistant && (
        <CreateAssistant
          profile={profile}
          files={files}
          collections={collections}
          models={models}
          tools={tools}
          isOpen={isCreatingAssistant}
          onOpenChange={setIsCreatingAssistant}
        />
      )}

      {isCreatingTool && (
        <CreateTool
          profile={profile}
          isOpen={isCreatingTool}
          onOpenChange={setIsCreatingTool}
        />
      )}

      {isCreatingModel && (
        <CreateModel
          profile={profile}
          isOpen={isCreatingModel}
          onOpenChange={setIsCreatingModel}
        />
      )}
    </div>
  )
}
