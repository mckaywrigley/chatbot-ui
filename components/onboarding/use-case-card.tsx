"use client"

import { cn } from "@/lib/utils"
import { IconCheck } from "@tabler/icons-react"
import { FC } from "react"

interface UseCaseCardProps {
  title: string
  description: string
  selected: boolean
  onClick: () => void
}

export const UseCaseCard: FC<UseCaseCardProps> = ({
  title,
  description,
  selected,
  onClick
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-rust bg-rust-soft shadow-sm"
          : "border-line bg-surface hover:border-line-strong hover:bg-paper-2"
      )}
    >
      <span
        className={cn(
          "text-[14px] font-medium transition-colors",
          selected ? "text-rust-ink" : "text-ink"
        )}
      >
        {title}
      </span>
      <span
        className={cn(
          "text-[12.5px] leading-relaxed transition-colors",
          selected ? "text-rust-ink/80" : "text-ink-3"
        )}
      >
        {description}
      </span>
      {selected && (
        <span className="bg-rust text-paper absolute right-3 top-3 flex size-5 items-center justify-center rounded-full">
          <IconCheck size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
