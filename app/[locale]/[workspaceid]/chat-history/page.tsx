"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/**
 * The standalone Chats history was removed from the streamlined sidebar - chats
 * now live under each project's Chats tab. Redirect any old link to the
 * projects list.
 */
export default function ChatHistoryRedirectPage() {
  const params = useParams()
  const router = useRouter()
  useEffect(() => {
    const ws = params.workspaceid as string
    const locale = params.locale as string
    if (ws) router.replace(`/${locale}/${ws}/projects`)
  }, [params, router])
  return null
}
