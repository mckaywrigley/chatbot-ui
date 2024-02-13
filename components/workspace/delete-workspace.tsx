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
import { deleteWorkspace } from "@/db/workspaces"
import { Tables } from "@/supabase/types"
import { FC, useContext, useRef, useState } from "react"
import { Input } from "../ui/input"
import { useRouter } from "next/navigation"

interface DeleteWorkspaceProps {
  workspace: Tables<"workspaces">
  onDelete: () => void
}

export const DeleteWorkspace: FC<DeleteWorkspaceProps> = ({
  workspace,
  onDelete
}) => {
  const { setWorkspaces, setSelectedWorkspace } = useContext(ChatbotUIContext)
  const { handleNewChat } = useChatHandler()
  const router = useRouter()

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showWorkspaceDialog, setShowWorkspaceDialog] = useState(false)

  const [name, setName] = useState("")

  const handleDeleteWorkspace = async () => {
    await deleteWorkspace(workspace.id)

    setWorkspaces(prevWorkspaces => {
      const filteredWorkspaces = prevWorkspaces.filter(
        w => w.id !== workspace.id
      )

      const defaultWorkspace = filteredWorkspaces[0]

      setSelectedWorkspace(defaultWorkspace)
      router.push(`/${defaultWorkspace.id}/chat`)

      return filteredWorkspaces
    })

    setShowWorkspaceDialog(false)
    onDelete()

    handleNewChat()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  return (
    <Dialog open={showWorkspaceDialog} onOpenChange={setShowWorkspaceDialog}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>

      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Delete {workspace.name}</DialogTitle>

          <DialogDescription className="space-y-1">
            WARNING: Deleting a workspace will delete all of its data.
          </DialogDescription>
        </DialogHeader>

        <Input
          className="mt-4"
          placeholder="Type the name of this workspace to confirm"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowWorkspaceDialog(false)}>
            Cancel
          </Button>

          <Button
            ref={buttonRef}
            variant="destructive"
            onClick={handleDeleteWorkspace}
            disabled={name !== workspace.name}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
