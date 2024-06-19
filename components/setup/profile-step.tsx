import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PROFILE_DISPLAY_NAME_MAX, PROFILE_CONTEXT_MAX } from "@/db/limits"
import { FC } from "react"
import { LimitDisplay } from "../ui/limit-display"
import { TextareaAutosize } from "../ui/textarea-autosize"

interface ProfileStepProps {
  displayName: string
  onDisplayNameChange: (name: string) => void
  profileInstructions: string
  onProfileInstructionsChange: (profileInstructions: string) => void
}

export const ProfileStep: FC<ProfileStepProps> = ({
  displayName,
  onDisplayNameChange,
  profileInstructions,
  onProfileInstructionsChange
}) => {
  return (
    <>
      <div className="space-y-1">
        <Label>Chat Display Name</Label>

        <Input
          placeholder="Your Name"
          value={displayName}
          onChange={e => onDisplayNameChange(e.target.value)}
          maxLength={PROFILE_DISPLAY_NAME_MAX}
        />

        <LimitDisplay
          used={displayName.length}
          limit={PROFILE_DISPLAY_NAME_MAX}
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <Label>
            What would you like the AI to know about you to provide better
            responses?
          </Label>
        </div>

        <div className="relative">
          <TextareaAutosize
            value={profileInstructions}
            onValueChange={onProfileInstructionsChange}
            placeholder="Profile context... (optional)"
            minRows={6}
            maxRows={10}
          />

          <LimitDisplay
            used={profileInstructions.length}
            limit={PROFILE_CONTEXT_MAX}
          />
        </div>
      </div>
    </>
  )
}
