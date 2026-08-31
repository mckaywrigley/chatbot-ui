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
import { useDataCollectionContext } from "@/context/datacollectioncontext"
import { deleteDataCollection } from "@/db/data-collections-firestore"
import { DataCollectionItem } from "@/types/sidebar-data"
import { FC, useContext, useState } from "react"
import { toast } from "sonner"
import { Trash } from "lucide-react"

interface DeleteDataCollectionProps {
  dataCollection: DataCollectionItem
}

export const DeleteDataCollection: FC<DeleteDataCollectionProps> = ({
  dataCollection
}) => {
  const { selectedWorkspace, dataCollections, setDataCollections } =
    useContext(ChatbotUIContext)
  const { setSelectedDataCollection } = useDataCollectionContext()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!selectedWorkspace) return

    try {
      setDeleting(true)

      await deleteDataCollection(dataCollection.id)

      setDataCollections(
        dataCollections.filter(dc => dc.id !== dataCollection.id)
      )
      setSelectedDataCollection(null)

      toast.success("Data collection deleted!")
      setShowDeleteDialog(false)
    } catch (error) {
      toast.error("Error deleting data collection.")
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
            <DialogTitle>Delete Data Collection</DialogTitle>

            <DialogDescription>
              Are you sure you want to delete this data collection?
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
