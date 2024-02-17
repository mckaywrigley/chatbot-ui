import { updateAssistant } from "@/db/assistants"
import { updateChat } from "@/db/chats"
import { updateCollection } from "@/db/collections"
import { updateFile } from "@/db/files"
import { updateModel } from "@/db/models"
import { updatePreset } from "@/db/presets"
import { updatePrompt } from "@/db/prompts"
import { updateTool } from "@/db/tools"
import { Tables } from "@/supabase/types"
import { ContentType, DataItemType, DataListType } from "@/types"
import { cn } from "@/utils/utils"
import { FC, useEffect, useRef, useState } from "react"
import { Separator } from "../ui/separator"
import { AssistantItem } from "./items/assistants/assistant-item"
import { ChatItem } from "./items/chat/chat-item"
import { CollectionItem } from "./items/collections/collection-item"
import { FileItem } from "./items/files/file-item"
import { Folder } from "./items/folders/folder-item"
import { ModelItem } from "./items/models/model-item"
import { PresetItem } from "./items/presets/preset-item"
import { PromptItem } from "./items/prompts/prompt-item"
import { ToolItem } from "./items/tools/tool-item"

interface SidebarDataListProps {
  workspaceId: string
  profile: Tables<"profiles">
  models: Tables<"models">[]
  workspaces: Tables<"workspaces">[]
  presets: Tables<"presets">[]
  contentType: ContentType
  data: DataListType
  folders: Tables<"folders">[]
  files: Tables<"files">[]
  tools: Tables<"tools">[]
  collections: Tables<"collections">[]
}

