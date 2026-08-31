"use client"

/**
 * Per-design sub-views - Reports / Chats / Files scoped to ONE design, rendered
 * inside the design page's secondary tab bar. Each is self-contained (fetches
 * its own scoped data) and mirrors the SlabRow list style used elsewhere.
 *
 * Scoping:
 *  - Reports: rows with source_design_id === designId
 *  - Chats:   chats with scope === "design" && scope_id === designId
 *  - Files:   saved papers whose source_design_ids include designId, PLUS the
 *             project's uploaded files (uploads are project-level - no per-design
 *             FK in the data model - so they're shared across the project).
 */

import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SlabRow } from "@/components/ui/slab-row"
import {
  IconDotsVertical,
  IconDownload,
  IconExternalLink,
  IconFile,
  IconFileText,
  IconLoader2,
  IconMessagePlus,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconTable,
  IconTrash
} from "@tabler/icons-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { formatCreatedModifiedStacked } from "@/lib/format-date"
import type { Tables } from "@/supabase/types"

import {
  createReport,
  deleteReport,
  getReportsByProject,
  getReportsByWorkspaceId
} from "@/db/reports-firestore"
import { createChat, deleteChat, getChatsByWorkspaceId } from "@/db/chats"
import { getPaperLibrary, removePaperFromLibrary } from "@/db/paper-library"
import {
  deleteProjectFile,
  getProjectFiles,
  getProjectFileSignedUrl,
  type ProjectFileMeta
} from "@/db/project-files"
import type { PaperLibraryEntry } from "@/lib/paper-library/types"

export interface DesignSubViewContext {
  designId: string
  designName: string
  workspaceId: string
  locale: string
  projectId?: string | null
  userId?: string | null
  /** Workspace defaults + chat settings needed to spin up a design chat. */
  selectedWorkspace?: any
  chatSettings?: any
}

const Toolbar: FC<{
  search: string
  onSearch: (v: string) => void
  placeholder: string
  cta?: React.ReactNode
}> = ({ search, onSearch, placeholder, cta }) => (
  <div className="mb-4 flex items-center gap-3">
    <div className="border-ink-200 flex min-w-[220px] flex-1 items-center gap-2 rounded-md border bg-white px-3 py-1.5">
      <IconSearch size={14} className="text-ink-400 shrink-0" />
      <Input
        placeholder={placeholder}
        value={search}
        onChange={e => onSearch(e.target.value)}
        className="border-none p-0 shadow-none focus-visible:ring-0"
      />
    </div>
    {cta}
  </div>
)

