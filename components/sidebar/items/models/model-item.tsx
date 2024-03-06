import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MODEL_NAME_MAX } from "@/db/limits"
import { Tables, TablesUpdate } from "@/supabase/types"
import { IconChevronDown, IconSparkles } from "@tabler/icons-react"
import { FC, useRef, useState } from "react"
import { SidebarItem } from "../all/sidebar-display-item"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ModelOption } from "@/components/models/model-option"
import { LLMID } from "@/types"
import {
  getModels,
  isValidUrl,
  removeSearchParams,
  sendURL
} from "@/components/sidebar/items/models/models"

interface ModelItemProps {
  model: Tables<"models">
}

export const ModelItem: FC<ModelItemProps> = ({ model }) => {
  const [isTyping] = useState(false)
  const [apiKey, setApiKey] = useState(model.api_key)
  const [baseUrl, setBaseUrl] = useState(model.base_url)
  const [description] = useState(model.description)
  const [modelId, setModelIdState] = useState(model.model_id)
  const [name, setName] = useState(model.name)
  const [contextLength, setContextLength] = useState(model.context_length)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [dropdownIsOpen, setIsOpen] = useState(false)
  const [models, setArray] = useState([])

  // Content for dropdown
  // Select and close dropdown
  const setModelId = (getModelId: LLMID) => {
    setModelIdState(getModelId)
    setIsOpen(false)
  }

  // Get data when opening dropdown and when loading the model to edit
  const openDropdown = async (dropdownIsOpen: boolean) => {
    if (!dropdownIsOpen) {
      setArray([])
      setIsOpen(false)
      return
    }

    if (baseUrl !== "") {
      if (baseUrl == model.base_url && isValidUrl(baseUrl)) {
        await sendURL(removeSearchParams(baseUrl))
      }
      const data = await getModels()
      if (Object.keys(data).length !== 0) {
        models.push(...data)
      }
    }

    setIsOpen(true)
  }

  return (
    <SidebarItem
      item={model}
      isTyping={isTyping}
      contentType="models"
      icon={<IconSparkles height={30} width={30} />}
      updateState={
        {
          api_key: apiKey,
          base_url: baseUrl,
          description,
          context_length: contextLength,
          model_id: modelId,
          name
        } as TablesUpdate<"models">
      }
      renderInputs={() => (
        <>
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
                disabled={models.length == null}
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
                  await sendURL(removeSearchParams(baseUrl))
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
