"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/ui/submit-button"
import { IconShield, IconLock, IconUsers, IconStar } from "@tabler/icons-react"

interface LoginFormProps {
  signIn: (formData: FormData) => Promise<void>
  signUp: (formData: FormData) => Promise<void>
  signInWithGoogle: () => Promise<void>
  searchParams?: { message: string; type?: string }
}

export function LoginForm({
  signIn,
  signUp,
  signInWithGoogle,
  searchParams
}: LoginFormProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signup")

  return (
    <div className="w-full max-w-md">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          {activeTab === "signin" ? "Welcome back" : "Get Started"}
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {activeTab === "signin"
            ? "Enter your credentials to access your dashboard"
            : "Create an account to get started"}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("signin")}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "signin"
              ? "border-b-2 border-gray-900 text-gray-900 dark:border-white dark:text-white"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => setActiveTab("signup")}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "signup"
              ? "border-b-2 border-gray-900 text-gray-900 dark:border-white dark:text-white"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Message banner */}
      {searchParams?.message && (
        <div
          className={`mb-6 rounded-lg p-4 text-sm font-medium ${
            searchParams.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200"
              : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200"
          }`}
        >
          {searchParams.message}
        </div>
      )}

      {/* Google Sign-in */}
      <form action={signInWithGoogle} className="mb-6">
        <SubmitButton className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800">
          <svg className="size-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </SubmitButton>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 uppercase tracking-wider text-gray-500 dark:bg-slate-950 dark:text-gray-400">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form
        className="flex w-full flex-col gap-5"
        action={activeTab === "signin" ? signIn : signUp}
      >
        <div className="space-y-2">
          <Label
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="email"
          >
            Email
          </Label>
          <Input
            className="rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 caret-gray-900 focus:border-gray-900 focus:ring-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white dark:caret-white dark:focus:border-white dark:focus:ring-white"
            name="email"
            placeholder="name@company.com"
            required
            type="email"
          />
        </div>

        <div className="space-y-2">
          <Label
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="password"
          >
            Password
          </Label>
          <Input
            className="rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 caret-gray-900 focus:border-gray-900 focus:ring-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white dark:caret-white dark:focus:border-white dark:focus:ring-white"
            type="password"
            name="password"
            placeholder="••••••••"
            required
          />
        </div>

        {activeTab === "signin" ? (
          <SubmitButton className="mt-2 rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white transition-all hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
            Sign In
          </SubmitButton>
        ) : (
          <SubmitButton className="mt-2 rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white transition-all hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
            Create Account
          </SubmitButton>
        )}

        <div className="mt-4 text-center text-xs text-gray-600 dark:text-gray-400">
          By clicking continue, you agree to our{" "}
          <a
            href="https://resources.rooftops.ai/tos"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-900 dark:hover:text-white"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="https://resources.rooftops.ai/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-900 dark:hover:text-white"
          >
            Privacy Policy
          </a>
          .
        </div>

        {/* Trust Signals */}
        <div className="mt-6 space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">
          {/* Security badges */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <IconLock className="size-4 text-green-500" />
              <span>SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <IconShield className="size-4 text-cyan-500" />
              <span>Secure Signup</span>
            </div>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <IconUsers className="size-4 text-gray-400" />
            <span>
              Join{" "}
              <strong className="text-gray-700 dark:text-gray-300">
                2,000+
              </strong>{" "}
              roofing pros
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <IconStar
                key={i}
                className="size-4 fill-yellow-400 text-yellow-400"
              />
            ))}
            <span className="ml-1 text-xs text-gray-500">4.9/5 rating</span>
          </div>

          {/* Free trial reassurance */}
          {activeTab === "signup" && (
            <p className="text-center text-xs text-gray-500">
              <strong>No credit card required</strong> for free trial
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
