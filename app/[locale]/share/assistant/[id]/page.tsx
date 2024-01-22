"use client"

import { ShareAssistant } from "@/components/sharing/share-assistant"
import { ShareHeader } from "@/components/sharing/share-header"
import { ScreenLoader } from "@/components/ui/screen-loader"
import { getAssistantById } from "@/db/assistants"
import { supabase } from "@/lib/supabase/browser-client"
import { Tables } from "@/supabase/types"
import { useEffect, useState } from "react"

interface ShareAssistantPageProps {
  params: {
    id: string
  }
}

export default function ShareAssistantPage({
  params
}: ShareAssistantPageProps) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [assistant, setAssistant] = useState<Tables<"assistants"> | null>(null)

  const onLoad = async () => {
    const session = (await supabase.auth.getSession()).data.session

    setSession(session)

    const fetchedAssistant = await getAssistantById(params.id)
    setAssistant(fetchedAssistant)

    if (!fetchedAssistant) {
      setLoading(false)
      return
    }

    setLoading(false)
  }

  useEffect(() => {
    onLoad()
  }, [])

  if (loading) {
    return <ScreenLoader />
  }

  if (!assistant) {
    return (
      <div className="flex size-full items-center justify-center text-4xl">
        Assistant not found.
      </div>
    )
  }

  return (
    <div className="flex size-full flex-col p-4">
      <ShareHeader session={session} />

      <div className="flex flex-1 flex-col items-center justify-center">
        <ShareAssistant user={session?.user} assistant={assistant} />
      </div>
    </div>
  )
}
