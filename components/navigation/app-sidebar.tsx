"use client"

import {
  IconBuilding,
  IconChevronDown,
  IconChevronsLeft,
  IconDotsVertical,
  IconFolder,
  IconHome,
  IconLayoutGrid,
  IconPlus,
  IconSearch,
  IconSettings
} from "@tabler/icons-react"
import { usePathname, useRouter } from "next/navigation"
import { useContext, useEffect, useState } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Brand } from "@/components/ui/brand"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { ProfileSettings } from "@/components/utility/profile-settings"
import { ChatbotUIContext } from "@/context/context"
import { getProjectsByWorkspaceId } from "@/db/projects"
import { createWorkspace } from "@/db/workspaces"
import { supabase } from "@/lib/supabase/browser-client"
import { cn } from "@/lib/utils"

interface AppSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

interface NavItemProps {
  icon?: React.ReactNode
  label: string
  active?: boolean
  badge?: React.ReactNode
  onClick?: () => void
  collapsed?: boolean
  indent?: number
  /** Optional data-tour selector handle so the product tour can highlight it. */
  dataTour?: string
}

function NavItem({
  icon,
  label,
  active,
  badge,
  onClick,
  collapsed,
  indent = 0,
  dataTour
}: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      data-tour={dataTour}
      className={cn(
        "relative mx-2 my-px flex w-[calc(100%-1rem)] items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[14px] transition-colors",
        active
          ? "bg-paper-3 text-ink font-medium"
          : "text-ink-2 hover:bg-paper-3"
      )}
      style={indent ? { paddingLeft: 10 + indent } : undefined}
    >
      {active && (
        <span className="bg-rust absolute inset-y-2 left-[-8px] w-0.5 rounded" />
      )}
      {icon && (
        <span className={active ? "text-ink" : "text-ink-3"}>{icon}</span>
      )}
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && badge && (
        <span className="bg-paper-3 text-ink-3 rounded-md px-1.5 py-px font-mono text-[11px]">
          {badge}
        </span>
      )}
    </button>
  )
}

interface NavSectionProps {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
  collapsed?: boolean
}

