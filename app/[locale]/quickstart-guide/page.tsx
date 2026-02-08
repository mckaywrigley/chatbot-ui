"use client"

import { useState } from "react"
import Image from "next/image"
import {
  IconCheck,
  IconDownload,
  IconHome,
  IconCalculator,
  IconFileText,
  IconRobot,
  IconTarget,
  IconTrendingUp,
  IconMail,
  IconCalendar
} from "@tabler/icons-react"

export default function QuickstartGuidePage() {
  const [activeDay, setActiveDay] = useState(1)

  const days = [
    {
      day: 1,
      title: "Your First AI Roof Report",
      icon: IconHome,
      description: "Get your first property analysis in under 2 minutes",
      tasks: [
        "Sign up for your free Rooftops AI account",
        "Enter any property address in the search bar",
        "Watch the AI analyze the roof from multiple satellite angles",
        "Review your instant report: measurements, pitch, facets",
        "Download the PDF to share with your team"
      ],
      proTip:
        "Try analyzing your own home first to get familiar with the interface. You'll be amazed at the detail the AI captures from satellite imagery.",
      timeEstimate: "10 minutes"
    },
    {
      day: 2,
      title: "AI-Powered Cost Estimating",
      icon: IconCalculator,
      description: "Build accurate estimates in minutes, not hours",
      tasks: [
        "Take your Day 1 report and open the AI chat",
        "Ask: 'Create a cost estimate for this roof replacement'",
        "Input your local material and labor rates",
        "Let the AI calculate total costs with waste factors",
        "Save the estimate to your workspace"
      ],
      proTip:
        "The AI learns your pricing patterns. The more estimates you create, the more accurate it gets for your specific market.",
      timeEstimate: "15 minutes"
    },
    {
      day: 3,
      title: "Professional Proposals",
      icon: IconFileText,
      description: "Generate client-ready proposals with one click",
      tasks: [
        "Select a completed estimate from Day 2",
        "Click 'Generate Proposal' in the AI chat",
        "Add your company branding and logo",
        "Customize the scope of work section",
        "Export as PDF and send to your first prospect"
      ],
      proTip:
        "Proposals with satellite imagery and detailed measurements have 40% higher close rates than text-only quotes.",
      timeEstimate: "10 minutes"
    },
    {
      day: 4,
      title: "Multi-Agent Property Analysis",
      icon: IconRobot,
      description: "See how AI analyzes properties from every angle",
      tasks: [
        "Analyze 3 different property types: residential, commercial, multi-family",
        "Compare how the AI detects different roof complexities",
        "Test the solar potential analysis feature",
        "Review damage detection on storm-affected roofs",
        "Export comparison reports for your sales team"
      ],
      proTip:
        "The AI uses multiple computer vision models working together—one for measurements, one for materials, one for damage detection. This multi-agent approach is what makes it so accurate.",
      timeEstimate: "20 minutes"
    },
    {
      day: 5,
      title: "AI Sales Assistant",
      icon: IconTarget,
      description: "Train your AI to handle sales conversations",
      tasks: [
        "Open Rooftops Chat and start a new conversation",
        "Ask: 'Help me respond to a lead who wants a quote'",
        "Share common objections you hear from prospects",
        "Have the AI draft follow-up emails for recent estimates",
        "Create email templates for different sales scenarios"
      ],
      proTip:
        "Feed the AI your best-performing sales emails. It will learn your voice and help you respond to leads in your style, but faster.",
      timeEstimate: "15 minutes"
    },
    {
      day: 6,
      title: "Marketing & Content Creation",
      icon: IconTrendingUp,
      description: "Use AI to generate marketing materials",
      tasks: [
        "Ask the AI to write a Facebook post about a recent project",
        "Generate 5 blog post ideas for your website",
        "Create email copy for a seasonal promotion",
        "Draft a 'Why Choose Us' page for your website",
        "Set up an automated follow-up sequence for cold leads"
      ],
      proTip:
        "The AI can create content in your brand voice. Share examples of your best marketing materials and tell it to 'write in this style.'",
      timeEstimate: "20 minutes"
    },
    {
      day: 7,
      title: "Building Your AI Workflow",
      icon: IconCalendar,
      description: "Integrate AI into your daily operations",
      tasks: [
        "Map your current workflow: lead → estimate → proposal → close",
        "Identify 3 repetitive tasks AI can handle for you",
        "Set up automated report generation for new leads",
        "Create templates for your most common roof types",
        "Schedule a weekly 'AI power hour' to process reports"
      ],
      proTip:
        "The roofers seeing the biggest ROI use AI for the full workflow: instant reports → automated estimates → professional proposals → AI follow-ups. You're now ready to implement this.",
      timeEstimate: "25 minutes"
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
          <Image
            src="/rooftops-logo-gr-black.png"
            alt="Rooftops AI"
            width={160}
            height={40}
            className="h-7 w-auto"
          />
          <a
            href="/login"
            className="rounded-lg bg-[#1A1A1A] px-4 py-2 text-sm font-semibold text-white"
          >
            Start Free Trial
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-green-500/20 px-4 py-2 ring-1 ring-cyan-500/30">
            <IconDownload className="size-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-300">
              Free Resource
            </span>
          </div>

          <h1 className="mb-4 text-4xl font-bold leading-tight sm:text-5xl">
            7-Day Roofing AI
            <span className="block bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
              Quick-Start Guide
            </span>
          </h1>

          <p className="mx-auto mb-6 max-w-2xl text-lg text-gray-300">
            Transform your roofing business with AI in just one week. No
            technical experience required.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <IconCalendar className="size-4 text-cyan-400" />
              <span>7 Days</span>
            </div>
            <div className="flex items-center gap-2">
              <IconCheck className="size-4 text-green-400" />
              <span>1-2 Hours Total</span>
            </div>
            <div className="flex items-center gap-2">
              <IconHome className="size-4 text-cyan-400" />
              <span>For Roofing Contractors</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 font-bold text-gray-900">
                Your 7-Day Journey
              </h2>
              <nav className="space-y-1">
                {days.map(day => {
                  const Icon = day.icon
                  return (
                    <button
                      key={day.day}
                      onClick={() => setActiveDay(day.day)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        activeDay === day.day
                          ? "bg-gradient-to-r from-cyan-50 to-green-50 text-gray-900"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          activeDay === day.day
                            ? "bg-gradient-to-r from-cyan-500 to-green-500 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {day.day}
                      </div>
                      <span className="font-medium">{day.title}</span>
                    </button>
                  )
                })}
              </nav>

              <div className="mt-6 rounded-lg bg-gradient-to-r from-cyan-50 to-green-50 p-4">
                <h3 className="mb-2 font-bold text-gray-900">
                  Ready to Start?
                </h3>
                <p className="mb-3 text-sm text-gray-600">
                  Get 1 free roof report and access to all AI tools.
                </p>
                <a
                  href="/login"
                  className="block w-full rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 py-2 text-center text-sm font-semibold text-white"
                >
                  Start Free Trial
                </a>
              </div>
            </div>
          </div>

          {/* Day Content */}
          <div className="lg:col-span-2">
            {days.map(day => {
              if (day.day !== activeDay) return null
              const Icon = day.icon

              return (
                <div
                  key={day.day}
                  className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-green-500">
                      <Icon className="size-7 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-cyan-600">
                        Day {day.day}
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {day.title}
                      </h2>
                    </div>
                  </div>

                  <p className="mb-6 text-lg text-gray-600">
                    {day.description}
                  </p>

                  <div className="mb-6">
                    <h3 className="mb-3 font-bold text-gray-900">
                      Today&apos;s Tasks
                    </h3>
                    <ul className="space-y-3">
                      {day.tasks.map((task, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                            <IconCheck className="size-4 text-green-600" />
                          </div>
                          <span className="text-gray-700">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-6 rounded-lg border-l-4 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-bold text-amber-800">
                        💡 Pro Tip
                      </span>
                    </div>
                    <p className="text-sm text-amber-800">{day.proTip}</p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Time estimate:</span>{" "}
                      {day.timeEstimate}
                    </div>
                    {day.day < 7 && (
                      <button
                        onClick={() => setActiveDay(day.day + 1)}
                        className="text-sm font-semibold text-cyan-600 hover:text-cyan-700"
                      >
                        Next Day →
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* CTA at bottom */}
            <div className="mt-8 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-center text-white">
              <h3 className="mb-3 text-2xl font-bold">
                Ready to Transform Your Business?
              </h3>
              <p className="mb-6 text-gray-300">
                Join thousands of roofing contractors already using AI to win
                more jobs and work less.
              </p>
              <a
                href="/login"
                className="inline-block rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
              >
                Start Your Free Trial — 1 Report Free
              </a>
              <p className="mt-4 text-sm text-gray-400">
                No credit card required · 3-day free trial available
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-gray-500">
          <p>© 2024 Rooftops AI. Free guide for roofing contractors.</p>
          <p className="mt-2">Questions? Email sb@rooftops.ai</p>
        </div>
      </footer>
    </div>
  )
}
