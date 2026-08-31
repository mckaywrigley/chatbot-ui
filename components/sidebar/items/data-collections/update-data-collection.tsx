import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChatbotUIContext } from "@/context/context"
import { useDataCollectionContext } from "@/context/datacollectioncontext"
import { updateDataCollection } from "@/db/data-collections-firestore"
import { DataCollectionItem } from "@/types/sidebar-data"
import { FC, useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import { Pencil } from "lucide-react"

interface UpdateDataCollectionProps {
  dataCollection: DataCollectionItem
}

export const UpdateDataCollection: FC<UpdateDataCollectionProps> = ({
  dataCollection
}) => {
  const { selectedWorkspace, dataCollections, setDataCollections } =
    useContext(ChatbotUIContext)
  const { setSelectedDataCollection } = useDataCollectionContext()

  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [name, setName] = useState(dataCollection.name)
  const [description, setDescription] = useState(
    dataCollection.description || ""
  )

  useEffect(() => {
    if (showUpdateDialog) {
      setName(dataCollection.name)
      setDescription(dataCollection.description || "")
    }
  }, [showUpdateDialog, dataCollection])

  const handleUpdate = async () => {
    if (!selectedWorkspace) return
    if (!name) return

    try {
      setUpdating(true)

      const updated = await updateDataCollection(dataCollection.id, {
        name,
        description,
        user_id: dataCollection.user_id
      })

      setDataCollections(
        dataCollections.map(dc => (dc.id === dataCollection.id ? updated : dc))
      )
      setSelectedDataCollection(updated)

      toast.success("Data collection updated!")
      setShowUpdateDialog(false)
    } catch (error) {
      toast.error("Error updating data collection.")
    } finally {
      setUpdating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleUpdate()
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowUpdateDialog(true)}
      >
        <Pencil className="size-4" />
      </Button>

      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent onKeyDown={handleKeyDown}>
          <DialogHeader>
            <DialogTitle>Update Data Collection</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Data collection name..."
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Description..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowUpdateDialog(false)}
              disabled={updating}
            >
              Cancel
            </Button>

            <Button onClick={handleUpdate} disabled={updating || !name}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
