"use client"

/**
 * Interactive first-run tour. Opens with a centered WELCOME popup, then
 * spotlights the real elements that walk the user through their first design
 * (New design → type the question → refine the problem → continue), and closes
 * with a popup pointing at the replay button. "Next" ALWAYS advances (so it can
 * never get stuck), and the tour also auto-advances when the user performs the
 * action themselves. Activated only for a fresh onboarding completion (the
 * onboarding form sets the flag) or via the Tutorial button. Mounted once in
 * the app layout so it survives client navigation.
 */

import { CSSProperties, useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { markWalkthroughViewed } from "@/app/[locale]/onboarding/walkthrough-actions"
import { isWalkthroughActive, setWalkthroughActive } from "./design-coach"
import { cn } from "@/lib/utils"

interface GuidedStep {
  kind: "popup" | "spotlight"
  target?: string
  title: string
  body: string
  side?: "top" | "bottom" | "left" | "right"
  /** Run when the step becomes active (focus/scroll a field). */
  onShow?: (ctx: StepCtx) => void
  /** Run when Next is clicked (drive the app - e.g. open New design). */
  onNext?: (ctx: StepCtx) => void
  last?: boolean
}

interface StepCtx {
  router: any
  locale: string
  wsId: string
}

const TOOLTIP_W = 360
const TOOLTIP_H = 200
const PAD = 10
const GAP = 14
const STEP_KEY = "sa_tour_step"

const focusTarget = (sel: string) => {
  const el = document.querySelector(sel) as HTMLElement | null
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    setTimeout(() => el.focus?.(), 350)
  }
}

const SCRIPT: GuidedStep[] = [
  {
    kind: "popup",
    title: "Welcome to Shadow AI 👋",
    body: "Since it's your first time, here's a quick walkthrough of how to turn a research question into a full, run-ready experiment. You can skip anytime."
  },
  {
    kind: "spotlight",
    target: "[data-tour='new-design']",
    title: "Start your first experiment",
    body: "This is New design. Hit Next and I'll open it for you.",
    side: "bottom",
    onNext: ({ router, locale, wsId }) =>
      router.push(`/${locale}/${wsId}/designs/new`)
  },
  {
    kind: "spotlight",
    target: "[data-tour='design-question']",
    title: "Type your research question",
    body: "Put the question on your mind here, then Create - I'll turn it into a full experiment. Take your time; I'll wait.",
    side: "top",
    onShow: () => focusTarget("[data-tour='design-question']")
  },
  {
    kind: "spotlight",
    target: "[data-tour='problem-statement']",
    title: "Refine your problem",
    body: "Once you Create, your problem statement appears here. Tweak it and set the domain + phase below (objective is optional).",
    side: "right",
    onShow: () => focusTarget("[data-tour='problem-statement']")
  },
  {
    kind: "spotlight",
    target: "[data-tour='problem-continue']",
    title: "Continue when you're ready",
    body: "Click Continue and I'll ask a few sharp clarifying questions, then scout the literature and build the design with you.",
    side: "top"
  },
  {
    kind: "popup",
    title: "You're all set 🎉",
    body: "That's the flow. You can replay this walkthrough anytime from the Tutorial button at the top-right.",
    last: true
  }
]

