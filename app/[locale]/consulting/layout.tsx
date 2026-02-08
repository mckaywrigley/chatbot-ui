import { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Consulting for Roofing Companies | 5-Week Transformation Program",
  description:
    "White-glove AI consulting for roofing company leaders. 5-week virtual program to transform your business with AI. $5,000 investment.",
  openGraph: {
    title: "AI Consulting for Roofing Companies",
    description: "Transform your roofing business with AI in 5 weeks"
  }
}

export default function ConsultingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
