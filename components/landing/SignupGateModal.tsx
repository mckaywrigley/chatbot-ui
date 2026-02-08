"use client"

import {
  Dialog,
  DialogContent,
  DialogTitle
} from "@/components/ui/dialog"
import { RooftopsSVG } from "@/components/icons/rooftops-svg"
import {
  IconLock,
  IconSparkles,
  IconRulerMeasure,
  IconArrowRight
} from "@tabler/icons-react"

interface SignupGateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignupGateModal({ open, onOpenChange }: SignupGateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:!max-w-[420px]">
        <DialogTitle className="sr-only">
          Sign up to continue
        </DialogTitle>

        <div className="flex flex-col items-center px-2 pb-2 pt-4 text-center">
          {/* Gradient accent */}
          <div
            className="absolute inset-x-0 top-0 h-1 rounded-t-lg"
            style={{
              background: "linear-gradient(90deg, #03A7FF, #50EBBC)"
            }}
          />

          {/* Logo */}
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-2.5 shadow-lg shadow-gray-900/20">
            <RooftopsSVG className="size-9" />
          </div>

          {/* Lock icon badge */}
          <div className="mb-3 flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
            <IconLock size={13} />
            Free preview limit reached
          </div>

          {/* Heading */}
          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            Ready to see more properties?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Create a free account to get instant previews on unlimited
            properties, plus <strong className="text-gray-700">3 full AI-powered roof reports</strong>.
          </p>

          {/* Feature list */}
          <div className="mt-5 w-full space-y-2">
            {[
              {
                icon: <IconRulerMeasure size={16} />,
                text: "Unlimited instant property previews"
              },
              {
                icon: <IconSparkles size={16} />,
                text: "3 free AI-powered roof reports"
              },
              {
                icon: (
                  <svg
                    width="16"
                    height="16"
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
                className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2.5 text-left"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan-50 to-emerald-50 text-cyan-600">
                  {item.icon}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-6 flex w-full flex-col gap-2.5">
            <a
              href="/login?ref=landing-gate"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-[15px] font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-xl hover:shadow-cyan-500/30"
            >
              Sign Up Free
              <IconArrowRight size={18} />
            </a>
            <a
              href="/login"
              className="flex h-10 w-full items-center justify-center rounded-xl text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              Already have an account? Sign In
            </a>
          </div>

          <p className="mt-3 text-[11px] text-gray-400">
            No credit card required · Cancel anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
