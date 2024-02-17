import { ModelIcon } from "@/components/models/model-icon"
import { ChatSettingsForm } from "@/components/ui/chat-settings-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PRESET_NAME_MAX } from "@/db/limits"
import { Tables } from "@/supabase/types"
import { LLM_LIST } from "@/utils/models/llm/llm-list"
import { FC, useState } from "react"
import { SidebarItem } from "../all/sidebar-display-item"

interface PresetItemProps {
  workspaces: Tables<"workspaces">[]
  profile: Tables<"profiles">
  models: Tables<"models">[]
  preset: Tables<"presets">
}

export const PresetItem: FC<PresetItemProps> = ({
  workspaces,
  profile,
  models,
  preset
}) => {
  const [name, setName] = useState(preset.name)
  const [isTyping, setIsTyping] = useState(false)
  const [description, setDescription] = useState(preset.description)
  const [presetChatSettings, setPresetChatSettings] = useState({
    model: preset.model,
    prompt: preset.prompt,
    temperature: preset.temperature,
    contextLength: preset.context_length,
    includeProfileContext: preset.include_profile_context,
    includeWorkspaceInstructions: preset.include_workspace_instructions
  })

  const modelDetails = LLM_LIST.find(model => model.modelId === preset.model)

  return (
    <SidebarItem
      workspaces={workspaces}
      item={preset}
      isTyping={isTyping}
      contentType="presets"
      icon={
        <ModelIcon
          provider={modelDetails?.provider || "custom"}
          height={30}
          width={30}
        />
      }
      updateState={{
        name,
        description,
        include_profile_context: presetChatSettings.includeProfileContext,
        include_workspace_instructions:
          presetChatSettings.includeWorkspaceInstructions,
        context_length: presetChatSettings.contextLength,
        model: presetChatSettings.model,
        prompt: presetChatSettings.prompt,
        temperature: presetChatSettings.temperature
      }}
      renderInputs={() => (
        <>
          <div className="space-y-1">
            <Label>Name</Label>

            <Input
              placeholder="Preset name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={PRESET_NAME_MAX}
            />
          </div>

          <ChatSettingsForm
            profile={profile}
            models={models}
            chatSettings={presetChatSettings as any}
            onChangeChatSettings={setPresetChatSettings}
            useAdvancedDropdown={true}
          />
        </>
      )}
    />
  )
}
