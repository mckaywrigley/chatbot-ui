"use client"

/**
 * StartChatModal - picker for the new-thread flow.
 *
 * The user chooses what they want to chat with: the whole workspace, one
 * or more projects, designs, reports, or hand-picked files. Selection
 * drives `chats.scope`, `chats.scope_id` (CSV-encoded for multi-pick),
 * and the `chat_files` join. The retrieve route uses these to filter the
 * unified `rag_items` corpus (see lib/rag/retrieve.ts).
 *
 * All non-Workspace tabs are multi-select. Workspace is single-click
 * (it's already the broadest possible scope; multi-select is meaningless).
 */
import {
  IconBriefcase,
  IconCheck,
  IconFile,
  IconFlask,
  IconFolder,
  IconReport,
  IconSearch
} from "@tabler/icons-react"
import { FC, useContext, useEffect, useMemo, useState } from "react"

import { getProjectsByWorkspaceId } from "@/db/projects"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatbotUIContext } from "@/context/context"
import { cn } from "@/lib/utils"

export type ChatScope = "workspace" | "project" | "design" | "report" | "files"

export interface StartChatSelection {
  /** The chat scope to persist on `chats.scope` (NULL for workspace + files). */
  scope: "project" | "design" | "report" | null
  /**
   * Picked source ids. For Projects/Designs/Reports tabs this carries
   * 1+ ids; the caller CSV-encodes them into `chats.scope_id` so the
   * retrieve route can fan out via `p_only_source_ids`.
   */
  scopeIds: string[]
  /** Picked file ids (Files tab). Persisted via `chat_files`. */
  fileIds: string[]
  /** Human-readable label for the new chat name + header pill. */
  label: string
}

interface StartChatModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (sel: StartChatSelection) => void
  busy?: boolean
  /**
   * Optional tab to land on when the modal opens. Used by the
   * workspace `/chat` landing's scope picker to deep-link to the
   * matching tab (#18). Falls back to "workspace".
   */
  initialTab?: ChatScope
}

