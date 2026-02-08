"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import {
  IconCalculator,
  IconFileText,
  IconMessageCircle,
  IconTargetArrow,
  IconTrendingUp,
  IconStar,
  IconQuote,
  IconChevronLeft,
  IconChevronRight,
  IconRobot,
  IconFileAnalytics,
  IconSend,
  IconUserBolt,
  IconSparkles,
  IconBrandInstagram,
  IconMail,
  IconRocket
} from "@tabler/icons-react"
import { createClient } from "@/lib/supabase/client"
import { ExitIntentPopup } from "@/components/ui/exit-intent-popup"
import LandingHeroMap from "@/components/landing/LandingHeroMap"
import PropertyPreviewDrawer from "@/components/explore/PropertyPreviewDrawer"
import { SignupGateModal } from "@/components/landing/SignupGateModal"

// Testimonials data for social proof
const testimonials = [
  {
    quote:
      "Rooftops AI cut my estimate time from 2 hours to 10 minutes. I'm closing 40% more jobs because I can respond faster.",
    name: "Mike Rodriguez",
    company: "Rodriguez Roofing",
    location: "Dallas, TX",
    metric: "+40% close rate"
  },
  {
    quote:
      "The satellite roof reports are incredibly accurate. My crew trusts the measurements and we rarely have material overruns now.",
    name: "Sarah Chen",
    company: "Summit Roofing Co",
    location: "Denver, CO",
    metric: "15% material savings"
  },
  {
    quote:
      "I used to spend Sundays doing paperwork. Now the AI handles my proposals and follow-ups. Got my weekends back.",
    name: "James Wilson",
    company: "Wilson & Sons Roofing",
    location: "Atlanta, GA",
    metric: "+12 hrs/week saved"
  }
]

