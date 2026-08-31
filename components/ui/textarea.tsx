import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "border-line bg-surface text-ink placeholder:text-ink-3 focus-visible:border-rust focus-visible:ring-rust-soft flex min-h-[88px] w-full rounded-md border px-3 py-2 text-[14px] leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