export const StartChatModal: FC<StartChatModalProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  busy,
  initialTab
}) => {
  const {
    selectedWorkspace,
    designs,
    reports,
    files: workspaceFiles
  } = useContext(ChatbotUIContext)

  const [activeTab, setActiveTab] = useState<ChatScope>(
    initialTab ?? "workspace"
  )

  // Sync activeTab when caller changes the initial tab while modal is
  // closed (e.g. user clicks a different scope card on the workspace
  // /chat landing). Only takes effect when re-opening to avoid yanking
  // the active tab mid-pick.
  useEffect(() => {
    if (!isOpen && initialTab) setActiveTab(initialTab)
  }, [initialTab, isOpen])
  const [search, setSearch] = useState("")
  const [pickedProjectIds, setPickedProjectIds] = useState<string[]>([])
  const [pickedDesignIds, setPickedDesignIds] = useState<string[]>([])
  const [pickedReportIds, setPickedReportIds] = useState<string[]>([])
  const [pickedFileIds, setPickedFileIds] = useState<string[]>([])
  // Projects aren't carried in ChatbotUIContext today - fetch on modal
  // open so the Projects tab populates without a context refactor.
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    if (!isOpen || !selectedWorkspace?.id) return
    let cancelled = false
    void getProjectsByWorkspaceId(selectedWorkspace.id)
      .then((rows: any[]) => {
        if (!cancelled) setProjects(rows ?? [])
      })
      .catch((err: any) =>
        console.warn("[StartChatModal] failed to load projects:", err)
      )
    return () => {
      cancelled = true
    }
  }, [isOpen, selectedWorkspace?.id])

  const reset = () => {
    // Don't reset activeTab - the next-open's `initialTab` prop is the
    // source of truth (see the useEffect that syncs it). Resetting
    // here yanked the modal back to "workspace" before it could read
    // the caller's intent.
    setSearch("")
    setPickedProjectIds([])
    setPickedDesignIds([])
    setPickedReportIds([])
    setPickedFileIds([])
  }

  const handleClose = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const handlePickWorkspace = () => {
    onConfirm({
      scope: null,
      scopeIds: [],
      fileIds: [],
      label: `Workspace · ${selectedWorkspace?.name ?? "Workspace"}`
    })
  }

  /**
   * Pick handler shared by Projects / Designs / Reports tabs. Builds a
   * label that names the single picked item or shows the count for
   * multi-pick.
   */
  const handlePickMulti = (
    scope: "project" | "design" | "report",
    ids: string[],
    titleResolver: (id: string) => string,
    labelSingular: string,
    labelPlural: string
  ) => {
    if (ids.length === 0) return
    const label =
      ids.length === 1
        ? `${labelSingular} · ${titleResolver(ids[0])}`
        : `${labelPlural} · ${ids.length} selected`
    onConfirm({
      scope,
      scopeIds: ids,
      fileIds: [],
      label
    })
  }

  const handleConfirmFiles = () => {
    if (pickedFileIds.length === 0) return
    onConfirm({
      scope: null,
      scopeIds: [],
      fileIds: pickedFileIds,
      label: `Files · ${pickedFileIds.length} selected`
    })
  }

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p: any) =>
      `${p.name} ${p.description ?? ""}`.toLowerCase().includes(q)
    )
  }, [projects, search])

  const filteredDesigns = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return designs
    return designs.filter(d =>
      `${d.name} ${d.description ?? ""}`.toLowerCase().includes(q)
    )
  }, [designs, search])

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return reports
    return reports.filter(r =>
      `${r.name ?? ""} ${(r as any).description ?? ""}`
        .toLowerCase()
        .includes(q)
    )
  }, [reports, search])

  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workspaceFiles
    return workspaceFiles.filter(f =>
      `${f.name ?? ""} ${(f as any).description ?? ""}`
        .toLowerCase()
        .includes(q)
    )
  }, [workspaceFiles, search])

  // Title resolvers used by the multi-pick label builder.
  const projectTitle = (id: string) =>
    projects.find((p: any) => p.id === id)?.name ?? "project"
  const designTitle = (id: string) =>
    designs.find(d => d.id === id)?.name ?? "design"
  const reportTitle = (id: string) =>
    reports.find(r => r.id === id)?.name ?? "report"

  const togglePicked =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    (id: string) => {
      setter(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      )
    }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {/* `w-[640px] max-w-[calc(100vw-32px)]` is the load-bearing fix:
          DialogContent's base `grid` lets grid children claim
          `min-width: auto` (their intrinsic content width), so a
          single long design title was blowing the modal past
          `max-w-2xl`. Pinning a fixed width with a viewport cap +
          `min-w-0 overflow-hidden` on the grid stops every child from
          dictating size and forces the inner truncate chain to clip. */}
      <DialogContent className="w-[640px] min-w-0 max-w-[calc(100vw-32px)] overflow-hidden sm:max-w-screen-sm">
        <DialogHeader>
          <DialogTitle>Start a new chat</DialogTitle>
          <DialogDescription>
            Pick what you want to chat with. The chat will pull answers from
            this context only and cite back to the source.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={v => {
            setActiveTab(v as ChatScope)
            setSearch("")
          }}
          className="w-full min-w-0 max-w-full overflow-hidden"
        >
          {/* `justify-center` on every trigger keeps the icon+label
              cluster centred inside each grid cell - without it the
              Designs trigger looked nudged off-axis vs Workspace /
              Projects because IconFlask is taller than the other
              tabler glyphs (#28). The shrink-0 on the icon keeps it
              from collapsing when the cell is tight. */}
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="workspace" className="justify-center gap-1.5">
              <IconBriefcase size={14} className="shrink-0" /> Workspace
            </TabsTrigger>
            <TabsTrigger value="project" className="justify-center gap-1.5">
              <IconFolder size={14} className="shrink-0" /> Projects
            </TabsTrigger>
            <TabsTrigger value="design" className="justify-center gap-1.5">
              <IconFlask size={14} className="shrink-0" /> Designs
            </TabsTrigger>
            <TabsTrigger value="report" className="justify-center gap-1.5">
              <IconReport size={14} className="shrink-0" /> Reports
            </TabsTrigger>
            <TabsTrigger value="files" className="justify-center gap-1.5">
              <IconFile size={14} className="shrink-0" /> Files
            </TabsTrigger>
          </TabsList>

          {/* Search bar - hidden for the workspace tab (single choice). */}
          {activeTab !== "workspace" && (
            <div className="border-line bg-paper mt-3 flex items-center gap-2 rounded-md border px-3">
              <IconSearch size={14} className="text-ink-400 shrink-0" />
              <Input
                placeholder={`Search ${activeTab}…`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border-none px-0 shadow-none focus-visible:ring-0"
              />
            </div>
          )}

          {/* WORKSPACE */}
          <TabsContent
            value="workspace"
            className="mt-4 min-w-0 max-w-full overflow-hidden"
          >
            <div className="border-line bg-paper-2 flex items-start gap-3 rounded-lg border p-4">
              <IconBriefcase size={18} className="text-ink-700 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-ink truncate text-sm font-semibold">
                  {selectedWorkspace?.name ?? "Workspace"}
                </div>
                <div className="text-ink-3 mt-0.5 text-[12.5px] leading-relaxed">
                  Chat across every design, report, paper, file, and
                  conversation in this workspace. Answers cite the source on
                  click.
                </div>
              </div>
            </div>
          </TabsContent>

          {/* PROJECT (multi-select) */}
          <TabsContent
            value="project"
            className="mt-3 min-w-0 max-w-full overflow-hidden"
          >
            <MultiPickList
              items={filteredProjects.map((p: any) => ({
                id: p.id,
                title: p.name,
                subtitle: p.description ?? undefined
              }))}
              picked={pickedProjectIds}
              onToggle={togglePicked(setPickedProjectIds)}
              emptyHint="No projects in this workspace yet."
            />
          </TabsContent>

          {/* DESIGN (multi-select) */}
          <TabsContent
            value="design"
            className="mt-3 min-w-0 max-w-full overflow-hidden"
          >
            <MultiPickList
              items={filteredDesigns.map(d => ({
                id: d.id,
                title: d.name,
                subtitle: d.description ?? undefined
              }))}
              picked={pickedDesignIds}
              onToggle={togglePicked(setPickedDesignIds)}
              emptyHint="No designs in this workspace yet."
            />
          </TabsContent>

          {/* REPORT (multi-select) */}
          <TabsContent
            value="report"
            className="mt-3 min-w-0 max-w-full overflow-hidden"
          >
            <MultiPickList
              items={filteredReports.map(r => ({
                id: r.id,
                title: r.name ?? "Untitled report",
                subtitle: (r as any).description ?? undefined
              }))}
              picked={pickedReportIds}
              onToggle={togglePicked(setPickedReportIds)}
              emptyHint="No reports in this workspace yet."
            />
          </TabsContent>

          {/* FILES (multi-select) */}
          <TabsContent
            value="files"
            className="mt-3 min-w-0 max-w-full overflow-hidden"
          >
            <MultiPickList
              items={filteredFiles.map(f => ({
                id: f.id,
                title: f.name,
                subtitle: f.type ?? undefined
              }))}
              picked={pickedFileIds}
              onToggle={togglePicked(setPickedFileIds)}
              emptyHint="No files in this workspace yet. Upload from a project's Files tab."
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={busy}
          >
            Cancel
          </Button>

          {activeTab === "workspace" && (
            <Button onClick={handlePickWorkspace} disabled={busy}>
              {busy ? "Starting…" : "Chat with workspace"}
            </Button>
          )}

          {activeTab === "project" && (
            <Button
              onClick={() =>
                handlePickMulti(
                  "project",
                  pickedProjectIds,
                  projectTitle,
                  "Project",
                  "Projects"
                )
              }
              disabled={busy || pickedProjectIds.length === 0}
            >
              {busy
                ? "Starting…"
                : `Chat with ${pickedProjectIds.length} project${
                    pickedProjectIds.length === 1 ? "" : "s"
                  }`}
            </Button>
          )}

          {activeTab === "design" && (
            <Button
              onClick={() =>
                handlePickMulti(
                  "design",
                  pickedDesignIds,
                  designTitle,
                  "Design",
                  "Designs"
                )
              }
              disabled={busy || pickedDesignIds.length === 0}
            >
              {busy
                ? "Starting…"
                : `Chat with ${pickedDesignIds.length} design${
                    pickedDesignIds.length === 1 ? "" : "s"
                  }`}
            </Button>
          )}

          {activeTab === "report" && (
            <Button
              onClick={() =>
                handlePickMulti(
                  "report",
                  pickedReportIds,
                  reportTitle,
                  "Report",
                  "Reports"
                )
              }
              disabled={busy || pickedReportIds.length === 0}
            >
              {busy
                ? "Starting…"
                : `Chat with ${pickedReportIds.length} report${
                    pickedReportIds.length === 1 ? "" : "s"
                  }`}
            </Button>
          )}

          {activeTab === "files" && (
            <Button
              onClick={handleConfirmFiles}
              disabled={busy || pickedFileIds.length === 0}
            >
              {busy
                ? "Starting…"
                : `Chat with ${pickedFileIds.length} file${
                    pickedFileIds.length === 1 ? "" : "s"
                  }`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Multi-select list (used by all non-Workspace tabs) ───────────────────

interface PickListItem {
  id: string
  title: string
  subtitle?: string
}

const MultiPickList: FC<{
  items: PickListItem[]
  picked: string[]
  onToggle: (id: string) => void
  emptyHint: string
}> = ({ items, picked, onToggle, emptyHint }) => {
  if (items.length === 0) {
    return (
      <div className="border-line bg-paper-2 text-ink-3 rounded-md border border-dashed p-6 text-center text-[12.5px]">
        {emptyHint}
      </div>
    )
  }
  const isAllPicked = items.every(it => picked.includes(it.id))
  return (
    // `w-full` + `min-w-0` here are load-bearing: without an explicit
    // width on the scroll container, the parent (TabsContent) sizes to
    // its widest child - and the widest child is the button row, which
    // takes its width from the title text (long unbroken design names
    // pushed the dialog off-screen). Setting w-full forces the scroll
    // container to track the dialog width, which lets the row's
    // `truncate` chain finally clip the title.
    <div className="max-h-[320px] w-full min-w-0 space-y-1.5 overflow-y-auto overflow-x-hidden pr-1">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-ink-3 text-[11.5px]">
          {picked.length} selected
        </span>
        <button
          type="button"
          onClick={() =>
            isAllPicked
              ? items.forEach(it => picked.includes(it.id) && onToggle(it.id))
              : items.forEach(it => !picked.includes(it.id) && onToggle(it.id))
          }
          className="text-ink-3 hover:text-ink text-[11.5px] underline-offset-2 hover:underline"
        >
          {isAllPicked ? "Clear all" : "Select all"}
        </button>
      </div>
      {items.map(it => {
        const isPicked = picked.includes(it.id)
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onToggle(it.id)}
            className={cn(
              // `min-w-0 max-w-full` on the row + flex-children + the inner
              // `min-w-0 flex-1 truncate` chain is what actually clips long
              // unbroken titles. Without `min-w-0` on the button itself,
              // flex items default to `min-width: auto` and refuse to
              // shrink below their content's intrinsic width - which is
              // why long report names were blowing past the dialog edge.
              "border-line bg-surface hover:border-line-strong hover:bg-paper-2 flex w-full min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-md border px-3 py-2.5 text-left transition-colors",
              isPicked && "border-rust bg-rust-soft"
            )}
          >
            <Checkbox
              checked={isPicked}
              className="pointer-events-none shrink-0"
            />
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="text-ink block truncate text-[13px] font-semibold">
                {it.title}
              </div>
              {it.subtitle && (
                // `truncate` (not `line-clamp-1 break-all`) - the latter
                // only hides extra LINES, which requires the text to
                // actually wrap. Long single-line descriptions with no
                // upstream max-width constraint never wrap, so the row
                // grows wider than the dialog and clips visibly past
                // the modal edge. `truncate` sets white-space:nowrap
                // unconditionally + ellipsis-clips, which works
                // regardless of parent width.
                <div className="text-ink-3 mt-0.5 block truncate text-[11.5px]">
                  {it.subtitle}
                </div>
              )}
            </div>
            {isPicked && <IconCheck size={14} className="text-rust shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}
