"use client"

import Image from "next/image"
import Link from "next/link"
import { FC } from "react"

import { Brand } from "@/components/ui/brand"

/**
 * Shared brand hero panel used on the left of /login, /signup,
 * /forgot-password, and /onboarding. Pulled out of AuthShell so the
 * onboarding flow can keep its own step shell on the right without
 * duplicating the navy + glow treatment.
 */
export const AuthHero: FC = () => {
  return (
    <aside
      className="relative hidden flex-1 flex-col justify-between overflow-hidden p-10 lg:flex"
      style={{ background: "#0E0B40" }}
    >
      <div className="relative z-10">
        <Brand size={28} className="[&_span]:text-[#F4F1EA]" />
      </div>

      <div className="relative z-10">
        <Image
          src="/logo-full.png"
          alt="Shadow AI"
          width={520}
          height={335}
          priority
          className="mb-8 max-w-[440px] drop-shadow-[0_0_40px_rgba(34,211,238,0.25)]"
        />
        <h2 className="font-display text-[28px] font-medium leading-tight tracking-[-0.01em] text-[#F4F1EA]">
          Plan experiments,{" "}
          <span className="bg-[linear-gradient(90deg,#22D3EE_0%,#E879F9_100%)] bg-clip-text text-transparent">
            end to end.
          </span>
        </h2>
        <p className="mt-3 max-w-[420px] text-[14px] leading-relaxed text-[#A3A0C2]">
          Shadow AI is your experiment design and planning agent - turn a
          research question into a citation-grounded, run-ready protocol in
          minutes.
        </p>
      </div>

      <div className="relative z-10 text-[12px] text-[#7A7799]">
        <span>© {new Date().getFullYear()} Shadow AI</span>
        <span className="mx-2">·</span>
        <Link href="/" className="hover:text-[#A3A0C2]">
          Back to home
        </Link>
      </div>

      {/* Decorative cyan + magenta glows. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 size-[460px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(34,211,238,0.30), transparent 70%)"
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-32 size-[360px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(232,121,249,0.22), transparent 70%)"
        }}
      />
    </aside>
  )
}
