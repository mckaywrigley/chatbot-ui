import * as React from "react"

import { cn } from "@/lib/utils"

export type StatusKind = "running" | "ready" | "done" | "idle"

interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusKind
  label?: string
}

const config: Record<
  StatusKind,
  { bg: string; color: string; dot: string; label: string }
> = {
  running: {
    bg: "var(--rust-soft)",
    color: "var(--rust-ink)",
    dot: "var(--rust)",
    label: "Running…"
  },
  ready: {
    bg: "var(--paper-2)",
    color: "var(--ink-2)",
    dot: "var(--ink-3)",
    label: "Ready"
  },
  done: {
    bg: "#DDE9DF",
    color: "#1F4A2C",
    dot: "var(--success)",
    label: "Complete"
  },
  idle: {
    bg: "var(--paper-2)",
    color: "var(--ink-3)",
    dot: "var(--ink-4)",
    label: "Idle"
  }
}

const StatusChip = React.forwardRef<HTMLSpanElement, StatusChipProps>(
  ({ status, label, className, ...props }, ref) => {
    const c = config[status]
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex h-[22px] items-center gap-1.5 rounded-full px-[10px] text-[11px] font-medium",
          className
        )}
        style={{ background: c.bg, color: c.color }}
        {...props}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            status === "running" && "animate-pulse-soft"
          )}
          style={{ background: c.dot }}
        />
        {label ?? c.label}
      </span>
    )
  }
)
StatusChip.displayName = "StatusChip"

export { StatusChip }
