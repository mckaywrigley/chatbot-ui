"use client"

import { IconClock } from "@tabler/icons-react"
import { ReactNode } from "react"

import type { AccentKey } from "@/components/canvas/accent-tabs"
import { cn } from "@/lib/utils"

export interface CompletionChip {
  label: string
  filled: boolean
  accent: AccentKey
}

interface EntityCardProps {
  title: string
  description?: string
  thumbnail?: ReactNode
  chips?: CompletionChip[]
  timestampLabel?: string
  timestamp?: string
  badges?: string[]
  actions?: ReactNode
  onClick?: () => void
  className?: string
}

/**
 * Accent chip maps onto the editorial phase tints, so legacy accent keys
 * still render something meaningful after the palette swap.
 */
const CHIP_FILLED_BG: Record<AccentKey, string> = {
  "teal-journey": "bg-[color:var(--p-problem)] border-[color:var(--p-problem)]",
  "orange-product": "bg-[color:var(--p-lit)] border-[color:var(--p-lit)]",
  "purple-persona": "bg-[color:var(--p-hyp)] border-[color:var(--p-hyp)]",
  "sage-brand": "bg-[color:var(--p-overview)] border-[color:var(--p-overview)]",
  neutral: "bg-ink-3 border-ink-3"
}

export function EntityCard({
  title,
  description,
  thumbnail,
  chips,
  timestampLabel,
  timestamp,
  badges,
  actions,
  onClick,
  className
}: EntityCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "border-line bg-surface hover:border-line-strong hover:bg-paper group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border transition-colors",
        className
      )}
    >
      {thumbnail && (
        <div className="bg-paper-2 flex h-20 items-center justify-center">
          {thumbnail}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3
            title={title}
            className="text-ink line-clamp-3 min-w-0 flex-1 break-words text-[14px] font-semibold leading-snug"
          >
            {title}
          </h3>
          {actions && (
            <div
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={e => e.stopPropagation()}
            >
              {actions}
            </div>
          )}
        </div>

        {description && (
          <p className="text-ink-3 line-clamp-2 text-[12.5px] leading-relaxed">
            {description}
          </p>
        )}

        {badges && badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {badges.slice(0, 3).map(b => (
              <span
                key={b}
                className="bg-paper-2 text-ink-3 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-medium tracking-wide"
              >
                {b}
              </span>
            ))}
            {badges.length > 3 && (
              <span className="bg-paper-2 text-ink-3 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-medium">
                +{badges.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-1">
          {chips && chips.length > 0 ? (
            <div className="flex items-center gap-1.5">
              {chips.map(chip => (
                <span
                  key={chip.label}
                  title={`${chip.label}${chip.filled ? " - present" : " - none yet"}`}
                  className={cn(
                    "size-2.5 rounded-full border",
                    chip.filled
                      ? CHIP_FILLED_BG[chip.accent]
                      : "border-line bg-surface"
                  )}
                />
              ))}
            </div>
          ) : (
            <span />
          )}

          {timestamp && (
            <div className="text-ink-3 flex items-center gap-1 font-mono text-[11px]">
              <IconClock size={11} />
              <span>
                {timestampLabel ? `${timestampLabel} ` : ""}
                {timestamp}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
