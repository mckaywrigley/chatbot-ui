import Link from "next/link"
import { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"

import { AuthShell } from "@/components/auth/auth-shell"
import { GoogleButton } from "@/components/auth/google-button"
import { PasswordInput } from "@/components/auth/password-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/ui/submit-button"
import { createClient } from "@/lib/supabase/server"
import { friendlyAuthError } from "@/lib/auth/friendly-errors"
import { Database } from "@/supabase/types"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Shadow AI and continue designing your experiments.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false }
}

export default async function Login({
  searchParams
}: {
  searchParams: { message?: string; error?: string }
}) {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
  let supabaseConnectionError: string | null = null
  let session: Awaited<
    ReturnType<typeof supabase.auth.getSession>
  >["data"]["session"] = null
  try {
    session = (await supabase.auth.getSession()).data.session
  } catch (e: any) {
    session = null
    supabaseConnectionError =
      e?.cause?.code === "ECONNREFUSED"
        ? `Supabase is unreachable at ${process.env.NEXT_PUBLIC_SUPABASE_URL}. Run "supabase start" locally and copy API URL + anon key from "supabase status" into .env.local.`
        : "Supabase is unreachable. Check NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY and that Supabase is running."
  }

  if (session) {
    // Middleware decides where an authenticated user belongs. Bouncing through "/"
    // keeps that decision in one place.
    return redirect("/")
  }

  const signIn = async (formData: FormData) => {
    "use server"

    const email = (formData.get("email") as string)?.trim()
    const password = formData.get("password") as string
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return redirect(
        `/login?error=${encodeURIComponent(friendlyAuthError(error.message))}`
      )
    }

    return redirect("/")
  }

  const message = searchParams?.message
  const errorMessage = searchParams?.error

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to keep planning experiments."
      footer={
        <span>
          New to Shadow AI?{" "}
          <Link
            href="/signup"
            className="text-rust font-medium underline-offset-2 hover:underline"
          >
            Create an account
          </Link>
        </span>
      }
    >
      <div className="mb-4 flex flex-col gap-4">
        <GoogleButton next="/" />
        <div className="flex items-center gap-3">
          <span className="bg-line h-px flex-1" />
          <span className="text-ink-3 text-[11.5px] uppercase tracking-wide">
            or sign in with email
          </span>
          <span className="bg-line h-px flex-1" />
        </div>
      </div>
      <form className="flex w-full flex-col gap-4" action={signIn}>
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

        <PasswordInput
          name="password"
          autoComplete="current-password"
          required
          placeholder="Your password"
        />

        <div className="-mt-1 flex justify-end">
          <Link
            href="/forgot-password"
            className="text-ink-3 hover:text-ink text-[12px] underline-offset-2 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <SubmitButton className="bg-rust text-paper border-rust mt-2 inline-flex h-10 items-center justify-center rounded-md border px-4 text-[14px] font-medium transition-colors hover:bg-[color:var(--rust-hover)]">
          Sign in
        </SubmitButton>

        {(errorMessage || message) && (
          <p
            className={`mt-1 rounded-md border p-3 text-center text-[12.5px] ${
              errorMessage
                ? "bg-rust-soft text-rust-ink border-rust-soft"
                : "bg-paper-2 text-ink-2 border-line"
            }`}
          >
            {errorMessage || message}
          </p>
        )}

        {supabaseConnectionError && (
          <p className="bg-rust-soft text-rust-ink border-rust-soft mt-1 rounded-md border p-3 text-center text-[12.5px]">
            {supabaseConnectionError}
          </p>
        )}
      </form>
    </AuthShell>
  )
}
