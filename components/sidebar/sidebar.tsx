import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { ContentType } from "@/types"
import { FC, useContext } from "react"
import { SIDEBAR_WIDTH } from "../ui/dashboard"
import { TabsContent } from "../ui/tabs"
import { WorkspaceSwitcher } from "../utility/workspace-switcher"
import { WorkspaceSettings } from "../workspace/workspace-settings"
import { SidebarContent } from "./sidebar-content"
import { ProjectsSidebarContent } from "./projects-sidebar-content"

// Define a constant for the sidebar switcher width
export const SIDEBAR_SWITCHER_WIDTH = 180

interface SidebarProps {
  contentType: ContentType
  showSidebar: boolean
}

export const Sidebar: FC<SidebarProps> = ({ contentType, showSidebar }) => {
  const {
    folders,
    chats,
    files,
    collections,
    assistants,
    reports,
    designs,
    dataCollections
  } = useContext(ChatbotUIContext)

  const filesFolders = folders.filter(folder => folder.type === "files")
  const chatsFolders = folders.filter(folder => folder.type === "chats")
  const collectionsFolders = folders.filter(
    folder => folder.type === "collections"
  )
  const assistantsFolders = folders.filter(
    folder => folder.type === "assistants"
  )
  const reportsFolders = folders.filter(folder => folder.type === "reports")
  const designsFolders = folders.filter(folder => folder.type === "designs")
  const dataCollectionsFolders = folders.filter(
    folder => folder.type === "data-collections"
  )

  const renderSidebarContent = (
    contentType: ContentType,
    data: any[],
    folders: Tables<"folders">[]
  ) => {
    return (
      <SidebarContent contentType={contentType} data={data} folders={folders} />
    )
  }

  return (
    <TabsContent
      className="m-0 w-full space-y-2"
      style={{
        // Sidebar - SidebarSwitcher
        minWidth: showSidebar
          ? `calc(${SIDEBAR_WIDTH}px - ${SIDEBAR_SWITCHER_WIDTH}px)`
          : "0px",
        maxWidth: showSidebar
          ? `calc(${SIDEBAR_WIDTH}px - ${SIDEBAR_SWITCHER_WIDTH}px)`
          : "0px",
        width: showSidebar
          ? `calc(${SIDEBAR_WIDTH}px - ${SIDEBAR_SWITCHER_WIDTH}px)`
          : "0px"
      }}
      value={contentType}
    >
      <div className="flex h-full flex-col p-3">
        <div className="flex items-center border-b-2 pb-2">
          <WorkspaceSwitcher />

          <WorkspaceSettings />
        </div>

        {(() => {
          switch (contentType) {
            case "chats":
            case "chat-history":
              return renderSidebarContent("chats", chats, chatsFolders)

            case "projects":
              return <ProjectsSidebarContent />

            case "files":
              return renderSidebarContent("files", files, filesFolders)

            case "collections":
              return renderSidebarContent(
                "collections",
                collections,
                collectionsFolders
              )

            case "assistants":
              return renderSidebarContent(
                "assistants",
                assistants,
                assistantsFolders
              )
            case "reports":
              return renderSidebarContent("reports", reports, reportsFolders)

            case "designs":
              return renderSidebarContent("designs", designs, designsFolders)

            case "data-collections":
              return renderSidebarContent(
                "data-collections",
                dataCollections,
                dataCollectionsFolders
              )

            default:
              return null
          }
        })()}
      </div>
    </TabsContent>
  )
}
