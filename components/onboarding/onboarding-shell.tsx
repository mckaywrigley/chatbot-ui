"use client"

import { cn } from "@/lib/utils"
import { IconArrowLeft, IconLoader2 } from "@tabler/icons-react"
import { FC, ReactNode } from "react"

interface OnboardingShellProps {
  stepNum: number
  totalSteps: number
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  onContinue: () => void
  continueLabel: string
  continueDisabled?: boolean
  isPending?: boolean
  onBack?: () => void
}

export const OnboardingShell: FC<OnboardingShellProps> = ({
  stepNum,
  totalSteps,
  eyebrow,
  title,
  description,
  children,
  onContinue,
  continueLabel,
  continueDisabled,
  isPending,
  onBack
}) => {
  return (
    <div className="border-line bg-surface w-full max-w-[560px] rounded-2xl border p-8 shadow-sm sm:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const idx = i + 1
            const active = idx <= stepNum
            return (
              <span
                key={idx}
                className={cn(
                  "h-1.5 w-6 rounded-full transition-colors",
                  active ? "bg-rust" : "bg-paper-2"
                )}
              />
            )
          })}
        </div>
        <span className="text-ink-3 text-[12px] font-medium uppercase tracking-wide">
          {eyebrow}
        </span>
      </div>

      <h1 className="font-display text-ink text-[30px] font-normal leading-tight tracking-[-0.01em] sm:text-[34px]">
        {title}
      </h1>
      <p className="text-ink-2 mt-2 text-[14px] leading-relaxed">
        {description}
      </p>

      <div className="mt-8">{children}</div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={isPending}
              className="text-ink-2 hover:text-ink inline-flex h-10 items-center gap-1.5 text-[13px] font-medium transition-colors disabled:opacity-50"
            >
              <IconArrowLeft size={16} />
              Back
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled}
          className="bg-rust text-paper inline-flex h-10 items-center gap-2 rounded-md px-5 text-[14px] font-medium transition-colors hover:bg-[color:var(--rust-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && <IconLoader2 size={16} className="animate-spin" />}
          {continueLabel}
        </button>
      </div>
    </div>
  )
}
