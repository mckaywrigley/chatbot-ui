"use client"

import { ChatbotUIContext } from "@/context/context"
import { createReport } from "@/db/reports-firestore"
import { getProjectsByWorkspaceId } from "@/db/projects"
import { useParams, useRouter } from "next/navigation"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { track } from "@/lib/analytics"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

interface CreateReportProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  projectId?: string
}

export const CreateReport: FC<CreateReportProps> = ({
  isOpen,
  onOpenChange,
  projectId
}) => {
  const { profile, selectedWorkspace, setReports } =
    useContext(ChatbotUIContext)

  const router = useRouter()
  const params = useParams()

  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  // Project dropdown - lets the user pick which project this report
  // belongs to (was previously inferred only from the URL when the
  // create flow was launched from a project canvas). When opened from
  // the workspace Reports list we now offer the same picker. "none" is
  // a sentinel for an unscoped (workspace-only) report.
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | "none">(
    projectId ?? "none"
  )
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setName("")
      setSelectedProjectId(projectId ?? "none")
      setTimeout(() => nameRef.current?.focus(), 0)
    }
  }, [isOpen, projectId])

  // Fetch projects once when the dialog opens. Best-effort: if the load
  // fails the dropdown just shows "(no project)".
  useEffect(() => {
    if (!isOpen || !selectedWorkspace?.id) return
    let cancelled = false
    void getProjectsByWorkspaceId(selectedWorkspace.id)
      .then((rows: any[]) => {
        if (!cancelled) {
          setProjects(
            (rows ?? []).map((p: any) => ({
              id: p.id as string,
              name: p.name as string
            }))
          )
        }
      })
      .catch((err: any) =>
        console.warn("[CreateReport] failed to load projects:", err)
      )
    return () => {
      cancelled = true
    }
  }, [isOpen, selectedWorkspace?.id])

  if (!profile || !selectedWorkspace) return null

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    track("new_report_clicked")
    setCreating(true)
    try {
      const finalProjectId =
        selectedProjectId === "none" ? null : selectedProjectId
      const created = await createReport(
        {
          user_id: profile.user_id,
          name: trimmed,
          description: "",
          sharing: "private",
          project_id: finalProjectId
        },
        selectedWorkspace.id,
        { protocol: [], papers: [], dataFiles: [] },
        []
      )

      setReports(prev => [created, ...prev])

      const locale = (params.locale as string) ?? "en"
      const wsId = params.workspaceid as string
      router.push(`/${locale}/${wsId}/reports/${created.id}`)
    } catch (error: any) {
      console.error("Failed to create report:", error)
      toast.error(
        `Failed to create report: ${error?.message || "Unknown error"}`
      )
    } finally {
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && name.trim() && !creating) {
      e.preventDefault()
      void handleCreate()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="report-name">Name</Label>
            <Input
              id="report-name"
              ref={nameRef}
              placeholder="e.g. pH effect on enzyme activity"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-project">Project</Label>
            <Select
              value={selectedProjectId}
              onValueChange={v => setSelectedProjectId(v as string | "none")}
            >
              <SelectTrigger id="report-project">
                <SelectValue placeholder="Choose a project (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              The report will be filed under this project. Leave as &quot;No
              project&quot; to keep it at the workspace level.
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            You can add the objective, design/plan/procedure, reference
            documents, and data files in the next view before generating the
            report.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="bg-brick hover:bg-brick-hover"
          >
            {creating ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
