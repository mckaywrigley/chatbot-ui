"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import {
  IconCheck,
  IconCalendar,
  IconBuildingStore,
  IconUsers,
  IconTarget,
  IconLoader2
} from "@tabler/icons-react"
import { toast } from "sonner"

export default function ConsultingSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    companyName: "",
    website: "",
    location: "",
    teamSize: "",
    annualRevenue: "",
    currentChallenges: "",
    aiExperience: "none",
    goals: "",
    preferredTime: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/consulting/intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          sessionId
        })
      })

      if (response.ok) {
        setSubmitted(true)
        toast.success("Information submitted successfully!")
      } else {
        toast.error("Failed to submit. Please try again.")
      }
    } catch (error) {
      console.error("Error submitting intake:", error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-green-100">
              <IconCheck className="size-10 text-green-600" />
            </div>
            <h1 className="mb-4 text-3xl font-bold text-gray-900">
              You&apos;re All Set!
            </h1>
            <p className="mb-6 text-gray-600">
              Thank you for your payment and for sharing details about your
              business. I&apos;ll review everything and reach out within 24
              hours to schedule our first session.
            </p>
            <div className="rounded-lg bg-cyan-50 p-4">
              <p className="text-sm text-cyan-800">
                <strong>Next Steps:</strong>
                <br />
                1. Check your email for confirmation
                <br />
                2. I&apos;ll send scheduling link within 24 hours
                <br />
                3. Our first session will be Week 1: AI Audit & Strategy
              </p>
            </div>
            <p className="mt-6 text-sm text-gray-500">
              Questions? Email steele@rooftops.ai
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-6">
          <Image
            src="/rooftops-logo-gr-black.png"
            alt="AI Consulting for Roofing"
            width={180}
            height={40}
            className="h-8 w-auto"
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
            <IconCheck className="size-8 text-green-600" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Payment Confirmed!
          </h1>
          <p className="text-gray-600">
            Welcome to the AI Consulting Program. Let&apos;s get to know your
            business.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Information */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <IconBuildingStore className="size-5 text-cyan-600" />
              About Your Business
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="companyName"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="e.g., Summit Roofing Co"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Website (if you have one)
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    placeholder="www.yourcompany.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Location *
                  </label>
                  <input
                    type="text"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    placeholder="City, State"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Team Size *
                  </label>
                  <select
                    name="teamSize"
                    required
                    value={formData.teamSize}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <option value="">Select...</option>
                    <option value="1-5">Just me + 1-4 crew</option>
                    <option value="5-15">5-15 employees</option>
                    <option value="15-50">15-50 employees</option>
                    <option value="50+">50+ employees</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Annual Revenue (approx) *
                  </label>
                  <select
                    name="annualRevenue"
                    required
                    value={formData.annualRevenue}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <option value="">Select...</option>
                    <option value="under-500k">Under $500K</option>
                    <option value="500k-1m">$500K - $1M</option>
                    <option value="1m-5m">$1M - $5M</option>
                    <option value="5m-10m">$5M - $10M</option>
                    <option value="10m+">$10M+</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Challenges & Goals */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <IconTarget className="size-5 text-cyan-600" />
              Challenges & Goals
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  What are your biggest challenges right now? *
                </label>
                <textarea
                  name="currentChallenges"
                  required
                  rows={4}
                  value={formData.currentChallenges}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="e.g., Taking too long to create estimates, losing bids to faster competitors, struggling to follow up with leads..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  What do you hope to achieve with AI in the next 90 days? *
                </label>
                <textarea
                  name="goals"
                  required
                  rows={3}
                  value={formData.goals}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="e.g., Reduce estimate time by 50%, close 20% more deals, automate follow-ups..."
                />
              </div>
            </div>
          </div>

          {/* AI Experience */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <IconUsers className="size-5 text-cyan-600" />
              AI Experience
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  What&apos;s your current experience with AI tools? *
                </label>
                <div className="space-y-2">
                  {[
                    {
                      value: "none",
                      label: "No experience - this is all new to me"
                    },
                    {
                      value: "basic",
                      label: "Basic - I've played with ChatGPT a few times"
                    },
                    {
                      value: "moderate",
                      label: "Moderate - I use AI tools occasionally for work"
                    },
                    {
                      value: "advanced",
                      label:
                        "Advanced - I already use AI regularly in my business"
                    }
                  ].map(option => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="aiExperience"
                        value={option.value}
                        checked={formData.aiExperience === option.value}
                        onChange={handleChange}
                        className="mt-1 size-4 text-cyan-600"
                      />
                      <span className="text-sm text-gray-700">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <IconCalendar className="size-5 text-cyan-600" />
              Scheduling Preferences
            </h2>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                What time of day works best for our weekly sessions? *
              </label>
              <select
                name="preferredTime"
                required
                value={formData.preferredTime}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="">Select your preference...</option>
                <option value="morning">Morning (8am-12pm ET)</option>
                <option value="afternoon">Afternoon (12pm-5pm ET)</option>
                <option value="evening">Evening (5pm-8pm ET)</option>
                <option value="flexible">I&apos;m flexible</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">
                All sessions are conducted via Zoom. I&apos;ll send you a
                scheduling link within 24 hours.
              </p>
            </div>
          </div>

          {/* Submit */}
          <div className="rounded-xl bg-gradient-to-r from-cyan-50 to-green-50 p-6">
            <p className="mb-4 text-sm text-gray-600">
              This information helps me prepare for our first session and
              customize the program to your specific needs. Everything is
              confidential.
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 py-4 font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <IconLoader2 className="size-5 animate-spin" />
                  Submitting...
                </span>
              ) : (
                "Complete Registration & Schedule First Session"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
