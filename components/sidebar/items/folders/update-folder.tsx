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
import { updateFolder } from "@/db/folders"
import { Tables } from "@/supabase/types"
import { faPen, faPencil } from "@fortawesome/pro-regular-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { IconEdit } from "@tabler/icons-react"
import { FC, useContext, useRef, useState } from "react"

interface UpdateFolderProps {
  folder: Tables<"folders">
}

export const UpdateFolder: FC<UpdateFolderProps> = ({ folder }) => {
  const { setFolders } = useContext(ChatbotUIContext)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [name, setName] = useState(folder.name)

  const handleUpdateFolder = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const updatedFolder = await updateFolder(folder.id, {
      name
    })
    setFolders(prevState =>
      prevState.map(c => (c.id === folder.id ? updatedFolder : c))
    )

    setShowFolderDialog(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  return (
    <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="hover:bg-pixelspace-gray-55 dark:hover:bg-pixelspace-gray-70 block w-full cursor-pointer px-4 py-2 text-left text-sm font-medium dark:hover:text-white"
        >
          <FontAwesomeIcon icon={faPen} className="mr-2" />
          <span>Rename</span>
        </button>
      </DialogTrigger>

      <DialogContent className="h-[223px] w-[640px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="font-bolt text-pixelspace-gray-10">
            Edit Folder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <Label className="text-pixelspace-gray-10 font-normal leading-[25.20px]">
            Folder name
          </Label>

          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>

        <DialogFooter>
          <Button
            size="cancelPrompt"
            className="mr-4"
            variant="cancelPrompt"
            onClick={() => setShowFolderDialog(false)}
          >
            Cancel
          </Button>

          <Button
            size={"savePrompt"}
            variant="savePrompt"
            ref={buttonRef}
            onClick={handleUpdateFolder}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
