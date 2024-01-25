import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet"
import { FC } from "react"

interface MessageReplyProps {
  replyText: string
}

export const MessageReply: FC<MessageReplyProps> = ({ replyText }) => {
  return (
    <Sheet>
      <SheetTrigger>Open</SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>Reply</SheetTitle>
          <SheetDescription>{replyText}</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}
