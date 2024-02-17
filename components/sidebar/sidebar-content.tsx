import { Tables } from "@/supabase/types"
import { ContentType, DataListType } from "@/types"
import { FC, useState } from "react"
import { SidebarCreateButtons } from "./sidebar-create-buttons"
import { SidebarDataList } from "./sidebar-data-list"
import { SidebarSearch } from "./sidebar-search"

interface SidebarContentProps {
  profile: Tables<"profiles">
  files: Tables<"files">[]
  collections: Tables<"collections">[]
  models: Tables<"models">[]
  tools: Tables<"tools">[]
  workspaceId: string
  contentType: ContentType
  data: DataListType
  folders: Tables<"folders">[]
  workspaces: Tables<"workspaces">[]
  presets: Tables<"presets">[]
}

export const SidebarContent: FC<SidebarContentProps> = ({
  profile,
  files,
  collections,
  models,
  tools,
  workspaceId,
  contentType,
  data,
  folders,
  workspaces,
  presets
}) => {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredData: any = data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    // Subtract 50px for the height of the workspace settings
    <div className="flex max-h-[calc(100%-50px)] grow flex-col">
      <div className="mt-2 flex items-center">
        <SidebarCreateButtons
          profile={profile}
          files={files}
          collections={collections}
          models={models}
          tools={tools}
          workspaceId={workspaceId}
          contentType={contentType}
          hasData={data.length > 0}
        />
      </div>

      <div className="mt-2">
        <SidebarSearch
          contentType={contentType}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      </div>

      <SidebarDataList
        contentType={contentType}
        data={filteredData}
        folders={folders}
        profile={profile}
        models={models}
        workspaces={workspaces}
        presets={presets}
        files={files}
        tools={tools}
        collections={collections}
      />
    </div>
  )
}