export function GuidedTour() {
  const router = useRouter()
  const params = useParams() as { locale?: string; workspaceid?: string }
  const locale = params.locale ?? "en"
  const wsId = params.workspaceid ?? ""

  const [active, setActive] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  // Activate from the localStorage flag (set on fresh onboarding completion or
  // by the Tutorial button). Re-check periodically so a replay click is picked
  // up without a remount.
  useEffect(() => {
    const sync = () => {
      const on = isWalkthroughActive()
      setActive(on)
      if (on) {
        const saved = Number(
          (typeof window !== "undefined" && localStorage.getItem(STEP_KEY)) || 0
        )
        setStepIdx(Number.isFinite(saved) ? saved : 0)
      }
    }
    sync()
    const id = setInterval(sync, 1200)
    return () => clearInterval(id)
  }, [])

  const persistStep = useCallback((i: number) => {
    try {
      localStorage.setItem(STEP_KEY, String(i))
    } catch {
      /* ignore */
    }
  }, [])

  const finish = useCallback(() => {
    setActive(false)
    setWalkthroughActive(false)
    try {
      localStorage.removeItem(STEP_KEY)
    } catch {
      /* ignore */
    }
    void markWalkthroughViewed().catch(() => undefined)
  }, [])

  const step = active ? SCRIPT[stepIdx] : undefined

  // Run the step's onShow (focus/scroll) when it becomes active.
  useEffect(() => {
    if (!active || !step) return
    step.onShow?.({ router, locale, wsId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIdx])

  // Measure the spotlight target + auto-advance when the user moves themselves.
  useEffect(() => {
    if (!active) return
    const loop = () => {
      const s = SCRIPT[stepIdx]
      if (!s) return
      if (s.kind === "popup" || !s.target) {
        setRect(null)
        return
      }
      const el = document.querySelector(s.target) as HTMLElement | null
      const next = SCRIPT[stepIdx + 1]
      const nextEl =
        next?.kind === "spotlight" && next.target
          ? (document.querySelector(next.target) as HTMLElement | null)
          : null
      // Accelerator: current target gone + next appeared → user moved forward.
      if (!el && nextEl) {
        const ni = stepIdx + 1
        setStepIdx(ni)
        persistStep(ni)
        return
      }
      setRect(el ? el.getBoundingClientRect() : null)
    }
    loop()
    const interval = setInterval(loop, 400)
    const onScroll = () => loop()
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onScroll)
    return () => {
      clearInterval(interval)
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onScroll)
    }
  }, [active, stepIdx, persistStep])

  if (!active || !wsId || !step) return null

  const handleNext = () => {
    step.onNext?.({ router, locale, wsId })
    if (step.last) {
      finish()
      return
    }
    const ni = Math.min(SCRIPT.length - 1, stepIdx + 1)
    setStepIdx(ni)
    persistStep(ni)
  }

  // Spotlight cutout only when we actually found the target; otherwise the
  // tooltip centers over a plain dim overlay (never invisible/stuck).
  const cutout =
    step.kind === "spotlight" && rect
      ? {
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2
        }
      : null

  const tooltipStyle: CSSProperties = (() => {
    if (!cutout)
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: TOOLTIP_W,
        position: "fixed"
      }
    const side = step.side ?? "bottom"
    let top = cutout.top
    let left = cutout.left
    if (side === "bottom") top = cutout.top + cutout.height + GAP
    else if (side === "top") top = cutout.top - TOOLTIP_H - GAP
    else if (side === "right") left = cutout.left + cutout.width + GAP
    else if (side === "left") left = cutout.left - TOOLTIP_W - GAP
    const vw = window.innerWidth
    const vh = window.innerHeight
    top = Math.max(8, Math.min(vh - TOOLTIP_H - 8, top))
    left = Math.max(8, Math.min(vw - TOOLTIP_W - 8, left))
    return { top, left, width: TOOLTIP_W, position: "fixed" }
  })()

  return (
    <div className="fixed inset-0 z-[80]" aria-modal="true" role="dialog">
      {cutout ? (
        <>
          <div
            className="pointer-events-none fixed inset-x-0 top-0 bg-black/60"
            style={{ height: Math.max(0, cutout.top) }}
          />
          <div
            className="pointer-events-none fixed bg-black/60"
            style={{
              top: cutout.top,
              left: 0,
              width: Math.max(0, cutout.left),
              height: cutout.height
            }}
          />
          <div
            className="pointer-events-none fixed bg-black/60"
            style={{
              top: cutout.top,
              left: cutout.left + cutout.width,
              right: 0,
              height: cutout.height
            }}
          />
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 bg-black/60"
            style={{ top: cutout.top + cutout.height }}
          />
          <div
            className="ring-rust pointer-events-none fixed rounded-lg ring-2"
            style={{
              top: cutout.top,
              left: cutout.left,
              width: cutout.width,
              height: cutout.height
            }}
          />
        </>
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-black/60" />
      )}

      <div
        style={tooltipStyle}
        className="border-line bg-surface rounded-xl border p-5 shadow-2xl"
      >
        <div className="text-rust mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em]">
          Step {stepIdx + 1} of {SCRIPT.length}
        </div>
        <h3 className="font-display text-ink text-[17px] font-semibold leading-tight">
          {step.title}
        </h3>
        <p className="text-ink-2 mt-2 text-[13px] leading-relaxed">
          {step.body}
        </p>
        <div className="mt-4 flex items-center gap-1.5">
          {SCRIPT.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === stepIdx
                  ? "bg-rust w-5"
                  : i < stepIdx
                    ? "bg-rust/40 w-2"
                    : "bg-line w-2"
              )}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={finish}
            className="text-ink-3 hover:text-ink text-[12.5px] font-medium"
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="bg-rust text-paper inline-flex h-8 items-center rounded-md px-3 text-[12.5px] font-medium hover:bg-[color:var(--rust-hover)]"
          >
            {step.last ? "Finish" : stepIdx === 0 ? "Start tour" : "Next"}
          </button>
        </div>
      </div>
    </div>
  )
}
