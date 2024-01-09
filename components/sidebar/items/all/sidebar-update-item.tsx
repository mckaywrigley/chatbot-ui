import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { AssignWorkspaces } from "@/components/workspace/assign-workspaces"
import { ChatbotUIContext } from "@/context/context"
import {
  createAssistantWorkspaces,
  deleteAssistantWorkspace,
  getAssistantWorkspacesByAssistantId,
  updateAssistant
} from "@/db/assistants"
import { updateChat } from "@/db/chats"
import {
  createCollectionWorkspaces,
  deleteCollectionWorkspace,
  getCollectionWorkspacesByCollectionId,
  updateCollection
} from "@/db/collections"
import {
  createFileWorkspaces,
  deleteFileWorkspace,
  getFileWorkspacesByFileId,
  updateFile
} from "@/db/files"
import {
  createPresetWorkspaces,
  deletePresetWorkspace,
  getPresetWorkspacesByPresetId,
  updatePreset
} from "@/db/presets"
import {
  createPromptWorkspaces,
  deletePromptWorkspace,
  getPromptWorkspacesByPromptId,
  updatePrompt
} from "@/db/prompts"
import { uploadAssistantImage } from "@/db/storage/assistant-images"
import { Tables, TablesUpdate } from "@/supabase/types"
import { ContentType, DataItemType } from "@/types"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { SidebarDeleteItem } from "./sidebar-delete-item"

interface SidebarUpdateItemProps {
  item: DataItemType
  contentType: ContentType
  children: React.ReactNode
  renderInputs: () => JSX.Element
  updateState: any
}

