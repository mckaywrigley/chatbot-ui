import { ContentType } from "@/types"
import { FC } from "react"
import { TabsTrigger } from "../ui/tabs"
import { WithTooltip } from "../ui/with-tooltip"

interface SidebarSwitchItemProps {
  contentType: ContentType
  icon: React.ReactNode
  onContentTypeChange: (contentType: ContentType) => void
}

export const SidebarSwitchItem: FC<SidebarSwitchItemProps> = ({
  contentType,
  icon,
  onContentTypeChange
}) => {
  const DISPLAY_NAMES: Partial<Record<ContentType, string>> = {
    "data-collections": "Data Collection",
    "chat-history": "Chats"
  }
  const title =
    DISPLAY_NAMES[contentType] ||
    contentType[0].toUpperCase() + contentType.substring(1)

  return (
    <WithTooltip
      display={<div>{title}</div>}
      trigger={
        <TabsTrigger
          className="flex w-full items-center justify-start gap-2 px-3 py-2 hover:opacity-50"
          value={contentType}
          onClick={() => onContentTypeChange(contentType as ContentType)}
        >
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </TabsTrigger>
      }
    />
  )
}
