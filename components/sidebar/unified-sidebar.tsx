"use client"

import { useCallback, useEffect, useState, startTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WithTooltip } from "@/components/ui/with-tooltip"
import { useChatbotUI } from "@/context/context"
import { ProfileSettings } from "@/components/utility/profile-settings"
import { SidebarContent } from "./sidebar-content"
import { RooftopsSVG } from "@/components/icons/rooftops-svg"
import {
  IconMessageCircle,
  IconSparkles,
  IconPalette,
  IconFolders,
  IconStack2,
  IconRobotFace,
  IconPlugConnected,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMenu2,
  IconCrown,
  IconLoader2,
  IconHome,
  IconWand,
  IconChevronDown,
  IconDots,
  IconGrid3x3,
  IconUsers,
  IconUserBolt,
  IconShieldCog
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { ContentType } from "@/types"
import { UsageStats } from "@/components/sidebar/usage-stats"

const SIDEBAR_ICON_SIZE = 20
const BADGE_ICON_SIZE = 18
const NAV_ITEM_HEIGHT = 40

interface NavItem {
  id: string
  label: string
  shortLabel?: string // Short label for collapsed sidebar
  icon: React.ComponentType<{
    size?: number
    className?: string
    stroke?: number
  }>
  route?: (workspaceId: string) => string
  tab?: string
  badge?: "premium" | "pro"
}

interface UnifiedSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

// Feature flags for launch - hide features still in development
const SHOW_AGENT_FEATURES = false // AI Agent - coming soon
const SHOW_CRM_FEATURES = false // CRM - coming soon
const SHOW_AGENT_LIBRARY = false // Agent Library - coming soon
const SHOW_CONNECTORS = false // Connectors - coming soon

const primaryNavigationItems: NavItem[] = [
  {
    id: "chat",
    label: "Chat",
    icon: IconMessageCircle,
    route: (workspaceId: string) => `/${workspaceId}/chat`
  },
  // Hidden for launch - AI Agent
  ...(SHOW_AGENT_FEATURES
    ? [
        {
          id: "agent",
          label: "AI Agent",
          icon: IconSparkles,
          route: (workspaceId: string) => `/${workspaceId}/agent`,
          badge: "premium" as const
        }
      ]
    : []),
  // Hidden for launch - CRM
  ...(SHOW_CRM_FEATURES
    ? [
        {
          id: "crm",
          label: "AI Employee CRM",
          icon: IconUsers,
          route: (workspaceId: string) => `/${workspaceId}/crm`,
          badge: "pro" as const
        }
      ]
    : []),
  {
    id: "explore",
    label: "AI Property Reports",
    shortLabel: "Reports",
    icon: IconHome,
    route: (workspaceId: string) => `/${workspaceId}/explore`,
    badge: "premium"
  },
  // AI Employees - Coming Soon waitlist page
  {
    id: "ai-employees",
    label: "AI Employees",
    shortLabel: "AI Crew",
    icon: IconUserBolt,
    route: (workspaceId: string) => `/${workspaceId}/ai-employees`,
    badge: "pro"
  },
  // Hidden for launch - Agent Library
  ...(SHOW_AGENT_LIBRARY
    ? [
        {
          id: "creator",
          label: "Agent Library",
          icon: IconWand,
          route: (workspaceId: string) => `/${workspaceId}/creator`,
          badge: "premium" as const
        }
      ]
    : [])
]

const secondaryNavigationItems: NavItem[] = [
  {
    id: "files",
    label: "Files",
    icon: IconFolders,
    tab: "files"
  },
  {
    id: "collections",
    label: "Collections",
    icon: IconStack2,
    tab: "collections"
  },
  {
    id: "assistants",
    label: "Assistants",
    icon: IconRobotFace,
    tab: "assistants"
  },
  // Hidden for launch - Connectors
  ...(SHOW_CONNECTORS
    ? [
        {
          id: "connectors",
          label: "Connectors",
          icon: IconPlugConnected,
          tab: "tools"
        }
      ]
    : [])
]

export function UnifiedSidebar({ isCollapsed, onToggle }: UnifiedSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const {
    selectedWorkspace,
    userSubscription,
    profile,
    folders,
    chats,
    presets,
    prompts,
    files,
    collections,
    assistants,
    tools,
    models
  } = useChatbotUI()
  const [isNavigating, setIsNavigating] = useState<string | null>(null)
  const [showHamburger, setShowHamburger] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMore, setShowMore] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Premium/Business subscription detection
  const isPremiumOrBusiness =
    (userSubscription?.plan_type === "premium" ||
      userSubscription?.plan_type === "business" ||
      userSubscription?.plan_type === "premium_monthly" ||
      userSubscription?.plan_type === "premium_annual" ||
      userSubscription?.plan_type === "business_monthly" ||
      userSubscription?.plan_type === "business_annual") &&
    (userSubscription?.status === "active" ||
      userSubscription?.status === "trialing")
  const hasActiveSubscription =
    userSubscription?.status === "active" ||
    userSubscription?.status === "trialing"

  const workspaceId = selectedWorkspace?.id || ""

  // Check if nav item is active
  const isNavItemActive = useCallback(
    (item: NavItem): boolean => {
      // Route-based navigation
      if (item.route) {
        const targetRoute = item.route(workspaceId)
        // Exact match
        if (targetRoute === pathname) return true
        // Base route match (e.g., /chat matches /chat/123)
        if (pathname.startsWith(targetRoute + "/")) return true
        // For explore route, also check if we're on explore without a tab param
        if (
          targetRoute.includes("/explore") &&
          pathname.includes("/explore") &&
          !searchParams.get("tab")
        ) {
          return true
        }
        return false
      }

      // Tab-based navigation
      if (item.tab) {
        return searchParams.get("tab") === item.tab
      }

      return false
    },
    [pathname, searchParams, workspaceId]
  )

  // Get current content type based on route and tab
  const getCurrentContentType = (): ContentType => {
    const tab = searchParams.get("tab")
    if (tab === "files") return "files"
    if (tab === "collections") return "collections"
    if (tab === "assistants") return "assistants"
    if (tab === "tools") return "tools"
    return "chats" // Default to chats
  }

  // Prefetch routes on component mount for instant navigation
  useEffect(() => {
    if (workspaceId) {
      primaryNavigationItems.forEach(item => {
        if (item.route) {
          router.prefetch(item.route(workspaceId))
        }
      })
    }
  }, [workspaceId, router])

  // Handle navigation click
  const handleNavClick = useCallback(
    (item: NavItem) => {
      // Set loading state immediately for instant visual feedback
      setIsNavigating(item.id)

      // If sidebar is collapsed and this is a tab-based item, expand sidebar first
      if (isCollapsed && item.tab) {
        onToggle()
      }

      // Use startTransition to keep UI responsive during navigation
      startTransition(() => {
        if (item.route) {
          router.push(item.route(workspaceId))
        } else if (item.tab) {
          const newUrl = `${pathname}?tab=${item.tab}`
          router.push(newUrl)
        }
      })

      // Close mobile sidebar if open
      if (isMobile && !isCollapsed) {
        onToggle()
      }
    },
    [router, pathname, workspaceId, isMobile, isCollapsed, onToggle]
  )

  // Prefetch on hover for even faster perceived performance
  const handleNavHover = useCallback(
    (item: NavItem) => {
      if (item.route) {
        router.prefetch(item.route(workspaceId))
      }
    },
    [router, workspaceId]
  )

  // Reset navigation state when pathname changes
  useEffect(() => {
    setIsNavigating(null)
  }, [pathname, searchParams])

  // Render nav item
  const renderNavItem = (item: NavItem) => {
    const isActive = isNavItemActive(item)
    const isLoading = isNavigating === item.id
    const Icon = item.icon
    const collapsedLabel = item.shortLabel || item.label

    // Collapsed view: icon on top, label below
    if (isCollapsed) {
      return (
        <div key={item.id} className="flex w-full justify-center">
          <button
            onClick={() => handleNavClick(item)}
            onMouseEnter={() => handleNavHover(item)}
            disabled={isLoading}
            className={cn(
              "relative flex w-full flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition-all duration-150",
              isActive
                ? "bg-gray-100 font-medium text-gray-900"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
              isLoading && "opacity-70"
            )}
          >
            {isLoading ? (
              <IconLoader2
                size={SIDEBAR_ICON_SIZE}
                className="shrink-0 animate-spin"
              />
            ) : (
              <Icon size={SIDEBAR_ICON_SIZE} stroke={2} className="shrink-0" />
            )}
            <span className="w-full truncate text-center text-[10px] leading-tight">
              {collapsedLabel}
            </span>
          </button>
        </div>
      )
    }

    // Expanded view: icon + label side by side
    return (
      <div key={item.id} className="w-full">
        <button
          onClick={() => handleNavClick(item)}
          onMouseEnter={() => handleNavHover(item)}
          disabled={isLoading}
          className={cn(
            "relative flex h-10 w-full items-center justify-start gap-3 rounded-lg px-3 transition-all duration-150",
            isActive
              ? "bg-gray-100 font-medium text-gray-900"
              : "text-gray-700 hover:bg-gray-50",
            isLoading && "opacity-70"
          )}
        >
          {isLoading ? (
            <IconLoader2
              size={SIDEBAR_ICON_SIZE}
              className="shrink-0 animate-spin"
            />
          ) : (
            <Icon size={SIDEBAR_ICON_SIZE} stroke={2} className="shrink-0" />
          )}
          <span className="flex-1 text-left text-sm font-medium transition-opacity duration-200">
            {item.label}
          </span>
          {item.badge && (
            <IconCrown
              size={BADGE_ICON_SIZE}
              className="ml-auto shrink-0 opacity-60"
              fill="currentColor"
              stroke={0}
            />
          )}
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && !isCollapsed && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={onToggle} />
      )}

      {/* Mobile hamburger button */}
      {isMobile && isCollapsed && (
        <button
          onClick={onToggle}
          className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2 shadow-lg"
        >
          <IconMenu2 size={24} className="text-gray-700" />
        </button>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[72px]" : "w-[280px]",
          isMobile && !isCollapsed && "fixed left-0 top-0 z-50",
          isMobile && isCollapsed && "hidden"
        )}
        onMouseEnter={() => {
          if (isCollapsed && !isMobile) {
            setShowHamburger(true)
          }
        }}
        onMouseLeave={() => {
          if (isCollapsed && !isMobile) {
            setShowHamburger(false)
          }
        }}
      >
        {/* Header */}
        <div className="shrink-0">
          <div
            className={cn(
              "flex items-center",
              isCollapsed ? "justify-center p-3" : "justify-between p-3"
            )}
          >
            {/* Logo */}
            {isCollapsed ? (
              <div
                className="relative flex cursor-pointer items-center justify-center"
                onClick={onToggle}
              >
                <RooftopsSVG width="36" height="36" />
                {showHamburger && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/95 transition-opacity duration-150">
                    <IconMenu2 size={20} className="text-gray-700" />
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <img
                    src="https://uploads-ssl.webflow.com/64e9150f53771ac56ef528b7/64ee16bb300d3e08d25a03ac_rooftops-logo-gr-black.png"
                    alt="Rooftops AI"
                    className="h-7 w-auto dark:invert"
                  />
                  {isPremiumOrBusiness && (
                    <span className="rounded-full bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 shadow-sm">
                      Pro
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="size-8 shrink-0"
                >
                  <IconLayoutSidebarLeftCollapse size={20} />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="shrink-0 space-y-1 p-2">
          {/* Primary Navigation Items */}
          {primaryNavigationItems.map(renderNavItem)}

          {/* More Button / Secondary Items */}
          {!isCollapsed && (
            <>
              <button
                onClick={() => setShowMore(!showMore)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-600 transition-all duration-150 hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <IconGrid3x3 size={SIDEBAR_ICON_SIZE} stroke={2} />
                  <span className="font-medium">More</span>
                </div>
                {showMore ? (
                  <IconChevronDown size={16} stroke={2} />
                ) : (
                  <IconDots size={16} stroke={2} />
                )}
              </button>

              {/* Secondary Navigation Items - Collapsible */}
              {showMore && (
                <div className="space-y-1 pl-2">
                  {secondaryNavigationItems.map(renderNavItem)}
                </div>
              )}
            </>
          )}

          {/* When collapsed, show secondary items with labels */}
          {isCollapsed && (
            <>
              <div className="mx-auto my-1 w-8 border-t border-gray-200" />
              {secondaryNavigationItems.map(renderNavItem)}
            </>
          )}
        </nav>

        {/* Content Section - Dynamic based on route */}
        {!isCollapsed && (
          <div className="flex-1 overflow-auto">
            {(() => {
              const contentType = getCurrentContentType()
              const chatFolders = folders.filter(f => f.type === "chats")
              const filesFolders = folders.filter(f => f.type === "files")
              const collectionFolders = folders.filter(
                f => f.type === "collections"
              )
              const assistantFolders = folders.filter(
                f => f.type === "assistants"
              )
              const toolFolders = folders.filter(f => f.type === "tools")

              // Show content only for specific routes/tabs
              if (pathname.includes("/chat") && !searchParams.get("tab")) {
                return (
                  <SidebarContent
                    contentType="chats"
                    data={chats}
                    folders={chatFolders}
                    isMobile={isMobile}
                    toggleSidebar={onToggle}
                  />
                )
              }

              if (pathname.includes("/explore") && !searchParams.get("tab")) {
                return (
                  <SidebarContent
                    contentType="reports"
                    data={[]}
                    folders={[]}
                    isMobile={isMobile}
                    toggleSidebar={onToggle}
                  />
                )
              }

              if (pathname.includes("/agent") && !searchParams.get("tab")) {
                // Agent page has its own internal sidebar, so we return null here
                return null
              }

              if (searchParams.get("tab") === "files") {
                return (
                  <SidebarContent
                    contentType="files"
                    data={files}
                    folders={filesFolders}
                    isMobile={isMobile}
                    toggleSidebar={onToggle}
                  />
                )
              }

              if (searchParams.get("tab") === "collections") {
                return (
                  <SidebarContent
                    contentType="collections"
                    data={collections}
                    folders={collectionFolders}
                    isMobile={isMobile}
                    toggleSidebar={onToggle}
                  />
                )
              }

              if (searchParams.get("tab") === "assistants") {
                return (
                  <SidebarContent
                    contentType="assistants"
                    data={assistants}
                    folders={assistantFolders}
                    isMobile={isMobile}
                    toggleSidebar={onToggle}
                  />
                )
              }

              if (searchParams.get("tab") === "tools") {
                return (
                  <SidebarContent
                    contentType="tools"
                    data={tools}
                    folders={toolFolders}
                    isMobile={isMobile}
                    toggleSidebar={onToggle}
                  />
                )
              }

              return null
            })()}
          </div>
        )}

        {/* Footer Section */}
        <div
          className={cn(
            "mt-auto shrink-0",
            isCollapsed ? "flex flex-col items-center p-2" : "p-3"
          )}
        >
          {/* Admin button - only for admins */}
          {profile?.is_admin && !isCollapsed && (
            <Link href="/admin/dashboard">
              <Button
                variant="ghost"
                className="mb-2 h-[36px] w-full justify-start gap-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                <IconShieldCog size={18} stroke={1.5} />
                RT Admin
              </Button>
            </Link>
          )}
          {profile?.is_admin && isCollapsed && (
            <Link
              href="/admin/dashboard"
              className="flex w-full justify-center"
            >
              <button className="flex w-full flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700">
                <IconShieldCog size={SIDEBAR_ICON_SIZE} stroke={1.5} />
                <span className="text-[10px] leading-tight">Admin</span>
              </button>
            </Link>
          )}

          {/* Usage stats + Upgrade for free users */}
          {!isCollapsed && !isPremiumOrBusiness && (
            <>
              <UsageStats className="mb-2" />
              <Link href="/pricing">
                <div className="mb-3 flex w-full flex-col items-center rounded-lg bg-gradient-to-r from-[#ffd700] via-[#ffb700] to-[#ff8c00] px-4 py-2.5 font-semibold text-gray-900 transition-opacity hover:opacity-90">
                  <div className="flex items-center">
                    <IconCrown
                      size={18}
                      className="mr-2"
                      fill="currentColor"
                      stroke={0}
                    />
                    <span className="text-sm font-bold">Start Free Trial</span>
                  </div>
                  <span className="text-[11px] font-medium text-gray-700/80">
                    3 days free, then $25/mo
                  </span>
                </div>
              </Link>
            </>
          )}

          {/* Profile button */}
          <ProfileSettings />
        </div>
      </div>
    </>
  )
}
