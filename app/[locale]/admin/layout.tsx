import { Metadata } from "next"
import { ReactNode } from "react"

// Internal ops tool - never index, never surface in search or previews.
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true }
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