export const SidebarUpdateItem: FC<SidebarUpdateItemProps> = ({
  item,
  contentType,
  children,
  renderInputs,
  updateState
}) => {
  const {
    workspaces,
    selectedWorkspace,
    setChats,
    setPresets,
    setPrompts,
    setFiles,
    setCollections,
    setAssistants
  } = useContext(ChatbotUIContext)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [startingWorkspaces, setStartingWorkspaces] = useState<
    Tables<"workspaces">[]
  >([])
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<
    Tables<"workspaces">[]
  >([])

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        const workspaces = await fetchSelectedWorkspaces()
        setStartingWorkspaces(workspaces)
        setSelectedWorkspaces(workspaces)
      }

      fetchData()
    }
  }, [isOpen])

  const fetchWorkpaceFunctions = {
    chats: null,
    presets: async (presetId: string) => {
      const item = await getPresetWorkspacesByPresetId(presetId)
      return item.workspaces
    },
    prompts: async (promptId: string) => {
      const item = await getPromptWorkspacesByPromptId(promptId)
      return item.workspaces
    },
    files: async (fileId: string) => {
      const item = await getFileWorkspacesByFileId(fileId)
      return item.workspaces
    },
    collections: async (collectionId: string) => {
      const item = await getCollectionWorkspacesByCollectionId(collectionId)
      return item.workspaces
    },
    assistants: async (assistantId: string) => {
      const item = await getAssistantWorkspacesByAssistantId(assistantId)
      return item.workspaces
    }
  }

  const fetchSelectedWorkspaces = async () => {
    const fetchFunction = fetchWorkpaceFunctions[contentType]

    if (!fetchFunction) return []

    const workspaces = await fetchFunction(item.id)

    return workspaces
  }

  const handleWorkspaceUpdates = async (
    startingWorkspaces: Tables<"workspaces">[],
    selectedWorkspaces: Tables<"workspaces">[],
    itemId: string,
    deleteWorkspaceFn: (
      itemId: string,
      workspaceId: string
    ) => Promise<boolean>,
    createWorkspaceFn: (
      workspaces: { user_id: string; item_id: string; workspace_id: string }[]
    ) => Promise<void>,
    itemIdKey: string
  ) => {
    if (!selectedWorkspace) return

    const deleteList = startingWorkspaces.filter(
      startingWorkspace =>
        !selectedWorkspaces.some(
          selectedWorkspace => selectedWorkspace.id === startingWorkspace.id
        )
    )

    for (const workspace of deleteList) {
      await deleteWorkspaceFn(itemId, workspace.id)
    }

    if (deleteList.map(w => w.id).includes(selectedWorkspace.id)) {
      const setStateFunction = stateUpdateFunctions[contentType]

      if (setStateFunction) {
        setStateFunction((prevItems: any) =>
          prevItems.filter((prevItem: any) => prevItem.id !== item.id)
        )
      }
    }

    const createList = selectedWorkspaces.filter(
      selectedWorkspace =>
        !startingWorkspaces.some(
          startingWorkspace => startingWorkspace.id === selectedWorkspace.id
        )
    )

    await createWorkspaceFn(
      createList.map(workspace => {
        return {
          user_id: workspace.user_id,
          [itemIdKey]: itemId,
          workspace_id: workspace.id
        } as any
      })
    )
  }

  const updateFunctions = {
    chats: updateChat,
    presets: async (presetId: string, updateState: TablesUpdate<"presets">) => {
      const updatedPreset = await updatePreset(presetId, updateState)

      await handleWorkspaceUpdates(
        startingWorkspaces,
        selectedWorkspaces,
        presetId,
        deletePresetWorkspace,
        createPresetWorkspaces as any,
        "preset_id"
      )

      return updatedPreset
    },
    prompts: async (promptId: string, updateState: TablesUpdate<"prompts">) => {
      const updatedPrompt = await updatePrompt(promptId, updateState)

      await handleWorkspaceUpdates(
        startingWorkspaces,
        selectedWorkspaces,
        promptId,
        deletePromptWorkspace,
        createPromptWorkspaces as any,
        "prompt_id"
      )

      return updatedPrompt
    },
    files: async (fileId: string, updateState: TablesUpdate<"files">) => {
      const updatedFile = await updateFile(fileId, updateState)

      await handleWorkspaceUpdates(
        startingWorkspaces,
        selectedWorkspaces,
        fileId,
        deleteFileWorkspace,
        createFileWorkspaces as any,
        "file_id"
      )

      return updatedFile
    },
    collections: async (
      collectionId: string,
      updateState: {
        image: File
        collectionFilesToAdd: string[]
        collectionFilesToRemove: string[]
      } & TablesUpdate<"assistants">
    ) => {
      const { image, collectionFilesToAdd, collectionFilesToRemove, ...rest } =
        updateState

      // add files
      // remove files

      // TODO deletes image
      const updatedCollection = await updateCollection(collectionId, rest)

      await handleWorkspaceUpdates(
        startingWorkspaces,
        selectedWorkspaces,
        collectionId,
        deleteCollectionWorkspace,
        createCollectionWorkspaces as any,
        "collection_id"
      )

      return updatedCollection
    },
    assistants: async (
      assistantId: string,
      updateState: {
        image: File
      } & TablesUpdate<"assistants">
    ) => {
      const { image, ...rest } = updateState

      const updatedAssistant = await updateAssistant(assistantId, rest)

      // TODO deletes
      if (image) {
        await uploadAssistantImage(updatedAssistant, image)
      }

      await handleWorkspaceUpdates(
        startingWorkspaces,
        selectedWorkspaces,
        assistantId,
        deleteAssistantWorkspace,
        createAssistantWorkspaces as any,
        "assistant_id"
      )

      return updatedAssistant
    }
  }

  const stateUpdateFunctions = {
    chats: setChats,
    presets: setPresets,
    prompts: setPrompts,
    files: setFiles,
    collections: setCollections,
    assistants: setAssistants
  }

  const handleUpdate = async () => {
    const updateFunction = updateFunctions[contentType]
    const setStateFunction = stateUpdateFunctions[contentType]

    if (!updateFunction || !setStateFunction) return

    const updatedItem = await updateFunction(item.id, updateState)

    setStateFunction((prevItems: any) =>
      prevItems.map((prevItem: any) =>
        prevItem.id === item.id ? updatedItem : prevItem
      )
    )

    setIsOpen(false)
  }

  const handleSelectWorkspace = (workspace: Tables<"workspaces">) => {
    setSelectedWorkspaces(prevState => {
      const isWorkspaceAlreadySelected = prevState.find(
        selectedWorkspace => selectedWorkspace.id === workspace.id
      )

      if (isWorkspaceAlreadySelected) {
        return prevState.filter(
          selectedWorkspace => selectedWorkspace.id !== workspace.id
        )
      } else {
        return [...prevState, workspace]
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      buttonRef.current?.click()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Edit {contentType.slice(0, -1)}
          </DialogTitle>
        </DialogHeader>

        {/* TODO */}
        {/* <div className="absolute right-4 top-4">
          <ShareMenu item={item} contentType={contentType} />
        </div> */}

        <div className="space-y-3">
          {workspaces.length > 1 && (
            <div className="space-y-1">
              <Label>Assigned Workspaces</Label>

              <AssignWorkspaces
                selectedWorkspaces={selectedWorkspaces}
                onSelectWorkspace={handleSelectWorkspace}
              />
            </div>
          )}

          {renderInputs()}
        </div>

        <DialogFooter className="mt-2 flex justify-between">
          <SidebarDeleteItem item={item} contentType={contentType} />

          <div className="flex grow justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>

            <Button ref={buttonRef} onClick={handleUpdate}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
