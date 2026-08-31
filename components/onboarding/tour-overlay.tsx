"use client"

/**
 * Spotlight-style product tour. Each step optionally targets a DOM element
 * (via a CSS selector or a `data-tour` attribute); the tour draws a dark
 * overlay with a cutout around that element and renders a tooltip card next
 * to it. Steps without a target render the tooltip centered on the viewport
 * (used for the intro / outro slides).
 *
 * Designed to be re-triggerable later from a Help menu - the consumer
 * controls `open` and persists "viewed" state itself, so this component is
 * stateless apart from the current step index.
 *
 * Re-measures on scroll / resize so the highlight tracks the element even
 * when the sidebar collapses or the user resizes the window mid-tour.
 */

import { CSSProperties, useCallback, useEffect, useState } from "react"

import { cn } from "@/lib/utils"

export interface TourStep {
  /**
   * CSS selector for the element to highlight. Recommend a `data-tour="…"`
   * attribute over class-based selectors so the tour doesn't break when
   * styles change. If omitted, the tooltip renders centered.
   */
  target?: string
  title: string
  body: string
  /** Preferred side of the target to anchor the tooltip on. Auto-clamps. */
  side?: "top" | "bottom" | "left" | "right"
}

interface TourOverlayProps {
  steps: TourStep[]
  open: boolean
  onClose: () => void
}

const TOOLTIP_WIDTH = 340
const TOOLTIP_APPROX_HEIGHT = 200
const SPOTLIGHT_PADDING = 10
const TOOLTIP_GAP = 14

export function TourOverlay({ steps, open, onClose }: TourOverlayProps) {
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  // Bumping this re-runs the measure layout effect (which itself depends on
  // step/open). Used to re-measure on scroll/resize without re-binding.
  const [tick, setTick] = useState(0)

  const step = steps[stepIdx]
  const isFirst = stepIdx === 0
  const isLast = stepIdx === steps.length - 1

  // Re-measure the target element. Returns null if there's no target or the
  // element isn't on the page yet (e.g. step targets the sidebar but the
  // sidebar is collapsed at this viewport).
  const measure = useCallback(() => {
    if (!step?.target) {
      setRect(null)
      return
    }
    const el = document.querySelector(step.target) as HTMLElement | null
    if (!el) {
      setRect(null)
      return
    }
    // Bring the target into view BEFORE measuring so the highlight lands on
    // the right pixels even when the element was off-screen.
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" })
    // Wait a frame for the smooth scroll to settle, then measure.
    requestAnimationFrame(() => {
      setRect(el.getBoundingClientRect())
    })
  }, [step])

  useEffect(() => {
    if (!open) return
    measure()
    // Track scroll on any ancestor (capture-phase listener catches scrolls in
    // overflow containers, not just window).
    const onScroll = () => setTick(t => t + 1)
    const onResize = () => setTick(t => t + 1)
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onResize)
    }
    // measure depends on step; tick triggers explicit re-measures.
  }, [open, measure, tick])

  // Esc closes the tour.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open || !step) return null

  // Compute the cutout box (target bounds + padding). Null if no target or
  // target wasn't found - we fall back to a plain centered modal.
  const cutout = rect
    ? {
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2
      }
    : null

  // Position the tooltip near the cutout, then clamp into the viewport so it
  // never spills off-screen.
  const tooltipStyle: CSSProperties = (() => {
    if (!cutout) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: TOOLTIP_WIDTH,
        position: "fixed"
      }
    }
    const side = step.side ?? "bottom"
    let top = 0
    let left = 0
    switch (side) {
      case "bottom":
        top = cutout.top + cutout.height + TOOLTIP_GAP
        left = cutout.left
        break
      case "top":
        top = cutout.top - TOOLTIP_APPROX_HEIGHT - TOOLTIP_GAP
        left = cutout.left
        break
      case "right":
        top = cutout.top
        left = cutout.left + cutout.width + TOOLTIP_GAP
        break
      case "left":
        top = cutout.top
        left = cutout.left - TOOLTIP_WIDTH - TOOLTIP_GAP
        break
    }
    const vw = window.innerWidth
    const vh = window.innerHeight
    top = Math.max(8, Math.min(vh - TOOLTIP_APPROX_HEIGHT - 8, top))
    left = Math.max(8, Math.min(vw - TOOLTIP_WIDTH - 8, left))
    return { top, left, width: TOOLTIP_WIDTH, position: "fixed" }
  })()

  return (
    <div className="fixed inset-0 z-[70]" aria-modal="true" role="dialog">
      {/* Dark backdrop. When we have a cutout we render four rectangles
          around it (so the target stays visible + interactive); otherwise a
          single full-page block. */}
      {cutout ? (
        <>
          <div
            className="pointer-events-none fixed inset-x-0 top-0 bg-black/70"
            style={{ height: Math.max(0, cutout.top) }}
          />
          <div
            className="pointer-events-none fixed bg-black/70"
            style={{
              top: cutout.top,
              left: 0,
              width: Math.max(0, cutout.left),
              height: cutout.height
            }}
          />
          <div
            className="pointer-events-none fixed bg-black/70"
            style={{
              top: cutout.top,
              left: cutout.left + cutout.width,
              right: 0,
              height: cutout.height
            }}
          />
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 bg-black/70"
            style={{ top: cutout.top + cutout.height }}
          />
          {/* Highlight ring around the target. */}
          <div
            className="ring-rust pointer-events-none fixed rounded-lg shadow-2xl ring-2"
            style={{
              top: cutout.top,
              left: cutout.left,
              width: cutout.width,
              height: cutout.height
            }}
          />
        </>
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-black/70" />
      )}

      {/* Tooltip card */}
      <div
        style={tooltipStyle}
        className={cn(
          "border-line bg-surface rounded-xl border p-5 shadow-2xl"
        )}
      >
        <div className="text-rust mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em]">
          Step {stepIdx + 1} of {steps.length}
        </div>
        <h3 className="font-display text-ink text-[17px] font-semibold leading-tight">
          {step.title}
        </h3>
        <p className="text-ink-2 mt-2 text-[13px] leading-relaxed">
          {step.body}
        </p>

        {/* Step dots */}
        <div className="mt-4 flex items-center gap-1.5">
          {steps.map((_, i) => (
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
            onClick={onClose}
            className="text-ink-3 hover:text-ink text-[12.5px] font-medium"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStepIdx(i => Math.max(0, i - 1))}
                className="text-ink-2 hover:bg-paper-2 inline-flex h-8 items-center gap-1 rounded-md px-3 text-[12.5px] font-medium"
              >
                Back
              </button>
            )}
            {isLast ? (
              <button
                type="button"
                onClick={onClose}
                className="bg-rust text-paper inline-flex h-8 items-center rounded-md px-3 text-[12.5px] font-medium hover:bg-[color:var(--rust-hover)]"
              >
                Got it
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setStepIdx(i => Math.min(steps.length - 1, i + 1))
                }
                className="bg-rust text-paper inline-flex h-8 items-center rounded-md px-3 text-[12.5px] font-medium hover:bg-[color:var(--rust-hover)]"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
