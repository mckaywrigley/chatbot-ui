"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/**
 * The standalone Designs list was removed from the streamlined sidebar - designs
 * now live under each project's Designs tab. Redirect any old link to the
 * workspace dashboard.
 */
export default function DesignsRedirectPage() {
  const params = useParams()
  const router = useRouter()
  useEffect(() => {
    const ws = params.workspaceid as string
    const locale = params.locale as string
    if (ws) router.replace(`/${locale}/${ws}`)
  }, [params, router])
  return null
}
