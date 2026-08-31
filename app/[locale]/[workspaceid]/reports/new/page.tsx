"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { CreateReport } from "@/components/reports/create-report"

export default function NewReportPage() {
  const router = useRouter()
  const params = useParams() as { locale: string; workspaceid: string }
  const searchParams = useSearchParams()
  const projectId = searchParams.get("projectId")
  const [isOpen, setIsOpen] = useState(true)

  // Cancel returns the user to wherever the report was being created
  // from - explicit routing, NOT `history.back()`. The history-back
  // path bounced into the previous design page when the user navigated
  // there before opening the create-report flow (#12 in the May ask).
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) return
    if (projectId) {
      // Came from a project canvas → return to its Reports tab.
      router.push(
        `/${params.locale}/${params.workspaceid}/projects/${projectId}#reports`
      )
    } else {
      // Came from the workspace Reports list.
      router.push(`/${params.locale}/${params.workspaceid}/reports`)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <CreateReport
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        projectId={projectId || undefined}
      />
    </div>
  )
}