export const SidebarDataList: FC<SidebarDataListProps> = ({
  workspaceId,
  profile,
  models,
  workspaces,
  presets,
  contentType,
  data,
  folders,
  files,
  tools,
  collections
}) => {
  const divRef = useRef<HTMLDivElement>(null)

  const [isOverflowing, setIsOverflowing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const getDataListComponent = (
    contentType: ContentType,
    item: DataItemType
  ) => {
    switch (contentType) {
      case "chats":
        return (
          <ChatItem
            workspaceId={workspaceId}
            key={item.id}
            profile={profile}
            models={models}
            chat={item as Tables<"chats">}
          />
        )

      case "presets":
        return (
          <PresetItem
            key={item.id}
            workspaces={workspaces}
            profile={profile}
            models={models}
            preset={item as Tables<"presets">}
          />
        )

      case "prompts":
        return (
          <PromptItem
            key={item.id}
            prompt={item as Tables<"prompts">}
            workspaces={workspaces}
          />
        )

      case "files":
        return (
          <FileItem
            key={item.id}
            file={item as Tables<"files">}
            workspaces={workspaces}
          />
        )

      case "collections":
        return (
          <CollectionItem
            key={item.id}
            workspaces={workspaces}
            collection={item as Tables<"collections">}
            files={files}
          />
        )

      case "assistants":
        return (
          <AssistantItem
            key={item.id}
            workspaces={workspaces}
            assistant={item as Tables<"assistants">}
            tools={tools}
            models={models}
            files={files}
            collections={collections}
          />
        )

      case "tools":
        return (
          <ToolItem
            key={item.id}
            tool={item as Tables<"tools">}
            workspaces={workspaces}
          />
        )

      case "models":
        return (
          <ModelItem
            key={item.id}
            model={item as Tables<"models">}
            workspaces={workspaces}
          />
        )

      default:
        return null
    }
  }

  const getSortedData = (
    data: any,
    dateCategory: "Today" | "Yesterday" | "Previous Week" | "Older"
  ) => {
    const now = new Date()
    const todayStart = new Date(now.setHours(0, 0, 0, 0))
    const yesterdayStart = new Date(
      new Date().setDate(todayStart.getDate() - 1)
    )
    const oneWeekAgoStart = new Date(
      new Date().setDate(todayStart.getDate() - 7)
    )

    return data
      .filter((item: any) => {
        const itemDate = new Date(item.updated_at || item.created_at)
        switch (dateCategory) {
          case "Today":
            return itemDate >= todayStart
          case "Yesterday":
            return itemDate >= yesterdayStart && itemDate < todayStart
          case "Previous Week":
            return itemDate >= oneWeekAgoStart && itemDate < yesterdayStart
          case "Older":
            return itemDate < oneWeekAgoStart
          default:
            return true
        }
      })
      .sort(
        (
          a: { updated_at: string; created_at: string },
          b: { updated_at: string; created_at: string }
        ) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      )
  }

  const updateFunctions = {
    chats: updateChat,
    presets: updatePreset,
    prompts: updatePrompt,
    files: updateFile,
    collections: updateCollection,
    assistants: updateAssistant,
    tools: updateTool,
    models: updateModel
  }

  const updateFolder = async (itemId: string, folderId: string | null) => {
    const item: any = data.find(item => item.id === itemId)

    if (!item) return null

    const updateFunction = updateFunctions[contentType]

    if (!updateFunction) return

    const updatedItem = await updateFunction(item.id, {
      folder_id: folderId
    })
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData("text/plain", id)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()

    const target = e.target as Element

    if (!target.closest("#folder")) {
      const itemId = e.dataTransfer.getData("text/plain")
      updateFolder(itemId, null)
    }

    setIsDragOver(false)
  }

  useEffect(() => {
    if (divRef.current) {
      setIsOverflowing(
        divRef.current.scrollHeight > divRef.current.clientHeight
      )
    }
  }, [data])

  const dataWithFolders = data.filter(item => item.folder_id)
  const dataWithoutFolders = data.filter(item => item.folder_id === null)

  return (
    <>
      <div
        ref={divRef}
        className="mt-2 flex flex-col overflow-auto"
        onDrop={handleDrop}
      >
        {data.length === 0 && (
          <div className="flex grow flex-col items-center justify-center">
            <div className=" text-centertext-muted-foreground p-8 text-lg italic">
              No {contentType}.
            </div>
          </div>
        )}

        {(dataWithFolders.length > 0 || dataWithoutFolders.length > 0) && (
          <div
            className={`h-full ${
              isOverflowing ? "w-[calc(100%-8px)]" : "w-full"
            } space-y-2 pt-2 ${isOverflowing ? "mr-2" : ""}`}
          >
            {folders.map(folder => (
              <Folder
                key={folder.id}
                folder={folder}
                onUpdateFolder={updateFolder}
                contentType={contentType}
              >
                {dataWithFolders
                  .filter(item => item.folder_id === folder.id)
                  .map(item => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, item.id)}
                    >
                      {getDataListComponent(contentType, item)}
                    </div>
                  ))}
              </Folder>
            ))}

            {folders.length > 0 && <Separator />}

            {contentType === "chats" ? (
              <>
                {["Today", "Yesterday", "Previous Week", "Older"].map(
                  dateCategory => {
                    const sortedData = getSortedData(
                      dataWithoutFolders,
                      dateCategory as
                        | "Today"
                        | "Yesterday"
                        | "Previous Week"
                        | "Older"
                    )

                    return (
                      sortedData.length > 0 && (
                        <div key={dateCategory} className="pb-2">
                          <div className="text-muted-foreground mb-1 text-sm font-bold">
                            {dateCategory}
                          </div>

                          <div
                            className={cn(
                              "flex grow flex-col",
                              isDragOver && "bg-accent"
                            )}
                            onDrop={handleDrop}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                          >
                            {sortedData.map((item: any) => (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={e => handleDragStart(e, item.id)}
                              >
                                {getDataListComponent(contentType, item)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )
                  }
                )}
              </>
            ) : (
              <div
                className={cn("flex grow flex-col", isDragOver && "bg-accent")}
                onDrop={handleDrop}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
              >
                {dataWithoutFolders.map(item => {
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, item.id)}
                    >
                      {getDataListComponent(contentType, item)}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className={cn("flex grow", isDragOver && "bg-accent")}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
      />
    </>
  )
}