export default function LandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  // Interactive map hero state
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [selectedAddress, setSelectedAddress] = useState("")
  const [showPreviewDrawer, setShowPreviewDrawer] = useState(false)
  const [showSignupGate, setShowSignupGate] = useState(false)

  // Check auth in background without blocking render
  useEffect(() => {
    const checkAuth = async () => {
      const code = searchParams.get("code")
      if (code) {
        router.push(`/auth/callback?code=${code}`)
        return
      }

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("has_onboarded")
          .eq("user_id", session.user.id)
          .single()

        if (!profile || !profile.has_onboarded) {
          router.push("/setup")
          return
        }

        const { data: homeWorkspace } = await supabase
          .from("workspaces")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("is_home", true)
          .single()

        if (homeWorkspace) {
          router.push(`/${homeWorkspace.id}/chat`)
        }
      }
    }

    checkAuth()
  }, [router, searchParams])

  const handleRedirectToLogin = () => {
    router.push("/login")
  }

  const handleLeadCapture = () => {
    router.push("/login")
  }

  // Handle property selection from interactive map
  const handlePropertySelect = useCallback(
    (location: { lat: number; lng: number }, address: string) => {
      const used =
        typeof window !== "undefined" &&
        localStorage.getItem("rooftops_free_preview_used") === "true"
      if (used) {
        setShowSignupGate(true)
        return
      }
      // Allow first free preview
      if (typeof window !== "undefined") {
        localStorage.setItem("rooftops_free_preview_used", "true")
      }
      setSelectedLocation(location)
      setSelectedAddress(address)
      setShowPreviewDrawer(true)
    },
    []
  )

  return (
    <div className="relative flex min-h-full w-full flex-col bg-[#FAFAFA]">
      {/* Header - Transparent overlay on map hero */}
      <header className="absolute inset-x-0 top-0 z-50 flex w-full items-center justify-between px-4 py-3 md:px-6">
        <div
          className="flex shrink-0 cursor-pointer items-center"
          onClick={handleRedirectToLogin}
        >
          <Image
            src="/rooftops-logo-gr-black.png"
            alt="Rooftops AI"
            width={160}
            height={40}
            className="h-7 w-auto rounded-md bg-white/90 object-contain px-2 py-1 shadow-sm backdrop-blur-sm sm:h-8 md:h-9"
            priority
          />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button
            onClick={handleRedirectToLogin}
            className="px-2 py-1.5 text-sm font-medium text-white/90 transition-colors hover:text-white sm:px-3"
          >
            Sign In
          </button>
          <button
            onClick={handleRedirectToLogin}
            className="rounded-lg bg-white/95 px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm backdrop-blur-sm transition-all hover:bg-white sm:px-4 sm:py-2"
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* Interactive Map Hero — Full-screen "try before signup" experience */}
      <div className="relative h-[70vh] w-full sm:h-[80vh]">
        {/* Overlay gradient for hero text legibility */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-black/50 to-transparent" />

        {/* Hero text overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4 text-center sm:pt-8">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl">
            Win more roofing jobs. Work less.
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-white/80 drop-shadow sm:mt-3 sm:text-base">
            Search any address below to see instant roof data — free, no signup required.
          </p>
        </div>

        {/* The interactive map */}
        <LandingHeroMap
          onPropertySelect={handlePropertySelect}
          isDrawerOpen={showPreviewDrawer}
        />

        {/* Instant Property Preview Drawer — gated to 1 free preview */}
        {selectedLocation && selectedAddress && (
          <PropertyPreviewDrawer
            isOpen={showPreviewDrawer}
            onClose={() => setShowPreviewDrawer(false)}
            address={selectedAddress}
            location={selectedLocation}
            onGenerateFullReport={() => {
              setShowPreviewDrawer(false)
              setShowSignupGate(true)
            }}
            isAnalyzing={false}
          />
        )}

        {/* Signup gate modal after 1 free preview */}
        <SignupGateModal
          open={showSignupGate}
          onOpenChange={setShowSignupGate}
        />
      </div>

      {/* Scrollable content below the fold */}
      <main className="flex flex-1 flex-col items-center px-4 pb-12 pt-10 md:px-6">
        <div className="relative z-10 w-full max-w-5xl">
          {/* Quantified Value Stats */}
          <div className="mx-auto mb-10 grid max-w-3xl grid-cols-2 gap-3 px-4 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-gray-100">
              <div className="text-xl font-bold text-[#24BDEB] sm:text-2xl">
                +12 hrs
              </div>
              <div className="text-xs text-gray-500">saved weekly</div>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-gray-100">
              <div className="text-xl font-bold text-[#4FEBBC] sm:text-2xl">
                +35%
              </div>
              <div className="text-xs text-gray-500">more jobs closed</div>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-gray-100">
              <div className="text-xl font-bold text-[#24BDEB] sm:text-2xl">
                2 min
              </div>
              <div className="text-xs text-gray-500">roof reports</div>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-gray-100">
              <div className="text-xl font-bold text-[#4FEBBC] sm:text-2xl">
                $50k+
              </div>
              <div className="text-xs text-gray-500">avg revenue boost</div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="mx-auto mt-16 w-full max-w-4xl px-4">
            <h2 className="mb-8 text-center text-2xl font-bold text-[#1A1A1A] sm:text-3xl">
              How Roofers Win with AI
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="relative rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#24BDEB]/10 text-lg font-bold text-[#24BDEB]">
                  1
                </div>
                <h3 className="mb-2 font-bold text-[#1A1A1A]">
                  Enter Any Address
                </h3>
                <p className="text-sm text-gray-600">
                  Type in a property address. Our AI instantly pulls satellite
                  imagery and analyzes the roof.
                </p>
              </div>
              <div className="relative rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#4FEBBC]/10 text-lg font-bold text-[#4FEBBC]">
                  2
                </div>
                <h3 className="mb-2 font-bold text-[#1A1A1A]">
                  Get Instant Report
                </h3>
                <p className="text-sm text-gray-600">
                  Receive detailed measurements, pitch analysis, material
                  recommendations, and cost estimates in under 2 minutes.
                </p>
              </div>
              <div className="relative rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#24BDEB]/10 text-lg font-bold text-[#24BDEB]">
                  3
                </div>
                <h3 className="mb-2 font-bold text-[#1A1A1A]">Send & Close</h3>
                <p className="text-sm text-gray-600">
                  Generate professional proposals with one click. Send to
                  homeowners and close deals faster than ever.
                </p>
              </div>
            </div>
          </div>

          {/* Testimonials Section */}
          <div className="mx-auto mt-16 w-full max-w-3xl px-4">
            <h2 className="mb-2 text-center text-2xl font-bold text-[#1A1A1A] sm:text-3xl">
              Trusted by Roofers Nationwide
            </h2>
            <p className="mb-8 text-center text-sm text-gray-500">
              Join hundreds of roofing contractors growing their business with
              AI
            </p>

            <div className="relative rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100 sm:p-8">
              <IconQuote className="absolute left-4 top-4 size-8 text-[#24BDEB]/20 sm:left-6 sm:top-6 sm:size-10" />

              <div className="relative z-10">
                <p className="mb-6 text-base italic text-gray-700 sm:text-lg">
                  &ldquo;{testimonials[currentTestimonial].quote}&rdquo;
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#1A1A1A]">
                      {testimonials[currentTestimonial].name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {testimonials[currentTestimonial].company} ·{" "}
                      {testimonials[currentTestimonial].location}
                    </div>
                  </div>
                  <div className="rounded-full bg-[#4FEBBC]/10 px-3 py-1 text-sm font-semibold text-[#0D9488]">
                    {testimonials[currentTestimonial].metric}
                  </div>
                </div>
              </div>

              {/* Testimonial Navigation */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() =>
                    setCurrentTestimonial(prev =>
                      prev === 0 ? testimonials.length - 1 : prev - 1
                    )
                  }
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <IconChevronLeft className="size-5" />
                </button>
                <div className="flex gap-1.5">
                  {testimonials.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentTestimonial(idx)}
                      className={`size-2 rounded-full transition-colors ${
                        idx === currentTestimonial
                          ? "bg-[#24BDEB]"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() =>
                    setCurrentTestimonial(prev =>
                      prev === testimonials.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <IconChevronRight className="size-5" />
                </button>
              </div>

              {/* Star Rating */}
              <div className="mt-4 flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <IconStar
                    key={i}
                    className="size-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Features Grid - Expanded */}
          <div className="mx-auto mt-16 w-full max-w-4xl px-4">
            <h2 className="mb-2 text-center text-2xl font-bold text-[#1A1A1A] sm:text-3xl">
              Everything You Need to Dominate Your Market
            </h2>
            <p className="mb-8 text-center text-sm text-gray-500">
              Built specifically for roofing contractors
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <IconFileAnalytics className="mb-3 size-8 text-[#24BDEB]" />
                <h3 className="mb-1 font-bold text-[#1A1A1A]">
                  AI Roof Measurements
                </h3>
                <p className="text-sm text-gray-600">
                  Satellite-powered reports with facet counts, pitch analysis,
                  and square footage.
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <IconCalculator className="mb-3 size-8 text-[#4FEBBC]" />
                <h3 className="mb-1 font-bold text-[#1A1A1A]">
                  Instant Cost Estimates
                </h3>
                <p className="text-sm text-gray-600">
                  Material and labor costs calculated automatically based on
                  your pricing.
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <IconSend className="mb-3 size-8 text-[#24BDEB]" />
                <h3 className="mb-1 font-bold text-[#1A1A1A]">
                  One-Click Proposals
                </h3>
                <p className="text-sm text-gray-600">
                  Generate professional proposals and send directly to
                  homeowners.
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <IconRobot className="mb-3 size-8 text-[#4FEBBC]" />
                <h3 className="mb-1 font-bold text-[#1A1A1A]">AI Assistant</h3>
                <p className="text-sm text-gray-600">
                  Ask questions, draft emails, and get help with any roofing
                  task.
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <IconTargetArrow className="mb-3 size-8 text-[#24BDEB]" />
                <h3 className="mb-1 font-bold text-[#1A1A1A]">
                  Lead Follow-up
                </h3>
                <p className="text-sm text-gray-600">
                  Automated follow-up sequences that convert leads into signed
                  contracts.
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <IconTrendingUp className="mb-3 size-8 text-[#4FEBBC]" />
                <h3 className="mb-1 font-bold text-[#1A1A1A]">
                  Solar Analysis
                </h3>
                <p className="text-sm text-gray-600">
                  Upsell solar with built-in potential analysis and savings
                  estimates.
                </p>
              </div>
            </div>
          </div>

          {/* AI Employees Coming Soon Section */}
          <div className="mx-auto mt-20 w-full max-w-4xl px-4">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 sm:p-12">
              {/* Background decoration */}
              <div className="absolute -right-20 -top-20 size-64 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 size-64 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 blur-3xl" />

              <div className="relative z-10">
                {/* Coming Soon Badge */}
                <div className="mb-6 flex justify-center sm:justify-start">
                  <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500/20 to-cyan-500/20 px-4 py-1.5 ring-1 ring-teal-500/30">
                    <IconRocket className="size-4 text-teal-400" />
                    <span className="text-sm font-semibold text-teal-300">
                      Coming Soon
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
                  {/* Left Content */}
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-3xl font-bold text-white sm:text-4xl">
                      AI Employees for Your{" "}
                      <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                        Roofing Business
                      </span>
                    </h2>
                    <p className="mt-4 text-gray-300">
                      Hire AI-powered team members that work 24/7 to handle sales follow-ups,
                      content creation, customer communication, and more. Scale without scaling payroll.
                    </p>

                    {/* Feature bullets */}
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {[
                        { icon: IconMail, text: "Automated lead follow-up" },
                        { icon: IconFileText, text: "Content & SEO creation" },
                        { icon: IconBrandInstagram, text: "Social media management" },
                        { icon: IconMessageCircle, text: "24/7 customer responses" }
                      ].map(item => (
                        <div
                          key={item.text}
                          className="flex items-center gap-2 text-sm text-gray-300"
                        >
                          <item.icon className="size-4 text-teal-400" />
                          {item.text}
                        </div>
                      ))}
                    </div>

                    {/* Price and CTA */}
                    <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
                      <div className="text-center sm:text-left">
                        <div className="text-sm text-gray-400">Starting at</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-white">$199</span>
                          <span className="text-gray-400">/month</span>
                        </div>
                      </div>
                      <button
                        onClick={handleRedirectToLogin}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:shadow-teal-500/25"
                      >
                        <IconUserBolt className="size-5" />
                        Join the Waitlist
                      </button>
                    </div>
                  </div>

                  {/* Right - AI Employee Cards */}
                  <div className="flex shrink-0 flex-col gap-3">
                    {[
                      { name: "Marcus", role: "Sales", color: "bg-emerald-500" },
                      { name: "Aisha", role: "Marketing", color: "bg-pink-500" },
                      { name: "Elena", role: "Estimating", color: "bg-blue-500" },
                      { name: "Ryan", role: "Insurance", color: "bg-amber-500" }
                    ].map((emp, idx) => (
                      <div
                        key={emp.name}
                        className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2.5 ring-1 ring-white/10 backdrop-blur-sm"
                        style={{
                          animationDelay: `${idx * 100}ms`,
                          transform: `translateX(${idx * 8}px)`
                        }}
                      >
                        <div
                          className={`flex size-8 items-center justify-center rounded-lg ${emp.color} text-sm font-bold text-white`}
                        >
                          {emp.name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {emp.name}
                          </div>
                          <div className="text-xs text-gray-400">{emp.role}</div>
                        </div>
                        <IconSparkles className="ml-auto size-4 text-yellow-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integrations Section */}
          <div className="mx-auto mt-16 w-full max-w-4xl px-4">
            <p className="mb-6 text-center text-sm font-medium text-gray-400">
              POWERED BY INDUSTRY-LEADING DATA
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 opacity-60 grayscale sm:gap-10">
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm.14 19.018c-3.868 0-7-3.14-7-7.018c0-3.878 3.132-7.018 7-7.018c1.89 0 3.47.697 4.682 1.829l-1.974 1.978c-.532-.511-1.46-1.105-2.708-1.105c-2.31 0-4.187 1.903-4.187 4.316c0 2.412 1.877 4.316 4.187 4.316c2.693 0 3.683-1.917 3.832-2.914h-3.832v-2.568h6.408c.063.327.106.663.106 1.097c0 4.015-2.677 6.087-6.514 6.087z" />
                </svg>
                <span className="text-sm font-medium">Google Maps</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
                <span className="text-sm font-medium">Solar API</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-sm font-medium">Satellite Imagery</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <IconRobot className="size-6" />
                <span className="text-sm font-medium">GPT-5</span>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mx-auto mt-16 w-full max-w-3xl px-4">
            <div className="rounded-2xl bg-gradient-to-r from-[#1A1A1A] to-[#333] p-8 text-center text-white sm:p-12">
              <h2 className="mb-3 text-2xl font-bold sm:text-3xl">
                Ready to Close More Roofing Jobs?
              </h2>
              <p className="mb-6 text-gray-300">
                Join the roofers who are winning more bids and working smarter
                with AI.
              </p>
              <button
                onClick={handleRedirectToLogin}
                className="rounded-lg bg-gradient-to-r from-[#24BDEB] to-[#4FEBBC] px-8 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
              >
                Start Your Free Trial
              </button>
              <p className="mt-4 text-sm text-gray-400">
                No credit card required · Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Floating CTA - Sticky on scroll */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm sm:hidden">
        <button
          onClick={handleRedirectToLogin}
          className="w-full rounded-lg bg-gradient-to-r from-[#24BDEB] to-[#4FEBBC] py-3 text-sm font-semibold text-white shadow-md"
        >
          Start Free Trial — 3 Days Free
        </button>
      </div>

      {/* Exit Intent Popup */}
      <ExitIntentPopup onSignup={handleLeadCapture} />

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white px-4 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Image
              src="/rooftops-logo-gr-black.png"
              alt="Rooftops AI"
              width={120}
              height={30}
              className="h-6 w-auto"
            />
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <button
              onClick={() => router.push("/pricing")}
              className="hover:text-gray-900"
            >
              Pricing
            </button>
            <a href="mailto:team@rooftops.ai" className="hover:text-gray-900">
              Contact
            </a>
            <a href="#" className="hover:text-gray-900">
              Privacy
            </a>
            <a href="#" className="hover:text-gray-900">
              Terms
            </a>
          </div>
          <p className="text-sm text-gray-400">© 2024 Rooftops AI</p>
        </div>
      </footer>

      {/* CSS for Shimmer Effect and Gradient Border */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");

        @keyframes shimmer {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }

        .animate-shimmer-text {
          font-family: "Inter", sans-serif;
          font-weight: 700;
          background: linear-gradient(
            to right,
            #1a1a1a 0%,
            #1a1a1a 40%,
            #24bdeb 47%,
            #4febbc 53%,
            #1a1a1a 60%,
            #1a1a1a 100%
          );
          background-size: 500% auto;
          color: #1a1a1a;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 12s linear infinite;
          padding-bottom: 0.1em;
        }

        .gradient-border {
          background: linear-gradient(to right, #24bdeb, #4febbc);
        }
      `}</style>
    </div>
  )
}
