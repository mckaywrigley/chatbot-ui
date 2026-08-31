"use client"

import { useParams, useRouter } from "next/navigation"
import { StudioLayout } from "@/components/studio/studio-layout"

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()

  const projectId = params.projectId as string
  const workspaceId = params.workspaceid as string
  const locale = params.locale as string

  const handleBack = () => {
    router.push(`/${locale}/${workspaceId}/projects`)
  }

  return (
    <StudioLayout
      projectId={projectId}
      workspaceId={workspaceId}
      onBack={handleBack}
    />
  )
}
