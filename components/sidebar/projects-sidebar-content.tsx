"use client"

import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { IconFolder, IconPlus } from "@tabler/icons-react"
import { useEffect } from "react"

export const ProjectsSidebarContent = () => {
  const params = useParams()
  const router = useRouter()

  const workspaceId = params.workspaceid as string
  const locale = params.locale as string

  const handleViewAllProjects = () => {
    router.push(`/${locale}/${workspaceId}/projects`)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <IconFolder size={20} />
          <h3 className="text-sm font-medium">Projects</h3>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <IconFolder size={48} className="mb-4 text-zinc-300" />
        <h4 className="mb-2 text-sm font-medium text-zinc-600">
          Organize your work
        </h4>
        <p className="mb-6 px-4 text-xs text-zinc-400">
          Projects help you group related chats, files, and reports together.
        </p>
        <Button
          onClick={handleViewAllProjects}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <IconFolder size={14} />
          View All Projects
        </Button>
      </div>
    </div>
  )
}
