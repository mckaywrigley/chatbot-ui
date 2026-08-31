import Link from "next/link"
import { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { get } from "@vercel/edge-config"

import { AuthShell } from "@/components/auth/auth-shell"
import { SignupForm } from "./signup-form"
import { createClient } from "@/lib/supabase/server"
import { friendlyAuthError } from "@/lib/auth/friendly-errors"
import { attributeReferral } from "@/lib/affiliate/service"
import { REFERRAL_COOKIE } from "@/lib/affiliate/constants"

export const metadata: Metadata = {
  title: "Create Your Account",
  description:
    "Join thousands of life sciences researchers using Shadow AI to design experiments faster. Free to start - no credit card required.",
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: false }
}

export default async function SignupPage({
  searchParams
}: {
  searchParams: { error?: string; message?: string; email?: string }
}) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  let session: Awaited<
    ReturnType<typeof supabase.auth.getSession>
  >["data"]["session"] = null
  try {
    session = (await supabase.auth.getSession()).data.session
  } catch {
    session = null
  }
  if (session) return redirect("/")

  // Show a perk banner when the visitor arrived through a creator's referral
  // link (?ref=... was captured into a cookie by middleware).
  const invitedByReferral = Boolean(cookieStore.get(REFERRAL_COOKIE)?.value)

  // Whitelist gate honoured for B2C closed-beta; B2C open path is just env unset.
  const getEnvVarOrEdgeConfigValue = async (name: string) => {
    "use server"
    if (process.env.EDGE_CONFIG) return await get<string>(name)
    return process.env[name]
  }

  const signUp = async (formData: FormData) => {
    "use server"

    const email = ((formData.get("email") as string) ?? "").trim()
    const password = formData.get("password") as string
    const fullName = ((formData.get("full_name") as string) ?? "").trim()

    if (!email || !password) {
      return redirect(
        `/signup?error=${encodeURIComponent("Email and password are required.")}`
      )
    }
    if (password.length < 8) {
      return redirect(
        `/signup?error=${encodeURIComponent("Password must be at least 8 characters.")}`
      )
    }

    // Optional whitelist gates - kept for parity with the legacy
    // login-page sign-up flow. If neither env var is set, all emails
    // are allowed (the normal B2C path).
    const emailDomainWhitelistPatternsString = await getEnvVarOrEdgeConfigValue(
      "EMAIL_DOMAIN_WHITELIST"
    )
    const emailDomainWhitelist = emailDomainWhitelistPatternsString?.trim()
      ? emailDomainWhitelistPatternsString.split(",")
      : []
    const emailWhitelistPatternsString =
      await getEnvVarOrEdgeConfigValue("EMAIL_WHITELIST")
    const emailWhitelist = emailWhitelistPatternsString?.trim()
      ? emailWhitelistPatternsString.split(",")
      : []

    if (emailDomainWhitelist.length > 0 || emailWhitelist.length > 0) {
      const domainMatch = emailDomainWhitelist.includes(email.split("@")[1])
      const emailMatch = emailWhitelist.includes(email)
      if (!domainMatch && !emailMatch) {
        return redirect(
          `/signup?error=${encodeURIComponent(`Sign-ups for ${email} aren't open yet. Reach out and we'll add you.`)}`
        )
      }
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Stash the display name in user_metadata so the post-signup
        // trigger (which seeds the profile row) can copy it across.
        // Falls back to email local-part if blank.
        data: { full_name: fullName || email.split("@")[0] }
      }
    })

    if (error) {
      return redirect(
        `/signup?error=${encodeURIComponent(friendlyAuthError(error.message))}&email=${encodeURIComponent(email)}`
      )
    }

    // Influencer referral attribution: if this signup came in via a ?ref code
    // (captured into a cookie by middleware), record it. Best-effort - never
    // blocks the signup.
    const refCode = cookieStore.get(REFERRAL_COOKIE)?.value
    if (data?.user && refCode) {
      try {
        await attributeReferral({
          referredUserId: data.user.id,
          rawCode: refCode
        })
        cookieStore.delete(REFERRAL_COOKIE)
      } catch (refErr) {
        console.error("[signup] referral attribution failed", refErr)
      }
    }

    // If the Supabase project requires email confirmation, signUp
    // returns a user but no session - tell the user to check their
    // inbox rather than silently dropping them at /login.
    if (data?.user && !data.session) {
      return redirect(
        `/login?message=${encodeURIComponent(
          "Check your inbox to confirm your email, then sign in."
        )}`
      )
    }

    // Auto-confirm path (email verification disabled) - bounce through
    // "/" so middleware lands them on /onboarding to finish their
    // profile.
    return redirect("/")
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to start. From research question to a runnable design in minutes."
      footer={
        <span>
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-rust font-medium underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </span>
      }
    >
      {invitedByReferral && (
        <p className="bg-paper-2 text-ink-2 border-line mb-4 rounded-md border p-3 text-center text-[12.5px]">
          🎁 You were invited by a creator - you’ll get bonus credits when you
          subscribe.
        </p>
      )}

      <SignupForm
        action={signUp}
        defaultEmail={searchParams?.email ?? ""}
        error={searchParams?.error ?? null}
        message={searchParams?.message ?? null}
      />
    </AuthShell>
  )
}
