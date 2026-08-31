"use client"

import { useContext, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { SlabRow } from "@/components/ui/slab-row"
import { getProjectById, updateProject, deleteProject } from "@/db/projects"
import { getDesignsByProject } from "@/db/designs"
import { deleteDesign as deleteDesignFirestore } from "@/db/designs-firestore"
import { createReport, getReportsByProject } from "@/db/reports-firestore"
import { createChat } from "@/db/chats"
import { uploadProjectFile } from "@/db/project-files"
import type { Tables } from "@/supabase/types"
import { Project } from "@/types/project"
import { ProjectSettingsModal } from "./project-settings-modal"
import { getDesignProgress } from "@/lib/design-status"
import { formatCreatedModifiedStacked } from "@/lib/format-date"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  IconAdjustmentsHorizontal,
  IconArrowsSort,
  IconDotsVertical,
  IconEdit,
  IconFlask,
  IconLoader2,
  IconPlus,
  IconReport,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconUpload
} from "@tabler/icons-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/app/hooks/use-toast"
import { ChatbotUIContext } from "@/context/context"

interface StudioCanvasProps {
  children?: React.ReactNode
  projectId?: string
  workspaceId?: string
  onOpenChat?: () => void
  showRail?: boolean
  onToggleRail?: () => void
}

type DesignRow = Tables<"designs"> & {
  description?: string
  content?: unknown
  approved_phases?: string[] | null
  current_stage?: string | null
}

type SortKey = "updated" | "created" | "name"
type FilterKey = "all" | "completed" | "in_progress"

const SORT_LABEL: Record<SortKey, string> = {
  updated: "Last updated",
  created: "Date created",
  name: "Name (A–Z)"
}
const FILTER_LABEL: Record<FilterKey, string> = {
  all: "All designs",
  completed: "Completed",
  in_progress: "In progress"
}

const STATUS_COMPLETED =
  "rounded-full border border-transparent bg-[#DDE9DF] px-2 py-0.5 text-[10.5px] font-medium text-[#1F4A2C]"
const STATUS_IN_PROGRESS =
  "rounded-full border border-amber-300/40 bg-amber-100/70 px-2 py-0.5 text-[10.5px] font-medium text-amber-800"
const CHIP_STAGE =
  "rounded-full border border-purple-persona/30 bg-purple-persona-tint px-2 py-0.5 text-[10.5px] font-medium text-purple-persona"

