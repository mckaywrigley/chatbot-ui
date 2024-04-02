import { ChatbotUIContext } from "@/context/context"
import { getFileFromStorage } from "@/db/storage/files"
import useHotkey from "@/lib/hooks/use-hotkey"
import { cn } from "@/lib/utils"
import { ChatFile, MessageImage } from "@/types"
import {
  IconCircleFilled,
  IconFileFilled,
  IconFileTypeCsv,
  IconFileTypeDocx,
  IconFileTypePdf,
  IconFileTypeTxt,
  IconJson,
  IconLoader2,
  IconMarkdown,
  IconX
} from "@tabler/icons-react"
import Image from "next/image"
import { FC, useContext, useState } from "react"
import { Button } from "../ui/button"
import { FilePreview } from "../ui/file-preview"
import { WithTooltip } from "../ui/with-tooltip"
import { ChatRetrievalSettings } from "./chat-retrieval-settings"

interface ChatFilesDisplayProps {}

export const ChatFilesDisplay: FC<ChatFilesDisplayProps> = ({}) => {
  useHotkey("f", () => setShowFilesDisplay(prev => !prev))
  useHotkey("e", () => setUseRetrieval(prev => !prev))

  const {
    files,
    newMessageImages,
    setNewMessageImages,
    newMessageFiles,
    setNewMessageFiles,
    setShowFilesDisplay,
    showFilesDisplay,
    chatFiles,
    chatImages,
    setChatImages,
    setChatFiles,
    setUseRetrieval
  } = useContext(ChatbotUIContext)

  const [selectedFile, setSelectedFile] = useState<ChatFile | null>(null)
  const [selectedImage, setSelectedImage] = useState<MessageImage | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const messageImages = [
    ...newMessageImages.filter(
      image =>
        !chatImages.some(chatImage => chatImage.messageId === image.messageId)
    )
  ]

  const combinedChatFiles = [
    ...newMessageFiles.filter(
      file => !chatFiles.some(chatFile => chatFile.id === file.id)
    ),
    ...chatFiles
  ]

  const combinedMessageFiles = [...messageImages, ...combinedChatFiles]

  const getLinkAndView = async (file: ChatFile) => {
    const fileRecord = files.find(f => f.id === file.id)

    if (!fileRecord) return

    const link = await getFileFromStorage(fileRecord.file_path)
    window.open(link, "_blank")
  }

  return showFilesDisplay && combinedMessageFiles.length > 0 ? (
    <>
      {showPreview && selectedImage && (
        <FilePreview
          type="image"
          item={selectedImage}
          isOpen={showPreview}
          onOpenChange={(isOpen: boolean) => {
            setShowPreview(isOpen)
            setSelectedImage(null)
          }}
        />
      )}

      {showPreview && selectedFile && (
        <FilePreview
          type="file"
          item={selectedFile}
          isOpen={showPreview}
          onOpenChange={(isOpen: boolean) => {
            setShowPreview(isOpen)
            setSelectedFile(null)
          }}
        />
      )}

      <div className="space-y-2">
        <div className="bg-pixelspace-gray-90 flex w-full items-center justify-center">
          <button
            className="bg-pixelspace-gray-90 border-pixelspace-gray-60 flex h-10 w-[161px] items-center justify-center space-x-[10px] rounded-full border"
            onClick={() => setShowFilesDisplay(false)}
          >
            <RetrievalToggle />

            <div className="text-pixelspace-gray-3 text-sm">Hide files</div>

            <div onClick={e => e.stopPropagation()}>
              <ChatRetrievalSettings />
            </div>
          </button>
        </div>

        <div className="overflow-auto">
          <div className="flex gap-2 overflow-auto pt-2">
            {messageImages.map((image, index) => (
              <div
                key={index}
                className="relative flex h-[64px] cursor-pointer items-center space-x-4 rounded-xl hover:opacity-50"
              >
                <Image
                  className="rounded"
                  // Force the image to be 56px by 56px
                  style={{
                    minWidth: "56px",
                    minHeight: "56px",
                    maxHeight: "56px",
                    maxWidth: "56px"
                  }}
                  src={image.base64} // Preview images will always be base64
                  alt="File image"
                  width={56}
                  height={56}
                  onClick={() => {
                    setSelectedImage(image)
                    setShowPreview(true)
                  }}
                />

                <IconX
                  className="bg-muted-foreground border-primary absolute right-[-6px] top-[-2px] flex size-5 cursor-pointer items-center justify-center rounded-full border-[1px] text-[10px] hover:border-red-500 hover:bg-white hover:text-red-500"
                  onClick={e => {
                    e.stopPropagation()
                    setNewMessageImages(
                      newMessageImages.filter(
                        f => f.messageId !== image.messageId
                      )
                    )
                    setChatImages(
                      chatImages.filter(f => f.messageId !== image.messageId)
                    )
                  }}
                />
              </div>
            ))}

            {combinedChatFiles.map((file, index) =>
              file.id === "loading" ? (
                <div
                  key={index}
                  className="relative flex h-[60px]  w-[211px] items-center space-x-4 rounded-xl border-2 px-4 py-3"
                >
                  <div className="rounded bg-blue-500 p-2">
                    <IconLoader2 className="animate-spin" />
                  </div>

                  <div className="truncate text-sm">
                    <div className="truncate">{file.name}</div>
                    <div className="truncate opacity-50">{file.type}</div>
                  </div>
                </div>
              ) : (
                <div
                  key={file.id}
                  className="border-pixelspace-gray-60 relative flex  h-[60px] w-[211px] cursor-pointer items-center space-x-2 rounded-md border px-4 py-3 hover:opacity-50"
                  onClick={() => getLinkAndView(file)}
                >
                  <div className="rounded bg-blue-500 px-[10px] py-2 ">
                    {(() => {
                      let fileExtension = file.type.includes("/")
                        ? file.type.split("/")[1]
                        : file.type

                      switch (fileExtension) {
                        case "pdf":
                          return (
                            <i
                              style={{ fontSize: 20 }}
                              className="fa-regular fa-file-pdf"
                            ></i>
                          )
                        case "markdown":
                          return <IconMarkdown />
                        case "txt":
                          return (
                            <i
                              style={{ fontSize: 20 }}
                              className="fa-regular fa-file-lines"
                            ></i>
                          )
                        case "json":
                          return (
                            <i
                              style={{ fontSize: 20 }}
                              className="fa-regular fa-file-code"
                            ></i>
                          )
                        case "csv":
                          return (
                            <i
                              style={{ fontSize: 20 }}
                              className="fa-regular fa-file-csv"
                            ></i>
                          )
                        case "docx":
                          return (
                            <i
                              className="fa-regular fa-file-doc"
                              style={{ fontSize: 20 }}
                            ></i>
                          )
                        default:
                          return (
                            <i
                              className="fa-regular fa-file px-[2.5px]"
                              style={{ fontSize: 20 }}
                            ></i>
                          )
                      }
                    })()}
                  </div>

                  <div className="text-pixelspace-gray-3 font-inter truncate text-sm font-medium leading-[21px]">
                    <div className="truncate">{file.name}</div>
                  </div>

                  <div
                    className="bg-pixelspace-gray-60 absolute right-[-6px] top-[-6px] flex size-4 items-center justify-center rounded-full"
                    role="button"
                    onClick={e => {
                      e.stopPropagation()
                      setNewMessageFiles(
                        newMessageFiles.filter(f => f.id !== file.id)
                      )
                      setChatFiles(chatFiles.filter(f => f.id !== file.id))
                    }}
                  >
                    <i
                      style={{ fontSize: 10 }}
                      className="fa-solid fa-xmark text-pixelspace-gray-3"
                    ></i>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  ) : (
    combinedMessageFiles.length > 0 && (
      <div className="flex w-full items-center justify-center ">
        <button
          className="bg-pixelspace-gray-90 border-pixelspace-gray-60 flex h-10 w-[161px] items-center justify-center space-x-[10px] rounded-full border"
          onClick={() => setShowFilesDisplay(true)}
        >
          <RetrievalToggle />

          <div className="text-pixelspace-gray-3 text-sm font-medium ">
            View {combinedMessageFiles.length} file
            {combinedMessageFiles.length > 1 ? "s" : ""}
          </div>

          <div onClick={e => e.stopPropagation()}>
            <ChatRetrievalSettings />
          </div>
        </button>
      </div>
    )
  )
}

const RetrievalToggle = ({}) => {
  const { useRetrieval, setUseRetrieval } = useContext(ChatbotUIContext)

  return (
    <div className="flex items-center">
      <WithTooltip
        delayDuration={0}
        side="top"
        display={
          <div>
            {useRetrieval
              ? "File retrieval is enabled on the selected files for this message. Click the indicator to disable."
              : "Click the indicator to enable file retrieval for this message."}
          </div>
        }
        trigger={
          <IconCircleFilled
            className={cn(
              "size-[14px]",
              useRetrieval ? "text-green-500" : "text-red-500",
              useRetrieval ? "hover:text-green-200" : "hover:text-red-200"
            )}
            size={24}
            onClick={e => {
              e.stopPropagation()
              setUseRetrieval(prev => !prev)
            }}
          />
        }
      />
    </div>
  )
}
