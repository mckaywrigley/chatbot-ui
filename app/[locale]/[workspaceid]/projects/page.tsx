"use client"

import { useContext, useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EntityCard } from "@/components/cards/entity-card"
// Card primitives no longer used - replaced by EntityCard
import { ChatbotUIContext } from "@/context/context"
import {
  getProjectsByWorkspaceId,
  createProject,
  deleteProject,
  updateProject
} from "@/db/projects"
import { getFilteredProjects } from "@/db/search"
import { Project } from "@/types/project"
import {
  ProjectFiltersComponent,
  ProjectFilters
} from "@/components/projects/project-filters"
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconFolder,
  IconMessagePlus
} from "@tabler/icons-react"
import { supabase } from "@/lib/supabase/browser-client"
import { useToast } from "@/app/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DisplayHeading, Eyebrow } from "@/components/ui/typography"

export default function ProjectsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const workspaceId = params.workspaceid as string

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [filters, setFilters] = useState<ProjectFilters>({
    searchTerm: "",
    tags: [],
    dateRange: undefined,
    sortBy: "updated_at",
    sortOrder: "desc"
  })
  const [availableTags, setAvailableTags] = useState<string[]>([])

  // New project form state
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [newProjectTags, setNewProjectTags] = useState("")

  useEffect(() => {
    fetchProjects()
    // `fetchProjects` is a stable function defined in this component; adding
    // it to the dep array would require wrapping in useCallback for marginal
    // value. The real triggers are workspaceId and filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, filters])

  // When the sidebar's "+" button navigates here with ?create=1, auto-open
  // the create-project dialog and strip the param from the URL.
  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setIsCreateModalOpen(true)
      const locale = (params.locale as string) || "en"
      router.replace(`/${locale}/${workspaceId}/projects`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const data = await getFilteredProjects(workspaceId, {
        searchTerm: filters.searchTerm,
        tags: filters.tags,
        dateRange: filters.dateRange,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      })
      setProjects(data)

      // Extract available tags
      const allTags = data.reduce((tags: string[], project: Project) => {
        if (project.tags) {
          return [...tags, ...project.tags]
        }
        return tags
      }, [] as string[])
      const uniqueTags = Array.from(new Set(allTags)) as string[]
      setAvailableTags(uniqueTags)
    } catch (error) {
      console.error("Error fetching projects:", error)
      toast({
        title: "Error",
        description: "Failed to load projects.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) return

      const project = await createProject({
        user_id: user.id,
        workspace_id: workspaceId,
        name: newProjectName || "Untitled Project",
        description: newProjectDescription,
        tags: newProjectTags
          ? newProjectTags.split(",").map(tag => tag.trim())
          : []
      })

      setProjects(prev => [project, ...prev])
      setIsCreateModalOpen(false)
      setNewProjectName("")
      setNewProjectDescription("")
      setNewProjectTags("")

      toast({
        title: "Success",
        description: "Project created successfully."
      })
    } catch (error) {
      console.error("Error creating project:", error)
      toast({
        title: "Error",
        description: "Failed to create project.",
        variant: "destructive"
      })
    }
  }

  const handleUpdateProject = async () => {
    if (!editingProject) return

    try {
      const updatedProject = await updateProject(editingProject.id, {
        name: newProjectName,
        description: newProjectDescription,
        tags: newProjectTags
          ? newProjectTags.split(",").map(tag => tag.trim())
          : []
      })

      setProjects(prev =>
        prev.map(p => (p.id === updatedProject.id ? updatedProject : p))
      )

      setEditingProject(null)
      setNewProjectName("")
      setNewProjectDescription("")
      setNewProjectTags("")

      toast({
        title: "Success",
        description: "Project updated successfully."
      })
    } catch (error) {
      console.error("Error updating project:", error)
      toast({
        title: "Error",
        description: "Failed to update project.",
        variant: "destructive"
      })
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId)
      setProjects(prev => prev.filter(p => p.id !== projectId))
      toast({
        title: "Success",
        description: "Project deleted successfully."
      })
    } catch (error) {
      console.error("Error deleting project:", error)
      toast({
        title: "Error",
        description: "Failed to delete project.",
        variant: "destructive"
      })
    }
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setNewProjectName(project.name)
    setNewProjectDescription(project.description)
    setNewProjectTags(project.tags.join(", "))
  }

  const closeEditModal = () => {
    setEditingProject(null)
    setNewProjectName("")
    setNewProjectDescription("")
    setNewProjectTags("")
  }

  // Projects are already filtered and sorted by the database query

  const getTimeAgo = (date: string): string => {
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return new Date(date).toLocaleDateString()
  }

  const { designs } = useContext(ChatbotUIContext)

  const designStatsByProject = useMemo(() => {
    const map = new Map<string, { total: number; complete: number }>()
    for (const p of projects) {
      const projectDesigns = designs.filter((d: any) => d.project_id === p.id)
      const complete = projectDesigns.filter((d: any) => {
        if (!d.content) return false
        try {
          const parsed =
            typeof d.content === "string" ? JSON.parse(d.content) : d.content
          return !!parsed?.generatedDesign
        } catch {
          return false
        }
      }).length
      map.set(p.id, { total: projectDesigns.length, complete })
    }
    return map
  }, [projects, designs])

  return (
    <div className="bg-paper h-full space-y-6 overflow-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Eyebrow>Workspace</Eyebrow>
          <DisplayHeading as="h1" className="mt-1 text-[34px]">
            Projects
          </DisplayHeading>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            // From the Projects page, "New Chat" means "chat with every
            // project in the workspace" - i.e. workspace-scoped RAG.
            // Skip the picker modal and route straight to the fresh
            // chat surface (which creates a NULL-scoped chat on first
            // message, matching workspace-wide retrieval).
            onClick={() => router.push(`/${params.locale}/${workspaceId}/chat`)}
          >
            <IconMessagePlus size={16} />
            New Chat
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <IconPlus size={16} />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter project name..."
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter project description..."
                    value={newProjectDescription}
                    onChange={e => setNewProjectDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="molecular biology, cell culture, microscopy..."
                    value={newProjectTags}
                    onChange={e => setNewProjectTags(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateProject} className="flex-1">
                    Create Project
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <ProjectFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        availableTags={availableTags}
        className="border-line bg-surface rounded-lg border p-4"
      />

      {/* Project Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="border-line border-t-rust size-8 animate-spin rounded-full border-2" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-center">
          <IconFolder size={48} className="text-ink-4 mb-4" />
          <p className="text-ink-3 mb-4 text-[13px]">
            {filters.searchTerm || filters.tags.length > 0
              ? "No projects found"
              : "No projects yet"}
          </p>
          {!filters.searchTerm && filters.tags.length === 0 && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <IconPlus size={16} />
              Create your first project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map(project => {
            const stats = designStatsByProject.get(project.id) ?? {
              total: 0,
              complete: 0
            }
            const countLabel =
              stats.total === 0
                ? "No designs"
                : `${stats.total} design${stats.total === 1 ? "" : "s"}${
                    stats.complete > 0 ? ` · ${stats.complete} complete` : ""
                  }`
            return (
              <EntityCard
                key={project.id}
                title={project.name}
                description={project.description || "No description"}
                badges={[countLabel, ...project.tags]}
                chips={[
                  {
                    label: "Has designs",
                    filled: stats.total > 0,
                    accent: "teal-journey"
                  },
                  {
                    label: "Has completed designs",
                    filled: stats.complete > 0,
                    accent: "sage-brand"
                  }
                ]}
                timestamp={getTimeAgo(project.updated_at)}
                onClick={() =>
                  router.push(
                    `/${params.locale}/${workspaceId}/projects/${project.id}`
                  )
                }
                actions={
                  <div className="flex gap-1">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        openEditModal(project)
                      }}
                      className="hover:bg-ink-100 rounded p-1"
                    >
                      <IconEdit size={14} className="text-ink-500" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={e => e.stopPropagation()}
                          className="rounded p-1 hover:bg-red-50"
                        >
                          <IconTrash size={14} className="text-red-500" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Project</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &ldquo;
                            {project.name}&rdquo;? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProject(project.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                }
              />
            )
          })}
        </div>
      )}

      {/* Edit Project Modal */}
      <Dialog
        open={editingProject !== null}
        onOpenChange={open => !open && closeEditModal()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Project Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter project name..."
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter project description..."
                value={newProjectDescription}
                onChange={e => setNewProjectDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                placeholder="molecular biology, cell culture, microscopy..."
                value={newProjectTags}
                onChange={e => setNewProjectTags(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleUpdateProject} className="flex-1">
                Update Project
              </Button>
              <Button
                variant="outline"
                onClick={closeEditModal}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
