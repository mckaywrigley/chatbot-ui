import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "focus-visible:ring-rust/40 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-surface border-line text-ink hover:border-line-strong hover:bg-paper-2 border",
        primary:
          "bg-rust text-paper border-rust border hover:border-[color:var(--rust-hover)] hover:bg-[color:var(--rust-hover)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-transparent",
        outline:
          "border-line hover:bg-paper-2 hover:border-line-strong border bg-transparent",
        secondary:
          "bg-paper-2 text-ink hover:bg-paper-3 border border-transparent",
        ghost: "text-ink-2 hover:bg-paper-2 border border-transparent",
        link: "text-rust underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-[14px]",
        sm: "h-8 rounded-lg px-3 text-[13px]",
        lg: "h-11 rounded-md px-5 text-[15px]",
        icon: "size-9 p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
