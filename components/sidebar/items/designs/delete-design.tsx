import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { ChatbotUIContext } from "@/context/context"
import { useDesignContext } from "@/context/designcontext"
import { deleteDesign } from "@/db/designs-firestore"
import { Tables } from "@/supabase/types"
import { FC, useContext, useState } from "react"
import { toast } from "sonner"
import { Trash } from "lucide-react"

interface DeleteDesignProps {
  design: Tables<"designs">
}

export const DeleteDesign: FC<DeleteDesignProps> = ({ design }) => {
  const { selectedWorkspace, designs, setDesigns } =
    useContext(ChatbotUIContext)
  const { setSelectedDesign } = useDesignContext()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!selectedWorkspace) return

    try {
      setDeleting(true)

      await deleteDesign(design.id)

      setDesigns(designs.filter(r => r.id !== design.id))
      setSelectedDesign(null)

      toast.success("Design deleted!")
      setShowDeleteDialog(false)
    } catch (error) {
      toast.error("Error deleting design.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowDeleteDialog(true)}
      >
        <Trash className="size-4" />
      </Button>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Design</DialogTitle>

            <DialogDescription>
              Are you sure you want to delete this design?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>

            <Button onClick={handleDelete} disabled={deleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
