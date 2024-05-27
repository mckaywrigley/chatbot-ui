import React, { FC } from "react"
import { IconLoader } from "@tabler/icons-react"

interface VoiceLoadingBarProps {
  isLoading: boolean
}

const VoiceLoadingBar: FC<VoiceLoadingBarProps> = ({ isLoading }) => {
  if (!isLoading) return null

  return (
    <div className="mt-3 flex min-h-[60px] items-center justify-center rounded-xl border-2 border-gray-300 bg-transparent px-4 py-2">
      <IconLoader className="animate-spin text-gray-500" size={24} />
      <span className="ml-2 text-sm text-gray-500">Transcribing...</span>
    </div>
  )
}

export default VoiceLoadingBar
