"use client"

import { Menu, X } from "lucide-react"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

import { GlobalSearch } from "@/components/search/global-search"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { AppSidebar } from "./app-sidebar"
import { GuidedTour } from "@/components/onboarding/guided-tour"
import { TutorialButton } from "@/components/onboarding/tutorial-button"

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const pathname = usePathname()
  // When inside a design detail page the page provides its own left chat panel
  // and right library sidebar - hide the workspace nav sidebar + tutorial button.
  const isDesignDetail = /\/designs\/[^/]+/.test(pathname ?? "")

  useEffect(() => {
    const collapsed = localStorage.getItem("sidebarCollapsed") === "true"
    setIsCollapsed(collapsed)

    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setMobileSidebarOpen(false)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen(v => !v)
    } else {
      const next = !isCollapsed
      setIsCollapsed(next)
      localStorage.setItem("sidebarCollapsed", String(next))
    }
  }

  return (
    <div className="bg-paper flex h-screen">
      {/* Mobile menu button */}
      {isMobile && (
        <Button
          variant="default"
          size="icon"
          onClick={handleToggleSidebar}
          className="fixed left-4 top-4 z-50 size-9 shadow-sm md:hidden"
        >
          {mobileSidebarOpen ? <X size={16} /> : <Menu size={16} />}
        </Button>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(26,23,20,0.32)" }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on design detail pages (page has its own left chat panel) */}
      {!isDesignDetail && (
        <div
          className={cn(
            "z-40 transition-transform duration-300",
            isMobile
              ? cn(
                  "fixed inset-y-0 left-0",
                  mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )
              : "relative"
          )}
        >
          <AppSidebar
            isCollapsed={!isMobile && isCollapsed}
            onToggle={handleToggleSidebar}
          />
        </div>
      )}

      {/* Main content */}
      <main
        className={cn(
          "app-main-content bg-paper flex-1 overflow-hidden transition-all duration-300",
          isMobile && mobileSidebarOpen && "pointer-events-none"
        )}
      >
        {children}
      </main>

      <GlobalSearch />
      <GuidedTour />
      {/* Tutorial button hidden on design detail pages - no room and no need. */}
      {!isDesignDetail && <TutorialButton />}
    </div>
  )
}
