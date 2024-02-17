"use client"

import { Sidebar } from "@/components/sidebar/sidebar"
import { SidebarSwitcher } from "@/components/sidebar/sidebar-switcher"
import { Button } from "@/components/ui/button"
import { Tabs } from "@/components/ui/tabs"
import { Tables } from "@/supabase/types"
import { ContentType } from "@/types"
import useHotkey from "@/utils/hooks/use-hotkey"
import { cn } from "@/utils/utils"
import { IconChevronCompactRight } from "@tabler/icons-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FC, useState } from "react"
import { useSelectFileHandler } from "../chat/chat-hooks/use-select-file-handler"

export const SIDEBAR_WIDTH = 350

interface DashboardProps {
  children: React.ReactNode

  assistants: Tables<"assistants">[]
  chats: Tables<"chats">[]
  collections: Tables<"collections">[]
  folders: Tables<"folders">[]
  files: Tables<"files">[]
  presets: Tables<"presets">[]
  profile: Tables<"profiles">
  prompts: Tables<"prompts">[]
  tools: Tables<"tools">[]
  models: Tables<"models">[]
}

export const Dashboard: FC<DashboardProps> = ({
  children,

  assistants,
  chats,
  collections,
  folders,
  files,
  presets,
  profile,
  prompts,
  tools,
  models
}) => {
  useHotkey("s", () => setShowSidebar(prevState => !prevState))

  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabValue = searchParams.get("tab") || "chats"

  const { handleSelectDeviceFile } = useSelectFileHandler()

  const [contentType, setContentType] = useState<ContentType>(
    tabValue as ContentType
  )
  const [showSidebar, setShowSidebar] = useState(
    localStorage.getItem("showSidebar") === "true"
  )
  const [isDragging, setIsDragging] = useState(false)

  const onFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    const files = event.dataTransfer.files
    const file = files[0]

    handleSelectDeviceFile(file)

    setIsDragging(false)
  }

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleToggleSidebar = () => {
    setShowSidebar(prevState => !prevState)
    localStorage.setItem("showSidebar", String(!showSidebar))
  }

  return (
    <div className="flex size-full">
      {/* <CommandK /> */}

      <Button
        className={cn(
          "absolute left-[4px] top-[50%] z-10 size-[32px] cursor-pointer"
        )}
        style={{
          marginLeft: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
          transform: showSidebar ? "rotate(180deg)" : "rotate(0deg)"
        }}
        variant="ghost"
        size="icon"
        onClick={handleToggleSidebar}
      >
        <IconChevronCompactRight size={24} />
      </Button>

      <div
        className={cn("border-r-2 duration-200 dark:border-none")}
        style={{
          // Sidebar
          minWidth: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
          maxWidth: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
          width: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px"
        }}
      >
        {showSidebar && (
          <Tabs
            className="flex h-full"
            value={contentType}
            onValueChange={tabValue => {
              setContentType(tabValue as ContentType)
              router.replace(`${pathname}?tab=${tabValue}`)
            }}
          >
            <SidebarSwitcher
              profile={profile}
              onContentTypeChange={setContentType}
            />

            <Sidebar
              contentType={contentType}
              showSidebar={showSidebar}
              assistants={assistants}
              chats={chats}
              collections={collections}
              folders={folders}
              files={files}
              presets={presets}
              prompts={prompts}
              tools={tools}
              models={models}
            />
          </Tabs>
        )}
      </div>

      <div
        className="bg-muted/50 flex grow flex-col"
        onDrop={onFileDrop}
        onDragOver={onDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {isDragging ? (
          <div className="flex h-full items-center justify-center bg-black/50 text-2xl text-white">
            drop file here
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
