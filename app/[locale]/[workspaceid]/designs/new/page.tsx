"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import {
  CreateDesign,
  type CreateDesignMode
} from "@/components/designs/create-design"

const VALID_MODES: CreateDesignMode[] = [
  "from-scratch",
  "from-hypothesis",
  "from-plan",
  "check-stats",
  "make-plan"
]

function parseMode(raw: string | null): CreateDesignMode {
  if (!raw) return "from-scratch"
  return VALID_MODES.includes(raw as CreateDesignMode)
    ? (raw as CreateDesignMode)
    : "from-scratch"
}

/**
 * /designs/new is a lightweight shell that opens the Create Design modal.
 * Query params:
 *   ?projectId=… - optional; scopes the new design to a project
 *   ?mode=…      - from-scratch | from-hypothesis | from-plan
 *   ?q=…         - seed text from the dashboard quick-start composer
 *
 * Cancel routes to:
 *   • the owning project if `projectId` is present,
 *   • otherwise the workspace dashboard.
 */
export default function NewDesignPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const params = useParams()
  const projectId = searchParams.get("projectId")
  const mode = parseMode(searchParams.get("mode"))
  const initialQuery = searchParams.get("q") ?? ""
  const [isOpen, setIsOpen] = useState(true)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      const locale = (params.locale as string) ?? "en"
      const wsId = params.workspaceid as string
      router.replace(
        projectId
          ? `/${locale}/${wsId}/projects/${projectId}`
          : `/${locale}/${wsId}`
      )
    }
  }

  return (
    <div className="bg-paper h-full">
      <CreateDesign
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        projectId={projectId}
        mode={mode}
        initialQuery={initialQuery}
      />
    </div>
  )
}
