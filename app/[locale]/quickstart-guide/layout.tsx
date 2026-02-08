import { Metadata } from "next"

export const metadata: Metadata = {
  title: "7-Day Roofing AI Quick-Start Guide | Free Resource",
  description:
    "Transform your roofing business with AI in just 7 days. Free comprehensive guide covering AI roof reports, estimates, proposals, and automation.",
  openGraph: {
    title: "7-Day Roofing AI Quick-Start Guide",
    description: "Free guide to transform your roofing business with AI"
  }
}

export default function QuickstartLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
