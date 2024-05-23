"use client"

import { handleFileUpload } from "@/components/chat/chat-helpers/file-upload"
import { UnsupportedFilesDialog } from "@/components/chat/unsupported-files-dialog"
import { Sidebar } from "@/components/sidebar/sidebar"
import { SidebarSwitcher } from "@/components/sidebar/sidebar-switcher"
import { Button } from "@/components/ui/button"
import { Tabs } from "@/components/ui/tabs"
import { ChatbotUIContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { cn } from "@/lib/utils"
import { ContentType } from "@/types"
import {
  IconFileFilled,
  IconLayoutSidebarLeftExpand
} from "@tabler/icons-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FC, useContext, useState } from "react"
import { useSelectFileHandler } from "../chat/chat-hooks/use-select-file-handler"

export const SIDEBAR_WIDTH = 350

interface DashboardProps {
  children: React.ReactNode
}

export const Dashboard: FC<DashboardProps> = ({ children }) => {
  useHotkey("s", () => setShowSidebar(prevState => !prevState))
  const { subscription, chatSettings, isReadyToChat } =
    useContext(ChatbotUIContext)

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
  const [showConfirmationDialog, setShowConfirmationDialog] =
    useState<boolean>(false)

  const [currentFile, setCurrentFile] = useState<File | null>(null)

  const onFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    if (!isReadyToChat) {
      setIsDragging(false)
      return
    }

    const items = event.dataTransfer.items
    // let fileCount = 0

    if (items && subscription) {
      // for (let i = 0; i < items.length && fileCount < 5; i++) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === "file") {
          const file = item.getAsFile()
          if (file) {
            handleFileUpload(
              file,
              chatSettings,
              setShowConfirmationDialog,
              setCurrentFile,
              handleSelectDeviceFile
            )
            // fileCount++
            break
          }
        }
      }
    }

    // if (fileCount >= 5) {
    //   toast.error("Maximum of 5 files can be dropped at a time.")
    // }

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

  const handleConversionConfirmation = () => {
    if (currentFile) {
      handleSelectDeviceFile(currentFile)
      setShowConfirmationDialog(false)
    }
  }

  const handleCancel = () => {
    setCurrentFile(null)
    setShowConfirmationDialog(false)
  }

  return (
    <div className="flex size-full">
      {showConfirmationDialog && currentFile && (
        <UnsupportedFilesDialog
          isOpen={showConfirmationDialog}
          currentFile={currentFile}
          onCancel={handleCancel}
          onConfirm={handleConversionConfirmation}
        />
      )}

      <Button
        className={cn(
          `absolute left-[4px] ${showSidebar ? "top-[50%]" : "top-3"} z-20 size-[32px] cursor-pointer`
        )}
        style={{
          marginLeft: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
          transform: showSidebar ? "rotate(180deg)" : "rotate(0deg)"
        }}
        variant="ghost"
        size="icon"
        onClick={handleToggleSidebar}
      >
        <IconLayoutSidebarLeftExpand size={24} />
      </Button>

      <div
        className={cn(
          "bg-background absolute z-50 h-full border-r-2 duration-200 lg:relative"
        )}
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
            <SidebarSwitcher onContentTypeChange={setContentType} />

            <Sidebar contentType={contentType} showSidebar={showSidebar} />
          </Tabs>
        )}
      </div>

      {isReadyToChat ? (
        <div
          className="bg-muted/50 flex grow flex-col"
          onDrop={onFileDrop}
          onDragOver={onDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          {isDragging && subscription ? (
            <div className="flex h-full items-center justify-center bg-black/50 text-2xl text-white">
              <div className="justify-cente flex flex-col items-center rounded-lg p-4">
                <IconFileFilled size={48} className="mb-2 text-white" />
                <span className="text-lg font-semibold text-white">
                  Drop your files here to add it to the conversation
                </span>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      ) : (
        <div className="bg-muted/50 flex grow flex-col">{children}</div>
      )}
    </div>
  )
}
