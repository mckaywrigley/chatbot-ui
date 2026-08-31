"use client"

import { IconArrowsDiagonal, IconX } from "@tabler/icons-react"
import { ReactNode, useEffect } from "react"

import { ChatScope, ScopedChatRail } from "@/components/canvas/scoped-chat-rail"
import { ShadowAISVG } from "@/components/icons/chatbotui-svg"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AgentDrawerProps {
  open: boolean
  onClose: () => void
  scope: ChatScope
  scopeId?: string
  scopeName?: string
  /** Small hint shown below the title - e.g. current stage / selection. */
  scopeDetail?: ReactNode
  contextPrompt?: string
  autoStart?: boolean
  className?: string
}

/**
 * 440px slide-over agent drawer. Wraps ScopedChatRail so the pinned-thread
 * logic (scope/scope_id) is preserved - the drawer is a presentation layer.
 */
export function AgentDrawer({
  open,
  onClose,
  scope,
  scopeId,
  scopeName,
  scopeDetail,
  contextPrompt,
  autoStart,
  className
}: AgentDrawerProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="animate-fade-up fixed inset-0 z-40"
        style={{
          background: "rgba(26,23,20,0.24)",
          backdropFilter: "blur(2px)"
        }}
      />
      {/* Drawer */}
      <aside
        className={cn(
          "border-line bg-paper shadow-drawer animate-drawer-in fixed inset-y-0 right-0 z-50 flex w-[440px] max-w-[92vw] flex-col border-l",
          className
        )}
        role="dialog"
        aria-label="Shadow AI Agent"
      >
        {/* Header */}
        <div className="border-line flex flex-col gap-2 border-b p-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-ink flex size-7 items-center justify-center rounded-md">
              <ShadowAISVG scale={16 / 24} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-ink text-[13px] font-semibold">
                Shadow AI Agent
              </div>
              <div className="text-ink-3 flex items-center gap-1.5 text-[11.5px]">
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: "var(--success)" }}
                />
                <span>Scoped to</span>
                {scopeName && (
                  <span className="text-ink-2 truncate font-medium">
                    · {scopeName}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              title="Expand"
              type="button"
            >
              <IconArrowsDiagonal size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              title="Close"
              onClick={onClose}
              type="button"
            >
              <IconX size={14} />
            </Button>
          </div>
          {scopeDetail && (
            <div className="border-line-strong bg-paper-2 text-ink-3 rounded-md border border-dashed px-2.5 py-1.5 font-mono text-[11.5px]">
              {scopeDetail}
            </div>
          )}
        </div>

        {/* Chat body - uses existing ScopedChatRail so thread persistence works. */}
        <div className="relative min-h-0 flex-1">
          <ScopedChatRail
            scope={scope}
            scopeId={scopeId}
            scopeName={scopeName}
            contextPrompt={contextPrompt}
            autoStart={autoStart}
            className="h-full"
          />
        </div>
      </aside>
    </>
  )
}
