"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { IconCheck, IconArrowRight, IconLoader2 } from "@tabler/icons-react"
import { toast } from "sonner"

export default function ConsultingCheckoutPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleCheckout = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/stripe/create-consulting-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          successUrl: `${window.location.origin}/consulting/success`,
          cancelUrl: `${window.location.origin}/consulting`
        })
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to create checkout session")
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Checkout error:", error)
      toast.error("Something went wrong. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
          <Image
            src="/rooftops-logo-gr-black.png"
            alt="AI Consulting for Roofing"
            width={160}
            height={40}
            className="h-7 w-auto"
          />
          <div className="text-sm text-gray-500">Secure Checkout</div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left: Order Summary */}
          <div className="lg:col-span-3">
            <h1 className="mb-6 text-3xl font-bold text-gray-900">
              AI Consulting for Roofing Companies
            </h1>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">
                    5-Week AI Transformation Program
                  </h3>
                  <p className="text-sm text-gray-600">
                    1-on-1 consulting with Steele Billings
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">$5,000</div>
                  <div className="text-sm text-gray-500">one-time</div>
                </div>
              </div>

              <div className="space-y-3 border-t border-gray-100 pt-4">
                {[
                  "5 one-hour private consulting sessions",
                  "Custom AI setup for your roofing business",
                  "Direct email access between sessions",
                  "6 months Rooftops AI Premium included",
                  "Lifetime access to session recordings",
                  "Private AI consulting community"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <IconCheck className="size-5 text-green-500" />
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-gradient-to-r from-cyan-50 to-green-50 p-6">
              <h4 className="mb-2 font-bold text-gray-900">
                100% Satisfaction Guarantee
              </h4>
              <p className="text-sm text-gray-600">
                If after week 2 you&apos;re not seeing a clear path to AI
                transforming your business, I&apos;ll refund 100% of your
                investment. No questions asked.
              </p>
            </div>
          </div>

          {/* Right: Payment */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">
                Complete Your Reservation
              </h2>

              <div className="mb-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Program Fee</span>
                  <span className="font-medium">$5,000.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Processing Fee</span>
                  <span className="text-gray-500">Included</span>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>$5,000.00</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 py-4 font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <IconLoader2 className="size-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Proceed to Payment
                    <IconArrowRight className="size-5" />
                  </span>
                )}
              </button>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  Secure payment via Stripe. You&apos;ll be redirected to
                  complete payment.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                SSL Encrypted & Secure
              </div>
            </div>

            <div className="mt-4 text-center text-sm text-gray-500">
              <p>Questions? Email sb@rooftops.ai</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
