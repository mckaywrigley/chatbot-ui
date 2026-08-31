"use client"

import { IconCheck, IconEye, IconTrash } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PaperRowProps {
  citation: string
  url?: string
  note?: string
  selected?: boolean
  onToggle?: () => void
  onPreview?: () => void
  onRemove?: () => void
  className?: string
}

/**
 * Selectable literature row with a citation, an external link, and notes.
 * Click anywhere on the row (except buttons) to toggle selection.
 */
export function PaperRow({
  citation,
  url,
  note,
  selected,
  onToggle,
  onPreview,
  onRemove,
  className
}: PaperRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onToggle?.()
        }
      }}
      className={cn(
        "flex cursor-pointer items-center gap-3.5 rounded-md border px-4 py-3.5 transition-colors",
        selected
          ? "border-ink bg-paper-2"
          : "border-line bg-surface hover:border-line-strong",
        className
      )}
    >
      <div
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors",
          selected ? "border-ink bg-ink" : "border-line-strong bg-transparent"
        )}
      >
        {selected && <IconCheck size={11} stroke={3} className="text-paper" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="text-ink text-[13.5px] font-semibold">
            {citation}
          </span>
          {url && (
            <a
              href={url}
              onClick={e => e.stopPropagation()}
              className="text-rust font-mono text-[11.5px] no-underline hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {url} ↗
            </a>
          )}
        </div>
        {note && <div className="text-ink-3 mt-1 text-[12px]">{note}</div>}
      </div>
      {onPreview && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={e => {
            e.stopPropagation()
            onPreview()
          }}
          title="Preview paper"
        >
          <IconEye size={14} />
        </Button>
      )}
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={e => {
            e.stopPropagation()
            onRemove()
          }}
          title="Remove paper"
        >
          <IconTrash size={14} />
        </Button>
      )}
    </div>
  )
}
