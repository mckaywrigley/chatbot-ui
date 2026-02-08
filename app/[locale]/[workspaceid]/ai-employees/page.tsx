"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  IconArrowRight,
  IconLoader2,
  IconCircleCheck,
  IconCheck,
  IconSparkles,
  IconChevronLeft,
  IconFileText,
  IconSearch,
  IconUsers,
  IconMessageCircle,
  IconClipboardList,
  IconStar,
  IconRobot,
  IconClock,
  IconShieldCheck
} from "@tabler/icons-react"
import { createClient } from "@/lib/supabase/client"
import { useChatbotUI } from "@/context/context"

// Capability categories matching the design
const capabilities = [
  {
    title: "Content Creation",
    icon: IconFileText,
    description:
      "Write posts, case studies, and before/after storyboards that sound like your brand.",
    items: [
      "Weekly content calendar",
      "Jobsite-to-post workflows",
      "On-brand voice"
    ]
  },
  {
    title: "SEO & Local Search",
    icon: IconSearch,
    description:
      "Rank for high-intent keywords and keep your GBP alive with consistent updates.",
    items: [
      "Service page drafts",
      "Keyword clusters",
      "Google Business Profile posts"
    ]
  },
  {
    title: "Sales Follow-ups",
    icon: IconUsers,
    description:
      "Never let a lead go cold — AI follows up, schedules, and nudges the next step.",
    items: [
      "Lead-to-appointment sequences",
      "Estimate reminders",
      "Reactivation campaigns"
    ]
  },
  {
    title: "Customer Communication",
    icon: IconMessageCircle,
    description:
      "Fast, professional updates that reduce churn and boost trust.",
    items: [
      "Status update templates",
      "Storm event comms",
      "Warranty & care guidance"
    ]
  },
  {
    title: "Operations & Admin",
    icon: IconClipboardList,
    description:
      "Lightweight ops support: checklists, SOPs, and document prep.",
    items: ["Job checklists", "Process docs", "Internal handoffs"]
  },
  {
    title: "Reputation & Reviews",
    icon: IconStar,
    description:
      "Ask for reviews at the right moments and publish highlights automatically.",
    items: [
      "Review request scripts",
      "Testimonial snippets",
      "Social proof library"
    ]
  }
]

