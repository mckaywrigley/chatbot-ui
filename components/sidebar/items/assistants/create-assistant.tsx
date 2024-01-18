import { SidebarCreateItem } from "@/components/sidebar/items/all/sidebar-create-item"
import { ChatSettingsForm } from "@/components/ui/chat-settings-form"
import ImagePicker from "@/components/ui/image-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChatbotUIContext } from "@/context/context"
import { ASSISTANT_NAME_MAX } from "@/db/limits"
import { Tables, TablesInsert } from "@/supabase/types"
import { FC, useContext, useEffect, useState } from "react"
import { AssistantRetrievalSelect } from "./assistant-retrieval-select"
import { AssistantToolSelect } from "./assistant-tool-select"

interface CreateAssistantProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const CreateAssistant: FC<CreateAssistantProps> = ({
  isOpen,
  onOpenChange
}) => {
  const { profile, selectedWorkspace } = useContext(ChatbotUIContext)

  const [name, setName] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [description, setDescription] = useState("")
  const [assistantChatSettings, setAssistantChatSettings] = useState({
    model: selectedWorkspace?.default_model,
    prompt: selectedWorkspace?.default_prompt,
    temperature: selectedWorkspace?.default_temperature,
    contextLength: selectedWorkspace?.default_context_length,
    includeProfileContext: false,
    includeWorkspaceInstructions: false,
    embeddingsProvider: selectedWorkspace?.embeddings_provider
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imageLink, setImageLink] = useState("")
  const [selectedAssistantRetrievalItems, setSelectedAssistantRetrievalItems] =
    useState<Tables<"files">[] | Tables<"collections">[]>([])
  const [selectedAssistantToolItems, setSelectedAssistantToolItems] = useState<
    Tables<"tools">[]
  >([])

  useEffect(() => {
    setAssistantChatSettings(prevSettings => {
      const previousPrompt = prevSettings.prompt || ""
      const previousPromptParts = previousPrompt.split(". ")

      previousPromptParts[0] = name ? `You are ${name}` : ""

      return {
        ...prevSettings,
        prompt: previousPromptParts.join(". ")
      }
    })
  }, [name])

  const handleRetrievalItemSelect = (
    item: Tables<"files"> | Tables<"collections">
  ) => {
    setSelectedAssistantRetrievalItems(prevState => {
      const isItemAlreadySelected = prevState.find(
        selectedItem => selectedItem.id === item.id
      )

      if (isItemAlreadySelected) {
        return prevState.filter(selectedItem => selectedItem.id !== item.id)
      } else {
        return [...prevState, item]
      }
    })
  }

  const handleToolSelect = (item: Tables<"tools">) => {
    setSelectedAssistantToolItems(prevState => {
      const isItemAlreadySelected = prevState.find(
        selectedItem => selectedItem.id === item.id
      )

      if (isItemAlreadySelected) {
        return prevState.filter(selectedItem => selectedItem.id !== item.id)
      } else {
        return [...prevState, item]
      }
    })
  }

  const checkIfModelIsToolCompatible = () => {
    if (!assistantChatSettings.model) return false

    const compatibleModels = [
      "gpt-4-1106-preview",
      "gpt-4-vision-preview",
      "gpt-3.5-turbo-1106"
    ]
    const isModelCompatible = compatibleModels.includes(
      assistantChatSettings.model
    )

    return isModelCompatible
  }

  if (!profile) return null
  if (!selectedWorkspace) return null

  return (
    <SidebarCreateItem
      contentType="assistants"
      createState={
        {
          image: selectedImage,
          user_id: profile.user_id,
          name,
          description,
          include_profile_context: assistantChatSettings.includeProfileContext,
          include_workspace_instructions:
            assistantChatSettings.includeWorkspaceInstructions,
          context_length: assistantChatSettings.contextLength,
          model: assistantChatSettings.model,
          image_path: "",
          prompt: assistantChatSettings.prompt,
          temperature: assistantChatSettings.temperature,
          embeddings_provider: assistantChatSettings.embeddingsProvider,
          files: selectedAssistantRetrievalItems.filter(item =>
            item.hasOwnProperty("type")
          ) as Tables<"files">[],
          collections: selectedAssistantRetrievalItems.filter(
            item => !item.hasOwnProperty("type")
          ) as Tables<"collections">[],
          tools: selectedAssistantToolItems
        } as TablesInsert<"assistants">
      }
      isOpen={isOpen}
      isTyping={isTyping}
      renderInputs={() => (
        <>
          <div className="space-y-1">
            <Label>Name</Label>

            <Input
              placeholder="Assistant name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={ASSISTANT_NAME_MAX}
            />
          </div>

          <div className="space-y-1 pt-2">
            <Label className="flex space-x-1">
              <div>Image</div>

              <div className="text-xs">(optional)</div>
            </Label>

            <ImagePicker
              src={imageLink}
              image={selectedImage}
              onSrcChange={setImageLink}
              onImageChange={setSelectedImage}
              width={100}
              height={100}
            />
          </div>

          <ChatSettingsForm
            chatSettings={assistantChatSettings as any}
            onChangeChatSettings={setAssistantChatSettings}
            useAdvancedDropdown={true}
          />

          <div className="space-y-1 pt-2">
            <Label>Files & Collections</Label>

            <AssistantRetrievalSelect
              selectedAssistantRetrievalItems={selectedAssistantRetrievalItems}
              onAssistantRetrievalItemsSelect={handleRetrievalItemSelect}
            />
          </div>

          {checkIfModelIsToolCompatible() ? (
            <div className="space-y-1">
              <Label>Tools</Label>

              <AssistantToolSelect
                selectedAssistantTools={selectedAssistantToolItems}
                onAssistantToolsSelect={handleToolSelect}
              />
            </div>
          ) : (
            <div className="pt-1 font-semibold">
              Model is not compatible with tools.
            </div>
          )}
        </>
      )}
      onOpenChange={onOpenChange}
    />
  )
}
