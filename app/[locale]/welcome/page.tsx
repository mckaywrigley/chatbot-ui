"use client"

/**
 * First-run greeting: three intro slides about Shadow AI, then a CTA into
 * signup. A split hero - narrative copy on the left, an animated product
 * preview on the right that illustrates each slide. Auto-advancing progress
 * bars (pause on interaction). Sets a `seen_welcome` cookie so returning
 * visitors skip straight to the app/auth. Middleware redirects an
 * unauthenticated first visit here.
 */

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { track } from "@/lib/analytics"

import { Brand } from "@/components/ui/brand"
import { Button } from "@/components/ui/button"
import {
  IconArrowDown,
  IconArrowRight,
  IconChecklist,
  IconCircleCheckFilled,
  IconFileText,
  IconFlask,
  IconShieldCheck,
  IconSparkles,
  type TablerIconsProps
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

const AUTO_MS = 6500

const SLIDES: {
  icon: (p: TablerIconsProps) => JSX.Element
  eyebrow: string
  title: string
  body: string
}[] = [
  {
    icon: IconFlask,
    eyebrow: "Design",
    title: "From a question to a bench-ready design",
    body: "Type a plain research question. Shadow AI builds the whole experiment - hypothesis, DOE, controls, materials, and a statistical plan - in minutes."
  },
  {
    icon: IconShieldCheck,
    eyebrow: "Defend",
    title: "Rigor you can defend",
    body: "Every design is literature-backed, cited, and auditable - built to stand up in group meeting, cross-functional review, and regulatory scrutiny."
  },
  {
    icon: IconChecklist,
    eyebrow: "Ship",
    title: "Built for how you actually work",
    body: "Open it after a meeting or fresh data. Refine the design in chat, then export a protocol your bench can run today. Let's make your first one."
  }
]

const setSeen = () => {
  try {
    document.cookie = `seen_welcome=1; path=/; max-age=${60 * 60 * 24 * 365}`
  } catch {
    /* ignore */
  }
}

export default function WelcomePage() {
  const router = useRouter()
  const params = useParams() as { locale?: string }
  const locale = params.locale ?? "en"
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const last = i === SLIDES.length - 1
  const Slide = SLIDES[i]
  const Icon = Slide.icon

  // Auto-advance until the user interacts, then hand them the wheel.
  useEffect(() => {
    if (paused || last) return
    const t = setTimeout(() => setI(n => n + 1), AUTO_MS)
    return () => clearTimeout(t)
  }, [i, paused, last])

  const go = (idx: number) => {
    setPaused(true)
    setI(idx)
  }

  const next = () => {
    if (last) {
      setSeen()
      track("landing_cta_clicked", { slide: i, action: "get_started" })
      router.push(`/${locale}/signup`)
      return
    }
    track("landing_slide_changed", { from: i, to: i + 1 })
    setPaused(true)
    setI(n => n + 1)
  }

  const skip = () => {
    setSeen()
    track("landing_cta_clicked", { slide: i, action: "skip" })
    router.push(`/${locale}/signup`)
  }

  return (
    <div className="bg-paper text-ink relative flex min-h-dvh flex-col overflow-hidden">
      <style>{`@keyframes sa-fill{from{width:0%}to{width:100%}}.sa-fill{animation:sa-fill linear forwards}`}</style>

      {/* Ambient editorial background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(var(--line-strong-hsl) / 0.45) 1px, transparent 0)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent 78%)"
          }}
        />
        <div
          className="absolute -right-40 -top-40 size-[520px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--rust-hsl) / 0.12), transparent 70%)"
          }}
        />
        <div
          className="absolute -bottom-40 -left-40 size-[480px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--p-problem) / 0.10), transparent 70%)"
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Brand size={24} />
        <button
          type="button"
          onClick={skip}
          className="text-ink-3 hover:text-ink text-[13px] transition-colors"
        >
          Skip intro
        </button>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-6 pb-12 md:px-10">
        <div className="grid w-full items-center gap-12 md:grid-cols-2">
          {/* Copy */}
          <div className="max-w-xl">
            <div className="text-rust mb-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
              <span className="bg-rust size-1.5 rounded-full" />
              Step {i + 1} of {SLIDES.length} · {Slide.eyebrow}
            </div>

            <div
              key={i}
              className="animate-in fade-in slide-in-from-bottom-3 duration-500"
            >
              <div className="bg-rust-soft text-rust mb-6 flex size-14 items-center justify-center rounded-2xl">
                <Icon size={26} />
              </div>
              <h1 className="font-display text-ink text-[30px] leading-[1.08] tracking-[-0.01em] md:text-[36px]">
                {Slide.title}
              </h1>
              <p className="text-ink-2 mt-4 max-w-md text-[15px] leading-relaxed">
                {Slide.body}
              </p>
            </div>

            {/* Progress bars */}
            <div className="mt-9 flex items-center gap-2">
              {SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => go(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className="bg-line h-1.5 w-10 overflow-hidden rounded-full"
                >
                  <span
                    key={`${idx}-${i}-${paused}`}
                    className={cn(
                      "bg-rust block h-full rounded-full",
                      idx < i || (idx === i && paused)
                        ? "w-full"
                        : idx > i
                          ? "w-0"
                          : "sa-fill"
                    )}
                    style={
                      idx === i && !paused
                        ? { animationDuration: `${AUTO_MS}ms` }
                        : undefined
                    }
                  />
                </button>
              ))}
            </div>

            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Button
                variant="primary"
                size="lg"
                onClick={next}
                className="w-full gap-2 sm:w-auto sm:min-w-[180px]"
              >
                {last ? "Get started" : "Next"}
                <IconArrowRight size={16} />
              </Button>
              <p className="text-ink-3 text-[13px]">
                Already have an account?{" "}
                <Link
                  href={`/${locale}/login`}
                  onClick={setSeen}
                  className="text-rust font-medium underline-offset-2 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Animated product preview */}
          <div className="hidden justify-center md:flex">
            <Preview index={i} />
          </div>
        </div>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Preview - a small mock of the product that matches the active slide.
// ---------------------------------------------------------------------------
function Preview({ index }: { index: number }) {
  return (
    <div className="border-line bg-surface w-full max-w-[400px] rounded-2xl border p-4 shadow-md">
      {/* faux window chrome */}
      <div className="mb-3 flex items-center gap-1.5 px-1">
        <span className="bg-line-strong size-2 rounded-full" />
        <span className="bg-line-strong size-2 rounded-full" />
        <span className="bg-line-strong size-2 rounded-full" />
        <span className="text-ink-4 ml-2 text-[10px] font-medium">
          Shadow AI
        </span>
      </div>

      <div
        key={index}
        className="animate-in fade-in slide-in-from-bottom-2 space-y-2.5 duration-500"
      >
        {index === 0 && <PreviewDesign />}
        {index === 1 && <PreviewRigor />}
        {index === 2 && <PreviewWorkflow />}
      </div>
    </div>
  )
}

const DESIGN_ROWS: { label: string; meta: string }[] = [
  { label: "Hypothesis", meta: "directional" },
  { label: "DOE", meta: "2³ factorial" },
  { label: "Controls", meta: "+ / − / vehicle" },
  { label: "Materials", meta: "12 items" },
  { label: "Statistical plan", meta: "ANOVA · n=4" }
]

function PreviewDesign() {
  return (
    <>
      <div className="border-line bg-paper flex items-center gap-2 rounded-lg border px-3 py-2.5">
        <IconSparkles size={15} className="text-rust shrink-0" />
        <span className="text-ink text-[12.5px]">
          How does temperature affect enzyme activity?
        </span>
        <span className="bg-ink-4 ml-auto h-3.5 w-px animate-pulse" />
      </div>
      <div className="flex justify-center py-0.5">
        <IconArrowDown size={15} className="text-ink-4" />
      </div>
      <div className="border-line bg-paper rounded-lg border p-3">
        <div className="text-ink-3 mb-2 text-[10px] font-semibold uppercase tracking-wide">
          Experiment design
        </div>
        <div className="space-y-1.5">
          {DESIGN_ROWS.map(r => (
            <div key={r.label} className="flex items-center gap-2">
              <IconCircleCheckFilled size={14} className="text-rust shrink-0" />
              <span className="text-ink-2 text-[12px]">{r.label}</span>
              <span className="text-ink-4 ml-auto text-[11px]">{r.meta}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function PreviewRigor() {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-ink-3 text-[10px] font-semibold uppercase tracking-wide">
          Hypothesis · rationale
        </span>
        <span className="text-rust bg-rust-soft inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
          <IconShieldCheck size={11} /> Literature-backed
        </span>
      </div>
      <div className="border-line bg-paper rounded-lg border p-3">
        <p className="text-ink-2 text-[12.5px] leading-relaxed">
          Catalytic rate rises with temperature to an optimum near 40 °C
          <sup className="text-rust font-semibold">1</sup>, beyond which thermal
          denaturation dominates and activity falls sharply
          <sup className="text-rust font-semibold">2,3</sup>.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Nature 2021", "Cell 2019", "J. Biol. Chem. 2020"].map(c => (
            <span
              key={c}
              className="border-line text-ink-3 rounded-md border px-1.5 py-0.5 text-[10.5px]"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

function PreviewWorkflow() {
  return (
    <>
      <div className="flex justify-end">
        <div className="bg-rust max-w-[78%] rounded-2xl rounded-br-sm px-3 py-2 text-[12px] text-white">
          Widen the temperature range to 20–60 °C
        </div>
      </div>
      <div className="flex justify-start">
        <div className="border-line bg-paper text-ink-2 max-w-[82%] rounded-2xl rounded-bl-sm border px-3 py-2 text-[12px]">
          <span className="text-ink font-medium">Updated the DOE</span> - 5
          temperature levels, n=4, controls held. Power still ≥ 0.8.
        </div>
      </div>
      <button
        type="button"
        className="border-line bg-paper text-ink hover:bg-paper-2 mt-1 flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-[12px] font-medium transition-colors"
      >
        <IconFileText size={14} className="text-rust" />
        Export protocol
      </button>
    </>
  )
}
