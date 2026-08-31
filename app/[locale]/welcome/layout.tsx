import { Metadata } from "next"
import { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Welcome to Shadow AI - AI-Powered Experiment Design",
  description:
    "See how Shadow AI helps life sciences researchers design experiments, generate hypotheses, and build run-ready protocols using AI. Free to start.",
  alternates: {
    canonical: "/welcome"
  },
  openGraph: {
    title: "Welcome to Shadow AI - AI-Powered Experiment Design",
    description:
      "See how Shadow AI helps life sciences researchers design experiments, generate hypotheses, and build run-ready protocols using AI."
  }
}

export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
