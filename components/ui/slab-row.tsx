"use client"

/**
 * Canonical slab row layout used across dashboard, designs, reports,
 * chats. Standardises the alignment the scientist asked for:
 *
 *  - Title / body on the left.
 *  - Optional action icons (edit, delete, save-as-template) stacked
 *    HORIZONTALLY in the UPPER right corner.
 *  - Stacked vertical "Created mm/dd/yy" / "Modified mm/dd/yy" lines
 *    aligned with the LOWER right corner, directly under the icons.
 *
 * Parents pass `actions` + `dateLines` (already pre-formatted via
 * `formatCreatedModifiedStacked`). The component handles all the
 * grid + alignment so every list looks identical.
 */

import { FC, MouseEvent, ReactNode } from "react"

import { cn } from "@/lib/utils"

interface SlabRowProps {
  onClick?: () => void
  /** Main content. */
  children: ReactNode
  /** Upper-right icon buttons. Click events should call stopPropagation. */
  actions?: ReactNode
  /** Pre-formatted date lines from formatCreatedModifiedStacked. */
  dateLines?: string[]
  className?: string
  /** When true, the whole slab is interactive (cursor + hover). */
  clickable?: boolean
}

export const SlabRow: FC<SlabRowProps> = ({
  onClick,
  children,
  actions,
  dateLines,
  className,
  clickable = true
}) => {
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    // Don't trigger row click when the user clicks one of the action
    // buttons inside the upper-right cluster.
    if ((e.target as HTMLElement).closest("[data-slab-action]")) return
    onClick?.()
  }
  return (
    <div
      onClick={onClick ? handleClick : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(
        "border-line bg-surface group relative grid grid-cols-[1fr_auto] items-start gap-5 rounded-lg border px-5 py-4 transition-colors",
        clickable && onClick
          ? "hover:border-line-strong hover:bg-paper cursor-pointer"
          : "",
        className
      )}
    >
      <div className="min-w-0">{children}</div>
      <div className="flex h-full min-h-[48px] flex-col items-end justify-between gap-3">
        {/* Upper-right icon cluster. Hidden until row hover so the
            list stays calm at rest. */}
        {actions ? (
          <div
            data-slab-action
            className="flex items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
          >
            {actions}
          </div>
        ) : (
          <span aria-hidden className="size-0" />
        )}
        {/* Lower-right stacked dates. Reserves a fixed min-width so
            month + day digits don't kick text content around as the
            list paginates. */}
        {dateLines && dateLines.length > 0 ? (
          <div className="text-ink-3 flex min-w-[120px] flex-col items-end gap-0.5 text-right font-mono text-[11px] leading-tight">
            {dateLines.map(line => (
              <div key={line}>{line}</div>
            ))}
          </div>
        ) : (
          <span aria-hidden className="size-0" />
        )}
      </div>
    </div>
  )
}
