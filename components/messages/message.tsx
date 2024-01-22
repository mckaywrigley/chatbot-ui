import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { LLM, LLMID, MessageImage } from "@/types"
import {
  IconBolt,
  IconCaretDownFilled,
  IconCaretRightFilled,
  IconCircleFilled,
  IconFileFilled,
  IconFileText,
  IconFileTypePdf,
  IconMoodSmile,
  IconPencil,
  IconRobotFace
} from "@tabler/icons-react"
import Image from "next/image"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { ModelIcon } from "../models/model-icon"
import { Avatar, AvatarImage } from "../ui/avatar"
import { Button } from "../ui/button"
import { FilePreview } from "../ui/file-preview"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { WithTooltip } from "../ui/with-tooltip"
import { MessageActions } from "./message-actions"
import { MessageMarkdown } from "./message-markdown"

const ICON_SIZE = 28

interface MessageProps {
  message: Tables<"messages">
  fileItems: Tables<"file_items">[]
  isEditing: boolean
  isLast: boolean
  onStartEdit: (message: Tables<"messages">) => void
  onCancelEdit: () => void
  onSubmitEdit: (value: string, sequenceNumber: number) => void
}

export const Message: FC<MessageProps> = ({
  message,
  fileItems,
  isEditing,
  isLast,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit
}) => {
  const {
    profile,
    isGenerating,
    setIsGenerating,
    firstTokenReceived,
    availableLocalModels,
    availableOpenRouterModels,
    chatMessages,
    selectedAssistant,
    chatImages,
    assistantImages,
    toolInUse,
    files
  } = useContext(ChatbotUIContext)

  const { handleSendMessage } = useChatHandler()

  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const [isHovering, setIsHovering] = useState(false)
  const [editedMessage, setEditedMessage] = useState(message.content)

  const [showImagePreview, setShowImagePreview] = useState(false)
  const [selectedImage, setSelectedImage] = useState<MessageImage | null>(null)

  const [showFileItemPreview, setShowFileItemPreview] = useState(false)
  const [selectedFileItem, setSelectedFileItem] =
    useState<Tables<"file_items"> | null>(null)

  const [viewSources, setViewSources] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
  }

  const handleSendEdit = () => {
    onSubmitEdit(editedMessage, message.sequence_number)
    onCancelEdit()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isEditing && event.key === "Enter" && event.metaKey) {
      handleSendEdit()
    }
  }

  const handleRegenerate = async () => {
    setIsGenerating(true)
    await handleSendMessage(
      editedMessage || chatMessages[chatMessages.length - 2].message.content,
      chatMessages,
      true
    )
  }

  const handleStartEdit = () => {
    onStartEdit(message)
  }

  useEffect(() => {
    setEditedMessage(message.content)

    if (isEditing && editInputRef.current) {
      const input = editInputRef.current
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  }, [isEditing])

  const MODEL_DATA = [
    ...LLM_LIST,
    ...availableLocalModels,
    ...availableOpenRouterModels
  ].find(llm => llm.modelId === message.model) as LLM

  const selectedAssistantImage = assistantImages.find(
    image => image.path === selectedAssistant?.image_path
  )?.base64

  return (
    <div
      className={cn(
        "flex w-full justify-center",
        message.role === "user" ? "" : "bg-secondary"
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onKeyDown={handleKeyDown}
    >
      <div className="relative flex w-[300px] flex-col py-6 sm:w-[400px] md:w-[500px] lg:w-[600px] xl:w-[700px]">
        <div className="absolute right-0 top-7">
          <MessageActions
            onCopy={handleCopy}
            onEdit={handleStartEdit}
            isAssistant={message.role === "assistant"}
            isLast={isLast}
            isEditing={isEditing}
            isHovering={isHovering}
            onRegenerate={handleRegenerate}
          />
        </div>
        <div className="space-y-3">
          {message.role === "system" ? (
            <div className="flex items-center space-x-4">
              <IconPencil
                className="border-primary bg-primary text-secondary rounded border-[1px] p-1"
                size={ICON_SIZE}
              />

              <div className="text-lg font-semibold">Prompt</div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              {message.role === "assistant" ? (
                selectedAssistant ? (
                  selectedAssistantImage ? (
                    <Image
                      className="rounded"
                      src={selectedAssistantImage || ""}
                      alt="assistant image"
                      height={ICON_SIZE}
                      width={ICON_SIZE}
                    />
                  ) : (
                    <IconRobotFace
                      className="bg-primary text-secondary border-primary rounded border-[1px] p-1"
                      size={ICON_SIZE}
                    />
                  )
                ) : (
                  <WithTooltip
                    display={<div>{MODEL_DATA.modelName}</div>}
                    trigger={
                      <ModelIcon
                        modelId={message.model as LLMID}
                        height={ICON_SIZE}
                        width={ICON_SIZE}
                      />
                    }
                  />
                )
              ) : profile?.image_url ? (
                <Avatar className={`size-[28px] rounded`}>
                  <AvatarImage src={profile?.image_url} />
                </Avatar>
              ) : (
                <IconMoodSmile
                  className="bg-primary text-secondary border-primary rounded border-[1px] p-1"
                  size={ICON_SIZE}
                />
              )}

              <div className="font-semibold">
                {message.role === "assistant"
                  ? selectedAssistant
                    ? selectedAssistant?.name
                    : MODEL_DATA?.modelName
                  : profile?.display_name ?? profile?.username}
              </div>
            </div>
          )}
          {!firstTokenReceived &&
          isGenerating &&
          isLast &&
          message.role === "assistant" ? (
            <>
              {(() => {
                switch (toolInUse) {
                  case "none":
                    return (
                      <IconCircleFilled className="animate-pulse" size={20} />
                    )
                  case "retrieval":
                    return (
                      <div className="flex animate-pulse items-center space-x-2">
                        <IconFileText size={20} />

                        <div>Searching files...</div>
                      </div>
                    )
                  default:
                    return (
                      <div className="flex animate-pulse items-center space-x-2">
                        <IconBolt size={20} />

                        <div>Using {toolInUse}...</div>
                      </div>
                    )
                }
              })()}
            </>
          ) : isEditing ? (
            <TextareaAutosize
              textareaRef={editInputRef}
              className="text-md"
              value={editedMessage}
              onValueChange={setEditedMessage}
              maxRows={20}
            />
          ) : (
            <MessageMarkdown content={message.content} />
          )}
        </div>

        {fileItems.length > 0 && (
          <div className="mt-6 text-lg font-bold">
            {!viewSources ? (
              <div
                className="flex cursor-pointer items-center hover:opacity-50"
                onClick={() => setViewSources(true)}
              >
                View {fileItems.length} Sources{" "}
                <IconCaretRightFilled className="ml-1" />
              </div>
            ) : (
              <>
                <div
                  className="flex cursor-pointer items-center hover:opacity-50"
                  onClick={() => setViewSources(false)}
                >
                  Sources <IconCaretDownFilled className="ml-1" />
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  {fileItems.map((fileItem, index) => {
                    const parentFile = files.find(
                      file => file.id === fileItem.file_id
                    )

                    return (
                      <div
                        key={index}
                        className="border-primary flex cursor-pointer items-center space-x-4 rounded-xl border px-4 py-3 hover:opacity-50"
                        onClick={() => {
                          setSelectedFileItem(fileItem)
                          setShowFileItemPreview(true)
                        }}
                      >
                        <div className="rounded bg-blue-500 p-2">
                          {(() => {
                            let fileExtension = parentFile?.type.includes("/")
                              ? parentFile.type.split("/")[1]
                              : parentFile?.type

                            switch (fileExtension) {
                              case "pdf":
                                return <IconFileTypePdf />
                              default:
                                return <IconFileFilled />
                            }
                          })()}
                        </div>

                        <div className="w-fit space-y-1 truncate text-wrap text-xs">
                          <div className="truncate">{parentFile?.name}</div>

                          <div className="truncate text-xs opacity-50">
                            {fileItem.content.substring(0, 60)}...
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {message.image_paths.map((path, index) => {
            const item = chatImages.find(
              image => image.messageId === message.id
            )

            return (
              <Image
                key={index}
                className="cursor-pointer rounded hover:opacity-50"
                src={path.startsWith("data") ? path : item?.base64}
                alt="message image"
                width={300}
                height={300}
                onClick={() => {
                  setSelectedImage({
                    messageId: message.id,
                    path,
                    base64: path.startsWith("data") ? path : item?.base64 || "",
                    url: path.startsWith("data") ? "" : item?.url || "",
                    file: null
                  })

                  setShowImagePreview(true)
                }}
                loading="lazy"
              />
            )
          })}
        </div>
        {isEditing && (
          <div className="mt-4 flex justify-center space-x-2">
            <Button size="sm" onClick={handleSendEdit}>
              Save & Send
            </Button>

            <Button size="sm" variant="outline" onClick={onCancelEdit}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {showImagePreview && selectedImage && (
        <FilePreview
          type="image"
          item={selectedImage}
          isOpen={showImagePreview}
          onOpenChange={(isOpen: boolean) => {
            setShowImagePreview(isOpen)
            setSelectedImage(null)
          }}
        />
      )}

      {showFileItemPreview && selectedFileItem && (
        <FilePreview
          type="file_item"
          item={selectedFileItem}
          isOpen={showFileItemPreview}
          onOpenChange={(isOpen: boolean) => {
            setShowFileItemPreview(isOpen)
            setSelectedFileItem(null)
          }}
        />
      )}
    </div>
  )
}
