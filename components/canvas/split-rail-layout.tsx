"use client"

import { cn } from "@/lib/utils"
import { ReactNode, useCallback, useEffect, useState } from "react"

interface SplitRailLayoutProps {
  children: ReactNode
  rail: ReactNode
  showRail: boolean
  onToggleRail: () => void
  railDefaultWidth?: number
  railMinWidth?: number
  railMaxWidth?: number
  className?: string
}

/**
 * Two-region shell used by Project and Design detail pages: full-height canvas
 * column on the left, resizable right rail. The rail visibility is controlled
 * by the parent via showRail / onToggleRail so the toggle can live in the
 * page's own toolbar.
 *
 * On mobile the rail opens as a full-screen overlay with a back button.
 */
export function SplitRailLayout({
  children,
  rail,
  showRail,
  onToggleRail,
  railDefaultWidth = 400,
  railMinWidth = 320,
  railMaxWidth = 640,
  className
}: SplitRailLayoutProps) {
  const [chatWidth, setChatWidth] = useState(railDefaultWidth)
  const [isDragging, setIsDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      const startX = e.clientX
      const startWidth = chatWidth

      const onMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX
        setChatWidth(
          Math.max(railMinWidth, Math.min(railMaxWidth, startWidth + delta))
        )
      }
      const onUp = () => {
        setIsDragging(false)
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
      }
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [chatWidth, railMinWidth, railMaxWidth]
  )

  /* ── Mobile layout ──────────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div
        className={cn(
          "bg-paper text-ink flex h-full flex-col overflow-hidden font-sans",
          className
        )}
      >
        <div className="flex-1 overflow-hidden">{children}</div>

        {showRail && (
          <div className="bg-surface fixed inset-0 z-40 flex flex-col">
            <button
              onClick={onToggleRail}
              className="border-line text-ink-3 shrink-0 border-b px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.08em]"
            >
              ← Back to canvas
            </button>
            <div className="min-h-0 flex-1">{rail}</div>
          </div>
        )}
      </div>
    )
  }

  /* ── Desktop layout ─────────────────────────────────────────────────── */
  return (
    <div
      className={cn(
        "bg-ink-50 text-ink-900 flex h-full overflow-hidden font-sans",
        className
      )}
    >
      <main className="relative min-w-0 flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          <div className="relative flex-1 overflow-hidden">{children}</div>
        </div>
      </main>

      {showRail && (
        <>
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              "group z-50 flex w-1.5 shrink-0 cursor-col-resize justify-center",
              isDragging ? "bg-rust/30" : "hover:bg-rust/20"
            )}
          >
            <div
              className={cn(
                "h-full w-px transition-colors",
                isDragging ? "bg-rust" : "bg-line group-hover:bg-rust"
              )}
            />
          </div>

          <aside
            className="border-line bg-surface shrink-0 border-l"
            style={{ width: chatWidth }}
          >
            {rail}
          </aside>
        </>
      )}
    </div>
  )
}
