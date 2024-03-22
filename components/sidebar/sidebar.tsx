import { Tables } from "@/supabase/types"
import { ContentType } from "@/types"
import { FC } from "react"
import { SIDEBAR_WIDTH } from "../ui/dashboard"
import { TabsContent } from "../ui/tabs"
import { WorkspaceSwitcher } from "../utility/workspace-switcher"
import { WorkspaceSettings } from "../workspace/workspace-settings"
import { SidebarContent } from "./sidebar-content"

interface SidebarProps {
  contentType: ContentType
  showSidebar: boolean

  profile: Tables<"profiles">
  assistants: Tables<"assistants">[]
  chats: Tables<"chats">[]
  collections: Tables<"collections">[]
  folders: Tables<"folders">[]
  files: Tables<"files">[]
  presets: Tables<"presets">[]
  prompts: Tables<"prompts">[]
  tools: Tables<"tools">[]
  models: Tables<"models">[]
  workspaces: Tables<"workspaces">[]
  workspaceId: string
}

export const Sidebar: FC<SidebarProps> = ({
  contentType,
  showSidebar,

  profile,
  assistants,
  chats,
  collections,
  folders,
  files,
  presets,
  prompts,
  tools,
  models,
  workspaces,
  workspaceId
}) => {
  const chatFolders = folders.filter(folder => folder.type === "chats")
  const presetFolders = folders.filter(folder => folder.type === "presets")
  const promptFolders = folders.filter(folder => folder.type === "prompts")
  const filesFolders = folders.filter(folder => folder.type === "files")
  const collectionFolders = folders.filter(
    folder => folder.type === "collections"
  )
  const assistantFolders = folders.filter(
    folder => folder.type === "assistants"
  )
  const toolFolders = folders.filter(folder => folder.type === "tools")
  const modelFolders = folders.filter(folder => folder.type === "models")

  const renderSidebarContent = (
    contentType: ContentType,
    data: any[],
    folders: Tables<"folders">[]
  ) => {
    return (
      <SidebarContent
        workspaceId={workspaceId}
        contentType={contentType}
        data={data}
        folders={folders}
        profile={profile}
        files={files}
        collections={collections}
        models={models}
        tools={tools}
        presets={presets}
        workspaces={workspaces}
      />
    )
  }

  return (
    <TabsContent
      className="m-0 w-full space-y-2"
      style={{
        // Sidebar - SidebarSwitcher
        minWidth: showSidebar ? `calc(${SIDEBAR_WIDTH}px - 60px)` : "0px",
        maxWidth: showSidebar ? `calc(${SIDEBAR_WIDTH}px - 60px)` : "0px",
        width: showSidebar ? `calc(${SIDEBAR_WIDTH}px - 60px)` : "0px"
      }}
      value={contentType}
    >
      <div className="flex h-full flex-col p-3">
        <div className="flex items-center border-b-2 pb-2">
          <WorkspaceSwitcher workspaces={workspaces} />

          <WorkspaceSettings models={models} />
        </div>

        {(() => {
          switch (contentType) {
            case "chats":
              return renderSidebarContent("chats", chats, chatFolders)

            case "presets":
              return renderSidebarContent("presets", presets, presetFolders)

            case "prompts":
              return renderSidebarContent("prompts", prompts, promptFolders)

            case "files":
              return renderSidebarContent("files", files, filesFolders)

            case "collections":
              return renderSidebarContent(
                "collections",
                collections,
                collectionFolders
              )

            case "assistants":
              return renderSidebarContent(
                "assistants",
                assistants,
                assistantFolders
              )

            case "tools":
              return renderSidebarContent("tools", tools, toolFolders)

            case "models":
              return renderSidebarContent("models", models, modelFolders)

            default:
              return null
          }
        })()}
      </div>
    </TabsContent>
  )
}
