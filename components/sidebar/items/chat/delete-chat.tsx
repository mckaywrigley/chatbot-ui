import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { ChatbotUIContext } from "@/context/context"
import { deleteChat } from "@/db/chats"
import useHotkey from "@/lib/hooks/use-hotkey"
import { Tables } from "@/supabase/types"
import { faTrash } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { IconTrash } from "@tabler/icons-react"
import { FC, useContext, useRef, useState } from "react"

interface DeleteChatProps {
  chat: Tables<"chats">
}

export const DeleteChat: FC<DeleteChatProps> = ({ chat }) => {
  useHotkey("Backspace", () => setShowChatDialog(true))

  const { setChats } = useContext(ChatbotUIContext)
  const { handleNewChat } = useChatHandler()

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showChatDialog, setShowChatDialog] = useState(false)

  const handleDeleteChat = async () => {
    await deleteChat(chat.id)

    setChats(prevState => prevState.filter(c => c.id !== chat.id))

    setShowChatDialog(false)

    handleNewChat()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  return (
    <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
      <DialogTrigger asChild>
        <div
          role="button"
          className="text-pixelspace-gray-20 flex items-center text-sm font-medium"
        >
          <FontAwesomeIcon icon={faTrash} className="mr-2" />
          <span>Delete</span>
        </div>
      </DialogTrigger>

      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Delete {chat.name}</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this chat?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            className="mr-4"
            variant="cancelPrompt"
            onClick={() => setShowChatDialog(false)}
          >
            Cancel
          </Button>

          <Button variant="savePrompt" onClick={handleDeleteChat}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
