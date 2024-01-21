import { IconMessage } from "@tabler/icons-react"
import { FC, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "../ui/sheet"
import { WithTooltip } from "../ui/with-tooltip"
import { MESSAGE_ICON_SIZE } from "./message-actions"

interface MessageRepliesProps {}

export const MessageReplies: FC<MessageRepliesProps> = ({}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <WithTooltip
          delayDuration={1000}
          side="bottom"
          display={<div>View Replies</div>}
          trigger={
            <div
              className="relative cursor-pointer hover:opacity-50"
              onClick={() => setIsOpen(true)}
            >
              <IconMessage size={MESSAGE_ICON_SIZE} />
              <div className="notification-indicator absolute right-[-4px] top-[-4px] flex h-3 w-3 items-center justify-center rounded-full bg-red-600 text-[8px] text-white">
                {1}
              </div>
            </div>
          }
        />
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>Are you sure absolutely sure?</SheetTitle>
          <SheetDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}
