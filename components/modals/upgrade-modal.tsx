"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { IconCheck, IconX } from "@tabler/icons-react"
import { useRouter } from "next/navigation"

type UpgradeReason =
  | "report_limit"
  | "chat_limit"
  | "web_search_limit"
  | "agent_access"

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason: UpgradeReason
}

const REASON_MESSAGES = {
  report_limit: {
    title: "Report Limit Reached",
    description: "You've used your free report. Upgrade to generate more!"
  },
  chat_limit: {
    title: "Chat Limit Reached",
    description: "Daily chat limit reached. Upgrade for 1000 messages/month!"
  },
  web_search_limit: {
    title: "Web Search Unavailable",
    description: "Upgrade to Premium for 50 web searches/month"
  },
  agent_access: {
    title: "Agents Available on Premium",
    description: "Unlock AI agents with Premium or Business plans"
  }
}

export function UpgradeModal({
  open,
  onOpenChange,
  reason
}: UpgradeModalProps) {
  const router = useRouter()
  const message = REASON_MESSAGES[reason]

  const handleUpgrade = (tier: "premium" | "business") => {
    onOpenChange(false)
    // Navigate to pricing page with pre-selected tier
    router.push(`/pricing?plan=${tier}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {message.title}
          </DialogTitle>
          <DialogDescription>{message.description}</DialogDescription>
        </DialogHeader>

        {/* Trial banner */}
        <div className="rounded-lg bg-gradient-to-r from-cyan-50 to-green-50 p-3 text-center dark:from-cyan-950/30 dark:to-green-950/30">
          <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
            Start with a 3-day free trial — no charge until day 4
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Free Tier */}
          <div className="flex flex-col rounded-lg border border-gray-200 p-6 dark:border-gray-700">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Free
              </h3>
              <div className="mt-2 flex items-baseline">
                <span className="text-3xl font-bold">$0</span>
                <span className="ml-1 text-gray-600 dark:text-gray-400">
                  /mo
                </span>
              </div>
            </div>

            <div className="mb-6 flex-1 space-y-3">
              <div className="flex items-start gap-2">
                <IconCheck
                  size={20}
                  className="mt-0.5 text-green-600 dark:text-green-400"
                  aria-hidden="true"
                />
                <span className="text-sm">1 report</span>
              </div>
              <div className="flex items-start gap-2">
                <IconCheck
                  size={20}
                  className="mt-0.5 text-green-600 dark:text-green-400"
                  aria-hidden="true"
                />
                <span className="text-sm">5 chat messages/day (GPT-4o)</span>
              </div>
              <div className="flex items-start gap-2">
                <IconX
                  size={20}
                  className="mt-0.5 text-gray-400 dark:text-gray-600"
                  aria-hidden="true"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  No web searches
                </span>
              </div>
              <div className="flex items-start gap-2">
                <IconX
                  size={20}
                  className="mt-0.5 text-gray-400 dark:text-gray-600"
                  aria-hidden="true"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  View agents only
                </span>
              </div>
            </div>

            <Button variant="outline" disabled className="w-full">
              Current Plan
            </Button>
          </div>

          {/* Premium Tier */}
          <div className="relative flex flex-col rounded-lg border-2 border-cyan-500 p-6 shadow-xl dark:border-cyan-400">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-gradient-to-r from-cyan-500 to-green-500 px-3 py-1 text-xs font-semibold text-white">
                MOST POPULAR
              </span>
            </div>

            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Pro
              </h3>
              <div className="mt-2 flex items-baseline">
                <span className="text-3xl font-bold">$25</span>
                <span className="ml-1 text-gray-600 dark:text-gray-400">
                  /mo
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Billed annually ($300/yr) — save $48
              </p>
            </div>

            <div className="mb-6 flex-1 space-y-3">
              <div className="flex items-start gap-2">
                <IconCheck
                  size={20}
                  className="mt-0.5 text-green-600 dark:text-green-400"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">20 reports/month</span>
              </div>
              <div className="flex items-start gap-2">
                <IconCheck
                  size={20}
                  className="mt-0.5 text-green-600 dark:text-green-400"
                  aria-hidden="true"
                />
                <span className="text-sm">1,000 GPT-5 messages/month</span>
              </div>
              <div className="flex items-start gap-2">
                <IconCheck
                  size={20}
                  className="mt-0.5 text-green-600 dark:text-green-400"
                  aria-hidden="true"
                />
                <span className="text-sm">50 web searches/month</span>
              </div>
              <div className="flex items-start gap-2">
                <IconCheck
                  size={20}
                  className="mt-0.5 text-green-600 dark:text-green-400"
                  aria-hidden="true"
                />
                <span className="text-sm">AI cost estimates included</span>
              </div>
            </div>

            <Button
              onClick={() => handleUpgrade("premium")}
              className="w-full bg-gradient-to-r from-cyan-500 to-green-500 text-white hover:from-cyan-600 hover:to-green-600"
            >
              Start Free Trial
            </Button>
          </div>

          {/* Business Tier */}
          <div className="flex flex-col rounded-lg border border-gray-200 p-6 dark:border-gray-700">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Business
              </h3>
              <div className="mt-2 flex items-baseline">
                <span className="text-3xl font-bold">$84</span>
                <span className="ml-1 text-gray-600 dark:text-gray-400">
                  /mo
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Billed annually ($1,008/yr) — save $180
              </p>
            </div>

            <div className="mb-6 flex-1 space-y-3">
              <div className="flex items-start gap-2">
                <IconCheck
                  size={20}
                  className="mt-0.5 text-green-600 dark:text-green-400"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">100 reports/month</span>
              </div>
              <div className="flex items-start gap-2">
                <IconCheck
                  size={20}
                  className="mt-0.5 text-green-600 dark:text-green-400"
                  aria-hidden="true"
                />
                <span className="text-sm">5,000 GPT-5 messages/month</span>
              </div>
              <div className="flex items-start gap-2">
                <IconCheck
                  size={20}
                  className="mt-0.5 text-green-600 dark:text-green-400"
                  aria-hidden="true"
                />
                <span className="text-sm">AI proposals & follow-ups</span>
              </div>
              <div className="flex items-start gap-2">
                <IconCheck
                  size={20}
                  className="mt-0.5 text-green-600 dark:text-green-400"
                  aria-hidden="true"
                />
                <span className="text-sm">Solar analysis included</span>
              </div>
            </div>

            <Button
              onClick={() => handleUpgrade("business")}
              variant="outline"
              className="w-full"
            >
              Start Free Trial
            </Button>
          </div>
        </div>

        <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          Cancel anytime. No hidden fees. No charge for 3 days.
        </div>
      </DialogContent>
    </Dialog>
  )
}
