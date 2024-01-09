"use client"

import SharePage from "@/components/sharing/share-page"
import { SharePreset } from "@/components/sharing/share-preset"
import { getPresetById } from "@/db/presets"

interface SharePresetPageProps {
  params: {
    id: string
  }
}

export default function SharePresetPage({ params }: SharePresetPageProps) {
  return (
    <SharePage
      contentType="presets"
      id={params.id}
      fetchById={getPresetById}
      ViewComponent={SharePreset}
    />
  )
}
