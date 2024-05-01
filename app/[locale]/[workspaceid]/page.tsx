"use client"

import { ChatbotUIContext } from "@/context/context"
import { useContext } from "react"

export default function WorkspacePage() {
  const { selectedWorkspace } = useContext(ChatbotUIContext)

  return (
    <div className="">
      <div className="text-4xl">{selectedWorkspace?.name}</div>
    </div>
  )
}
