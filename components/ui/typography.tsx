import * as React from "react"

import { cn } from "@/lib/utils"

/* Eyebrow - small mono label above headings.
   Mono, uppercase, wide tracking, ink-3 by default. */
const Eyebrow = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "text-ink-3 font-mono text-[12px] font-medium uppercase tracking-[0.12em]",
      className
    )}
    {...props}
  />
))
Eyebrow.displayName = "Eyebrow"

/* DisplayHeading - Instrument Serif, editorial display titles. */
type DisplayHeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  as?: "h1" | "h2" | "h3" | "h4"
}

const DisplayHeading = React.forwardRef<
  HTMLHeadingElement,
  DisplayHeadingProps
>(({ className, as = "h2", ...props }, ref) => {
  const Comp = as as React.ElementType
  return (
    <Comp
      ref={ref}
      className={cn(
        "font-display text-ink font-normal leading-[1.05] tracking-[-0.015em]",
        className
      )}
      {...props}
    />
  )
})
DisplayHeading.displayName = "DisplayHeading"

/* MonoText - inline monospace (for numerics, code-ish data). */
const MonoText = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("text-ink-2 font-mono text-[13px]", className)}
    {...props}
  />
))
MonoText.displayName = "MonoText"

export { Eyebrow, DisplayHeading, MonoText }
