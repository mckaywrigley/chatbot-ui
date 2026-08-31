import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ThinkingIndicator } from "@/components/chat/thinking-indicator"
import { ChatbotUIContext } from "@/context/context"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import { getAzureDeploymentNameClient } from "@/lib/azure-deployment-client"
import { Tables } from "@/supabase/types"
import { LLM, LLMID, MessageImage, ModelProvider } from "@/types"
import {
  IconBolt,
  IconCaretDownFilled,
  IconCaretRightFilled,
  IconFileText,
  IconMoodSmile,
  IconPencil
} from "@tabler/icons-react"
import Image from "next/image"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { ModelIcon } from "../models/model-icon"
import { Button } from "../ui/button"
import { FileIcon } from "../ui/file-icon"
import { FilePreview } from "../ui/file-preview"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { WithTooltip } from "../ui/with-tooltip"
import { MessageActions } from "./message-actions"
import { MessageMarkdown } from "./message-markdown"

const ICON_SIZE = 32

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
    assistants,
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
    selectedChat
  } = useContext(ChatbotUIContext)

  const { handleSendMessage } = useChatHandler()

  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const [isHovering, setIsHovering] = useState(false)
  const [editedMessage, setEditedMessage] = useState(message.content)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [azureDeploymentName, setAzureDeploymentName] = useState<
    string | null | undefined
  >(undefined)

  const [showImagePreview, setShowImagePreview] = useState(false)
  const [selectedImage, setSelectedImage] = useState<MessageImage | null>(null)

  const [showFileItemPreview, setShowFileItemPreview] = useState(false)
  const [selectedFileItem, setSelectedFileItem] =
    useState<Tables<"file_items"> | null>(null)

  const [viewSources, setViewSources] = useState(false)

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

  const handleStartEdit = () => {
    onStartEdit(message)
  }

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    // TODO: Implement actual bookmark persistence to database
    console.log(
      `${isBookmarked ? "Removed" : "Added"} bookmark for message ${message.id}`
    )
  }

  useEffect(() => {
    setEditedMessage(message.content)

    if (isEditing && editInputRef.current) {
      const input = editInputRef.current
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
    // Snapshots `message.content` on each toggle of `isEditing`. Including
    // `message.content` in deps would overwrite the user's in-progress edit
    // whenever the server-side message text streams in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const messageAssistantImage = assistantImages.find(
    image => image.assistantId === message.assistant_id
  )?.base64

  const selectedAssistantImage = assistantImages.find(
    image => image.path === selectedAssistant?.image_path
  )?.base64

  const modelDetails = LLM_LIST.find(model => model.modelId === message.model)

  // Legacy `fileSummary` (parent-file aggregation) was removed when the
  // Sources panel switched to rendering RAG citations directly. Each
  // `fileItem` now carries its own source_title / source_url / preview
  // (set by the chat-ui adapter that fetches rag_item snapshots).

  const isLoadingThisMessage =
    !firstTokenReceived &&
    isGenerating &&
    isLast &&
    message.role === "assistant"

  useEffect(() => {
    if (!isLoadingThisMessage) return
    if (azureDeploymentName !== undefined) return
    ;(async () => {
      const deployment = await getAzureDeploymentNameClient()
      setAzureDeploymentName(deployment)
    })()
  }, [isLoadingThisMessage, azureDeploymentName])

  // Model name intentionally not surfaced anywhere user-visible -
  // Shadow AI is the product, the underlying LLM (or Azure deployment)
  // is implementation detail. `displayedModelName` retained as an
  // unused local so future debug overlays can still toggle it on
  // without rewiring.
  const displayedModelName =
    isLoadingThisMessage && azureDeploymentName
      ? azureDeploymentName
      : MODEL_DATA?.modelName
  void displayedModelName

  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  const isSystem = message.role === "system"

  // Default assistant label across all chat scopes (was design-only).
  // Only an explicitly-attached assistant or selectedAssistant overrides
  // this - never the raw model name.
  const senderName = isAssistant
    ? message.assistant_id
      ? assistants.find(a => a.id === message.assistant_id)?.name
      : (selectedAssistant?.name ?? "Shadow AI")
    : (profile?.display_name ?? profile?.username)

  return (
    <div
      className={cn(
        "group flex w-full px-4 py-2",
        isUser ? "justify-end" : "justify-start"
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          "relative flex max-w-[85%] flex-col",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Sender name + avatar row */}
        {!isSystem && (
          <div
            className={cn(
              "mb-1.5 flex items-center gap-2 px-1",
              isUser ? "flex-row-reverse" : "flex-row"
            )}
          >
            {isAssistant ? (
              messageAssistantImage ? (
                <Image
                  className="size-5 rounded"
                  src={messageAssistantImage}
                  alt="assistant"
                  height={20}
                  width={20}
                />
              ) : (
                <ModelIcon
                  provider={modelDetails?.provider || "custom"}
                  height={20}
                  width={20}
                />
              )
            ) : profile?.image_url ? (
              <Image
                className="size-5 rounded-full"
                src={profile?.image_url}
                height={20}
                width={20}
                alt="user"
              />
            ) : (
              <div className="bg-rust flex size-5 items-center justify-center rounded-full">
                <IconMoodSmile size={12} className="text-paper" />
              </div>
            )}
            <span className="text-ink-3 text-xs font-medium">{senderName}</span>
          </div>
        )}

        {/* System message */}
        {isSystem && (
          <div className="bg-paper-2 flex w-full items-center gap-3 rounded-xl px-4 py-3">
            <IconPencil
              className="bg-ink text-paper shrink-0 rounded p-1"
              size={24}
            />
            <div className="text-ink text-sm font-semibold">Prompt</div>
          </div>
        )}

        {/* Message bubble */}
        {!isSystem && (
          <div
            className={cn(
              "relative rounded-2xl px-4 py-2.5 text-sm shadow-sm",
              isUser
                ? "bg-ink text-paper rounded-tr-sm"
                : "border-line bg-surface text-ink rounded-tl-sm border"
            )}
          >
            {/* Hover actions - anchored just BELOW the bubble and inside its
                horizontal bounds. The old `-left-8/-right-8` pushed them 32px
                outside the bubble, which overflowed and overlapped in the
                narrow design chat rail. */}
            <div
              className={cn(
                "absolute -bottom-6 z-10 flex opacity-0 transition-opacity group-hover:opacity-100",
                isUser ? "right-1 justify-end" : "left-1 justify-start"
              )}
            >
              <MessageActions
                onCopy={handleCopy}
                onEdit={handleStartEdit}
                isAssistant={isAssistant}
                isLast={isLast}
                isEditing={isEditing}
                isHovering={isHovering}
                onRegenerate={handleRegenerate}
                onBookmark={handleBookmark}
                isBookmarked={isBookmarked}
              />
            </div>

            {/* Content */}
            {isLoadingThisMessage ? (
              <>
                {(() => {
                  switch (toolInUse) {
                    case "none":
                      return <ThinkingIndicator />
                    case "retrieval":
                      return (
                        <div className="flex animate-pulse items-center space-x-2 text-slate-500">
                          <IconFileText size={18} />
                          <div>Searching files...</div>
                        </div>
                      )
                    default:
                      return (
                        <div className="flex animate-pulse items-center space-x-2 text-slate-500">
                          <IconBolt size={18} />
                          <div>Using {toolInUse}...</div>
                        </div>
                      )
                  }
                })()}
              </>
            ) : isEditing ? (
              <TextareaAutosize
                textareaRef={editInputRef}
                className="text-md w-full bg-transparent"
                value={editedMessage}
                onValueChange={setEditedMessage}
                maxRows={20}
              />
            ) : (
              <MessageMarkdown
                content={message.content}
                isUser={isUser}
                // Post-PR-6 each fileItem may carry RagItem citation
                // metadata (source_title / source_url / source_section)
                // so the chip renderer can resolve [N] markers to
                // clickable links. Legacy file_items rows just produce
                // styled pills via the renderer's fallback path.
                sources={fileItems.map(fi => ({
                  source_title: (fi as any).source_title ?? null,
                  source_url: (fi as any).source_url ?? null,
                  source_section: (fi as any).source_section ?? null
                }))}
              />
            )}
          </div>
        )}

        {/* Sources */}
        {fileItems.length > 0 && (
          <div className="mt-2 w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
            {(() => {
              // Post-PR-6 each fileItem may carry RAG citation metadata
              // (source_title, source_url, source_section). The legacy
              // `fileSummary` path joins to `files` table and only finds
              // anything for chats that attached actual file_items rows
              // - RAG citations have file_id=null so file count came out
              // as zero ("4 Sources from 0 File"). Render the panel
              // directly off `fileItems` instead.
              const items = fileItems as Array<any>
              return (
                <>
                  {!viewSources ? (
                    <div
                      className="flex cursor-pointer items-center font-medium text-slate-600 hover:text-slate-800"
                      onClick={() => setViewSources(true)}
                    >
                      {items.length}
                      {items.length > 1 ? " Sources" : " Source"}
                      <IconCaretRightFilled className="ml-1" size={14} />
                    </div>
                  ) : (
                    <>
                      <div
                        className="flex cursor-pointer items-center font-medium text-slate-600 hover:text-slate-800"
                        onClick={() => setViewSources(false)}
                      >
                        {items.length}
                        {items.length > 1 ? " Sources" : " Source"}
                        <IconCaretDownFilled className="ml-1" size={14} />
                      </div>

                      <div className="mt-2 space-y-2.5">
                        {items.map((fileItem, idx) => {
                          const title =
                            fileItem.source_title ??
                            files.find(f => f.id === fileItem.file_id)?.name ??
                            "Untitled source"
                          const url = fileItem.source_url ?? null
                          const section = fileItem.source_section ?? null
                          const preview = (fileItem.content ?? "")
                            .toString()
                            .slice(0, 200)
                          const inner = (
                            <div className="flex items-start gap-2">
                              <span className="bg-rust-soft text-rust mt-0.5 inline-flex h-[18px] min-w-[20px] shrink-0 items-center justify-center rounded-md px-1 font-mono text-[10.5px] font-semibold">
                                {idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium text-slate-700">
                                  {title}
                                  {section && (
                                    <span className="text-slate-400">
                                      {" - "}
                                      {section}
                                    </span>
                                  )}
                                </div>
                                {preview && (
                                  <div className="mt-0.5 line-clamp-2 break-words text-xs font-normal text-slate-500">
                                    {preview}
                                    {fileItem.content?.length > 200 && "…"}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                          return url ? (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-md p-1.5 hover:bg-slate-100"
                              title={`Open: ${title}`}
                            >
                              {inner}
                            </a>
                          ) : (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSelectedFileItem(fileItem)
                                setShowFileItemPreview(true)
                              }}
                              className="block w-full rounded-md p-1.5 text-left hover:bg-slate-100"
                            >
                              {inner}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {/* Images */}
        {message.image_paths.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.image_paths.map((path, index) => {
              const item = chatImages.find(image => image.path === path)
              return (
                <Image
                  key={index}
                  className="cursor-pointer rounded-lg hover:opacity-80"
                  src={path.startsWith("data") ? path : item?.base64}
                  alt="message image"
                  width={200}
                  height={200}
                  onClick={() => {
                    setSelectedImage({
                      messageId: message.id,
                      path,
                      base64: path.startsWith("data")
                        ? path
                        : item?.base64 || "",
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
        )}

        {/* Edit buttons */}
        {isEditing && (
          <div className="mt-3 flex gap-2">
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
