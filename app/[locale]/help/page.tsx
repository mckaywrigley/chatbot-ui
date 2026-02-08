"use client"

import { useState } from "react"
import Image from "next/image"
import {
  IconSearch,
  IconMail,
  IconMessageCircle,
  IconPhone,
  IconChevronDown,
  IconChevronUp,
  IconHome,
  IconCalculator,
  IconFileText,
  IconRobot,
  IconCreditCard,
  IconUser,
  IconArrowRight
} from "@tabler/icons-react"

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    {
      category: "Getting Started",
      icon: IconHome,
      questions: [
        {
          q: "How do I get my first roof report?",
          a: "Simply sign up for a free account, enter any property address in the search bar, and our AI will analyze the roof from satellite imagery. You'll get measurements, pitch analysis, and a detailed report in under 2 minutes. No credit card required for your first report."
        },
        {
          q: "Is it really free to try?",
          a: "Yes! You get 1 free roof report with no credit card required. After that, you can upgrade to a paid plan or continue with our free tier which includes 5 AI chat messages per day."
        },
        {
          q: "How accurate are the AI measurements?",
          a: "Our AI is typically within 2-5% of manual measurements. It uses multiple satellite angles and advanced computer vision to ensure precision. Most roofers find it's more consistent than manual measuring because it eliminates human error."
        }
      ]
    },
    {
      category: "Pricing & Billing",
      icon: IconCreditCard,
      questions: [
        {
          q: "What plans do you offer?",
          a: "We have four plans: Starter (Free - 1 report), Pro ($25/mo - 20 reports), Business ($84/mo - 100 reports + proposals), and AI Employee Pro ($169/mo - includes voice/SMS). All paid plans have a 3-day free trial."
        },
        {
          q: "Can I change plans anytime?",
          a: "Absolutely! You can upgrade or downgrade at any time. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your current billing period."
        },
        {
          q: "Do unused reports roll over?",
          a: "No, report limits reset on the 1st of each month. We recommend choosing a plan that fits your typical monthly usage. You can always upgrade temporarily if you have a busy month."
        },
        {
          q: "How do I cancel my subscription?",
          a: "You can cancel anytime from your account settings. Go to Settings → Billing → Cancel Subscription. You'll continue to have access until the end of your current billing period."
        }
      ]
    },
    {
      category: "AI Reports & Estimates",
      icon: IconCalculator,
      questions: [
        {
          q: "What information is in a roof report?",
          a: "Each report includes: total square footage, roof pitch/angle, number of facets/faces, ridge length, valley length, eave length, and recommended materials. Business and Pro plans also include cost estimates and solar potential analysis."
        },
        {
          q: "Can I export the reports?",
          a: "Yes! All reports can be exported as PDFs. Pro and Business plans can also export data in formats compatible with popular roofing software. Look for the 'Export' button on any completed report."
        },
        {
          q: "How do I create a cost estimate?",
          a: "After generating a roof report, open the AI chat and ask it to create an estimate. Input your local material and labor costs, and the AI will calculate the total including waste factors. You can save and reuse estimate templates."
        }
      ]
    },
    {
      category: "Proposals & Documents",
      icon: IconFileText,
      questions: [
        {
          q: "How do I create a professional proposal?",
          a: "Start with a completed estimate, then click 'Generate Proposal' in the AI chat. Add your company branding, customize the scope of work, and export as a branded PDF. Business plan includes proposal templates."
        },
        {
          q: "Can I customize the proposals?",
          a: "Yes! You can add your logo, company colors, custom terms and conditions, and modify any section of the proposal. Save templates for different job types (repairs, replacements, new construction)."
        }
      ]
    },
    {
      category: "AI Assistant Features",
      icon: IconRobot,
      questions: [
        {
          q: "What can the AI chatbot do?",
          a: "The AI assistant can: answer roofing questions, help with estimates, draft emails and proposals, create marketing content, analyze reports, suggest improvements, and guide you through using the platform. Think of it as your roofing business consultant."
        },
        {
          q: "Is the AI available 24/7?",
          a: "Yes! The AI chat is always available. However, AI Employee Pro plan includes 24/7 phone and SMS answering for your customers — not just for you."
        },
        {
          q: "How do I train the AI on my business?",
          a: "The AI learns from your interactions. Share examples of your best proposals, emails, and pricing. Tell it 'write in this style' or 'use my pricing structure' and it will adapt to your preferences."
        }
      ]
    },
    {
      category: "Account & Technical",
      icon: IconUser,
      questions: [
        {
          q: "I forgot my password. How do I reset it?",
          a: "Go to the login page and click 'Forgot Password'. Enter your email and we'll send you a reset link. If you don't see it, check your spam folder."
        },
        {
          q: "How do I update my profile or company info?",
          a: "Go to Settings in your dashboard. You can update your name, email, company details, and branding elements there."
        },
        {
          q: "What browsers are supported?",
          a: "Rooftops AI works best on Chrome, Safari, Firefox, and Edge (latest versions). Mobile browsers are supported but we recommend desktop for the best experience with reports and proposals."
        }
      ]
    }
  ]

  const filteredFaqs = searchQuery
    ? faqs
        .map(cat => ({
          ...cat,
          questions: cat.questions.filter(
            q =>
              q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
              q.a.toLowerCase().includes(searchQuery.toLowerCase())
          )
        }))
        .filter(cat => cat.questions.length > 0)
    : faqs

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <a href="/">
            <Image
              src="/rooftops-logo-gr-black.png"
              alt="Rooftops AI"
              width={160}
              height={40}
              className="h-7 w-auto"
            />
          </a>
          <a
            href="/login"
            className="rounded-lg bg-[#1A1A1A] px-4 py-2 text-sm font-semibold text-white"
          >
            Sign In
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="mb-4 text-4xl font-bold">How Can We Help?</h1>
          <p className="mb-8 text-lg text-gray-300">
            Find answers to common questions or get in touch with our team
          </p>

          {/* Search */}
          <div className="relative mx-auto max-w-xl">
            <IconSearch className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border-0 bg-white/10 py-4 pl-12 pr-4 text-white outline-none ring-1 ring-white/20 backdrop-blur-sm placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-cyan-100">
              <IconMail className="size-6 text-cyan-600" />
            </div>
            <h3 className="mb-2 font-bold text-gray-900">Email Us</h3>
            <p className="mb-3 text-sm text-gray-600">
              Get a response within 24 hours
            </p>
            <a
              href="mailto:sb@rooftops.ai"
              className="text-sm font-semibold text-cyan-600 hover:text-cyan-700"
            >
              sb@rooftops.ai
            </a>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-100">
              <IconMessageCircle className="size-6 text-green-600" />
            </div>
            <h3 className="mb-2 font-bold text-gray-900">AI Chat</h3>
            <p className="mb-3 text-sm text-gray-600">
              Instant answers from our AI assistant
            </p>
            <a
              href="/login"
              className="inline-flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700"
            >
              Start Chat <IconArrowRight className="size-4" />
            </a>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-purple-100">
              <IconPhone className="size-6 text-purple-600" />
            </div>
            <h3 className="mb-2 font-bold text-gray-900">AI Consulting</h3>
            <p className="mb-3 text-sm text-gray-600">
              1-on-1 help implementing AI in your business
            </p>
            <a
              href="/consulting"
              className="inline-flex items-center gap-1 text-sm font-semibold text-purple-600 hover:text-purple-700"
            >
              Learn More <IconArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto max-w-4xl px-4 pb-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">
          Frequently Asked Questions
        </h2>

        {filteredFaqs.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-600">
              No results found for &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 text-sm font-semibold text-cyan-600"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredFaqs.map((category, catIdx) => {
              const Icon = category.icon
              return (
                <div
                  key={catIdx}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100">
                      <Icon className="size-5 text-gray-600" />
                    </div>
                    <h3 className="font-bold text-gray-900">
                      {category.category}
                    </h3>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {category.questions.map((faq, faqIdx) => {
                      const globalIdx = catIdx * 100 + faqIdx
                      const isOpen = openFaq === globalIdx

                      return (
                        <div key={faqIdx} className="p-4">
                          <button
                            onClick={() =>
                              setOpenFaq(isOpen ? null : globalIdx)
                            }
                            className="flex w-full items-center justify-between text-left"
                          >
                            <span className="font-medium text-gray-900">
                              {faq.q}
                            </span>
                            {isOpen ? (
                              <IconChevronUp className="size-5 text-gray-400" />
                            ) : (
                              <IconChevronDown className="size-5 text-gray-400" />
                            )}
                          </button>

                          {isOpen && (
                            <p className="mt-3 leading-relaxed text-gray-600">
                              {faq.a}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-16">
        <div className="rounded-2xl bg-gradient-to-r from-cyan-500 to-green-500 p-8 text-center text-white">
          <h2 className="mb-3 text-2xl font-bold">Still Need Help?</h2>
          <p className="mb-6 text-white/90">
            Our team is here to help you get the most out of Rooftops AI
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="mailto:sb@rooftops.ai"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-gray-900"
            >
              Email Support
            </a>
            <a
              href="/consulting"
              className="rounded-lg border-2 border-white bg-transparent px-6 py-3 font-semibold text-white"
            >
              Book Consulting Call
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-gray-500">
          <p>© 2024 Rooftops AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
