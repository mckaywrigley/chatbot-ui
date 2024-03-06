import { SidebarCreateItem } from "@/components/sidebar/items/all/sidebar-create-item"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChatbotUIContext } from "@/context/context"
import { MODEL_NAME_MAX } from "@/db/limits"
import { TablesInsert } from "@/supabase/types"
import { FC, useContext, useRef, useState } from "react"
import { IconChevronDown } from "@tabler/icons-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LLMID } from "@/types"
import { ModelOption } from "@/components/models/model-option"
import {
  getModels,
  isValidUrl,
  sendURL
} from "@/components/sidebar/items/models/models"

interface CreateModelProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const CreateModel: FC<CreateModelProps> = ({ isOpen, onOpenChange }) => {
  const { profile, selectedWorkspace } = useContext(ChatbotUIContext)
  const [isTyping] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [description] = useState("")
  const [modelId, setModelIdState] = useState("")
  const [name, setName] = useState("")
  const [contextLength, setContextLength] = useState(4096)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [dropdownIsOpen, setIsOpen] = useState(false)
  const [models, setArray] = useState([])

  // Content for dropdown
  // Select from dropdown and close dropdown
  const setModelId = (getModelId: LLMID) => {
    setModelIdState(getModelId)
    setIsOpen(false)
  }

  // Get data when opening dropdown
  const openDropdown = async (dropdownIsOpen: boolean) => {
    if (dropdownIsOpen && baseUrl !== "") {
      const data = await getModels()
      if (Object.keys(data).length !== 0) {
        models.push(...data)
      }
    } else {
      setArray([])
    }

    setIsOpen(dropdownIsOpen)
  }

  if (!profile || !selectedWorkspace) return null
  return (
    <SidebarCreateItem
      contentType="models"
      isOpen={isOpen}
      isTyping={isTyping}
      onOpenChange={onOpenChange}
      createState={
        {
          user_id: profile.user_id,
          api_key: apiKey,
          base_url: baseUrl,
          description,
          context_length: contextLength,
          model_id: modelId,
          name
        } as TablesInsert<"models">
      }
      renderInputs={() => (
        <>
          <div className="space-y-1.5 text-sm">
            <div>Create a custom model.</div>
            <div>
              Your API <span className="font-bold">*must*</span> be compatible
              with the OpenAI SDK.
            </div>
          </div>

          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              placeholder="Model name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={MODEL_NAME_MAX}
            />
          </div>

          <div className="space-y-1">
            <Label>Model ID</Label>
            <DropdownMenu
              open={dropdownIsOpen}
              onOpenChange={dropdownIsOpen => {
                openDropdown(dropdownIsOpen)
              }}
            >
              <DropdownMenuTrigger
                className="bg-background w-full justify-start border-2 px-3 py-5"
                asChild
              >
                <Button
                  ref={triggerRef}
                  className="flex items-center justify-between"
                  variant="ghost"
                >
                  <div className="flex items-center">
                    {modelId == "" ? "Select a model" : modelId}
                  </div>
                  <IconChevronDown />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="space-y-2 overflow-auto p-2"
                style={{ width: triggerRef.current?.offsetWidth }}
                align="start"
              >
                <Input
                  className="w-full"
                  placeholder="Model ID..."
                  value={modelId}
                  onChange={e => setModelIdState(e.target.value)}
                />
                <div className="max-h-[300px] overflow-auto">
                  {models.map(model => {
                    return (
                      <div
                        key={model.modelId}
                        className="flex items-center space-x-1"
                      >
                        <ModelOption
                          key={model.modelId}
                          model={model}
                          onSelect={() => setModelId(model.modelId)}
                        />
                      </div>
                    )
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-1">
            <Label>Base URL</Label>
            <Input
              placeholder="Base URL..."
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              onBlur={async () => {
                if (isValidUrl(baseUrl)) {
                  await sendURL(baseUrl)
                }
              }}
            />
            <div className="pt-1 text-xs italic">
              Your API must be compatible with the OpenAI SDK.
            </div>
          </div>

          <div className="space-y-1">
            <Label>API Key</Label>
            <Input
              type="password"
              placeholder="API Key..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Max Context Length</Label>

            <Input
              type="number"
              placeholder="4096"
              min={0}
              value={contextLength}
              onChange={e => setContextLength(parseInt(e.target.value))}
            />
          </div>
        </>
      )}
    />
  )
}
