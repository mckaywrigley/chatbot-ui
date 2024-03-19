import { ContentType } from "@/types"
import {
  IconAdjustmentsHorizontal,
  IconBolt,
  IconBooks,
  IconFile,
  IconMessage,
  IconPencil,
  IconRobotFace,
  IconSparkles
} from "@tabler/icons-react"
import { FC } from "react"
import { TabsList } from "../ui/tabs"
import { WithTooltip } from "../ui/with-tooltip"
import { ProfileSettings } from "../utility/profile-settings"
import { SidebarSwitchItem } from "./sidebar-switch-item"

export const SIDEBAR_ICON_SIZE = 12

interface SidebarSwitcherProps {
  onContentTypeChange: (contentType: ContentType) => void
}

export const SidebarSwitcher: FC<SidebarSwitcherProps> = ({
  onContentTypeChange
}) => {
  return (
    <div className="border-pixelspace-gray-60 bg-pixelspace-gray-90 flex flex-col justify-between border-r px-5 pb-6  pt-8">
      <TabsList className="bg-pixelspace-gray-90 grid h-[460px]   grid-rows-8 space-y-[32px]">
        <SidebarSwitchItem
          icon={
            <i
              className="fa-kit fa-thread-simple text-pixelspace-pink"
              style={{ width: 16, height: 16 }}
            ></i>
          }
          contentType="chats"
          onContentTypeChange={onContentTypeChange}
        />

        <SidebarSwitchItem
          icon={
            <i
              className="fa-regular fa-sparkles text-pixelspace-gray-3"
              style={{ width: 16, height: 16 }}
            ></i>
          }
          contentType="prompts"
          onContentTypeChange={onContentTypeChange}
        />

        <hr className="border-pixelspace-gray-60 w-4 border" />

        <SidebarSwitchItem
          icon={
            <i
              className="fa-regular fa-file text-pixelspace-gray-3"
              style={{ width: 16, height: 16 }}
            ></i>
          }
          contentType="files"
          onContentTypeChange={onContentTypeChange}
        />

        {/* <SidebarSwitchItem
          icon={<IconAdjustmentsHorizontal size={SIDEBAR_ICON_SIZE} />}
          contentType="presets"
          onContentTypeChange={onContentTypeChange}
        /> */}

        <SidebarSwitchItem
          icon={
            <i
              className="fa-regular fa-files text-pixelspace-gray-3"
              style={{ width: 16, height: 16 }}
            ></i>
          }
          contentType="collections"
          onContentTypeChange={onContentTypeChange}
        />

        <hr className="border-pixelspace-gray-60 border" />

        <SidebarSwitchItem
          icon={
            <i
              className="fa-regular fa-robot text-pixelspace-gray-3"
              style={{ width: 16, height: 16 }}
            ></i>
          }
          contentType="assistants"
          onContentTypeChange={onContentTypeChange}
        />

        <SidebarSwitchItem
          icon={
            <i
              className="fa-regular fa-bolt text-pixelspace-gray-3"
              style={{ width: 16, height: 16 }}
            ></i>
          }
          contentType="tools"
          onContentTypeChange={onContentTypeChange}
        />

        <SidebarSwitchItem
          icon={
            <i
              className="fa-regular fa-microchip-ai text-pixelspace-gray-3"
              style={{ width: 16, height: 16 }}
            ></i>
          }
          contentType="models"
          onContentTypeChange={onContentTypeChange}
        />
      </TabsList>

      <div className="flex flex-col items-center space-y-4">
        {/* TODO */}
        {/* <WithTooltip display={<div>Import</div>} trigger={<Import />} /> */}

        {/* TODO */}
        {/* <Alerts /> */}

        <WithTooltip
          display={<div>Profile Settings</div>}
          trigger={<ProfileSettings />}
        />
      </div>
    </div>
  )
}
