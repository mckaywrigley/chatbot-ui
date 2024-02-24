"use client"

import { Sidebar } from "@/components/sidebar/sidebar"
import { SidebarSwitcher } from "@/components/sidebar/sidebar-switcher"
import { Button } from "@/components/ui/button"
import { Tabs } from "@/components/ui/tabs"
import useHotkey from "@/lib/hooks/use-hotkey"
import { cn } from "@/lib/utils"
import { ContentType } from "@/types"
import { IconChevronCompactRight } from "@tabler/icons-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FC, useState } from "react"
import { useSelectFileHandler } from "../chat/chat-hooks/use-select-file-handler"
import { CommandK } from "../utility/command-k"
import Modal from "@/components/chat/dialog-portal"

export const SIDEBAR_WIDTH = 350

interface DashboardProps {
  children: React.ReactNode
}

export const Dashboard: FC<DashboardProps> = ({ children }) => {
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
  const [showConfirmationDialog, setShowConfirmationDialog] =
    useState<boolean>(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)

  const handleFileUpload = (file: File) => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || ""

    const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg"]

    const videoExtensions = ["mp4", "avi", "mov", "wmv", "flv"]

    if (imageExtensions.includes(fileExtension)) {
      alert("HackerGPT does not support image files yet.")
      return
    } else if (videoExtensions.includes(fileExtension)) {
      alert("HackerGPT does not support video files yet.")
      return
    }

    if (
      fileExtension &&
      !["csv", "json", "md", "pdf", "txt", "html", "htm"].includes(
        fileExtension
      )
    ) {
      setShowConfirmationDialog(true)
      setCurrentFile(file)
      return
    } else {
      handleSelectDeviceFile(file)
    }
  }

  const onFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    const files = event.dataTransfer.files
    const file = files[0]

    handleFileUpload(file)

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
      <Modal isOpen={showConfirmationDialog}>
        <div className="bg-background/20 size-screen fixed inset-0 z-40 backdrop-blur-sm"></div>

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-background w-full max-w-lg rounded-md p-10 text-center">
            <p>
              The file extension{" "}
              <b>.{currentFile?.name.split(".").pop()?.toLowerCase()}</b> is
              currently not supported.
            </p>
            <p>Would you like to convert its content into a text format?</p>
            <div className="mt-5 flex justify-center gap-5">
              <button
                onClick={handleCancel}
                className="ring-offset-background focus-visible:ring-ring bg-input text-primary hover:bg-input/90 flex h-[36px] items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConversionConfirmation}
                className="ring-offset-background focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 flex h-[36px] items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Convert
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <CommandK />

      <Button
        className={cn(
          "absolute left-[4px] top-[50%] z-20 size-[32px] cursor-pointer"
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
