import { ChatbotUIContext } from "@/context/context"
import { createAssistant } from "@/db/assistants"
import { createPreset } from "@/db/presets"
import { createPrompt } from "@/db/prompts"
import { getWorkspaceById } from "@/db/workspaces"
import { Tables } from "@/supabase/types"
import { ContentType, DataItemType } from "@/types"
import { useRouter } from "next/navigation"
import { FC, useContext } from "react"
import { toast } from "sonner"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "../ui/command"

interface AddToWorkspaceProps {
  contentType: ContentType
  item: DataItemType
}

export const AddToWorkspace: FC<AddToWorkspaceProps> = ({
  contentType,
  item
}) => {
  const {
    profile,
    setSelectedWorkspace,
    workspaces,
    setChats,
    setPresets,
    setPrompts,
    setFiles,
    setCollections,
    setAssistants,
    setTools
  } = useContext(ChatbotUIContext)

  const router = useRouter()

  const createFunctions = {
    chats: async (
      item: Tables<"chats">,
      workspaceId: string,
      userId: string
    ) => {
      // TODO
      // const createdChat = await createChat(
      //   {
      //     user_id: userId,
      //     folder_id: null,
      //     description: item.description,
      //     name: item.name,
      //     prompt: item.prompt,
      //     temperature: item.temperature
      //   },
      //   workspaceId
      // )
      // return createdChat
    },
    presets: async (
      item: Tables<"presets">,
      workspaceId: string,
      userId: string
    ) => {
      const createdPreset = await createPreset(
        {
          user_id: userId,
          folder_id: null,
          context_length: item.context_length,
          description: item.description,
          include_profile_context: item.include_profile_context,
          include_workspace_instructions: item.include_workspace_instructions,
          model: item.model,
          name: item.name,
          prompt: item.prompt,
          temperature: item.temperature,
          embeddings_provider: item.embeddings_provider
        },
        workspaceId
      )

      return createdPreset
    },
    prompts: async (
      item: Tables<"prompts">,
      workspaceId: string,
      userId: string
    ) => {
      const createdPrompt = await createPrompt(
        {
          user_id: userId,
          folder_id: null,
          content: item.content,
          name: item.name
        },
        workspaceId
      )

      return createdPrompt
    },
    files: async (
      item: Tables<"files">,
      workspaceId: string,
      userId: string
    ) => {
      // TODO also need file items to duplicate
      // const createdFile = await createFile(
      //   {
      //     user_id: userId,
      //     folder_id: null,
      //     name: item.name
      //   },
      //   workspaceId
      // )
      // return createdFile
    },
    collections: async (
      item: Tables<"collections">,
      workspaceId: string,
      userId: string
    ) => {
      // TODO also need to duplicate each file item in the collection and file items
    },
    assistants: async (
      item: Tables<"assistants">,
      workspaceId: string,
      userId: string
    ) => {
      const createdAssistant = await createAssistant(
        {
          user_id: userId,
          folder_id: null,
          context_length: item.context_length,
          description: item.description,
          include_profile_context: item.include_profile_context,
          include_workspace_instructions: item.include_workspace_instructions,
          model: item.model,
          name: item.name,
          // TODO need to duplicate image
          image_path: item.image_path,
          prompt: item.prompt,
          temperature: item.temperature,
          embeddings_provider: item.embeddings_provider
        },
        workspaceId
      )

      return createdAssistant
    },
    tools: async (
      item: Tables<"tools">,
      workspaceId: string,
      userId: string
    ) => {
      // TODO
    }
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

  const handleAddToWorkspace = async (workspaceId: string) => {
    if (!profile) return

    const createFunction = createFunctions[contentType]
    const setStateFunction = stateUpdateFunctions[contentType]

    if (!createFunction || !setStateFunction) return

    const newItem = await createFunction(
      item as any,
      workspaceId,
      profile.user_id
    )

    setStateFunction((prevItems: any) => [...prevItems, newItem])

    toast.success(`Added ${item.name} to workspace.`)

    const workspace = await getWorkspaceById(workspaceId)
    setSelectedWorkspace(workspace)

    router.push(`/chat/?tab=${contentType}`)
  }

  return (
    <Command>
      <CommandInput placeholder="Search workspaces..." />

      <CommandList className="flex flex-col">
        <CommandEmpty>No workspaces found.</CommandEmpty>

        <CommandGroup className="mt-1 flex flex-col">
          {workspaces.map(workspace => (
            <CommandItem
              key={workspace.id}
              className="w-full cursor-pointer hover:opacity-50"
              onSelect={() => handleAddToWorkspace(workspace.id)}
            >
              <div className="w-full">Add to {workspace.name}</div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
