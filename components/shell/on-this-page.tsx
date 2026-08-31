"use client"

import { cn } from "@/lib/utils"

interface Section {
  id: string
  label: string
}

interface OnThisPageProps {
  sections: Section[]
  active?: string
  onSelect?: (id: string) => void
  numbered?: boolean
  className?: string
}

/**
 * Sticky left-rail section nav. Used on Overview and Design detail screens.
 * Items get a left border in line-default → rust when active.
 */
export function OnThisPage({
  sections,
  active,
  onSelect,
  numbered,
  className
}: OnThisPageProps) {
  return (
    <nav className={cn("sticky top-5 flex flex-col gap-0", className)}>
      <div className="text-ink-3 mb-2.5 px-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em]">
        On this page
      </div>
      <div className="flex flex-col">
        {sections.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect?.(s.id)}
            className={cn(
              "flex items-center gap-2 border-l-2 bg-transparent px-3 py-1.5 text-left text-[12.5px] transition-colors",
              active === s.id
                ? "border-rust text-ink font-medium"
                : "border-line text-ink-3 hover:text-ink-2"
            )}
          >
            {numbered && (
              <span className="text-ink-4 font-mono text-[10px]">
                {String(i + 1).padStart(2, "0")}
              </span>
            )}
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
