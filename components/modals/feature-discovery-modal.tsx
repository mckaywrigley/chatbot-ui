"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useChatbotUI } from "@/context/context"
import { RooftopsSVG } from "@/components/icons/rooftops-svg"
import Link from "next/link"

interface FeatureStep {
  icon: string
  title: string
  description: string
  isPremium?: boolean
}

interface FeatureDiscoveryModalProps {
  featureKey: string // unique key for localStorage tracking
  title: string
  subtitle: string
  steps: FeatureStep[]
  ctaText?: string
  ctaAction?: () => void
  premiumCtaText?: string
}

const STORAGE_PREFIX = "feature_discovered_"

export function FeatureDiscoveryModal({
  featureKey,
  title,
  subtitle,
  steps,
  ctaText = "Got it, let's go!",
  ctaAction,
  premiumCtaText = "Start 3-Day Free Trial"
}: FeatureDiscoveryModalProps) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<"next" | "prev">("next")
  const [isAnimating, setIsAnimating] = useState(false)
  const { userSubscription } = useChatbotUI()
  const touchStartX = useRef(0)

  const isFreeUser =
    !userSubscription ||
    userSubscription.plan_type === "free" ||
    (!userSubscription.plan_type && !userSubscription.tier)

  useEffect(() => {
    const hasSeen = localStorage.getItem(STORAGE_PREFIX + featureKey)
    if (!hasSeen) {
      const timer = setTimeout(() => setOpen(true), 800)
      return () => clearTimeout(timer)
    }
  }, [featureKey])

  const handleClose = () => {
    setOpen(false)
    localStorage.setItem(STORAGE_PREFIX + featureKey, "true")
    if (ctaAction) ctaAction()
  }

  const goToStep = (target: number) => {
    if (isAnimating || target === currentStep) return
    setDirection(target > currentStep ? "next" : "prev")
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentStep(target)
      setIsAnimating(false)
    }, 150)
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1)
    }
  }

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 50) {
      if (delta > 0 && currentStep < steps.length - 1) handleNext()
      else if (delta < 0 && currentStep > 0) handlePrev()
    }
  }

  const hasPremiumFeatures = steps.some(s => s.isPremium)
  const isLastStep = currentStep === steps.length - 1
  const step = steps[currentStep]

  return (
    <Dialog
      open={open}
      onOpenChange={val => {
        if (!val) handleClose()
      }}
    >
      <DialogContent className="!inset-0 !m-0 !max-h-none !max-w-none !translate-x-0 !translate-y-0 !gap-0 !rounded-none !border-0 !bg-white !from-transparent !to-transparent !p-0 !shadow-none sm:!inset-auto sm:!left-[50%] sm:!top-[50%] sm:!max-h-[calc(100%-40px)] sm:!max-w-[460px] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!rounded-2xl sm:!border sm:!border-gray-200 sm:!shadow-2xl">
        <DialogTitle className="sr-only">{title}</DialogTitle>

        <div
          className="flex h-full flex-col overflow-hidden sm:h-auto sm:max-h-[85vh]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* ━━━ HERO HEADER ━━━ */}
          <div className="relative shrink-0 overflow-hidden px-6 pb-5 pt-8 sm:px-8 sm:pt-10">
            {/* Subtle gradient accent line at very top */}
            <div
              className="absolute inset-x-0 top-0 h-1 sm:rounded-t-2xl"
              style={{
                background: "linear-gradient(90deg, #03A7FF, #50EBBC)"
              }}
            />

            {/* Background glow */}
            <div
              className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-[0.07] blur-3xl"
              style={{
                background: "linear-gradient(135deg, #03A7FF, #50EBBC)"
              }}
            />

            {/* Logo + brand */}
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 p-2 shadow-lg shadow-gray-900/20">
                <RooftopsSVG className="size-7" />
              </div>
              <div>
                <div className="text-[13px] font-bold tracking-tight text-gray-900">
                  Rooftops AI
                </div>
                <div className="text-[11px] font-medium text-gray-400">
                  Welcome aboard
                </div>
              </div>
            </div>

            {/* Title + subtitle */}
            <h2 className="mt-5 text-[22px] font-extrabold leading-tight tracking-tight text-gray-900 sm:text-[24px]">
              {title}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500 sm:text-sm">
              {subtitle}
            </p>
          </div>

          {/* ━━━ STEP CONTENT ━━━ */}
          <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-4 sm:px-8">
            {/* Step indicator bar */}
            {steps.length > 1 && (
              <div className="mb-5 flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToStep(i)}
                    tabIndex={-1}
                    className="group relative h-7 flex-1 cursor-pointer outline-none focus:outline-none"
                    aria-label={`Step ${i + 1} of ${steps.length}`}
                  >
                    <div
                      className={`absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full transition-all duration-300 ${
                        i === currentStep
                          ? "scale-y-100"
                          : i < currentStep
                            ? "scale-y-75 opacity-60"
                            : "scale-y-75 opacity-100"
                      }`}
                      style={{
                        background:
                          i <= currentStep
                            ? "linear-gradient(90deg, #03A7FF, #50EBBC)"
                            : "#e5e7eb"
                      }}
                    />
                    {/* Step number on active */}
                    {i === currentStep && (
                      <div
                        className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold tabular-nums"
                        style={{ color: "#03A7FF" }}
                      >
                        {i + 1}/{steps.length}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Animated step card */}
            <div
              className={`transition-all duration-200 ease-out ${
                isAnimating
                  ? direction === "next"
                    ? "-translate-x-3 opacity-0"
                    : "translate-x-3 opacity-0"
                  : "translate-x-0 opacity-100"
              }`}
            >
              <div className="rounded-2xl border border-gray-100 bg-gradient-to-b from-gray-50/80 to-white p-5 shadow-sm sm:px-6">
                {/* Icon + premium badge row */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-white text-3xl shadow-sm ring-1 ring-gray-100">
                    {step.icon}
                  </div>
                  {step.isPremium && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{
                        background: "linear-gradient(135deg, #03A7FF, #50EBBC)"
                      }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      Pro
                    </span>
                  )}
                </div>

                <h3 className="text-[17px] font-bold leading-snug text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
                  {step.description}
                </p>
              </div>
            </div>
          </div>

          {/* ━━━ FOOTER CTA ━━━ */}
          <div className="shrink-0 border-t border-gray-100 bg-gray-50/50 px-6 pb-6 pt-4 sm:px-8 sm:pb-5">
            {steps.length > 1 && !isLastStep ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="py-2 text-[13px] font-medium text-gray-400 transition-colors hover:text-gray-600"
                >
                  Skip
                </button>
                <div className="flex-1" />
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="rounded-xl px-6 py-2.5 text-[14px] font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg, #03A7FF, #0ED4A3)",
                    boxShadow: "0 4px 14px rgba(3, 167, 255, 0.25)"
                  }}
                >
                  Continue
                </button>
              </div>
            ) : (
              <>
                {isFreeUser && hasPremiumFeatures ? (
                  <div className="flex flex-col gap-2.5">
                    <button
                      onClick={handleClose}
                      className="w-full rounded-xl px-5 py-3 text-[14px] font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
                      style={{
                        background: "linear-gradient(135deg, #03A7FF, #0ED4A3)",
                        boxShadow: "0 4px 14px rgba(3, 167, 255, 0.25)"
                      }}
                    >
                      {ctaText}
                    </button>
                    <Link
                      href="/pricing"
                      onClick={handleClose}
                      className="group flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-[13px] font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]"
                    >
                      {premiumCtaText}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-transform group-hover:translate-x-0.5"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={handleClose}
                    className="w-full rounded-xl px-5 py-3.5 text-[15px] font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, #03A7FF, #0ED4A3)",
                      boxShadow: "0 4px 14px rgba(3, 167, 255, 0.25)"
                    }}
                  >
                    {ctaText}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
