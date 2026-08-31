"use client"

import { FC, useEffect, useState } from "react"

import { PasswordInput, scorePassword } from "@/components/auth/password-input"
import { GoogleButton } from "@/components/auth/google-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/ui/submit-button"
import { track } from "@/lib/analytics"

interface SignupFormProps {
  /** Server action bound by the parent page. */
  action: (formData: FormData) => Promise<void> | void
  defaultEmail?: string
  error: string | null
  message: string | null
}

/**
 * Client wrapper around the signup `<form>` so we can score the
 * password in real time and disable the submit button until it's at
 * least "Fair" (3/4 segments). Keeps the server action a plain
 * progressive-enhancement target.
 */
export const SignupForm: FC<SignupFormProps> = ({
  action,
  defaultEmail = "",
  error,
  message
}) => {
  const [password, setPassword] = useState("")
  const [agreed, setAgreed] = useState(true)
  const strength = scorePassword(password)
  const submitDisabled = !agreed || password.length < 8 || strength < 2

  // Track signup errors surfaced from the server action via searchParams.
  useEffect(() => {
    if (error) track("signup_error", { reason: error.slice(0, 80) })
  }, [error])

  return (
    <div className="flex w-full flex-col gap-4">
      <GoogleButton next="/" />
      <div className="flex items-center gap-3">
        <span className="bg-line h-px flex-1" />
        <span className="text-ink-3 text-[11.5px] uppercase tracking-wide">
          or sign up with email
        </span>
        <span className="bg-line h-px flex-1" />
      </div>
      <form
        className="flex w-full flex-col gap-4"
        action={action}
        onSubmit={() => track("signup_submitted")}
      >
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="full_name"
            className="text-ink text-[12.5px] font-medium"
          >
            Full name
          </Label>
          <Input
            id="full_name"
            name="full_name"
            placeholder="Ada Lovelace"
            autoComplete="name"
            maxLength={80}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-ink text-[12.5px] font-medium">
            Work email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            defaultValue={defaultEmail}
            required
          />
        </div>

        <PasswordInput
          name="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          showStrength
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
        />

        <label className="text-ink-3 mt-1 flex items-start gap-2 text-[12px] leading-snug">
          <input
            type="checkbox"
            className="mt-0.5 size-3.5 cursor-pointer accent-[var(--rust)]"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
          />
          <span>
            I agree to the{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noreferrer"
              className="text-ink-2 underline-offset-2 hover:underline"
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-ink-2 underline-offset-2 hover:underline"
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>

        <SubmitButton
          disabled={submitDisabled}
          className="bg-rust text-paper border-rust mt-2 inline-flex h-10 items-center justify-center rounded-md border px-4 text-[14px] font-medium transition-colors hover:bg-[color:var(--rust-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Create account
        </SubmitButton>

        {(error || message) && (
          <p
            className={`mt-1 rounded-md border p-3 text-center text-[12.5px] ${
              error
                ? "bg-rust-soft text-rust-ink border-rust-soft"
                : "bg-paper-2 text-ink-2 border-line"
            }`}
          >
            {error || message}
          </p>
        )}
      </form>
    </div>
  )
}
