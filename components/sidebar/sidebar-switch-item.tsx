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
  let labelTooltip

  switch (contentType) {
    case "chats":
      labelTooltip = <div>Threads</div>
      break
    case "collections":
      labelTooltip = <div>File collections</div>
      break
    default:
      labelTooltip = (
        <div>{contentType[0].toUpperCase() + contentType.slice(1)}</div>
      )
      break
  }

  return (
    <WithTooltip
      display={labelTooltip}
      trigger={
        <TabsTrigger
          className="hover:opacity-50"
          value={contentType}
          onClick={() => onContentTypeChange(contentType as ContentType)}
        >
          {icon}
        </TabsTrigger>
      }
    />
  )
}
