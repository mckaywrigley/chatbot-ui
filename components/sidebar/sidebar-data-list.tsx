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
import { fsrs } from "ts-fsrs"
import { QuickQuiz } from "./items/chat/quick-quiz"

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
    setModels,
    allChatRecallAnalysis
  } = useContext(ChatbotUIContext)

  const divRef = useRef<HTMLDivElement>(null)

  const [isOverflowing, setIsOverflowing] = useState(false)

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
        const dueDate = item.due_date ? new Date(item.due_date) : currentTime

        const revisionNextWeek =
          dueDate >= addWeeks(startOfWeek(currentTime), 1) &&
          dueDate <= endOfWeek(addWeeks(currentTime, 1))

        const dueTomorrow = isTomorrow(dueDate)

        const endOfNextMonth = endOfMonth(addMonths(currentTime, 1))
        switch (dateCategory) {
          case "Today":
            return isToday(dueDate) || isDateBeforeToday(dueDate)
          case "Tomorrow":
            return dueTomorrow
          case "Later this week":
            return (
              dueDate > endOfDay(addDays(new Date(), 1)) && isThisWeek(dueDate)
            )
          case "Next week":
            return revisionNextWeek
          case "Later this month":
            return (
              dueDate > currentTime &&
              !isThisWeek(dueDate) &&
              !revisionNextWeek &&
              isThisMonth(dueDate)
            )
          case "Next month":
            return (
              !dueTomorrow &&
              dueDate > endOfMonth(currentTime) &&
              dueDate <= endOfNextMonth &&
              !revisionNextWeek
            )
          case "After next month":
            return dueDate > endOfNextMonth
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

  useEffect(() => {
    if (divRef.current) {
      setIsOverflowing(
        divRef.current.scrollHeight > divRef.current.clientHeight
      )
    }
  }, [data])

  const f = fsrs()
  const now = new Date()

  const dataWithFolders = data.filter(item => item.folder_id)
  const dataWithoutFolders = data.filter(item => item.folder_id === null)
  const dataWithPredictedRecall = dataWithoutFolders.map(item => {
    let predictedRecall = -1

    if ("srs_card" in item && typeof item.srs_card === "string") {
      const retrievability = f.get_retrievability(
        JSON.parse(item.srs_card),
        now
      )
      predictedRecall = parseFloat(retrievability || "75")
    }

    return {
      ...item,
      predictedRecall
    }
  })

  return (
    <>
      <div ref={divRef} className="mt-2 flex flex-col overflow-auto">
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
                    <div key={item.id}>
                      {getDataListComponent(contentType, item)}
                    </div>
                  ))}
              </Folder>
            ))}

            {folders.length > 0 && <Separator />}

            {allChatRecallAnalysis.length > 0 && (
              <div className="pb-2">
                <div className={cn("flex grow flex-col")}>
                  <QuickQuiz />
                </div>
              </div>
            )}

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

                        <div className={cn("flex grow flex-col")}>
                          {sortedData.map((item: any) => (
                            <div key={item.id}>
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
              <div className={cn("flex grow flex-col")}>
                {dataWithoutFolders.map(item => {
                  return (
                    <div key={item.id}>
                      {getDataListComponent(contentType, item)}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={cn("flex grow")} />
    </>
  )
}
