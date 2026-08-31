"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

export default function DataCollectionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceid = params.workspaceid as string

  // Redirect to the main data collection page
  useEffect(() => {
    router.replace(`/${workspaceid}/data-collection`)
  }, [workspaceid, router])

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-muted-foreground animate-pulse text-lg">
        Redirecting...
      </div>
    </div>
  )
}
