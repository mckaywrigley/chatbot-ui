"use client"

import {
  IconBook,
  IconBulb,
  IconChartHistogram,
  IconCheck,
  IconFlask,
  IconRefresh,
  IconTargetArrow,
  type Icon as TablerIconType
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"

export type StageId =
  | "problem"
  | "lit"
  | "hyp"
  | "design"
  | "validate"
  | "iterate"

interface StageDef {
  id: StageId
  label: string
  icon: TablerIconType
  short: string
}

// Validate + Iterate are no longer standalone stages: they live in a modal
// launched from the Design step ("Validate & iterate"), so the journey ends at
// Design. The StageId members stay in the type so persisted references and the
// tab-mapping records still typecheck.
export const STAGES: StageDef[] = [
  { id: "problem", label: "Problem", icon: IconTargetArrow, short: "01" },
  { id: "lit", label: "Literature", icon: IconBook, short: "02" },
  { id: "hyp", label: "Hypotheses", icon: IconBulb, short: "03" },
  { id: "design", label: "Design", icon: IconFlask, short: "04" }
]

type Status = "active" | "done" | "idle"

function stageStatus(
  stageId: StageId,
  current: StageId,
  completed: StageId[]
): Status {
  const idx = STAGES.findIndex(s => s.id === stageId)
  const curIdx = STAGES.findIndex(s => s.id === current)
  if (stageId === current) return "active"
  if (completed.includes(stageId)) return "done"
  if (idx < curIdx) return "done"
  return "idle"
}

interface StepperProps {
  current: StageId
  completed?: StageId[]
  meta?: Partial<Record<StageId, string>>
  running?: boolean
  onGoto?: (id: StageId) => void
  className?: string
}

/**
 * Signature 5-stage progress rail: continuous track + numbered nodes.
 * Active node gets a rust halo; done nodes fill with ink + checkmark.
 * When `running` is true, an accent spinner orbits the active node.
 */
export function Stepper({
  current,
  completed = [],
  meta = {},
  running,
  onGoto,
  className
}: StepperProps) {
  const curIdx = STAGES.findIndex(s => s.id === current)
  const progressPct = (curIdx / (STAGES.length - 1)) * 100

  return (
    <div className={cn("border-line bg-paper border-b px-8 py-5", className)}>
      <div className="relative">
        {/* Track */}
        <div className="bg-line absolute inset-x-4 top-4 h-0.5 rounded" />
        <div
          className="bg-ink absolute left-4 top-4 h-0.5 rounded transition-[width] duration-500"
          style={{
            width: `calc((100% - 32px) * ${progressPct / 100})`
          }}
        />

        {/* Nodes */}
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `repeat(${STAGES.length}, 1fr)` }}
        >
          {STAGES.map((s, i) => {
            const status = stageStatus(s.id, current, completed)
            const isActive = status === "active"
            const isDone = status === "done"
            const metaText = meta[s.id]
            const Icon = s.icon
            const alignSelf =
              i === 0
                ? "items-start text-left"
                : i === STAGES.length - 1
                  ? "items-end text-right"
                  : "items-center text-center"
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onGoto?.(s.id)}
                className={cn(
                  "flex flex-col gap-2.5 bg-transparent px-1 font-sans",
                  alignSelf,
                  onGoto ? "cursor-pointer" : "cursor-default"
                )}
              >
                {/* Node */}
                <div
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-full font-mono text-[11px] font-semibold transition-all",
                    isDone && "bg-ink text-paper border-ink border-2",
                    isActive &&
                      "bg-paper text-rust border-rust ring-rust-soft border-2 ring-[6px]",
                    status === "idle" &&
                      "bg-paper text-ink-4 border-line-strong border-2"
                  )}
                >
                  {isDone ? <IconCheck size={14} stroke={2.4} /> : s.short}
                  {isActive && running && (
                    <span
                      className="border-rust absolute inset-[-3px] animate-spin rounded-full border-2"
                      style={{
                        borderTopColor: "transparent",
                        animationDuration: "1.4s"
                      }}
                    />
                  )}
                </div>

                {/* Label + meta */}
                <div className="min-w-0">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-[12px]",
                      i === 0
                        ? "justify-start"
                        : i === STAGES.length - 1
                          ? "justify-end"
                          : "justify-center",
                      isActive
                        ? "text-ink font-semibold"
                        : isDone
                          ? "text-ink-2 font-medium"
                          : "text-ink-3 font-medium"
                    )}
                  >
                    <Icon size={12} stroke={1.8} />
                    {s.label}
                  </div>
                  <div
                    className="text-ink-3 mt-0.5 max-w-[160px] truncate font-mono text-[11px]"
                    style={{
                      textAlign:
                        i === 0
                          ? "left"
                          : i === STAGES.length - 1
                            ? "right"
                            : "center"
                    }}
                  >
                    {metaText ||
                      (isDone
                        ? "-"
                        : isActive
                          ? running
                            ? "in progress"
                            : "current"
                          : "pending")}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
