"use client"

import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { FC, useContext, useEffect, useState } from "react"
import { DesignItem } from "./design-item"
import { Users } from "lucide-react"

export const DesignsList: FC = () => {
  const { designs, profile } = useContext(ChatbotUIContext)
  const [sharedDesigns, setSharedDesigns] = useState<Tables<"designs">[]>([])

  useEffect(() => {
    if (!profile?.user_id) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/designs?scope=shared-with-me")
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setSharedDesigns(data.designs ?? [])
      } catch {
        // non-fatal - sidebar section stays hidden
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [profile?.user_id])

  return (
    <div className="space-y-2">
      {designs.map(design => (
        <DesignItem key={design.id} design={design} />
      ))}

      {sharedDesigns.length > 0 && (
        <>
          <div className="text-muted-foreground mt-4 flex items-center gap-2 px-2 pt-3 text-xs font-semibold uppercase tracking-wide">
            <Users className="size-3" /> Shared with me
          </div>
          {sharedDesigns.map(design => (
            <DesignItem key={`shared-${design.id}`} design={design} />
          ))}
        </>
      )}
    </div>
  )
}
