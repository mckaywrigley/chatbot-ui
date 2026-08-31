import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "focus:ring-rust/40 inline-flex h-6 items-center gap-1.5 rounded-full border px-[10px] text-[11.5px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-paper border-line text-ink-2",
        solid: "bg-ink text-paper border-ink",
        accent: "bg-rust-soft text-rust-ink border-rust-soft",
        success: "border-transparent bg-[#DDE9DF] text-[#1F4A2C]",
        secondary: "bg-paper-2 border-line text-ink-2",
        destructive:
          "bg-destructive text-destructive-foreground border-transparent",
        outline: "text-ink border-line"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
