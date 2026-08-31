import * as React from "react"

import { cn } from "@/lib/utils"

type ChipVariant = "default" | "solid" | "accent" | "success" | "ghost"

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant
  dot?: boolean
  dotColor?: string
}

const variantClass: Record<ChipVariant, string> = {
  default: "bg-paper border-line text-ink-2",
  solid: "bg-ink border-ink text-paper",
  accent: "bg-rust-soft border-rust-soft text-rust-ink",
  success: "border-transparent bg-[#DDE9DF] text-[#1F4A2C]",
  ghost: "border-transparent bg-transparent text-ink-3"
}

const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  (
    { className, variant = "default", dot, dotColor, children, ...props },
    ref
  ) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex h-[26px] items-center gap-1.5 rounded-full border px-[10px] text-[12.5px] font-medium",
        variantClass[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className="size-1.5 rounded-full"
          style={{ background: dotColor || "currentColor" }}
        />
      )}
      {children}
    </span>
  )
)
Chip.displayName = "Chip"

export { Chip }
