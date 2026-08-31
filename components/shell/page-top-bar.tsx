"use client"

import { IconArrowLeft } from "@tabler/icons-react"
import { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { DisplayHeading, Eyebrow } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

interface PageTopBarProps {
  title: ReactNode
  subtitle?: ReactNode
  onBack?: () => void
  status?: ReactNode
  actions?: ReactNode
  className?: string
}

/**
 * Back + eyebrow + display title + status + actions.
 * Used across the design-flow stage screens and detail pages.
 */
export function PageTopBar({
  title,
  subtitle,
  onBack,
  status,
  actions,
  className
}: PageTopBarProps) {
  return (
    <div
      className={cn(
        "border-line bg-paper flex items-center gap-3.5 border-b px-8 py-3.5",
        className
      )}
    >
      {onBack && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-ink-2 h-7 gap-1.5 px-2"
          >
            <IconArrowLeft size={14} /> Back
          </Button>
          <div className="bg-line h-[18px] w-px" />
        </>
      )}
      <div className="min-w-0 flex-1">
        {subtitle && <Eyebrow className="mb-0.5 block">{subtitle}</Eyebrow>}
        <div className="flex items-center gap-2.5">
          <DisplayHeading
            as="h1"
            className="m-0 truncate text-[22px] tracking-[-0.01em]"
          >
            {title}
          </DisplayHeading>
          {status}
        </div>
      </div>
      {actions}
    </div>
  )
}
