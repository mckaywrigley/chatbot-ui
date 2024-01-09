"use client"

import SharePage from "@/components/sharing/share-page"
import { SharePrompt } from "@/components/sharing/share-prompt"
import { getPromptById } from "@/db/prompts"

interface SharePromptPageProps {
  params: {
    id: string
  }
}

export default function SharePromptPage({ params }: SharePromptPageProps) {
  return (
    <SharePage
      contentType="prompts"
      id={params.id}
      fetchById={getPromptById}
      ViewComponent={SharePrompt}
    />
  )
}