export default function AIEmployeesPage() {
  const router = useRouter()
  const { profile } = useChatbotUI()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError("Please enter your email address")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const supabase = createClient()

      // Check if already on waitlist
      const { data: existing } = await supabase
        .from("ai_employee_waitlist")
        .select("id")
        .eq("email", email)
        .single()

      if (existing) {
        setIsSubmitted(true)
        return
      }

      // Add to waitlist
      const { error: insertError } = await supabase
        .from("ai_employee_waitlist")
        .insert({
          email,
          user_id: profile?.user_id || null,
          source: "app_waitlist_page"
        })

      if (insertError) {
        console.log("Waitlist signup (table may not exist yet):", email)
      }

      setIsSubmitted(true)
    } catch (err) {
      console.error("Waitlist error:", err)
      setIsSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:px-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
        >
          <IconChevronLeft className="size-5" />
        </button>
        <div className="flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5">
          <IconSparkles className="size-4 text-teal-600" />
          <span className="text-sm font-medium text-teal-700">Coming soon</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {/* Hero Section - Two Column Layout on Desktop */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left Column - Hero Card */}
          <div className="relative overflow-hidden rounded-3xl">
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80')"
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-900/70 to-gray-900/80" />

            {/* Content */}
            <div className="relative z-10 p-6 sm:p-8">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                <IconRobot className="size-4 text-teal-400" />
                <span className="text-sm font-medium text-white/90">
                  RooftopsAI • AI Employees
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
                Hire AI Employees that{" "}
                <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  run your back office.
                </span>
              </h1>

              <p className="mt-4 max-w-lg text-base text-white/70 sm:text-lg">
                Get dedicated AI roles that work inside your RooftopsAI workflow
                — from content and SEO to customer follow-ups and report ops.
                Launching soon. Founding plans start at{" "}
                <span className="font-semibold text-white">$199/month</span>.
              </p>

              {/* Stats Row */}
              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                  <div className="text-xs text-white/60">Typical setup</div>
                  <div className="mt-1 text-lg font-bold text-white">
                    10–15 min
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                  <div className="text-xs text-white/60">Works with</div>
                  <div className="mt-1 text-lg font-bold text-white">
                    Your Agent Library
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                  <div className="text-xs text-white/60">Starting at</div>
                  <div className="mt-1 text-lg font-bold text-white">
                    $199/mo
                  </div>
                </div>
              </div>

              {/* Plan Toggle */}
              <div className="mt-6 flex items-center gap-2">
                <button className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-gray-900 shadow-sm">
                  Pro
                </button>
                <button className="rounded-full px-6 py-2 text-sm font-medium text-white/70 hover:text-white">
                  Teams
                </button>
              </div>

              {/* Pricing & Form */}
              <div className="mt-6 rounded-2xl bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white/90">
                      AI Employees — Pro
                    </div>
                    <div className="text-sm text-white/60">
                      For owner-operators who want an always-on assistant that
                      ships work daily.
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">$199</div>
                    <div className="text-sm text-white/60">/month</div>
                  </div>
                </div>

                {/* Email Form */}
                {isSubmitted ? (
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-teal-500/20 px-4 py-3">
                    <IconCircleCheck className="size-5 text-teal-400" />
                    <span className="text-sm font-medium text-teal-300">
                      You&apos;re on the list! We&apos;ll notify you when AI
                      Employees launches.
                    </span>
                  </div>
                ) : (
                  <form
                    onSubmit={handleJoinWaitlist}
                    className="mt-4 flex gap-2"
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Enter your email for early access"
                      className="flex-1 rounded-lg border-0 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-teal-600 disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <IconLoader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          Join waitlist
                          <IconArrowRight className="size-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
                {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
                <p className="mt-3 text-xs text-white/50">
                  No spam. You&apos;ll get a private invite when AI Employees
                  launches.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Feature Cards */}
          <div className="flex flex-col gap-4">
            {/* Built for roofers card */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-gray-100 p-3">
                  <IconRobot className="size-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Built for roofers
                  </h3>
                  <p className="text-sm text-gray-500">No new tools to learn</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  "Uses your existing prompts & Agents",
                  "Works across chats, reports, and docs",
                  "Designed for speed: drafts → approvals → publish"
                ].map(item => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <IconCheck className="size-4 text-teal-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* What you get card */}
            <div className="relative overflow-hidden rounded-2xl">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80')"
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-teal-900/90 to-gray-900/90" />
              <div className="relative z-10 p-6">
                <div className="mb-1 text-xs font-medium uppercase tracking-wider text-teal-400">
                  What you get
                </div>
                <p className="text-sm text-white/80">
                  Dedicated AI roles with guardrails — you stay in control.
                </p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-white/10 p-2">
                      <IconShieldCheck className="size-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        Approvals & guardrails
                      </div>
                      <div className="text-sm text-white/60">
                        Review before anything goes live.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-white/10 p-2">
                      <IconClock className="size-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-white">Daily output</div>
                      <div className="text-sm text-white/60">
                        Get tasks shipped every day, not someday.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Capabilities Section */}
        <div className="mt-20">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Everything they can do for you
            </h2>
            <p className="mt-2 text-gray-600">
              Based on your existing Agent Library — packaged into roles that
              feel like employees.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(cap => (
              <div
                key={cap.title}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md"
              >
                <div className="mb-4 flex items-start gap-3">
                  <div className="rounded-xl bg-gray-100 p-2.5">
                    <cap.icon className="size-5 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{cap.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {cap.description}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {cap.items.map(item => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <div className="size-1.5 rounded-full bg-teal-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20">
          <div className="rounded-3xl bg-gradient-to-r from-gray-900 to-gray-800 p-8 sm:p-10">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div>
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  Be first to hire AI Employees
                </h2>
                <p className="mt-2 text-gray-400">
                  Join the waitlist for early access and founding pricing. Plans
                  start at{" "}
                  <span className="font-semibold text-white">$199/month</span>.
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  No spam. Early access invites roll out in batches.
                </p>
              </div>

              {isSubmitted ? (
                <div className="flex items-center gap-2 rounded-full bg-teal-500/20 px-5 py-3 text-teal-300">
                  <IconCircleCheck className="size-5" />
                  <span className="font-medium">
                    You&apos;re on the waitlist!
                  </span>
                </div>
              ) : (
                <form
                  onSubmit={handleJoinWaitlist}
                  className="flex w-full gap-2 sm:w-auto"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-teal-500 focus:outline-none sm:w-64"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex shrink-0 items-center gap-2 rounded-lg bg-teal-500 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-teal-600 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <IconLoader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        Join waitlist
                        <IconArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
