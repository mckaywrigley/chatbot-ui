import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { IconBell } from "@tabler/icons-react"
import { FC } from "react"
import { SIDEBAR_ICON_SIZE } from "../sidebar/sidebar-switcher"

interface AlertsProps {}

export const Alerts: FC<AlertsProps> = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative cursor-pointer hover:opacity-50">
          <IconBell size={SIDEBAR_ICON_SIZE} />
          {1 > 0 && (
            <span className="notification-indicator absolute right-[-4px] top-[-4px] flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
              1
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="mb-2 w-80">
        <div>placeholder</div>
      </PopoverContent>
    </Popover>
  )
}