const KebabDelete: FC<{ onOpen?: () => void; onDelete: () => void }> = ({
  onOpen,
  onDelete
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="text-ink-400 hover:text-ink-700 size-7"
        aria-label="Actions"
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
      {onOpen && (
        <DropdownMenuItem onSelect={onOpen} className="cursor-pointer">
          Open
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onSelect={onDelete}
        className="text-destructive focus:text-destructive cursor-pointer"
      >
        <IconTrash size={14} className="mr-2" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

const EmptyHint: FC<{
  icon: React.ReactNode
  title: string
  body: string
  cta?: React.ReactNode
}> = ({ icon, title, body, cta }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
    <div className="bg-ink-100 rounded-full p-4">{icon}</div>
    <p className="text-ink-700 text-sm font-semibold">{title}</p>
    <p className="text-ink-400 max-w-sm text-xs">{body}</p>
    {cta}
  </div>
)

// ── Reports ────────────────────────────────────────────────────────────────
export const DesignReportsView: FC<{ ctx: DesignSubViewContext }> = ({
  ctx
}) => {
  const router = useRouter()
  const [reports, setReports] = useState<Tables<"reports">[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = ctx.projectId
        ? await getReportsByProject(ctx.userId || "", ctx.projectId)
        : await getReportsByWorkspaceId(ctx.workspaceId)
      setReports(
        (rows as Tables<"reports">[]).filter(
          r => (r as any).source_design_id === ctx.designId
        )
      )
    } catch {
      // best-effort
    } finally {
      setLoading(false)
    }
  }, [ctx.projectId, ctx.userId, ctx.workspaceId, ctx.designId])

  useEffect(() => {
    void load()
  }, [load])

  const handleNew = async () => {
    if (!ctx.userId) return
    // Ask the user to name the report (no auto "<design> report" suffix).
    const name = window
      .prompt("Name this report", ctx.designName || "Report")
      ?.trim()
    if (!name) return
    setCreating(true)
    try {
      const created = await createReport(
        {
          user_id: ctx.userId,
          name,
          description: "",
          sharing: "private",
          project_id: ctx.projectId ?? null,
          source_design_id: ctx.designId,
          source_design_name: ctx.designName
        },
        ctx.workspaceId,
        { protocol: [], papers: [], dataFiles: [] },
        []
      )
      router.push(`/${ctx.locale}/${ctx.workspaceId}/reports/${created.id}`)
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't create the report.")
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this report? This cannot be undone.")) return
    const prev = reports
    setReports(r => r.filter(x => x.id !== id))
    try {
      await deleteReport(id)
      toast.success("Report deleted")
    } catch (e: any) {
      setReports(prev)
      toast.error(e?.message ?? "Couldn't delete the report.")
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return reports
    return reports.filter(r => (r.name || "").toLowerCase().includes(q))
  }, [reports, search])

  const cta = (
    <Button
      onClick={handleNew}
      disabled={creating || !ctx.userId}
      className="bg-brick hover:bg-brick-hover shrink-0 gap-2"
    >
      {creating ? (
        <IconLoader2 className="animate-spin" size={16} />
      ) : (
        <IconPlus size={16} />
      )}
      New Report
    </Button>
  )

  if (loading) return <Loading />

  return (
    <div className="mx-auto max-w-[960px]">
      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search reports…"
        cta={cta}
      />
      {filtered.length === 0 ? (
        <EmptyHint
          icon={<IconFileText size={26} className="text-orange-product" />}
          title="No reports for this design yet"
          body="Generate a report from this design - it'll be listed here."
          cta={cta}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map(r => (
            <SlabRow
              key={r.id}
              onClick={() =>
                router.push(`/${ctx.locale}/${ctx.workspaceId}/reports/${r.id}`)
              }
              dateLines={formatCreatedModifiedStacked(
                r.created_at,
                r.updated_at
              )}
              actions={
                <KebabDelete
                  onOpen={() =>
                    router.push(
                      `/${ctx.locale}/${ctx.workspaceId}/reports/${r.id}`
                    )
                  }
                  onDelete={() => handleDelete(r.id)}
                />
              }
            >
              <div className="text-ink-900 truncate text-[15px] font-semibold">
                {r.name || "Untitled Report"}
              </div>
              {r.description && (
                <div className="text-ink-500 mt-1 line-clamp-1 text-[12.5px]">
                  {r.description}
                </div>
              )}
            </SlabRow>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Chats ──────────────────────────────────────────────────────────────────
export const DesignChatsView: FC<{ ctx: DesignSubViewContext }> = ({ ctx }) => {
  const router = useRouter()
  const [chats, setChats] = useState<Tables<"chats">[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await getChatsByWorkspaceId(ctx.workspaceId)
      setChats(
        (rows as Tables<"chats">[]).filter(
          c => c.scope === "design" && c.scope_id === ctx.designId
        )
      )
    } catch {
      // best-effort
    } finally {
      setLoading(false)
    }
  }, [ctx.workspaceId, ctx.designId])

  useEffect(() => {
    void load()
  }, [load])

  const handleNew = async () => {
    const ws = ctx.selectedWorkspace
    if (!ws || !ctx.userId) return
    setCreating(true)
    try {
      const cs = ctx.chatSettings
      const chat = await createChat({
        user_id: ctx.userId,
        workspace_id: ws.id,
        name: `${ctx.designName} chat`,
        scope: "design",
        scope_id: ctx.designId,
        project_id: ctx.projectId ?? null,
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
      router.push(`/${ctx.locale}/${ctx.workspaceId}/chat/${chat.id}`)
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't start a chat.")
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this chat? This cannot be undone.")) return
    const prev = chats
    setChats(c => c.filter(x => x.id !== id))
    try {
      await deleteChat(id)
      toast.success("Chat deleted")
    } catch (e: any) {
      setChats(prev)
      toast.error(e?.message ?? "Couldn't delete the chat.")
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return chats
    return chats.filter(c => (c.name || "").toLowerCase().includes(q))
  }, [chats, search])

  const cta = (
    <Button
      onClick={handleNew}
      disabled={creating || !ctx.selectedWorkspace}
      className="bg-brick hover:bg-brick-hover shrink-0 gap-2"
    >
      {creating ? (
        <IconLoader2 className="animate-spin" size={16} />
      ) : (
        <IconMessagePlus size={16} />
      )}
      New Chat
    </Button>
  )

  if (loading) return <Loading />

  return (
    <div className="mx-auto max-w-[960px]">
      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search chats…"
        cta={cta}
      />
      {filtered.length === 0 ? (
        <EmptyHint
          icon={<IconMessagePlus size={26} className="text-purple-persona" />}
          title="No chats for this design yet"
          body="Start a chat scoped to this design to ask questions about it."
          cta={cta}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map(c => (
            <SlabRow
              key={c.id}
              onClick={() =>
                router.push(`/${ctx.locale}/${ctx.workspaceId}/chat/${c.id}`)
              }
              dateLines={formatCreatedModifiedStacked(
                c.created_at,
                c.updated_at
              )}
              actions={
                <KebabDelete
                  onOpen={() =>
                    router.push(
                      `/${ctx.locale}/${ctx.workspaceId}/chat/${c.id}`
                    )
                  }
                  onDelete={() => handleDelete(c.id)}
                />
              }
            >
              <div className="text-ink-900 truncate text-[15px] font-semibold">
                {c.name || "Untitled Chat"}
              </div>
            </SlabRow>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Files (saved papers for this design + project uploads) ───────────────────
const PAPER_SOURCE_LABEL: Record<string, string> = {
  pubmed: "PubMed",
  arxiv: "arXiv",
  semantic_scholar: "Semantic Scholar",
  scholar: "Google Scholar",
  tavily: "Web",
  openalex: "OpenAlex",
  user: "Uploaded"
}

export const DesignFilesView: FC<{ ctx: DesignSubViewContext }> = ({ ctx }) => {
  const [papers, setPapers] = useState<PaperLibraryEntry[]>([])
  const [files, setFiles] = useState<ProjectFileMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const mounted = useRef(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [allPapers, projFiles] = await Promise.all([
        getPaperLibrary(ctx.workspaceId).catch(() => []),
        ctx.projectId
          ? getProjectFiles(ctx.projectId).catch(() => [])
          : Promise.resolve([] as ProjectFileMeta[])
      ])
      if (!mounted.current) return
      setPapers(
        (allPapers as PaperLibraryEntry[]).filter(p =>
          (p.source_design_ids ?? []).includes(ctx.designId)
        )
      )
      setFiles(projFiles as ProjectFileMeta[])
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [ctx.workspaceId, ctx.projectId, ctx.designId])

  useEffect(() => {
    mounted.current = true
    void load()
    return () => {
      mounted.current = false
    }
  }, [load])

  const removePaper = async (id: string) => {
    const prev = papers
    setPapers(p => p.filter(x => x.id !== id))
    try {
      await removePaperFromLibrary(id)
      toast.success("Removed from library")
    } catch (e: any) {
      setPapers(prev)
      toast.error(e?.message ?? "Couldn't remove the paper.")
    }
  }

  const openFile = async (f: ProjectFileMeta) => {
    try {
      const url = await getProjectFileSignedUrl(f.storage_path)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't open the file.")
    }
  }

  const deleteFile = async (f: ProjectFileMeta) => {
    if (!window.confirm("Delete this file? This cannot be undone.")) return
    const prev = files
    setFiles(x => x.filter(y => y.id !== f.id))
    try {
      await deleteProjectFile(f.id, f.storage_path)
      toast.success("File deleted")
    } catch (e: any) {
      setFiles(prev)
      toast.error(e?.message ?? "Couldn't delete the file.")
    }
  }

  const q = search.trim().toLowerCase()
  const shownPapers = q
    ? papers.filter(p => (p.title || "").toLowerCase().includes(q))
    : papers
  const shownFiles = q
    ? files.filter(f => (f.name || "").toLowerCase().includes(q))
    : files

  const fileIcon = (mime: string, name: string) => {
    if (mime.startsWith("image/")) return <IconPhoto size={16} />
    if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf"))
      return <IconFileText size={16} />
    if (mime.includes("csv") || name.toLowerCase().endsWith(".csv"))
      return <IconTable size={16} />
    return <IconFile size={16} />
  }
  const fmt = (name: string, mime: string) => {
    const ext = name.includes(".") ? name.split(".").pop() : ""
    return (ext || mime.split("/")[1] || "FILE").toUpperCase()
  }
  const timeAgo = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : ""

  if (loading) return <Loading />

  return (
    <div className="mx-auto max-w-[960px] space-y-7">
      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search papers & files…"
      />

      {/* Saved papers (this design) */}
      <section>
        <h3 className="text-ink-700 mb-2 text-sm font-semibold">
          Saved papers{" "}
          <span className="text-ink-400 font-normal">
            ({shownPapers.length})
          </span>
        </h3>
        {shownPapers.length === 0 ? (
          <p className="text-ink-400 py-4 text-xs">
            No papers saved under this design yet - use the save icon on a paper
            in the Literature step.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {shownPapers.map((p, i) => (
              <div
                key={p.id}
                className="border-ink-200 rounded-2xl border bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-brick font-mono text-[11px] font-semibold">
                        #{i + 1}
                      </span>
                      <h4 className="text-ink-900 flex-1 text-sm font-semibold leading-snug">
                        {p.title}
                      </h4>
                    </div>
                    <p className="text-ink-500 mt-1 text-xs">
                      {p.year ? `${p.year} · ` : ""}
                      {p.source
                        ? (PAPER_SOURCE_LABEL[p.source] ?? p.source)
                        : "Saved paper"}
                      {p.created_at
                        ? ` · Saved ${new Date(p.created_at).toLocaleDateString()}`
                        : ""}
                    </p>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brick mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
                      >
                        Open <IconExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => removePaper(p.id)}
                    title="Remove from library"
                    className="text-ink-400 shrink-0 rounded p-1 hover:text-red-500"
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Uploaded files (project-wide) */}
      <section>
        <h3 className="text-ink-700 mb-2 text-sm font-semibold">
          Uploaded files{" "}
          <span className="text-ink-400 font-normal">
            ({shownFiles.length})
          </span>
          <span className="text-ink-400 ml-2 text-[11px] font-normal">
            shared across this project
          </span>
        </h3>
        {shownFiles.length === 0 ? (
          <p className="text-ink-400 py-4 text-xs">
            No files uploaded to this project yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shownFiles.map(f => (
              <div
                key={f.id}
                className="border-ink-200 hover:border-sage-brand/50 flex flex-col gap-2 rounded-2xl border bg-white p-4 shadow-sm transition-all"
              >
                <div className="flex items-start gap-2">
                  <div className="bg-sage-brand-tint text-sage-brand rounded-md p-2">
                    {fileIcon(f.mime_type, f.name)}
                  </div>
                  <button
                    onClick={() => openFile(f)}
                    title={f.name}
                    className="text-ink-900 line-clamp-3 min-w-0 flex-1 break-words text-left text-sm font-semibold leading-snug hover:underline"
                  >
                    {f.name}
                  </button>
                </div>
                <div className="text-ink-400 flex items-center justify-between text-[10px]">
                  <span>{fmt(f.name, f.mime_type)}</span>
                  <span>{timeAgo(f.created_at)}</span>
                </div>
                <div className="mt-auto flex items-center justify-end gap-1 pt-1">
                  <button
                    onClick={() => openFile(f)}
                    title="Open file"
                    className="text-ink-400 hover:text-ink-700 rounded p-1"
                  >
                    <IconDownload size={15} />
                  </button>
                  <button
                    onClick={() => deleteFile(f)}
                    title="Delete file"
                    className="text-ink-400 rounded p-1 hover:text-red-500"
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const Loading: FC = () => (
  <div className="text-ink-400 flex items-center justify-center gap-2 py-16 text-sm">
    <IconLoader2 className="animate-spin" size={18} /> Loading…
  </div>
)
