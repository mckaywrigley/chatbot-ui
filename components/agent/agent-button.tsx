"use client"

import { IconSparkles } from "@tabler/icons-react"
import { ButtonHTMLAttributes, forwardRef } from "react"

import { cn } from "@/lib/utils"

interface AgentButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  running?: boolean
}

/**
 * Top-bar agent trigger. Solid ink pill with a rust sparkle badge, ⌘I kbd hint.
 * Render a pulsing green dot when an agent run is active.
 */
export const AgentButton = forwardRef<HTMLButtonElement, AgentButtonProps>(
  ({ className, running, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        "bg-ink text-paper inline-flex h-9 items-center gap-2 rounded-full border pl-2.5 pr-3.5 text-[13px] font-medium shadow-sm transition-transform active:scale-[0.98]",
        "border-[hsl(var(--ink-hsl))]",
        className
      )}
    >
      <span className="bg-rust inline-flex size-[22px] items-center justify-center rounded-full">
        <IconSparkles size={12} stroke={2.2} />
      </span>
      Agent
      {running && (
        <span className="animate-pulse-soft ml-0.5 size-1.5 rounded-full bg-[hsl(var(--success)_/_0.95)]" />
      )}
      <span
        className="ml-0.5 rounded px-1 py-px font-mono text-[10.5px]"
        style={{
          color: "rgba(250,248,245,0.6)",
          border: "1px solid rgba(250,248,245,0.2)"
        }}
      >
        ⌘I
      </span>
    </button>
  )
)
AgentButton.displayName = "AgentButton"
