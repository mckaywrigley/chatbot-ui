"use client"

import { IconCheck, IconSparkles } from "@tabler/icons-react"

import { Chip } from "@/components/ui/chip"
import { MonoText } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

/**
 * Legacy standalone hypothesis card.
 *
 * This component is **not currently rendered anywhere** - the inline
 * HypothesesTab in `app/[locale]/[workspaceid]/designs/[designId]/page.tsx`
 * has fully replaced it. Kept here so that any future feature that needs
 * a portable hypothesis chip has a starting point.
 *
 * Per issue #21, the legacy `rigor` / `feasibility` / `novelty` score bars
 * were dropped; the only ranking signal is `relevanceScore` (0-1).
 */

interface HypothesisCardProps {
  n: number
  title: string
  rationale: string
  /** 0-1 - "how directly this hypothesis attacks the user's problem". */
  relevanceScore?: number
  refs?: string[]
  selected?: boolean
  onToggle?: () => void
  critique?: string
  className?: string
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="bg-paper-2 h-1 w-11 overflow-hidden rounded">
        <div
          className="h-full rounded transition-[width]"
          style={{ width: `${value * 10}%`, background: color }}
        />
      </div>
      <span className="text-ink-3 font-mono text-[10.5px]">
        {value.toFixed(1)}
      </span>
    </div>
  )
}

function ScoreLabel({ children }: { children: string }) {
  return (
    <div className="text-ink-3 mb-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em]">
      {children}
    </div>
  )
}

export function HypothesisCard({
  n,
  title,
  rationale,
  relevanceScore,
  refs,
  selected,
  onToggle,
  critique,
  className
}: HypothesisCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border transition-colors",
        selected
          ? "border-ink bg-paper-2"
          : "border-line bg-surface hover:border-line-strong",
        className
      )}
    >
      <div className="flex gap-3.5 px-[18px] py-4">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors",
            selected ? "border-ink bg-ink" : "border-line-strong bg-transparent"
          )}
          aria-pressed={selected}
        >
          {selected && (
            <IconCheck size={12} stroke={3} className="text-paper" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-baseline gap-2.5">
            <MonoText className="text-rust font-semibold">
              H{String(n).padStart(2, "0")}
            </MonoText>
            <h3 className="text-ink m-0 text-[15px] font-semibold leading-snug">
              {title}
            </h3>
          </div>
          <p className="text-ink-2 mb-2.5 text-[13px] leading-relaxed">
            {rationale}
          </p>
          <div className="flex flex-wrap items-center gap-[18px]">
            {typeof relevanceScore === "number" && (
              <div>
                <ScoreLabel>Relevance</ScoreLabel>
                <ScoreBar
                  value={relevanceScore * 10}
                  color="hsl(var(--ink-hsl))"
                />
              </div>
            )}
            <div className="flex-1" />
            {refs && refs.length > 0 && (
              <div className="flex gap-1">
                {refs.map(r => (
                  <Chip key={r} className="h-5 px-[7px] text-[10.5px]">
                    {r}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {critique && (
        <div
          className={cn(
            "text-ink-2 flex items-start gap-2 px-[18px] py-2.5 pl-[54px] text-[12px] leading-relaxed",
            "border-line bg-paper border-t border-dashed"
          )}
        >
          <IconSparkles size={12} className="text-ink-3 mt-0.5 shrink-0" />
          <div>
            <span className="text-ink font-semibold">
              Shadow&apos;s critique ·{" "}
            </span>
            {critique}
          </div>
        </div>
      )}
    </div>
  )
}
