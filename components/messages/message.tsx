import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { LLM, LLMID, MessageImage, ModelProvider } from "@/types"
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
import { Button } from "../ui/button"
import { FilePreview } from "../ui/file-preview"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { WithTooltip } from "../ui/with-tooltip"
import { MessageActions } from "./message-actions"
import MessageDetailedFeedback from "./message-detailed-feedback"
import { MessageMarkdown } from "./message-markdown"
import { MessageQuickFeedback } from "./message-quick-feedback"
import { MessageTooLong } from "./message-too-long"
import { MessagePluginFile } from "./message-plugin-file"
import { MessageTypeResolver } from "./message-type-solver"

const ICON_SIZE = 28

interface MessageProps {
  message: Tables<"messages">
  previousMessage: Tables<"messages"> | undefined
  fileItems: Tables<"file_items">[]
  feedback?: Tables<"feedback">
  isEditing: boolean
  isLast: boolean
  onStartEdit: (message: Tables<"messages">) => void
  onCancelEdit: () => void
  onSubmitEdit: (value: string, sequenceNumber: number) => void
  onSendFeedback: (
    feedback: "good" | "bad",
    reason?: string,
    detailedFeedback?: string,
    allowSharing?: boolean,
    allowEmail?: boolean
  ) => void
}

export const Message: FC<MessageProps> = ({
  message,
  previousMessage,
  fileItems,
  feedback,
  isEditing,
  isLast,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onSendFeedback
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
    files,
    models,
    isMobile
  } = useContext(ChatbotUIContext)

  const { handleSendMessage } = useChatHandler()

  const messageSizeLimit = Number(
    process.env.NEXT_PUBLIC_MESSAGE_SIZE_LIMIT || 12000
  )

  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const [isHovering, setIsHovering] = useState(false)
  const [editedMessage, setEditedMessage] = useState(message.content)

  const [showImagePreview, setShowImagePreview] = useState(false)
  const [selectedImage, setSelectedImage] = useState<MessageImage | null>(null)

  const [showFileItemPreview, setShowFileItemPreview] = useState(false)
  const [selectedFileItem, setSelectedFileItem] =
    useState<Tables<"file_items"> | null>(null)

  const [viewSources, setViewSources] = useState(false)

  const [quickFeedback, setQuickFeedback] = useState(false)
  const [sendReportQuery, setSendReportQuery] = useState(false)

  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false)

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message.content)
    } else {
      const textArea = document.createElement("textarea")
      textArea.value = message.content
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    }
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

  const handleGoodResponse = async () => {
    if (feedback?.feedback !== "good") {
      onSendFeedback("good", "", "", false, false)
    }
  }

  const handleReportModal = async () => {
    setSendReportQuery(false)
    setIsFeedbackDialogOpen(true)
  }

  const handleBadResponseReason = async (reason: string) => {
    if (feedback?.feedback !== "bad" || feedback?.reason !== reason) {
      onSendFeedback("bad", reason, "", false, false)
    }
    setQuickFeedback(false)
    setSendReportQuery(true)
  }

  const handleBadResponse = async () => {
    if (feedback?.feedback !== "bad") {
      onSendFeedback("bad", "", "", false, false)
    }
    setQuickFeedback(true)
  }

  useEffect(() => {
    if (quickFeedback) {
      const feedbackElement = document.querySelector(".quick-feedback")
      if (feedbackElement) {
        feedbackElement.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }
  }, [quickFeedback])

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
    ...models.map(model => ({
      modelId: model.model_id as LLMID,
      modelName: model.name,
      provider: "custom" as ModelProvider,
      hostedId: model.id,
      platformLink: "",
      imageInput: false
    })),
    ...LLM_LIST,
    ...availableLocalModels,
    ...availableOpenRouterModels
  ].find(llm => llm.modelId === message.model) as LLM

  const selectedAssistantImage = assistantImages.find(
    image => image.path === selectedAssistant?.image_path
  )?.base64

  const modelDetails = LLM_LIST.find(model => model.modelId === message.model)

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
      <div className="relative flex w-full flex-col p-8 sm:w-[550px] sm:px-0 md:w-[650px] lg:w-[650px] xl:w-[700px]">
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
                    display={<div>{MODEL_DATA?.modelName}</div>}
                    trigger={
                      <ModelIcon
                        provider={modelDetails?.provider || "custom"}
                        modelId={modelDetails?.modelId || "custom"}
                        height={ICON_SIZE}
                        width={ICON_SIZE}
                      />
                    }
                  />
                )
              ) : profile?.image_url ? (
                <Image
                  className={`size-[28px] rounded`}
                  src={profile?.image_url}
                  height={28}
                  width={28}
                  alt="user image"
                />
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
              maxRows={isMobile ? 6 : 12}
            />
          ) : (
            <MessageTypeResolver
              previousMessage={previousMessage}
              message={message}
              messageSizeLimit={messageSizeLimit}
              isLastMessage={isLast}
            />
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
            const item = chatImages.find(image => image.path === path)

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
        {!quickFeedback && !sendReportQuery && !isEditing && (
          <div className="absolute bottom-2 left-5 sm:left-0">
            <MessageActions
              onCopy={handleCopy}
              onEdit={handleStartEdit}
              isAssistant={message.role === "assistant"}
              isLast={isLast}
              isEditing={isEditing}
              isHovering={isHovering}
              isGoodResponse={feedback?.feedback === "good"}
              isBadResponse={feedback?.feedback === "bad"}
              messageHasImage={message.image_paths.length > 0}
              onRegenerate={handleRegenerate}
              onGoodResponse={handleGoodResponse}
              onBadResponse={handleBadResponse}
            />
          </div>
        )}

        {quickFeedback && (
          <MessageQuickFeedback
            handleBadResponseReason={handleBadResponseReason}
            feedback={feedback}
          />
        )}

        {sendReportQuery && (
          <div className="rounded-lg border p-4 shadow-lg">
            <p className="mb-2">Would you like to tell us more details?</p>
            <div className="flex flex-row flex-wrap items-start gap-2">
              <Button variant="outline" size="sm" onClick={handleReportModal}>
                Yes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSendReportQuery(false)}
              >
                No
              </Button>
            </div>
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

      <MessageDetailedFeedback
        isOpen={isFeedbackDialogOpen}
        onClose={() => setIsFeedbackDialogOpen(false)}
        feedback={feedback as Tables<"feedback">}
        onSendFeedback={onSendFeedback}
      />
    </div>
  )
}