function NavSection({ label, action, children, collapsed }: NavSectionProps) {
  return (
    <div className="mt-5">
      {!collapsed && (
        <div className="flex items-center justify-between px-5 pb-2">
          <span className="text-ink-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em]">
            {label}
          </span>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------
   Workspace picker - Popover with workspace list + "New workspace".
   ------------------------------------------------------------------ */
interface WorkspacePickerProps {
  collapsed?: boolean
}

function WorkspacePicker({ collapsed }: WorkspacePickerProps) {
  const router = useRouter()
  const { workspaces, selectedWorkspace, setSelectedWorkspace, setWorkspaces } =
    useContext(ChatbotUIContext)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const handleSelect = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId)
    if (!workspace) return
    setSelectedWorkspace(workspace)
    setOpen(false)
    router.push(`/${workspace.id}`)
  }

  const handleCreate = async () => {
    if (!selectedWorkspace) return
    try {
      const created = await createWorkspace({
        user_id: selectedWorkspace.user_id,
        default_context_length: selectedWorkspace.default_context_length,
        default_model: selectedWorkspace.default_model,
        default_prompt: selectedWorkspace.default_prompt,
        default_temperature: selectedWorkspace.default_temperature,
        description: "",
        embeddings_provider: "openai",
        include_profile_context: selectedWorkspace.include_profile_context,
        include_workspace_instructions:
          selectedWorkspace.include_workspace_instructions,
        instructions: selectedWorkspace.instructions,
        is_home: false,
        name: "New Workspace"
      })
      setWorkspaces([...workspaces, created])
      setSelectedWorkspace(created)
      setOpen(false)
      router.push(`/${created.id}`)
    } catch (err) {
      console.error("Failed to create workspace:", err)
    }
  }

  const initials = (selectedWorkspace?.name || "WS").slice(0, 2).toUpperCase()

  const filtered = workspaces
    .filter(w => !w.is_home)
    .filter(w => w.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
  const homeWorkspaces = workspaces.filter(w => w.is_home)

  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="mx-auto mb-2 flex size-10 items-center justify-center rounded-md text-[12px] font-semibold text-white transition-opacity hover:opacity-80"
            style={{
              background:
                "linear-gradient(135deg, var(--p-problem) 0%, #1A4A4A 100%)"
            }}
            title={selectedWorkspace?.name}
          >
            {initials}
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-64 p-2">
          <WorkspaceList
            homeWorkspaces={homeWorkspaces}
            filtered={filtered}
            onSelect={handleSelect}
            onCreate={handleCreate}
            query={query}
            setQuery={setQuery}
            selectedId={selectedWorkspace?.id}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div className="px-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="border-line bg-surface text-ink hover:border-line-strong hover:bg-paper flex h-11 w-full items-center gap-2.5 rounded-md border px-2.5 text-left transition-colors"
          >
            <div
              className="flex size-[24px] items-center justify-center rounded-[6px] text-[11px] font-semibold text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--p-problem) 0%, #1A4A4A 100%)"
              }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium">
                {selectedWorkspace?.name || "Workspace"}
              </div>
            </div>
            <IconChevronDown size={14} stroke={1.8} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-[228px] p-2">
          <WorkspaceList
            homeWorkspaces={homeWorkspaces}
            filtered={filtered}
            onSelect={handleSelect}
            onCreate={handleCreate}
            query={query}
            setQuery={setQuery}
            selectedId={selectedWorkspace?.id}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function WorkspaceList({
  homeWorkspaces,
  filtered,
  onSelect,
  onCreate,
  query,
  setQuery,
  selectedId
}: {
  homeWorkspaces: any[]
  filtered: any[]
  onSelect: (id: string) => void
  onCreate: () => void
  query: string
  setQuery: (q: string) => void
  selectedId?: string
}) {
  return (
    <div className="space-y-2">
      <Button
        variant="primary"
        size="sm"
        onClick={onCreate}
        className="w-full justify-center"
      >
        <IconPlus size={13} /> New workspace
      </Button>
      <Input
        placeholder="Search workspaces…"
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="flex max-h-64 flex-col gap-0.5 overflow-auto">
        {homeWorkspaces.map(w => (
          <WorkspaceRow
            key={w.id}
            isHome
            name={w.name}
            active={w.id === selectedId}
            onClick={() => onSelect(w.id)}
          />
        ))}
        {filtered.length === 0 && homeWorkspaces.length === 0 && (
          <div className="text-ink-3 px-2 py-3 text-center text-[12.5px]">
            No workspaces
          </div>
        )}
        {filtered.map(w => (
          <WorkspaceRow
            key={w.id}
            name={w.name}
            active={w.id === selectedId}
            onClick={() => onSelect(w.id)}
          />
        ))}
      </div>
    </div>
  )
}

function WorkspaceRow({
  name,
  isHome,
  active,
  onClick
}: {
  name: string
  isHome?: boolean
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-md p-2 text-left text-[13.5px] transition-colors",
        active
          ? "bg-paper-2 text-ink font-medium"
          : "text-ink-2 hover:bg-paper-2"
      )}
    >
      {isHome ? (
        <IconHome size={16} className="text-ink-3 shrink-0" />
      ) : (
        <IconBuilding size={16} className="text-ink-3 shrink-0" />
      )}
      <span className="truncate">{name}</span>
    </button>
  )
}

export const AppSidebar = ({ isCollapsed, onToggle }: AppSidebarProps) => {
  const { selectedWorkspace, profile } = useContext(ChatbotUIContext)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const pathname = usePathname()
  const router = useRouter()
  // Shared open state for ProfileSettings - wired to both the footer
  // Settings button (#8) and the user-card 3-dot menu (#9), which were
  // both inert before.
  const [profileOpen, setProfileOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      router.push("/login")
      router.refresh()
    }
  }

  useEffect(() => {
    if (!selectedWorkspace?.id) return
    let cancelled = false
    getProjectsByWorkspaceId(selectedWorkspace.id)
      .then(p => {
        if (!cancelled) setProjects(p)
      })
      .catch(err => {
        console.error("Error fetching projects:", err)
      })
    return () => {
      cancelled = true
    }
  }, [selectedWorkspace?.id])

  const wsId = selectedWorkspace?.id
  const currentProjectId = pathname.split("/projects/")[1]?.split("/")[0]

  const isActive = (slug: string) => {
    if (!wsId) return false
    return pathname.includes(`/${wsId}${slug}`)
  }

  const openGlobalSearch = () => {
    window.dispatchEvent(new CustomEvent("open-global-search"))
  }

  const openNewProject = () => {
    if (!wsId) return
    router.push(`/${wsId}/projects?create=1`)
  }

  const initials = (() => {
    const n = profile?.display_name || profile?.username || ""
    const parts = n.trim().split(/\s+/)
    if (!parts[0]) return "U"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  })()

  return (
    <ErrorBoundary>
      <aside
        className={cn(
          "border-line bg-paper-2 flex h-full flex-col border-r transition-all duration-300",
          isCollapsed ? "w-16" : "w-[260px]"
        )}
      >
        {/* Brand row */}
        <div className="flex items-center justify-between px-4 pb-3.5 pt-4">
          {isCollapsed ? <Brand collapsed size={22} /> : <Brand size={22} />}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-ink-3 size-7"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <IconChevronsLeft
              size={15}
              className={cn(
                "transition-transform",
                isCollapsed && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Workspace picker */}
        <WorkspacePicker collapsed={isCollapsed} />

        {/* Search */}
        {!isCollapsed && (
          <div className="px-3 pb-1 pt-3.5">
            <button
              type="button"
              onClick={openGlobalSearch}
              className="border-line bg-surface text-ink-3 hover:border-line-strong hover:bg-paper flex h-9 w-full items-center gap-2 rounded-md border px-2.5 text-[13.5px] transition-colors"
            >
              <IconSearch size={14} />
              <span className="flex-1 text-left">Search</span>
              <Kbd>⌘⇧K</Kbd>
            </button>
          </div>
        )}

        {/* Nav sections */}
        <div className="flex-1 overflow-y-auto pb-3">
          {/* Streamlined nav: Dashboard, Projects, Recents. Designs / Reports
              / Chats / Library are no longer top-level - each project owns its
              own Designs / Reports / Chats / Files tabs, so the sidebar no
              longer offers redundant routes to the same content. */}
          <div className="mt-3">
            <NavItem
              icon={<IconLayoutGrid size={16} />}
              label="Dashboard"
              active={
                wsId
                  ? pathname === `/${wsId}` || pathname.endsWith(`/${wsId}`)
                  : false
              }
              onClick={() => wsId && router.push(`/${wsId}`)}
              collapsed={isCollapsed}
            />
          </div>

          <NavSection
            label="Projects"
            collapsed={isCollapsed}
            action={
              !isCollapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-ink-3 hover:text-ink size-5"
                  onClick={openNewProject}
                  title="New project"
                >
                  <IconPlus size={13} />
                </Button>
              )
            }
          >
            <NavItem
              icon={<IconFolder size={16} />}
              label="All Projects"
              active={isActive("/projects") && !currentProjectId}
              onClick={() => wsId && router.push(`/${wsId}/projects`)}
              collapsed={isCollapsed}
            />
            {!isCollapsed &&
              projects
                .slice(0, 5)
                .map(p => (
                  <NavItem
                    key={p.id}
                    icon={<IconFolder size={16} />}
                    label={p.name}
                    active={currentProjectId === p.id}
                    onClick={() =>
                      wsId && router.push(`/${wsId}/projects/${p.id}`)
                    }
                  />
                ))}
            {!isCollapsed && projects.length > 5 && (
              <button
                type="button"
                onClick={() => wsId && router.push(`/${wsId}/projects`)}
                className="text-ink-3 hover:text-ink-2 mx-2 my-px flex w-[calc(100%-1rem)] items-center px-[30px] py-1 text-[12.5px]"
              >
                +{projects.length - 5} more
              </button>
            )}
          </NavSection>
        </div>

        {/* Footer */}
        <div className="border-line flex flex-col gap-1.5 border-t p-3">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className={cn(
              "text-ink-2 hover:bg-paper-3 flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13.5px]",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? "Settings" : undefined}
          >
            <IconSettings size={16} />
            {!isCollapsed && <span>Settings</span>}
          </button>

          {!isCollapsed && (
            <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
              <div className="bg-rust text-paper flex size-8 items-center justify-center rounded-full text-[12px] font-semibold">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-ink truncate text-[13px] font-medium">
                  {profile?.display_name || profile?.username || "User"}
                </div>
                <div className="text-ink-3 truncate text-[11.5px]">
                  {selectedWorkspace?.name}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-ink-3 size-6"
                    title="More"
                    aria-label="User menu"
                  >
                    <IconDotsVertical size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onSelect={() => setProfileOpen(true)}
                    className="cursor-pointer"
                  >
                    <IconSettings size={14} className="mr-2" />
                    Profile &amp; settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => wsId && router.push(`/${wsId}`)}
                    className="cursor-pointer"
                  >
                    <IconHome size={14} className="mr-2" />
                    Workspace home
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleSignOut}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Profile / settings sheet - controlled by sidebar buttons. */}
        <ProfileSettings open={profileOpen} onOpenChange={setProfileOpen} />
      </aside>
    </ErrorBoundary>
  )
}
