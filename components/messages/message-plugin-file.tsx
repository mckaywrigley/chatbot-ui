import {
  IconArrowDown,
  IconArrowUp,
  IconDownload,
  IconEye,
  IconUpload
} from "@tabler/icons-react"
import { FC, useContext, useEffect, useState } from "react"
import Modal from "../chat/dialog-portal"
import { Button } from "../ui/button"
import { MessageMarkdown } from "./message-markdown"
import { useSelectFileHandler } from "../chat/chat-hooks/use-select-file-handler"
import { ChatbotUIContext } from "@/context/context"

interface MessagePluginFileProps {
  autoDownloadEnabled: boolean
  isLastMessage: boolean
  created_at: string
  content: string
  plugin: string
  id: string
  filename: string | undefined
}

const getContentHeaderAndPayload = (content: string, plugin: string) => {
  const contentParts = content.split("## Results:")
  if (contentParts.length === 1) {
    return { contentHeader: content, contentPayload: undefined }
  }
  const contentPayload = contentParts.pop()
  const contentHeader = contentParts.join("## Results:")
  return { contentHeader, contentPayload }
}

export const MessagePluginFile: FC<MessagePluginFileProps> = ({
  isLastMessage,
  created_at,
  content,
  plugin,
  id,
  filename,
  autoDownloadEnabled
}) => {
  const [showModal, setShowModal] = useState(false)
  const { handleSelectDeviceFile } = useSelectFileHandler()
  const { subscription } = useContext(ChatbotUIContext)

  const handleViewContent = () => {
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  const { contentHeader, contentPayload } = getContentHeaderAndPayload(
    content,
    plugin
  )

  useEffect(() => {
    if (!autoDownloadEnabled || !isLastMessage || !created_at || !id) {
      return
    }

    const now = new Date()
    const messageCreatedAt = new Date(created_at)
    const diffInSeconds = (now.getTime() - messageCreatedAt.getTime()) / 1000
    const lastDownloadId = localStorage.getItem("lastDownload")

    if (diffInSeconds < 5 && lastDownloadId !== id) {
      handleDownloadContent()
      localStorage.setItem("lastDownload", id)
    }
  }, [created_at, id, isLastMessage, autoDownloadEnabled])

  const handleDownloadContent = () => {
    if (!contentPayload) {
      return
    }

    const finalFilename = filename || plugin + "-" + id + ".md"

    const cleanedContentPayload = contentPayload
      .replace(/^\s*```[\w\s]*\n/gm, "")
      .replace(/^```$/gm, "")
      .trim()

    const element = document.createElement("a")
    const file = new Blob([cleanedContentPayload], { type: "text/markdown" })
    element.href = URL.createObjectURL(file)
    element.download = `${finalFilename}`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <>
      <div className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 w-[80vw] min-w-full space-y-6 break-words md:w-full">
        <MessageMarkdown content={contentHeader} />
        {contentPayload && (
          <div className="bg-secondary flex justify-center space-x-2 p-1 md:space-x-4">
            <Button
              variant="outline"
              className="text-primary bg-primary-foreground hover:bg-muted px-2 py-1 text-sm md:px-4 md:py-2 md:text-base"
              onClick={handleViewContent}
            >
              <div className="flex items-center">
                <IconEye className="mr-1 md:mr-2" size={16} />
                <span className="text-sm font-medium md:text-base">View</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="text-primary bg-primary-foreground hover:bg-muted px-2 py-1 text-sm md:px-4 md:py-2 md:text-base"
              onClick={handleDownloadContent}
            >
              <div className="flex items-center">
                <IconDownload className="size mr-1 md:mr-2" size={16} />
                <span className="text-sm font-medium md:text-base">
                  Download
                </span>
              </div>
            </Button>
            {subscription && (
              <Button
                variant="outline"
                className="text-primary bg-primary-foreground hover:bg-muted px-2 py-1 text-sm md:px-4 md:py-2 md:text-base"
                onClick={() => {
                  const file = new Blob([content], { type: "text/markdown" })
                  handleSelectDeviceFile(
                    new File([file], `${plugin}-${id}.md`, {
                      type: "text/markdown"
                    })
                  )
                }}
              >
                <div className="flex items-center">
                  <IconUpload className="mr-1 md:mr-2" size={16} />
                  <span className="text-sm font-medium md:text-base">
                    Upload
                  </span>
                </div>
              </Button>
            )}
          </div>
        )}
      </div>
      <Modal isOpen={showModal}>
        <div className="bg-background/20 size-screen fixed inset-0 z-50 backdrop-blur-sm"></div>
        <div
          className="fixed inset-0 z-50 flex size-full items-center justify-center"
          onClick={handleCloseModal}
        >
          <div
            className="bg-secondary relative flex w-full max-w-4xl flex-col rounded-md border shadow-lg"
            style={{ maxHeight: "90vh" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="message-content-scrollable grow overflow-y-auto  p-4">
              <MessageMarkdown content={contentPayload || ""} />
            </div>
            <div className="flex justify-between space-x-2 pt-4">
              <Button
                onClick={() =>
                  document
                    ?.querySelector(".message-content-scrollable")
                    ?.scrollTo(0, 0)
                }
                variant="ghost"
              >
                <IconArrowUp />
              </Button>
              <Button
                onClick={handleCloseModal}
                variant="ghost"
                className="text-base"
              >
                Close
              </Button>
              <Button
                onClick={() =>
                  document
                    ?.querySelector(".message-content-scrollable")
                    ?.scrollTo(
                      0,
                      document?.querySelector(".message-content-scrollable")
                        ?.scrollHeight || 0
                    )
                }
                variant="ghost"
              >
                <IconArrowDown />
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
