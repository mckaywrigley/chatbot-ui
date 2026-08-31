"use client"

import { FC, ReactNode } from "react"

import { AuthHero } from "@/components/auth/auth-hero"
import { Brand } from "@/components/ui/brand"
import { cn } from "@/lib/utils"

interface AuthShellProps {
  /** Page-level heading on the form panel (e.g. "Welcome back"). */
  title: string
  /** Short subtitle under the title. */
  subtitle?: string
  /** The form itself. */
  children: ReactNode
  /**
   * Optional footer link rendered below the form, e.g. the cross-link
   * between Sign in / Create account.
   */
  footer?: ReactNode
}

/**
 * Editorial two-panel auth layout, used by /login, /signup,
 * /forgot-password. Left panel is the brand hero on logo navy with the
 * full lockup; right panel hosts the form on cream paper.
 *
 * Collapses to a single column on small screens so signup is one-thumb
 * on a phone (B2C path).
 */
export const AuthShell: FC<AuthShellProps> = ({
  title,
  subtitle,
  children,
  footer
}) => {
  return (
    <div className="bg-paper flex min-h-dvh w-full">
      <AuthHero />

      {/* Form panel */}
      <main className="flex w-full flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          {/* Mobile brand */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Brand size={28} />
          </div>

          <div
            className={cn(
              "border-line bg-surface w-full rounded-2xl border p-8 shadow-sm sm:p-10"
            )}
          >
            <h1 className="font-display text-ink text-[28px] font-medium leading-tight tracking-[-0.01em]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-ink-3 mt-2 text-[13px] leading-relaxed">
                {subtitle}
              </p>
            )}
            <div className="mt-7">{children}</div>
          </div>

          {footer && (
            <div className="text-ink-3 mt-5 text-center text-[13px]">
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
