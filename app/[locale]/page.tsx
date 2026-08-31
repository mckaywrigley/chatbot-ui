import { Metadata } from "next"
import { IconArrowRight } from "@tabler/icons-react"
import Link from "next/link"

import { ShadowAISVG } from "@/components/icons/chatbotui-svg"

export const metadata: Metadata = {
  title: "Shadow AI - AI Experiment Design for Life Sciences Researchers",
  description:
    "Turn any research question into a run-ready experiment plan in minutes. AI-powered experiment design, hypothesis generation, and protocol creation for PhD researchers, postdocs, and lab scientists.",
  alternates: {
    canonical: "/"
  }
}

export default function HomePage() {
  return (
    <div className="bg-paper flex size-full flex-col items-center justify-center px-6">
      <div className="flex max-w-[720px] flex-col items-center gap-7">
        <ShadowAISVG scale={2.5} />
        <div className="flex flex-col items-center gap-4">
          <h1 className="font-display text-ink text-balance text-center text-[36px] font-normal leading-[1.05] tracking-[-0.02em] sm:text-[44px] md:text-[56px]">
            <span className="text-rust">Shadow AI</span>, your AI co-scientist
            for experiment design
          </h1>
          <p className="text-ink-2 max-w-[560px] text-balance text-center text-[15px] leading-relaxed md:text-[17px]">
            Turn any research question into a structured, validated experiment
            plan. In minutes.
          </p>
        </div>
        <Link
          href="/login"
          className="bg-rust text-paper mt-1 inline-flex h-11 items-center gap-2 rounded-md px-5 text-[15px] font-medium transition-colors hover:bg-[color:var(--rust-hover)]"
        >
          Get started
          <IconArrowRight size={15} />
        </Link>
      </div>
    </div>
  )
}
