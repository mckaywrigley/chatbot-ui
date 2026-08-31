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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { ChatbotUIContext } from "@/context/context"
import { useDesignContext } from "@/context/designcontext"
import { updateDesign } from "@/db/designs-firestore"
import { linkDesignToProject } from "@/db/designs"
import { getProjectsByWorkspaceId } from "@/db/projects"
import { Tables } from "@/supabase/types"
import { Project } from "@/types/project"
import { FC, useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import { Pencil } from "lucide-react"

interface UpdateDesignProps {
  design: Tables<"designs"> & { problem?: string; project_id?: string | null }
}

const UNASSIGNED = "__unassigned__"

export const UpdateDesign: FC<UpdateDesignProps> = ({ design }) => {
  const { selectedWorkspace, designs, setDesigns } =
    useContext(ChatbotUIContext)
  const { setSelectedDesign } = useDesignContext()

  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [problem, setProblem] = useState(design.problem || design.name)
  const [description, setDescription] = useState(design.description || "")
  const [projectId, setProjectId] = useState<string | null>(
    design.project_id ?? null
  )
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    if (showUpdateDialog) {
      setProblem(design.problem || design.name)
      setDescription(design.description || "")
      setProjectId(design.project_id ?? null)
      if (selectedWorkspace) {
        getProjectsByWorkspaceId(selectedWorkspace.id)
          .then(setProjects)
          .catch(() => setProjects([]))
      }
    }
  }, [showUpdateDialog, design, selectedWorkspace])

  const handleUpdate = async () => {
    if (!selectedWorkspace) return
    if (!problem) return

    try {
      setUpdating(true)

      const updatedDesign = await updateDesign(design.id, {
        problem,
        name: problem,
        description,
        user_id: design.user_id
      })

      const withProject =
        projectId !== (design.project_id ?? null)
          ? await linkDesignToProject(design.id, projectId).catch(() => null)
          : null

      const merged = withProject
        ? { ...updatedDesign, project_id: withProject.project_id }
        : updatedDesign

      setDesigns(designs.map(r => (r.id === design.id ? merged : r)))
      setSelectedDesign(merged)

      toast.success("Design updated!")
      setShowUpdateDialog(false)
    } catch (error) {
      toast.error("Error updating design.")
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
            <DialogTitle>Update Design</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Problem</Label>
              <Input
                placeholder="Research Problem..."
                value={problem}
                onChange={e => setProblem(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Design description..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={projectId ?? UNASSIGNED}
                onValueChange={val =>
                  setProjectId(val === UNASSIGNED ? null : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <Button onClick={handleUpdate} disabled={updating || !problem}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
