import Link from "next/link"
import { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { AuthShell } from "@/components/auth/auth-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/ui/submit-button"
import { createClient } from "@/lib/supabase/server"
import { friendlyAuthError } from "@/lib/auth/friendly-errors"

export const metadata: Metadata = {
  title: "Reset password"
}

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: { error?: string; message?: string }
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

  const handleResetPassword = async (formData: FormData) => {
    "use server"

    const origin = headers().get("origin")
    const email = ((formData.get("email") as string) ?? "").trim()
    if (!email) {
      return redirect(
        `/forgot-password?error=${encodeURIComponent("Enter the email tied to your account.")}`
      )
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/login/password`
    })

    if (error) {
      return redirect(
        `/forgot-password?error=${encodeURIComponent(friendlyAuthError(error.message))}`
      )
    }

    return redirect(
      `/forgot-password?message=${encodeURIComponent("Check your inbox - we sent a reset link.")}`
    )
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email tied to your account and we'll send a link."
      footer={
        <span>
          Remembered it?{" "}
          <Link
            href="/login"
            className="text-rust font-medium underline-offset-2 hover:underline"
          >
            Back to sign in
          </Link>
        </span>
      }
    >
      <form className="flex w-full flex-col gap-4" action={handleResetPassword}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-ink text-[12.5px] font-medium">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <SubmitButton className="bg-rust text-paper border-rust mt-2 inline-flex h-10 items-center justify-center rounded-md border px-4 text-[14px] font-medium transition-colors hover:bg-[color:var(--rust-hover)]">
          Send reset link
        </SubmitButton>

        {(searchParams?.error || searchParams?.message) && (
          <p
            className={`mt-1 rounded-md border p-3 text-center text-[12.5px] ${
              searchParams.error
                ? "bg-rust-soft text-rust-ink border-rust-soft"
                : "bg-paper-2 text-ink-2 border-line"
            }`}
          >
            {searchParams.error || searchParams.message}
          </p>
        )}
      </form>
    </AuthShell>
  )
}
