"use client"

/**
 * "Continue with Google" - Supabase OAuth. Redirects to the hosted Google
 * consent screen, which returns to /auth/callback (existing) to exchange the
 * code for a session, then on to `next`. Requires the Google provider to be
 * enabled in the Supabase dashboard (Auth → Providers) with the callback URL
 * allow-listed; until then the button shows a friendly error.
 */

import { useState } from "react"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase/browser-client"
import { track } from "@/lib/analytics"
import { IconLoader2 } from "@tabler/icons-react"

const GoogleGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
    />
    <path
      fill="#FBBC05"
      d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
    />
  </svg>
)

export function GoogleButton({ next = "/" }: { next?: string }) {
  const [busy, setBusy] = useState(false)

  const onClick = async () => {
    setBusy(true)
    track("google_auth_clicked")
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        }
      })
      if (error) throw error
      // On success the browser is redirected away; keep the spinner.
    } catch (e: any) {
      setBusy(false)
      toast.error(
        e?.message?.includes("provider is not enabled")
          ? "Google sign-in isn't enabled yet. Use email for now."
          : (e?.message ?? "Couldn't start Google sign-in.")
      )
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="border-line bg-surface text-ink hover:bg-paper-2 inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-md border text-[14px] font-medium transition-colors disabled:opacity-60"
    >
      {busy ? (
        <IconLoader2 size={16} className="animate-spin" />
      ) : (
        <GoogleGlyph />
      )}
      Continue with Google
    </button>
  )
}
