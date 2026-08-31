"use client"

/**
 * Full-screen "Refine" step shown BEFORE a report is generated - a single page
 * of clarifying questions (audience, depth, focus, format) so the generated
 * report is tailored. Mirrors the design Refine flow but the questions are a
 * fixed, report-specific set (no model round-trip needed). Answers are
 * flattened and passed to /api/report/outline as `reportSpec`.
 */

import { FC, useState } from "react"
import { IconArrowRight, IconSparkles } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RQ {
  id: string
  prompt: string
  kind: "single" | "multi"
  options: string[]
}

const QUESTIONS: RQ[] = [
  {
    id: "audience",
    prompt: "Who is the primary audience?",
    kind: "single",
    options: [
      "My lab team",
      "PI / group meeting",
      "Regulatory / QA",
      "Publication / external"
    ]
  },
  {
    id: "type",
    prompt: "What kind of report do you need?",
    kind: "single",
    options: [
      "Concise summary",
      "Detailed protocol & results",
      "Full study report"
    ]
  },
  {
    id: "focus",
    prompt: "What should it emphasize? (pick any)",
    kind: "multi",
    options: [
      "Hypothesis validation",
      "Method & troubleshooting",
      "Optimization",
      "Data analysis & statistics",
      "Safety & compliance"
    ]
  },
  {
    id: "emphasis",
    prompt: "Preferred format",
    kind: "single",
    options: [
      "Balanced prose + tables",
      "Mostly tables & figures",
      "Mostly narrative"
    ]
  }
]

interface ReportClarifyStepProps {
  onComplete: (spec: string) => void
  onCancel: () => void
}

export const ReportClarifyStep: FC<ReportClarifyStepProps> = ({
  onComplete,
  onCancel
}) => {
  const [selected, setSelected] = useState<Record<string, string[]>>({})

  const toggle = (q: RQ, opt: string) =>
    setSelected(prev => {
      const cur = prev[q.id] ?? []
      if (q.kind === "single") return { ...prev, [q.id]: [opt] }
      return {
        ...prev,
        [q.id]: cur.includes(opt) ? cur.filter(o => o !== opt) : [...cur, opt]
      }
    })

  const buildSpec = () =>
    QUESTIONS.map(q => {
      const v = selected[q.id] ?? []
      return v.length ? `- ${q.prompt} ${v.join(", ")}` : ""
    })
      .filter(Boolean)
      .join("\n")

  return (
    <div className="bg-ink-50 flex h-full flex-col">
      <div className="border-ink-200 shrink-0 border-b bg-white px-6 py-5">
        <div className="text-teal-journey flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em]">
          <IconSparkles size={13} /> Refine
        </div>
        <h1 className="text-ink-900 mt-1 text-2xl font-extrabold tracking-tight">
          Tailor the report
        </h1>
        <p className="text-ink-500 mt-1 text-sm">
          A few quick questions so the generated report fits your audience and
          depth.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-[760px] space-y-5">
          {QUESTIONS.map((q, i) => (
            <div
              key={q.id}
              className="border-ink-200 rounded-2xl border bg-white p-5"
            >
              <div className="text-ink-900 text-[15px] font-semibold">
                {i + 1}. {q.prompt}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {q.options.map(opt => {
                  const on = (selected[q.id] ?? []).includes(opt)
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggle(q, opt)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                        on
                          ? "border-brick bg-brick text-white"
                          : "border-ink-200 text-ink-700 hover:border-ink-300"
                      )}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-ink-200 shrink-0 border-t bg-white px-6 py-3">
        <div className="mx-auto flex max-w-[760px] items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="text-ink-400 hover:text-ink-700 text-[13px]"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => onComplete("")}
              className="text-ink-500"
            >
              Skip & generate
            </Button>
            <Button
              onClick={() => onComplete(buildSpec())}
              className="bg-brick hover:bg-brick-hover gap-2"
            >
              Generate report
              <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
