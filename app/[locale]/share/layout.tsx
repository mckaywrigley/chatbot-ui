import { Metadata } from "next"
import { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Shared Experiment Design",
  description:
    "View this experiment design created with Shadow AI - AI-powered experiment planning for life sciences researchers.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Shared Experiment Design - Shadow AI",
    description:
      "A structured experiment plan built with Shadow AI. Includes problem statement, literature review, hypotheses, and full protocol."
  }
}

export default function ShareLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
