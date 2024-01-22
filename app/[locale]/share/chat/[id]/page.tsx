"use client"

import { ShareChat } from "@/components/sharing/share-chat"
import { ShareHeader } from "@/components/sharing/share-header"
import { ScreenLoader } from "@/components/ui/screen-loader"
import { getChatById } from "@/db/chats"
import { getMessagesByChatId } from "@/db/messages"
import { supabase } from "@/lib/supabase/browser-client"
import { Tables } from "@/supabase/types"
import { useEffect, useState } from "react"

interface ShareChatPageProps {
  params: {
    id: string
  }
}

export default function ShareChatPage({ params }: ShareChatPageProps) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [chat, setChat] = useState<Tables<"chats"> | null>(null)
  const [messages, setMessages] = useState<Tables<"messages">[]>([])

  const onLoad = async () => {
    const session = (await supabase.auth.getSession()).data.session

    setSession(session)

    const fetchedChat = await getChatById(params.id)
    setChat(fetchedChat)

    if (!fetchedChat) {
      setLoading(false)
      return
    }

    const fetchedMessages = await getMessagesByChatId(fetchedChat.id)
    setMessages(fetchedMessages)

    setLoading(false)
  }

  useEffect(() => {
    onLoad()
  }, [])

  if (loading) {
    return <ScreenLoader />
  }

  if (!chat) {
    return (
      <div className="flex size-full items-center justify-center text-4xl">
        Chat not found.
      </div>
    )
  }

  return (
    <div className="flex size-full flex-col p-4">
      <ShareHeader session={session} />

      <div className="flex flex-1 flex-col items-center justify-center">
        <ShareChat
          user={session?.user}
          chat={chat}
          messages={messages}
          username=""
        />
      </div>
    </div>
  )
}
