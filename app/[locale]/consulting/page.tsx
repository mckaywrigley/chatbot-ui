"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import Image from "next/image"
import {
  IconCheck,
  IconCalendar,
  IconVideo,
  IconBrain,
  IconTrendingUp,
  IconUsers,
  IconBuildingStore,
  IconArrowRight,
  IconShieldCheck,
  IconClock,
  IconMessageCircle
} from "@tabler/icons-react"

export default function ConsultingPage() {
  const router = useRouter()

  const [playbookEmail, setPlaybookEmail] = useState("")
  const [playbookStatus, setPlaybookStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle")

  const handleCheckout = () => {
    router.push("/consulting/checkout")
  }

  const handlePlaybookSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playbookEmail || playbookStatus === "sending") return

    setPlaybookStatus("sending")
    try {
      const res = await fetch("/api/consulting/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: playbookEmail })
      })

      if (res.ok) {
        setPlaybookStatus("sent")
      } else {
        const data = await res.json()
        console.error("Playbook email failed:", data)
        setPlaybookStatus("error")
      }
    } catch (err) {
      console.error("Playbook email error:", err)
      setPlaybookStatus("error")
    }
  }

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <Image
              src="/rooftops-logo-gr-black.png"
              alt="AI Consulting for Roofing"
              width={180}
              height={40}
              className="h-8 w-auto"
            />
          </a>
          <div className="text-sm text-gray-500">A Rooftops AI Service</div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center lg:py-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-green-500/20 px-4 py-2 ring-1 ring-cyan-500/30">
            <IconBrain className="size-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-300">
              White-Glove AI Consulting
            </span>
          </div>

          <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Transform Your Roofing Business with{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
              AI in 5 Weeks
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-300">
            Exclusive 1-on-1 consulting for roofing company leaders who want to
            dominate their market using AI. Virtual sessions designed
            specifically for the roofing industry.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={handleCheckout}
              className="group flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:shadow-cyan-500/25"
            >
              Reserve Your Spot — $5,000
              <IconArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </button>
            <p className="text-sm text-gray-400">
              Only 4 spots available per month
            </p>
          </div>

          {/* Trust badges */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <IconShieldCheck className="size-5 text-green-400" />
              <span>100% Satisfaction Guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <IconVideo className="size-5 text-cyan-400" />
              <span>Virtual via Zoom</span>
            </div>
            <div className="flex items-center gap-2">
              <IconClock className="size-5 text-cyan-400" />
              <span>5 One-Hour Sessions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Built Exclusively for Roofing Leaders
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              This isn&apos;t generic business consulting. It&apos;s AI strategy
              tailored to roofing.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="mb-5 flex size-14 items-center justify-center rounded-xl bg-cyan-100">
                <IconBuildingStore className="size-7 text-cyan-600" />
              </div>
              <h3 className="mb-3 text-lg font-bold text-gray-900">
                Roofing Company Owners
              </h3>
              <p className="leading-relaxed text-gray-600">
                You&apos;re running a $1M-$10M roofing company and know AI is
                the future, but don&apos;t know where to start.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="mb-5 flex size-14 items-center justify-center rounded-xl bg-green-100">
                <IconTrendingUp className="size-7 text-green-600" />
              </div>
              <h3 className="mb-3 text-lg font-bold text-gray-900">
                Growth-Focused Leaders
              </h3>
              <p className="leading-relaxed text-gray-600">
                You want to 2x or 3x your business in the next 12-18 months and
                understand AI is the lever to pull.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="mb-5 flex size-14 items-center justify-center rounded-xl bg-purple-100">
                <IconUsers className="size-7 text-purple-600" />
              </div>
              <h3 className="mb-3 text-lg font-bold text-gray-900">
                Forward-Thinking Teams
              </h3>
              <p className="leading-relaxed text-gray-600">
                You&apos;re tired of watching competitors adopt AI while
                you&apos;re stuck with outdated processes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Program */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              The 5-Week Transformation
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Each session builds on the last. By week 5, AI is running your
              business.
            </p>
          </div>

          <div className="mx-auto max-w-4xl space-y-5">
            {[
              {
                week: "Week 1",
                title: "AI Audit & Strategy",
                desc: "We analyze your entire operation and identify the highest-impact AI opportunities. You'll leave with a 90-day AI roadmap specific to your business.",
                deliverable: "Custom AI Implementation Roadmap"
              },
              {
                week: "Week 2",
                title: "Multi-Agent Property Analysis",
                desc: "Deep dive into how AI agents analyze properties from multiple angles simultaneously. Set up instant roof measurements, damage detection, and material calculations.",
                deliverable: "Working AI Property Analysis System"
              },
              {
                week: "Week 3",
                title: "AI Sales & Estimating",
                desc: "Build AI-powered estimating workflows that generate professional proposals in minutes. Train AI on your pricing, materials, and labor rates.",
                deliverable: "AI Estimating & Proposal System"
              },
              {
                week: "Week 4",
                title: "AI Marketing & Lead Gen",
                desc: "Create AI employees that handle content, social media, email follow-ups, and lead nurturing. Never write another sales email from scratch.",
                deliverable: "AI Marketing Automation Setup"
              },
              {
                week: "Week 5",
                title: "Implementation & Scale",
                desc: "Deploy everything into your daily operations. Train your team. Set up monitoring. Build your AI advantage that competitors can't copy.",
                deliverable: "Fully Operational AI-Enhanced Business"
              }
            ].map((week, idx) => (
              <div
                key={idx}
                className="flex gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
              >
                <div className="flex shrink-0 flex-col items-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-green-500 text-lg font-bold text-white sm:size-14">
                    {idx + 1}
                  </div>
                  {idx < 4 && (
                    <div className="mt-3 h-full w-0.5 bg-gradient-to-b from-cyan-500/50 to-transparent" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="mb-1 text-sm font-semibold text-cyan-600">
                    {week.week}
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900">
                    {week.title}
                  </h3>
                  <p className="mb-4 leading-relaxed text-gray-600">
                    {week.desc}
                  </p>
                  <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700">
                    <IconCheck className="size-4" />
                    {week.deliverable}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="mb-8 text-3xl font-bold text-gray-900 sm:text-4xl">
                Everything Included
              </h2>

              <ul className="space-y-5">
                {[
                  "5 one-hour private consulting sessions via Zoom",
                  "Direct access to Steele via email between sessions",
                  "Custom AI setup for your specific business",
                  "Roofing-specific AI prompt libraries",
                  "Property analysis workflow automation",
                  "Sales proposal templates & AI training",
                  "Marketing content AI training",
                  "6 months of Rooftops AI Premium included ($174 value)",
                  "Lifetime access to consulting recordings",
                  "Private AI consulting community access"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                      <IconCheck className="size-4 text-green-600" />
                    </div>
                    <span className="text-lg text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white shadow-xl sm:p-10 lg:sticky lg:top-8">
              <h3 className="mb-6 text-2xl font-bold">Your Investment</h3>

              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold sm:text-6xl">$5,000</span>
                  <span className="text-lg text-gray-400">one-time</span>
                </div>
              </div>

              <div className="mb-8 space-y-4 text-base">
                <div className="flex items-center gap-3 text-gray-300">
                  <IconCalendar className="size-5" />
                  <span>5 weekly 1-hour sessions</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <IconVideo className="size-5" />
                  <span>Virtual via Zoom</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <IconMessageCircle className="size-5" />
                  <span>Email support between sessions</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl"
              >
                Reserve Your Spot Now
              </button>

              <p className="mt-4 text-center text-sm text-gray-400">
                Secure payment via Stripe · Satisfaction guaranteed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Capture - Not Ready to Buy? */}
      <section className="bg-gradient-to-r from-amber-50 to-orange-50 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 sm:text-3xl">
            Not Ready to Book? Get the Free Guide
          </h2>
          <p className="mb-8 text-lg text-gray-600">
            Download &ldquo;The Roofing AI Playbook&rdquo; — 27 pages on how AI
            is transforming roofing businesses. No email required for the first
            chapter.
          </p>

          {playbookStatus === "sent" ? (
            <div className="mx-auto max-w-lg rounded-lg bg-green-50 p-6 text-center ring-1 ring-green-200">
              <p className="text-lg font-semibold text-green-800">
                Check your inbox!
              </p>
              <p className="mt-1 text-sm text-green-600">
                The Roofing AI Playbook has been sent to{" "}
                <strong>{playbookEmail}</strong>
              </p>
            </div>
          ) : (
            <>
              <form
                onSubmit={handlePlaybookSubmit}
                className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row"
              >
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={playbookEmail}
                  onChange={e => setPlaybookEmail(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-3.5 text-base outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  required
                  disabled={playbookStatus === "sending"}
                />
                <button
                  type="submit"
                  disabled={playbookStatus === "sending"}
                  className="whitespace-nowrap rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 px-6 py-3.5 font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-60"
                >
                  {playbookStatus === "sending"
                    ? "Sending..."
                    : "Send Me the Playbook"}
                </button>
              </form>

              {playbookStatus === "error" && (
                <p className="mt-3 text-sm font-medium text-red-600">
                  Something went wrong. Please try again or email sb@rooftops.ai
                </p>
              )}

              <p className="mt-4 text-xs text-gray-500">
                We respect your privacy. Unsubscribe anytime.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Guarantee */}
      <section className="bg-gradient-to-r from-cyan-50 to-green-50 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex size-16 items-center justify-center rounded-full bg-white shadow-md">
            <IconShieldCheck className="size-8 text-green-600" />
          </div>
          <h2 className="mb-5 text-3xl font-bold text-gray-900 sm:text-4xl">
            The &ldquo;AI Working or Your Money Back&rdquo; Guarantee
          </h2>
          <p className="text-lg leading-relaxed text-gray-600">
            If after week 2 you don&apos;t see a clear path to AI transforming
            your business, I&apos;ll refund 100% of your investment. No
            questions asked. I&apos;m only interested in working with roofing
            companies that get real results.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Ready to AI-Enable Your Roofing Business?
          </h2>
          <p className="mb-10 text-lg text-gray-600">
            Only 4 spots available per month. Next cohort starts soon.
          </p>

          <button
            onClick={handleCheckout}
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 px-10 py-5 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl"
          >
            Reserve Your Spot — $5,000
            <IconArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </button>

          <p className="mt-6 text-sm text-gray-500">
            Questions? Email sb@rooftops.ai
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-gray-500">
          <p>© 2025 Rooftops AI Consulting. All rights reserved.</p>
          <p className="mt-2">
            This is a separate consulting service from Rooftops AI subscription
            software.
          </p>
        </div>
      </footer>
    </div>
  )
}
