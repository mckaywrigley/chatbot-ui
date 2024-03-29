import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { Tables } from "@/supabase/types"
import { IconCircleCheckFilled, IconRobotFace } from "@tabler/icons-react"
import Image from "next/image"
import { FC } from "react"
import { ModelIcon } from "../models/model-icon"
import { DropdownMenuItem } from "../ui/dropdown-menu"

interface QuickSettingOptionProps {
  contentType: "presets" | "assistants"
  isSelected: boolean
  item: Tables<"presets"> | Tables<"assistants">
  onSelect: () => void
  image: string
}

export const QuickSettingOption: FC<QuickSettingOptionProps> = ({
  contentType,
  isSelected,
  item,
  onSelect,
  image
}) => {
  const modelDetails = LLM_LIST.find(model => model.modelId === item.model)

  return (
    <DropdownMenuItem
      tabIndex={0}
      className="cursor-pointer items-center"
      onSelect={onSelect}
    >
      <div className="w-[24px]">
        {contentType === "presets" ? (
          <ModelIcon
            provider={modelDetails?.provider || "custom"}
            width={24}
            height={24}
          />
        ) : image ? (
          <Image
            style={{ width: "24px", height: "24px" }}
            className="rounded-full"
            src={image}
            alt="Assistant"
            width={24}
            height={24}
          />
        ) : (
          <div className="bg-pixelspace-gray-70 flex size-6 items-center justify-center rounded-full">
            <i
              className="fa-regular fa-robot text-pixelspace-gray-20"
              style={{ fontSize: 11 }}
            ></i>
          </div>
        )}
      </div>

      <div className="ml-4 flex grow flex-col space-y-1">
        <div className="text-md font-bold">{item.name}</div>
      </div>

      <div className="min-w-[40px]">
        {isSelected ? (
          <IconCircleCheckFilled className="ml-4" size={20} />
        ) : null}
      </div>
    </DropdownMenuItem>
  )
}
