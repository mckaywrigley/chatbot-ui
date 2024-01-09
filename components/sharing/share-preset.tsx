import { Tables } from "@/supabase/types"
import { User } from "@supabase/supabase-js"
import { FC } from "react"
import { ModelIcon } from "../models/model-icon"
import { Checkbox } from "../ui/checkbox"
import { Label } from "../ui/label"
import { ShareItem } from "./share-item"

interface SharePresetProps {
  user: User | null
  preset: Tables<"presets">
}

export const SharePreset: FC<SharePresetProps> = ({ user, preset }) => {
  return (
    <ShareItem
      user={user}
      item={preset}
      contentType="presets"
      renderContent={() => (
        <div>
          <div className="text-3xl font-bold">{preset.name}</div>

          <div className="mt-1 font-light">{preset.description}</div>

          <div className="mt-4">
            <Label className="text-md font-semibold">Model</Label>

            <div className="mt-1 flex items-center space-x-2">
              <div className="w-[32px]">
                <ModelIcon modelId={preset.model} width={32} height={32} />
              </div>

              <div className="text-lg font-semibold">{preset.model}</div>
            </div>
          </div>

          <div className="mt-5">
            <Label className="text-md font-semibold">Prompt</Label>

            <div className="font-light">{preset.prompt}</div>
          </div>

          <div className="mt-3 flex space-x-1">
            <Label className="text-md font-semibold">Temperature:</Label>

            <div className="font-light">{preset.temperature}</div>
          </div>

          <div className="mt-1 flex space-x-1">
            <Label className="text-md font-semibold">Context Length:</Label>

            <div className="font-light">
              {preset.context_length.toLocaleString()}
            </div>
          </div>

          <div className="mt-2 flex items-center space-x-2">
            <Checkbox checked={preset.include_profile_context} />

            <div>Includes Profile Context</div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox checked={preset.include_workspace_instructions} />

            <div>Includes Workspace Instructions</div>
          </div>
        </div>
      )}
    />
  )
}
