"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/**
 * The standalone Reports list was removed from the streamlined sidebar - reports
 * now live under each project's Reports tab. Redirect any old link to the
 * workspace dashboard.
 */
export default function ReportsRedirectPage() {
  const params = useParams()
  const router = useRouter()
  useEffect(() => {
    const ws = params.workspaceid as string
    const locale = params.locale as string
    if (ws) router.replace(`/${locale}/${ws}`)
  }, [params, router])
  return null
}
