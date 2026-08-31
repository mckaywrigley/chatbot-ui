"use client"

import { FC, useEffect, useState } from "react"
import { IconLoader2, IconCheck } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

/**
 * What the outline pass is actually doing, in order. Shown while the report
 * draft is being generated so the wait reads as work rather than a dead spinner
 * - the researcher can see their data being read, the measurements extracted,
 * and the sections drafted.
 *
 * These are advanced on a timer, not driven by server events: /api/report/outline
 * is a single call that returns the whole draft, so there is no per-step signal
 * to subscribe to. The labels describe the real stages of that call, and the
 * last one stays put until the draft lands, so nothing ever claims to have
 * finished work it can't confirm.
 */
const STAGES = [
  "Reading your uploaded data files",
  "Extracting the measured values and units",
  "Matching results against what the design set out to measure",
  "Working out which comparisons the data supports",
  "Drafting the report sections",
  "Building figures and tables",
  "Tightening the wording and checking the numbers"
]

/** Roughly how long each stage is given before advancing (ms). */
const STAGE_MS = 9000

export const ReportGeneratingView: FC<{ objective?: string }> = ({
  objective
}) => {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    // Hold on the final stage - never advance past what we can be sure of.
    if (stage >= STAGES.length - 1) return
    const t = setTimeout(() => setStage(s => s + 1), STAGE_MS)
    return () => clearTimeout(t)
  }, [stage])

  return (
    <div className="mx-auto max-w-xl py-12">
      <div className="flex items-center gap-2.5">
        <IconLoader2 className="text-brick animate-spin" size={20} />
        <h3 className="text-ink-900 text-[15px] font-semibold">
          Writing your report
        </h3>
      </div>
      {objective ? (
        <p className="text-ink-500 mt-1.5 text-[12.5px] leading-relaxed">
          Against your objective: {objective}
        </p>
      ) : null}
      <p className="text-ink-400 mt-1 text-[12px]">
        This usually takes a minute or two. You can keep this open - the draft
        appears here when it&apos;s ready.
      </p>

      <ol className="mt-5 space-y-2.5">
        {STAGES.map((label, i) => {
          const done = i < stage
          const active = i === stage
          return (
            <li key={label} className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border",
                  done
                    ? "border-sage-brand bg-sage-brand text-white"
                    : active
                      ? "border-brick text-brick"
                      : "border-ink-200 text-ink-300"
                )}
              >
                {done ? (
                  <IconCheck size={11} />
                ) : active ? (
                  <IconLoader2 size={11} className="animate-spin" />
                ) : null}
              </span>
              <span
                className={cn(
                  "text-[13px] leading-snug",
                  done
                    ? "text-ink-500"
                    : active
                      ? "text-ink-900 font-medium"
                      : "text-ink-400"
                )}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
