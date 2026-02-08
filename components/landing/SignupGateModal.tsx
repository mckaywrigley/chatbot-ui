"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { RooftopsSVG } from "@/components/icons/rooftops-svg"
import {
  IconLock,
  IconSparkles,
  IconRulerMeasure,
  IconArrowRight,
  IconX
} from "@tabler/icons-react"

interface SignupGateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignupGateModal({ open, onOpenChange }: SignupGateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!inset-0 !max-h-full !w-full !max-w-full !translate-x-0 !translate-y-0 !rounded-none sm:!inset-auto sm:!left-[50%] sm:!top-[50%] sm:!max-w-[420px] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!rounded-[5px]">
        <DialogTitle className="sr-only">Sign up to continue</DialogTitle>

        {/* Close button — large and visible on mobile */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 sm:size-8"
          aria-label="Close"
        >
          <IconX size={22} className="sm:size-[16px]" />
        </button>

        <div className="flex size-full flex-col items-center justify-center px-4 pb-4 pt-8 text-center sm:px-2 sm:pb-2 sm:pt-4">
          {/* Gradient accent */}
          <div
            className="absolute inset-x-0 top-0 h-1 sm:rounded-t-lg"
            style={{
              background: "linear-gradient(90deg, #03A7FF, #50EBBC)"
            }}
          />

          {/* Logo */}
          <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-3 shadow-lg shadow-gray-900/20 sm:mb-4 sm:size-14 sm:p-2.5">
            <RooftopsSVG className="size-10 sm:size-9" />
          </div>

          {/* Lock icon badge */}
          <div className="mb-4 flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 sm:mb-3 sm:py-1 sm:text-xs">
            <IconLock size={14} />
            Free preview limit reached
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-xl">
            Ready to see more properties?
          </h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-gray-500 sm:mt-2 sm:text-sm">
            Create a free account to get instant previews on unlimited
            properties, plus{" "}
            <strong className="text-gray-700">
              3 full AI-powered roof reports
            </strong>
            .
          </p>

          {/* Feature list */}
          <div className="mt-6 w-full max-w-sm space-y-2.5 sm:mt-5 sm:space-y-2">
            {[
              {
                icon: <IconRulerMeasure size={18} />,
                text: "Unlimited instant property previews"
              },
              {
                icon: <IconSparkles size={18} />,
                text: "3 free AI-powered roof reports"
              },
              {
                icon: (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
                text: "AI roofing assistant chat"
              }
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3.5 text-left sm:rounded-lg sm:py-2.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-50 to-emerald-50 text-cyan-600 sm:size-7 sm:rounded-md">
                  {item.icon}
                </div>
                <span className="text-[15px] font-medium text-gray-700 sm:text-sm">
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:mt-6 sm:gap-2.5">
            <a
              href="/login?ref=landing-gate"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-base font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-xl hover:shadow-cyan-500/30 sm:h-12 sm:text-[15px]"
            >
              Sign Up Free
              <IconArrowRight size={20} />
            </a>
            <a
              href="/login"
              className="flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 sm:h-10 sm:text-sm"
            >
              Already have an account? Sign In
            </a>
          </div>

          <p className="mt-4 text-xs text-gray-400 sm:mt-3 sm:text-[11px]">
            No credit card required · Cancel anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
