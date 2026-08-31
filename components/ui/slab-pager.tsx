"use client"

/**
 * Reusable pagination shell for slab lists (designs, reports, chats,
 * dashboard previews). Renders a header strip with optional left
 * children, a right-aligned page counter + prev/next arrows; a slot
 * for the slab list itself; and a matching footer strip. Same
 * controls top + bottom so a scientist scanning a long page doesn't
 * have to scroll back up to flip pages.
 *
 * Pure presentation - the parent owns `page` state + the page-size
 * constant. This way the parent can also drive search / filter and
 * re-slice the underlying list before passing it in.
 */

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { FC, ReactNode } from "react"

import { cn } from "@/lib/utils"

interface SlabPagerProps {
  total: number
  page: number
  pageSize: number
  onPageChange: (next: number) => void
  /** Optional left-aligned content in the top strip (e.g. filter tabs). */
  topLeft?: ReactNode
  /** Optional right-aligned content in the top strip placed BEFORE the page controls. */
  topRight?: ReactNode
  /** Slot for the slab list - parent passes the already-paged items. */
  children: ReactNode
  /** Hide the bottom strip when the entire dataset fits on one page. */
  hideBottomWhenSinglePage?: boolean
  className?: string
}

export const SlabPager: FC<SlabPagerProps> = ({
  total,
  page,
  pageSize,
  onPageChange,
  topLeft,
  topRight,
  children,
  hideBottomWhenSinglePage = true,
  className
}) => {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(0, page), pages - 1)
  const first = total === 0 ? 0 : safePage * pageSize + 1
  const last = Math.min(total, (safePage + 1) * pageSize)
  const showBottom = !hideBottomWhenSinglePage || pages > 1

  const Controls = (
    <div className="flex items-center gap-2">
      <span className="text-ink-3 font-mono text-[11px]">
        {total === 0 ? "0 of 0" : `${first}–${last} of ${total}`}
      </span>
      <div className="border-line inline-flex overflow-hidden rounded-md border">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, safePage - 1))}
          disabled={safePage === 0}
          aria-label="Previous page"
          className="text-ink-2 hover:bg-paper-2 disabled:text-ink-4 px-1.5 py-1 transition-colors disabled:cursor-not-allowed"
        >
          <IconChevronLeft size={14} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pages - 1, safePage + 1))}
          disabled={safePage >= pages - 1}
          aria-label="Next page"
          className="text-ink-2 hover:bg-paper-2 disabled:text-ink-4 border-line border-l px-1.5 py-1 transition-colors disabled:cursor-not-allowed"
        >
          <IconChevronRight size={14} />
        </button>
      </div>
    </div>
  )

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">{topLeft}</div>
        <div className="flex items-center gap-3">
          {topRight}
          {Controls}
        </div>
      </div>
      {children}
      {showBottom && <div className="flex justify-end pt-1">{Controls}</div>}
    </div>
  )
}
