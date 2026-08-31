"use client"

import { IconArrowLeft, IconBrain } from "@tabler/icons-react"
import { ChatUI } from "@/components/chat/chat-ui"

interface StudioChatPanelProps {
  width: number
  projectId?: string
  workspaceId?: string
  onBack?: () => void
}

export function StudioChatPanel({
  width,
  projectId,
  workspaceId,
  onBack
}: StudioChatPanelProps) {
  return (
    <div
      className="relative z-30 flex h-full shrink-0 flex-col border-r border-slate-300 bg-slate-200 shadow-lg"
      style={{ width }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 cursor-pointer items-center gap-3 border-b border-slate-300 bg-slate-200 px-6 py-5 transition-colors hover:bg-slate-300/50"
        onClick={onBack}
        title="Back to Project"
      >
        <div className="flex size-8 items-center justify-center rounded bg-blue-600 text-sm font-bold text-white shadow-md">
          <IconBrain size={18} />
        </div>
        <h1 className="truncate text-base font-bold text-slate-800">
          ShadowAI
        </h1>
        {onBack && (
          <IconArrowLeft
            size={16}
            className="ml-auto text-slate-600 hover:text-slate-800"
          />
        )}
      </div>

      {/* Chat UI */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-200">
        <div className="relative flex-1">
          <ChatUI variant="panel" />
        </div>
      </div>
    </div>
  )
}
