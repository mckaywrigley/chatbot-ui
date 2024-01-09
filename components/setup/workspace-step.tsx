import { Label } from "@/components/ui/label"
import { WORKSPACE_INSTRUCTIONS_MAX } from "@/db/limits"
import { ChatSettings } from "@/types"
import { FC } from "react"
import ReactTextareaAutosize from "react-textarea-autosize"
import { ChatSettingsForm } from "../ui/chat-settings-form"
import { LimitDisplay } from "../ui/limit-display"

interface WorkspaceStepProps {
  chatSettings: ChatSettings
  workspaceInstructions: string
  onChatSettingsChange: (chatSettings: ChatSettings) => void
  onWorkspaceInstructionsChange: (workspaceInstructions: string) => void
}

export const WorkspaceStep: FC<WorkspaceStepProps> = ({
  chatSettings: defaultChatSettings,
  workspaceInstructions,
  onChatSettingsChange,
  onWorkspaceInstructionsChange
}) => {
  return (
    <>
      <div className="space-y-1">
        <Label>
          How would you like the AI to respond in your home workspace?
        </Label>

        <ReactTextareaAutosize
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          minRows={3}
          maxRows={10}
          placeholder="Workspace instructions here... (optional)"
          value={workspaceInstructions}
          onChange={e => onWorkspaceInstructionsChange(e.target.value)}
          maxLength={WORKSPACE_INSTRUCTIONS_MAX}
        />

        <LimitDisplay
          used={workspaceInstructions.length}
          limit={WORKSPACE_INSTRUCTIONS_MAX}
        />
      </div>

      <ChatSettingsForm
        chatSettings={defaultChatSettings}
        onChangeChatSettings={onChatSettingsChange}
        showTooltip={false}
      />
    </>
  )
}
