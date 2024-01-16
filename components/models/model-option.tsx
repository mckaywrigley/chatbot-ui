import { ChatbotUIContext } from "@/context/context"
import { isModelLocked } from "@/lib/is-model-locked"
import { LLM, LLMID } from "@/types"
import { IconLock } from "@tabler/icons-react"
import { FC, useContext, useEffect, useState } from "react"
import { WithTooltip } from "../ui/with-tooltip"
import { ModelIcon } from "./model-icon"

interface ModelOptionProps {
  model: LLM
  onSelect: () => void
}

export const ModelOption: FC<ModelOptionProps> = ({ model, onSelect }) => {
  const { profile } = useContext(ChatbotUIContext)
  const [isLocked, setIsLocked] = useState<Boolean>(true)

  useEffect(() => {
    async function setup() {
      if (!profile) return null

      const isUsingAzure = profile?.use_azure_openai

      const locked = await isModelLocked(
        model.provider === "openai" && isUsingAzure ? "azure" : model.provider,
        profile
      )

      setIsLocked(locked)
    }
    setup()
  }, [model, profile])

  if (!profile) return null

  const handleSelectModel = () => {
    if (isLocked) return

    onSelect()
  }

  return (
    <div
      className="hover:bg-accent flex w-full cursor-pointer justify-start space-x-3 truncate rounded p-2 hover:opacity-50"
      onClick={handleSelectModel}
    >
      <div className="flex items-center space-x-2">
        {isLocked ? (
          <WithTooltip
            display={
              <div>
                Save {model.provider} API key in profile settings to unlock.
              </div>
            }
            trigger={<IconLock className="mr-2" size={26} />}
          />
        ) : (
          <ModelIcon modelId={model.modelId as LLMID} width={28} height={28} />
        )}

        <div className="text-sm font-semibold">{model.modelName}</div>
      </div>
    </div>
  )
}