export function StudioCanvas({
  children,
  projectId,
  workspaceId
}: StudioCanvasProps) {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { profile, selectedWorkspace, chatSettings } =
    useContext(ChatbotUIContext)

  const [project, setProject] = useState<Project | null>(null)
  const [designs, setDesigns] = useState<DesignRow[]>([])
  // designId → its reports (to show "report ready / in progress" on the slab).
  const [reportsByDesign, setReportsByDesign] = useState<
    Record<string, Tables<"reports">[]>
  >({})
  const [loading, setLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("updated")
  const [filterKey, setFilterKey] = useState<FilterKey>("all")
  const [startingChat, setStartingChat] = useState(false)
  // The design we're generating a report for (drives the report popup).
  const [reportDialogDesign, setReportDialogDesign] =
    useState<DesignRow | null>(null)

  const actualProjectId = projectId || (params.projectId as string)
  const actualWorkspaceId = workspaceId || (params.workspaceid as string)
  const locale = params.locale as string

  useEffect(() => {
    if (actualProjectId && actualWorkspaceId) void fetchProjectData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualProjectId, actualWorkspaceId])

  // Re-fetch designs when the tab regains focus so returning from a design
  // page shows newly created / saved designs immediately.
  useEffect(() => {
    if (!actualProjectId) return
    const onFocus = () => {
      if (document.visibilityState === "visible") void fetchProjectData()
    }
    document.addEventListener("visibilitychange", onFocus)
    window.addEventListener("focus", onFocus)
    return () => {
      document.removeEventListener("visibilitychange", onFocus)
      window.removeEventListener("focus", onFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualProjectId])

  const fetchProjectData = async () => {
    try {
      setLoading(true)
      const projectData = await getProjectById(actualProjectId)
      if (!projectData) {
        toast({
          title: "Error",
          description: "Project not found.",
          variant: "destructive"
        })
        return
      }
      setProject(projectData)
      const [projectDesigns, projectReports] = await Promise.all([
        getDesignsByProject(actualProjectId).catch(() => []),
        profile
          ? getReportsByProject(profile.user_id, actualProjectId).catch(
              () => []
            )
          : Promise.resolve([] as Tables<"reports">[])
      ])
      setDesigns(projectDesigns as DesignRow[])
      const byDesign: Record<string, Tables<"reports">[]> = {}
      for (const r of projectReports as Tables<"reports">[]) {
        const did = (r as any).source_design_id as string | null
        if (!did) continue
        ;(byDesign[did] ||= []).push(r)
      }
      setReportsByDesign(byDesign)
    } catch (error) {
      console.error("Error fetching project data:", error)
      toast({
        title: "Error",
        description: "Failed to load project data.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNewDesign = () => {
    router.push(
      `/${locale}/${actualWorkspaceId}/designs/new?projectId=${actualProjectId}`
    )
  }

  const handleOpenDesign = (id: string) => {
    // Pass ret so the design's Back returns to THIS project (not the dashboard).
    const ret = encodeURIComponent(
      `/${locale}/${actualWorkspaceId}/projects/${actualProjectId}`
    )
    router.push(`/${locale}/${actualWorkspaceId}/designs/${id}?ret=${ret}`)
  }

  const handleDeleteDesign = async (id: string) => {
    if (!window.confirm("Delete this design? This cannot be undone.")) return
    try {
      await deleteDesignFirestore(id)
      setDesigns(prev => prev.filter(d => d.id !== id))
      toast({ title: "Design deleted" })
    } catch (err: any) {
      toast({
        title: "Couldn't delete design",
        description: err?.message ?? "Try again in a moment.",
        variant: "destructive"
      })
    }
  }

  const handleProjectUpdate = async (updates: Partial<Project>) => {
    if (!project) return
    try {
      const updated = await updateProject(project.id, updates)
      setProject(updated)
      toast({ title: "Project updated" })
      setSettingsOpen(false)
    } catch {
      toast({
        title: "Error",
        description: "Failed to update project.",
        variant: "destructive"
      })
    }
  }

  const handleProjectDelete = async () => {
    if (!project) return
    try {
      await deleteProject(project.id)
      toast({ title: "Project deleted" })
      router.push(`/${locale}/${actualWorkspaceId}/projects`)
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete project.",
        variant: "destructive"
      })
    }
  }

  // Full-screen chat across ALL designs in this project (project-scoped chat).
  const handleStartProjectChat = async () => {
    if (!selectedWorkspace || !profile || !project) return
    setStartingChat(true)
    try {
      const cs = chatSettings
      const ws = selectedWorkspace
      const chat = await createChat({
        user_id: profile.user_id,
        workspace_id: ws.id,
        name: `${project.name} chat`,
        scope: "project",
        scope_id: project.id,
        project_id: project.id,
        model: cs?.model ?? ws.default_model,
        prompt: cs?.prompt ?? ws.default_prompt ?? "",
        temperature: cs?.temperature ?? ws.default_temperature,
        context_length: cs?.contextLength ?? ws.default_context_length,
        embeddings_provider: cs?.embeddingsProvider ?? ws.embeddings_provider,
        include_profile_context:
          cs?.includeProfileContext ?? ws.include_profile_context,
        include_workspace_instructions:
          cs?.includeWorkspaceInstructions ?? ws.include_workspace_instructions,
        sharing: "private"
      })
      router.push(`/${locale}/${actualWorkspaceId}/chat/${chat.id}`)
    } catch (err: any) {
      toast({
        title: "Couldn't start chat",
        description: err?.message ?? "Try again in a moment.",
        variant: "destructive"
      })
      setStartingChat(false)
    }
  }

  const statusOf = (d: DesignRow) => {
    const progress = getDesignProgress(d as any)
    const isCompleted =
      progress.isCompleted || (d.approved_phases ?? []).includes("design")
    return {
      isCompleted,
      stageLabel: progress.currentStageLabel,
      isAuto: progress.isAutoGenerated
    }
  }

  // Report state for a design's slab: a report with a generated draft is
  // "ready"; one without is still "in progress".
  const reportStatusOf = (
    designId: string
  ): { status: "ready" | "in_progress"; report: Tables<"reports"> } | null => {
    const list = reportsByDesign[designId] ?? []
    if (list.length === 0) return null
    const drafted = list.find(r => {
      const d = (r as any).report_draft
      return (
        (typeof d === "string" && d.trim().length > 0) ||
        (!!d && typeof d === "object" && Object.keys(d).length > 0)
      )
    })
    return drafted
      ? { status: "ready", report: drafted }
      : { status: "in_progress", report: list[0] }
  }

  const visibleDesigns = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = designs.filter(d => {
      if (q) {
        const hit =
          d.name?.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q))
        if (!hit) return false
      }
      if (filterKey !== "all") {
        const { isCompleted } = statusOf(d)
        if (filterKey === "completed" && !isCompleted) return false
        if (filterKey === "in_progress" && isCompleted) return false
      }
      return true
    })
    list = [...list].sort((a, b) => {
      if (sortKey === "name") return (a.name || "").localeCompare(b.name || "")
      const ax = new Date(
        (sortKey === "created" ? a.created_at : a.updated_at || a.created_at) ||
          0
      ).getTime()
      const bx = new Date(
        (sortKey === "created" ? b.created_at : b.updated_at || b.created_at) ||
          0
      ).getTime()
      return bx - ax
    })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designs, search, sortKey, filterKey])

  // Children override: the design editor route renders its own content inside
  // the StudioLayout shell.
  if (children) {
    return <div className="bg-ink-50 h-full">{children}</div>
  }

  if (loading) {
    return (
      <div className="bg-ink-50 flex h-full flex-col">
        <div className="border-ink-200 border-b bg-white p-6">
          <Skeleton className="mb-2 h-8 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="flex-1 space-y-3 overflow-auto p-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="bg-ink-50 flex h-full items-center justify-center">
        <p className="text-ink-400">Project not found</p>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="bg-ink-50 flex h-full flex-col">
        {/* Header */}
        <div className="border-ink-200 shrink-0 border-b bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-ink-400 text-[11px] font-bold uppercase tracking-[0.13em]">
                Project
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <h1 className="text-ink-900 truncate text-2xl font-extrabold tracking-tight">
                  {project.name}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  className="text-ink-400 hover:text-ink-700"
                  title="Project settings"
                >
                  <IconEdit size={16} />
                </Button>
              </div>
              {project.description && (
                <p className="text-ink-500 mt-1 line-clamp-2 text-sm">
                  {project.description}
                </p>
              )}
              {project.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {project.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                onClick={handleStartProjectChat}
                disabled={startingChat || !selectedWorkspace}
                className="gap-2"
                title="Chat across all designs in this project"
              >
                {startingChat ? (
                  <IconLoader2 size={16} className="animate-spin" />
                ) : (
                  <IconSparkles size={16} />
                )}
                Start chat
              </Button>
              <Button
                onClick={handleNewDesign}
                className="bg-brick hover:bg-brick-hover gap-2"
              >
                <IconPlus size={16} />
                New Design
              </Button>
            </div>
          </div>
        </div>

        {/* Toolbar: search · sort · filter */}
        <div className="border-ink-200 shrink-0 border-b bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="border-ink-200 flex min-w-[240px] flex-1 items-center gap-2 rounded-md border px-3 py-1.5">
              <IconSearch size={14} className="text-ink-400 shrink-0" />
              <Input
                placeholder="Search designs…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border-none p-0 shadow-none focus-visible:ring-0"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <IconArrowsSort size={15} />
                  {SORT_LABEL[sortKey]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sortKey}
                  onValueChange={v => setSortKey(v as SortKey)}
                >
                  {(Object.keys(SORT_LABEL) as SortKey[]).map(k => (
                    <DropdownMenuRadioItem key={k} value={k}>
                      {SORT_LABEL[k]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <IconAdjustmentsHorizontal size={15} />
                  {FILTER_LABEL[filterKey]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Filter</DropdownMenuLabel>
                {(Object.keys(FILTER_LABEL) as FilterKey[]).map(k => (
                  <DropdownMenuCheckboxItem
                    key={k}
                    checked={filterKey === k}
                    onCheckedChange={() => setFilterKey(k)}
                  >
                    {FILTER_LABEL[k]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Vertical designs list */}
        <div className="min-h-0 flex-1 overflow-auto p-6">
          {visibleDesigns.length === 0 ? (
            <EmptyDesigns hasAny={designs.length > 0} onNew={handleNewDesign} />
          ) : (
            <div className="mx-auto flex max-w-[960px] flex-col gap-2.5">
              <div className="text-ink-400 mb-1 text-xs">
                {visibleDesigns.length} of {designs.length} design
                {designs.length === 1 ? "" : "s"}
              </div>
              {visibleDesigns.map(d => {
                const { isCompleted, stageLabel, isAuto } = statusOf(d)
                const dateLines = formatCreatedModifiedStacked(
                  d.created_at,
                  d.updated_at
                )
                return (
                  <SlabRow
                    key={d.id}
                    onClick={() => handleOpenDesign(d.id)}
                    dateLines={dateLines}
                    actions={
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-ink-400 hover:text-ink-700 size-7"
                            aria-label="Design actions"
                            onClick={e => e.stopPropagation()}
                          >
                            <IconDotsVertical size={15} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-36"
                          onClick={e => e.stopPropagation()}
                        >
                          <DropdownMenuItem
                            onSelect={() => handleOpenDesign(d.id)}
                            className="cursor-pointer"
                          >
                            <IconEdit size={14} className="mr-2" />
                            Open / edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => handleDeleteDesign(d.id)}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <IconTrash size={14} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                  >
                    <div className="text-ink-900 truncate text-[15px] font-semibold">
                      {d.name || "Untitled Design"}
                    </div>
                    {d.description && (
                      <div className="text-ink-500 mt-1 line-clamp-1 text-[12.5px]">
                        {d.description}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {/* How the design was built. An auto run and a
                          hand-driven one looked identical here, though they
                          warrant different scrutiny - auto chose its own
                          papers, hypothesis and iterations. */}
                      <span
                        className={
                          isAuto
                            ? "border-brick/30 bg-brick/10 text-brick rounded-full border px-2 py-0.5 text-[10.5px] font-medium"
                            : "border-ink-200 bg-ink-50 text-ink-600 rounded-full border px-2 py-0.5 text-[10.5px] font-medium"
                        }
                      >
                        {isAuto ? "Auto mode" : "Built by you"}
                      </span>
                      <span
                        className={
                          isCompleted ? STATUS_COMPLETED : STATUS_IN_PROGRESS
                        }
                      >
                        {isCompleted ? "Completed" : "In progress"}
                      </span>
                      {!isCompleted && stageLabel && (
                        <span className={CHIP_STAGE}>Stage: {stageLabel}</span>
                      )}
                      {(() => {
                        // Report is now generated from INSIDE the design (its
                        // Reports tab), not from the slab. The slab only shows a
                        // passive indicator when a report already exists - and
                        // nothing (no "create" affordance) when one doesn't.
                        const rep = reportStatusOf(d.id)
                        if (!rep) return null
                        return (
                          <button
                            data-slab-action
                            onClick={e => {
                              e.stopPropagation()
                              router.push(
                                `/${locale}/${actualWorkspaceId}/reports/${rep.report.id}`
                              )
                            }}
                            className={
                              rep.status === "ready"
                                ? "inline-flex items-center gap-1 rounded-full border border-[#1F4A2C]/20 bg-[#DDE9DF] px-2 py-0.5 text-[10.5px] font-medium text-[#1F4A2C] hover:opacity-80"
                                : "inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-100/70 px-2 py-0.5 text-[10.5px] font-medium text-amber-800 hover:opacity-80"
                            }
                            title="Open report"
                          >
                            <IconReport size={11} />
                            {rep.status === "ready"
                              ? "Report ready"
                              : "Report in progress"}
                          </button>
                        )
                      })()}
                    </div>
                  </SlabRow>
                )
              })}
            </div>
          )}
        </div>

        <ProjectSettingsModal
          project={project}
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onUpdate={handleProjectUpdate}
          onDelete={handleProjectDelete}
        />

        {reportDialogDesign && (
          <ReportDialog
            design={reportDialogDesign}
            projectId={actualProjectId}
            workspaceId={actualWorkspaceId}
            userId={profile?.user_id ?? ""}
            locale={locale}
            onClose={() => setReportDialogDesign(null)}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}

/**
 * Generate-a-report popup launched from a design slab. Optionally takes a
 * supporting document to upload for this design, then creates a report linked
 * to the design (source_design_id) and opens the report editor.
 */
function ReportDialog(props: {
  design: DesignRow
  projectId: string
  workspaceId: string
  userId: string
  locale: string
  onClose: () => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [name, setName] = useState(`${props.design.name || "Design"} report`)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast({ title: "Please name the report", variant: "destructive" })
      return
    }
    if (!props.userId) return
    setBusy(true)
    try {
      // Optional supporting document → upload to the project first.
      if (file) {
        try {
          await uploadProjectFile({
            file,
            projectId: props.projectId,
            workspaceId: props.workspaceId,
            userId: props.userId
          })
        } catch (err: any) {
          toast({
            title: `Couldn't upload ${file.name}`,
            description: err?.message ?? "The report was still created.",
            variant: "destructive"
          })
        }
      }
      const created = await createReport(
        {
          user_id: props.userId,
          name: trimmed,
          description: "",
          sharing: "private",
          project_id: props.projectId,
          source_design_id: props.design.id,
          source_design_name: props.design.name
        },
        props.workspaceId,
        { protocol: [], papers: [], dataFiles: [] },
        []
      )
      router.push(`/${props.locale}/${props.workspaceId}/reports/${created.id}`)
    } catch (err: any) {
      toast({
        title: "Couldn't create the report",
        description: err?.message ?? "Try again in a moment.",
        variant: "destructive"
      })
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={o => !o && props.onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate a report</DialogTitle>
          <DialogDescription>
            Create a report for{" "}
            <b className="text-ink-700">{props.design.name || "this design"}</b>
            . Optionally attach a supporting document.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="report-name">Report name</Label>
            <Input
              id="report-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Formulation stability report"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-doc">Supporting document (optional)</Label>
            <input
              id="report-doc"
              type="file"
              accept=".pdf,.doc,.docx,.csv,.png,.jpg,.jpeg,.webp"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="text-ink-600 file:bg-ink-50 file:text-ink-700 hover:file:bg-ink-100 block w-full text-xs file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-medium"
            />
            {file && (
              <p className="text-ink-400 flex items-center gap-1 text-[11px]">
                <IconUpload size={11} /> {file.name}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="bg-brick hover:bg-brick-hover gap-2"
          >
            {busy ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconReport size={15} />
            )}
            Create report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EmptyDesigns(props: { hasAny: boolean; onNew: () => void }) {
  if (props.hasAny) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <p className="text-ink-500 text-sm">No designs match your search.</p>
      </div>
    )
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="bg-teal-journey-tint rounded-full p-4">
        <IconFlask size={28} className="text-teal-journey" />
      </div>
      <p className="text-ink-700 text-sm font-semibold">No designs yet</p>
      <p className="text-ink-400 max-w-sm text-xs">
        Kick off your research by starting a Design. Move through Problem,
        Literature, Hypothesis, and Final Design in a guided flow - reports,
        chats, and files live inside each design.
      </p>
      <Button
        onClick={props.onNew}
        className="bg-brick hover:bg-brick-hover mt-2 gap-2"
      >
        <IconPlus size={16} />
        Start your first Design
      </Button>
    </div>
  )
}
