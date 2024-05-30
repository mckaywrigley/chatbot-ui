import { FC, useMemo, useState } from "react"
import { IconChevronDown } from "@tabler/icons-react"
import { WithTooltip } from "../ui/with-tooltip"
import { GPT4 } from "@/lib/models/llm/openai-llm-list"
import { ModelIcon } from "../models/model-icon"
import React from "react"
import { LLMID } from "@/types"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "../ui/dropdown-menu"

interface ChangeModelIconProps {
  currentModel: string
  onChangeModel: (model: string) => void
  isMobile: boolean
}

const getModelDisplayName = (modelId: string): string => {
  switch (modelId) {
    case GPT4.modelId:
      return "GPT-4o"
    case "mistral-medium":
      return "HGPT"
    case "mistral-large":
      return "HGPT Pro"
    default:
      return modelId
  }
}

export const ChangeModelIcon: FC<ChangeModelIconProps> = ({
  currentModel,
  onChangeModel,
  isMobile
}) => {
  const ICON_SIZE = isMobile ? 22 : 20
  const [isHovered, setIsHovered] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const displayName = useMemo(
    () => getModelDisplayName(currentModel),
    [currentModel]
  )

  const handleModelChange = (model: string) => {
    onChangeModel(model)
    setIsDropdownOpen(false)
  }

  const getClassNames = (
    base: string,
    condition: boolean,
    trueClass: string,
    falseClass: string
  ) => `${base} ${condition ? trueClass : falseClass}`

  const shouldShowDetails =
    (isHovered || isDropdownOpen) && (!isMobile || isDropdownOpen)

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <WithTooltip
        delayDuration={0}
        side="bottom"
        display={<div>Change model</div>}
        trigger={
          <DropdownMenu onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <div className="relative flex cursor-pointer items-center hover:opacity-50">
                <ModelIcon
                  modelId={currentModel as LLMID}
                  height={ICON_SIZE}
                  width={ICON_SIZE}
                />
                <div className="relative flex items-center">
                  <span
                    className={getClassNames(
                      "absolute left-full ml-1 text-sm transition-all duration-500",
                      shouldShowDetails,
                      "opacity-100 translate-x-0",
                      "opacity-0 -translate-x-4"
                    )}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {displayName}
                  </span>
                  <IconChevronDown
                    className={getClassNames(
                      "absolute left-full transition-all duration-500",
                      shouldShowDetails,
                      "opacity-100",
                      "opacity-50"
                    )}
                    size={16}
                    style={{
                      transform: `translateX(${shouldShowDetails ? displayName.length * 0.5 + 0.6 : 0.2}rem)`
                    }}
                  />
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top">
              <DropdownMenuItem
                onSelect={() => handleModelChange(GPT4.modelId)}
                className="text-base"
              >
                <ModelIcon
                  modelId={GPT4.modelId as LLMID}
                  height={18}
                  width={18}
                  className="mr-2"
                />{" "}
                GPT-4o
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => handleModelChange("mistral-large")}
                className="text-base"
              >
                <ModelIcon
                  modelId={"mistral-large" as LLMID}
                  height={18}
                  width={18}
                  className="mr-2"
                />{" "}
                HackerGPT Pro
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => handleModelChange("mistral-medium")}
                className="text-base"
              >
                <ModelIcon
                  modelId={"mistral-medium" as LLMID}
                  height={18}
                  width={18}
                  className="mr-2"
                />{" "}
                HackerGPT
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
    </div>
  )
}
