"use client"

/**
 * First-design walkthrough coach. A slim, dismissible banner that rides along
 * inside the design editor during a first-run user's first experiment, giving
 * one contextual tip per phase (Problem → Literature → Hypotheses → Design) so
 * they get end-to-end without hand-holding screens. Driven by a localStorage
 * flag set when the dashboard tour runs; clears itself when they finish or
 * dismiss. Silent for everyone else.
 */

import { useEffect, useState } from "react"
import { IconSparkles, IconX } from "@tabler/icons-react"

const KEY = "sa_walkthrough"

export function isWalkthroughActive(): boolean {
  try {
    return (
      typeof window !== "undefined" && localStorage.getItem(KEY) === "active"
    )
  } catch {
    return false
  }
}

export function setWalkthroughActive(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, "active")
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

interface DesignCoachProps {
  activeTab: string
  /** True while the full-screen Refine step is showing (coach hides then). */
  refining: boolean
  busy: boolean
  hasDesign: boolean
}

export function DesignCoach({
  activeTab,
  refining,
  busy,
  hasDesign
}: DesignCoachProps) {
  const [active, setActive] = useState(false)
  useEffect(() => {
    setActive(isWalkthroughActive())
  }, [])

  if (!active || refining) return null

  const close = () => {
    setWalkthroughActive(false)
    setActive(false)
  }

  // Pick the tip for where they are. Order matters: a finished design wins.
  let step = ""
  let body = ""
  let done = false
  if (busy) {
    step = "Working…"
    body =
      "I'm running this step - literature and design can take a few minutes. You can keep this tab open."
  } else if (activeTab === "design" && hasDesign) {
    step = "Done - that's your design 🎉"
    body =
      "Bench-ready: protocol, materials, controls, and stats. Edit any field inline, or open Chat to refine it. That's the whole flow!"
    done = true
  } else if (activeTab === "problem") {
    step = "Step 1 · Problem"
    body =
      "Describe your question and pick a domain + phase. When you continue, I'll ask a few sharp clarifying questions to sharpen the search."
  } else if (activeTab === "literature") {
    step = "Step 2 · Literature"
    body =
      "I scouted primary research for you. Tick the papers most relevant - your picks become the basis for the hypotheses."
  } else if (activeTab === "hypotheses") {
    step = "Step 3 · Hypotheses"
    body =
      "Pick the hypothesis to build around (edit it if you like). I'll ask a couple of design questions, then generate the experiment."
  } else {
    return null
  }

  return (
    <div className="border-teal-journey/30 bg-teal-journey-tint relative mx-6 mt-4 flex items-start gap-3 rounded-xl border px-4 py-3">
      <div className="text-teal-journey mt-0.5 shrink-0">
        <IconSparkles size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-teal-journey text-[11px] font-bold uppercase tracking-widest">
          {step}
        </div>
        <p className="text-ink-700 mt-0.5 text-[13px] leading-snug">{body}</p>
        {done && (
          <button
            type="button"
            onClick={close}
            className="bg-teal-journey mt-2 rounded-md px-3 py-1 text-[12px] font-semibold text-white hover:opacity-90"
          >
            Finish tour
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss walkthrough"
        className="text-teal-journey/70 hover:text-teal-journey shrink-0"
      >
        <IconX size={15} />
      </button>
    </div>
  )
}
