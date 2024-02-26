import { ChatbotUIContext } from "@/context/context"
import { updateAssistant } from "@/db/assistants"
import { updateChat } from "@/db/chats"
import { updateCollection } from "@/db/collections"
import { updateFile } from "@/db/files"
import { updateModel } from "@/db/models"
import { updatePreset } from "@/db/presets"
import { updatePrompt } from "@/db/prompts"
import { updateTool } from "@/db/tools"
import { cn, isDateBeforeToday } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { ContentType, DataItemType, DataListType } from "@/types"
import { FC, useContext, useEffect, useRef, useState } from "react"
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
import {
  isToday,
  isTomorrow,
  isThisWeek,
  addWeeks,
  endOfWeek,
  isThisMonth,
  startOfWeek,
  endOfMonth,
  addMonths,
  endOfDay,
  addDays
} from "date-fns"
import * as ebisu from "ebisu-js"

interface SidebarDataListProps {
  contentType: ContentType
  data: DataListType
  folders: Tables<"folders">[]
}

export const SidebarDataList: FC<SidebarDataListProps> = ({
  contentType,
  data,
  folders
}) => {
  const {
    setChats,
    setPresets,
    setPrompts,
    setFiles,
    setCollections,
    setAssistants,
    setTools,
    setModels
  } = useContext(ChatbotUIContext)

  const divRef = useRef<HTMLDivElement>(null)

  const [isOverflowing, setIsOverflowing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const currentTime = new Date()

  const getDataListComponent = (
    contentType: ContentType,
    item: DataItemType
  ) => {
    switch (contentType) {
      case "chats":
        return <ChatItem key={item.id} chat={item as Tables<"chats">} />

      case "presets":
        return <PresetItem key={item.id} preset={item as Tables<"presets">} />

      case "prompts":
        return <PromptItem key={item.id} prompt={item as Tables<"prompts">} />

      case "files":
        return <FileItem key={item.id} file={item as Tables<"files">} />

      case "collections":
        return (
          <CollectionItem
            key={item.id}
            collection={item as Tables<"collections">}
          />
        )

      case "assistants":
        return (
          <AssistantItem
            key={item.id}
            assistant={item as Tables<"assistants">}
          />
        )

      case "tools":
        return <ToolItem key={item.id} tool={item as Tables<"tools">} />

      case "models":
        return <ModelItem key={item.id} model={item as Tables<"models">} />

      default:
        return null
    }
  }

  const getSortedData = (
    data: any,
    dateCategory:
      | "Today"
      | "Tomorrow"
      | "Later this week"
      | "Next week"
      | "Later this month"
      | "Next month"
      | "After next month"
  ) => {
    return data
      .filter((item: any) => {
        const reviseDate = item.revise_date
          ? new Date(item.revise_date)
          : currentTime

        const revisionNextWeek =
          reviseDate >= addWeeks(startOfWeek(currentTime), 1) &&
          reviseDate <= endOfWeek(addWeeks(currentTime, 1))

        const endOfNextMonth = endOfMonth(addMonths(currentTime, 1))
        switch (dateCategory) {
          case "Today":
            return isToday(reviseDate) || isDateBeforeToday(reviseDate)
          case "Tomorrow":
            return isTomorrow(reviseDate)
          case "Later this week":
            return (
              reviseDate > endOfDay(addDays(new Date(), 1)) &&
              isThisWeek(reviseDate)
            )
          case "Next week":
            return revisionNextWeek
          case "Later this month":
            return (
              reviseDate > currentTime &&
              !isThisWeek(reviseDate) &&
              !revisionNextWeek &&
              isThisMonth(reviseDate)
            )
          case "Next month":
            return (
              reviseDate > endOfMonth(currentTime) &&
              reviseDate <= endOfNextMonth
            )
          case "After next month":
            return reviseDate > endOfNextMonth
          default:
            return true
        }
      })
      .sort(
        (a: { predictedRecall: number }, b: { predictedRecall: number }) =>
          a.predictedRecall - b.predictedRecall
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

  const stateUpdateFunctions = {
    chats: setChats,
    presets: setPresets,
    prompts: setPrompts,
    files: setFiles,
    collections: setCollections,
    assistants: setAssistants,
    tools: setTools,
    models: setModels
  }

  const updateFolder = async (itemId: string, folderId: string | null) => {
    const item: any = data.find(item => item.id === itemId)

    if (!item) return null

    const updateFunction = updateFunctions[contentType]
    const setStateFunction = stateUpdateFunctions[contentType]

    if (!updateFunction || !setStateFunction) return

    const updatedItem = await updateFunction(item.id, {
      folder_id: folderId
    })

    setStateFunction((items: any) =>
      items.map((item: any) =>
        item.id === updatedItem.id ? updatedItem : item
      )
    )
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
  const dataWithPredictedRecall = dataWithoutFolders.map(item => {
    const updated_at = (item.updated_at || item.created_at) as string
    const chatEbisuModel = "ebisu_model" in item ? item.ebisu_model : [4, 4, 24]
    const [arg1, arg2, arg3] = chatEbisuModel || [24, 4, 4] // Add null check and default value
    const model = ebisu.defaultModel(arg3, arg1, arg2)
    const elapsed =
      (Date.now() - new Date(updated_at).getTime()) / 1000 / 60 / 60
    const predictedRecall = ebisu.predictRecall(model, elapsed, true)
    return {
      ...item,
      predictedRecall
    }
  })

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
                {[
                  "Today",
                  "Tomorrow",
                  "Later this week",
                  "Next week",
                  "Later this month",
                  "Next month",
                  "After next month"
                ].map(dateCategory => {
                  const sortedData = getSortedData(
                    dataWithPredictedRecall,
                    dateCategory as
                      | "Today"
                      | "Tomorrow"
                      | "Later this week"
                      | "Next week"
                      | "Later this month"
                      | "Next month"
                      | "After next month"
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
                })}
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
