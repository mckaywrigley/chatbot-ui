import * as React from "react"

import { cn } from "@/lib/utils"

interface PlaceholderProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  height?: number | string
}

/* Dashed hatched box for coming-soon / empty slots. */
const Placeholder = React.forwardRef<HTMLDivElement, PlaceholderProps>(
  ({ className, label, height = 140, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "border-line-strong text-ink-3 flex items-center justify-center rounded-md border border-dashed font-mono text-[11px]",
        className
      )}
      style={{
        height,
        background:
          "repeating-linear-gradient(135deg, hsl(var(--paper-2-hsl)) 0 8px, hsl(var(--paper-3-hsl)) 8px 9px)",
        ...style
      }}
      {...props}
    >
      {label}
    </div>
  )
)
Placeholder.displayName = "Placeholder"

export { Placeholder }
