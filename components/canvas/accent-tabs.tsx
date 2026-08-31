"use client"

import { cn } from "@/lib/utils"
import { ReactNode } from "react"
import { IconCheck, IconLock } from "@tabler/icons-react"

export type AccentKey =
  | "teal-journey"
  | "orange-product"
  | "purple-persona"
  | "sage-brand"
  | "neutral"

export type TabStatus = "locked" | "active" | "review" | "approved"

export interface AccentTabDef {
  key: string
  label: string
  accent: AccentKey
  icon?: ReactNode
  disabled?: boolean
  status?: TabStatus
  primary?: boolean
  sublabel?: string
}

interface AccentTabsProps {
  tabs: AccentTabDef[]
  activeKey: string
  onChange: (key: string) => void
  className?: string
}

// All phase accents collapse to editorial ink + rust in the new design
// system - the stage identity is now carried by the Stepper/phase tints,
// not by tab chrome color. Kept `AccentKey` in the signature so legacy
// callsites compile without ripping; the rendered look is unified.
const ACCENT_CLASSES: Record<
  AccentKey,
  { active: string; inactive: string; activeText: string }
> = {
  "teal-journey": {
    active: "bg-surface border-ink text-ink shadow-sm",
    inactive: "bg-paper-2 text-ink-3 hover:text-ink",
    activeText: "text-ink"
  },
  "orange-product": {
    active: "bg-surface border-ink text-ink shadow-sm",
    inactive: "bg-paper-2 text-ink-3 hover:text-ink",
    activeText: "text-ink"
  },
  "purple-persona": {
    active: "bg-surface border-ink text-ink shadow-sm",
    inactive: "bg-paper-2 text-ink-3 hover:text-ink",
    activeText: "text-ink"
  },
  "sage-brand": {
    active: "bg-surface border-ink text-ink shadow-sm",
    inactive: "bg-paper-2 text-ink-3 hover:text-ink",
    activeText: "text-ink"
  },
  neutral: {
    active: "bg-surface border-ink text-ink shadow-sm",
    inactive: "bg-paper-2 text-ink-3 hover:text-ink",
    activeText: "text-ink"
  }
}

export function AccentTabs({
  tabs,
  activeKey,
  onChange,
  className
}: AccentTabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "border-line bg-paper flex w-full items-stretch gap-3 border-b px-6 pb-3 pt-4",
        className
      )}
    >
      {tabs.map(tab => {
        const isActive = tab.key === activeKey
        const isDisabled = tab.disabled === true
        const c = ACCENT_CLASSES[tab.accent]
        const status = tab.status
        const isPrimary = tab.primary === true

        // Issue #8 - the new-report page had the Overview tab visibly
        // narrower than Inputs/Report because `primary` got `flex-[1.5]`
        // and the others `flex-[0.8]`, while the heights were 56 vs 50.
        // Now every tab takes flex-1 (equal share) and the same height,
        // so a 3-tab row reads as three balanced cells. Primary keeps
        // its left-anchored sublabel and the bottom accent stripe.
        const baseBtnClasses = cn(
          "user-select-none relative flex h-[56px] min-w-0 flex-1 items-center rounded-lg border-2 px-3 py-2 transition-all duration-200",
          isPrimary
            ? "justify-start gap-2 border-b-[5px]"
            : "justify-center gap-2",
          isDisabled
            ? "bg-paper-3 text-ink-4 cursor-not-allowed border-transparent opacity-60"
            : isActive
              ? cn(
                  c.active,
                  // Subtle lift, no scale - scaling made the primary tab
                  // wider than its inactive neighbours and broke the
                  // 3-cell alignment the scientist flagged.
                  "z-[2] -translate-y-0.5 shadow-md"
                )
              : cn(
                  c.inactive,
                  "border-black/10 hover:-translate-y-0.5",
                  isPrimary && "border-b-[5px] border-b-black/20"
                )
        )

        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onClick={() => {
              if (!isDisabled) onChange(tab.key)
            }}
            className={baseBtnClasses}
          >
            {isDisabled && <IconLock size={14} className="shrink-0" />}
            {!isDisabled && tab.icon && (
              <span
                className={cn("shrink-0 opacity-80", isActive && "opacity-100")}
              >
                {tab.icon}
              </span>
            )}

            <span
              className={cn(
                "flex min-w-0 flex-1 flex-col items-start overflow-hidden leading-tight",
                !isPrimary && "items-start"
              )}
            >
              <span
                className={cn(
                  "max-w-full truncate text-[10px] font-bold uppercase tracking-[0.07em] opacity-80",
                  isActive && "opacity-100"
                )}
              >
                {tab.label}
              </span>
              {tab.sublabel && (
                <span
                  className={cn(
                    "max-w-full truncate text-[13px]",
                    isPrimary
                      ? isActive
                        ? "text-ink font-semibold"
                        : "text-ink-3 font-medium"
                      : "text-ink-2 font-normal"
                  )}
                >
                  {tab.sublabel}
                </span>
              )}
            </span>

            {/* Status chip on the right */}
            {!isDisabled && (
              <span className="ml-auto flex shrink-0 items-center">
                {status === "approved" ? (
                  <span className="flex size-[18px] items-center justify-center rounded-full bg-current">
                    <IconCheck size={11} className="text-white" />
                  </span>
                ) : status === "review" ? (
                  <span className="size-2 animate-pulse rounded-full bg-amber-400" />
                ) : (
                  <span className="size-[18px] rounded-full border-2 border-current opacity-50" />
                )}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function accentAccentColor(accent: AccentKey): string {
  return ACCENT_CLASSES[accent].activeText
}
