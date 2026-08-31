"use client"

import { IconCheck, IconPlayerPauseFilled } from "@tabler/icons-react"
import { ReactNode } from "react"

import { ShadowAISVG } from "@/components/icons/chatbotui-svg"
import { Button } from "@/components/ui/button"
import { MonoText } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

interface AgentRunningStep {
  title: string
  detail?: ReactNode
  mono?: boolean
}

interface AgentRunningCardProps {
  title: string
  subtitle?: string
  steps: AgentRunningStep[]
  currentStep: number
  onPause?: () => void
  className?: string
}

/**
 * Dashed-vertical-timeline card showing a live agent run with step progress.
 * Done steps fill with ink + check; the active step shows an accent pulse.
 */
export function AgentRunningCard({
  title,
  subtitle,
  steps,
  currentStep,
  onPause,
  className
}: AgentRunningCardProps) {
  return (
    <div
      className={cn("border-line bg-surface rounded-lg border p-5", className)}
      style={{
        background:
          "linear-gradient(180deg, hsl(var(--paper-hsl)) 0%, hsl(var(--surface-hsl)) 100%)"
      }}
    >
      <div className="mb-3.5 flex items-center gap-3">
        <div className="bg-ink relative flex size-9 items-center justify-center rounded-md">
          <ShadowAISVG scale={18 / 24} />
          <span
            className="border-rust absolute inset-[-3px] animate-spin rounded-md border-[1.5px]"
            style={{
              borderTopColor: "transparent",
              animationDuration: "1.4s"
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-ink text-[14px] font-semibold">{title}</div>
          {subtitle && (
            <div className="text-ink-3 mt-0.5 text-[12.5px]">{subtitle}</div>
          )}
        </div>
        {onPause && (
          <Button variant="default" size="sm" onClick={onPause}>
            <IconPlayerPauseFilled size={11} /> Pause
          </Button>
        )}
      </div>

      <div className="border-line-strong ml-4 flex flex-col gap-0.5 border-l-[1.5px] border-dashed py-1 pl-4">
        {steps.map((step, i) => {
          const done = i < currentStep
          const active = i === currentStep
          return (
            <div
              key={i}
              className="relative flex items-start gap-2.5 py-1.5"
              style={{ opacity: i > currentStep ? 0.4 : 1 }}
            >
              <div
                className={cn(
                  "absolute left-[-23px] top-2 flex size-3 items-center justify-center rounded-full",
                  done && "bg-ink border-ink border-2",
                  active && "bg-paper border-rust border-2",
                  !done && !active && "bg-paper-2 border-line-strong border-2"
                )}
              >
                {done && (
                  <IconCheck size={7} stroke={3} className="text-paper" />
                )}
                {active && (
                  <span className="bg-rust animate-pulse-soft size-1 rounded-full" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "text-[13px]",
                    active ? "text-ink font-semibold" : "",
                    done ? "text-ink-2 font-medium" : "",
                    !done && !active && "text-ink font-medium"
                  )}
                >
                  {step.title}
                </div>
                {step.detail && (
                  <div
                    className={cn(
                      "text-ink-3 mt-0.5 text-[11.5px] leading-relaxed",
                      step.mono && "font-mono"
                    )}
                  >
                    {step.detail}
                  </div>
                )}
              </div>
              {active && (
                <MonoText className="text-ink-3 text-[11px]">running…</MonoText>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
