import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChatbotUIContext } from "@/context/context"
import { updateChat } from "@/db/chats"
import { Tables } from "@/supabase/types"
import { faPen } from "@fortawesome/pro-regular-svg-icons"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

import { FC, useContext, useRef, useState } from "react"

interface UpdateChatProps {
  chat: Tables<"chats">
  setShowChatDialog: (value: boolean) => void
}

export const UpdateChat: FC<UpdateChatProps> = ({
  chat,
  setShowChatDialog: isSetShowDialog
}) => {
  const { setChats } = useContext(ChatbotUIContext)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showChatDialog, setShowChatDialog] = useState(false)
  const [name, setName] = useState(chat.name)

  const handleUpdateChat = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const updatedChat = await updateChat(chat.id, {
      name
    })
    setChats(prevState =>
      prevState.map(c => (c.id === chat.id ? updatedChat : c))
    )

    isSetShowDialog(false)
    setShowChatDialog(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  return (
    <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-pixelspace-gray-20 flex items-center text-sm font-normal"
        >
          <FontAwesomeIcon icon={faPen} className="mr-2" />
          <span>Rename</span>
        </button>
      </DialogTrigger>

      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Edit Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <Label>Name</Label>

          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>

        <DialogFooter>
          <Button
            className="mr-4"
            variant="cancelPrompt"
            onClick={() => {
              setShowChatDialog(false)
              isSetShowDialog(false)
            }}
          >
            Cancel
          </Button>

          <Button
            variant="savePrompt"
            ref={buttonRef}
            onClick={handleUpdateChat}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
