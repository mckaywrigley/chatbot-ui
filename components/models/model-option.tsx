import { LLM } from "@/types"
import { FC } from "react"
import { ModelIcon } from "./model-icon"

interface ModelOptionProps {
  model: LLM
  onSelect: () => void
}

export const ModelOption: FC<ModelOptionProps> = ({ model, onSelect }) => {
  return (
    <div
      className="hover:bg-accent flex w-full cursor-pointer justify-start space-x-3 truncate rounded p-2 hover:opacity-50"
      onClick={onSelect}
    >
      <div className="flex items-center space-x-2">
        <ModelIcon provider={model.provider} width={28} height={28} />

        <div className="text-sm font-semibold">{model.modelName}</div>
      </div>
    </div>
  )
}
