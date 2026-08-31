"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/browser-client"
import { Loader2 } from "lucide-react"

/**
 * Workspace-agnostic entry point for a shared design. Invite emails link here
 * because at invite time we don't know which workspace the invitee will use.
 *
 * Flow: confirm the viewer is signed in and actually has access to the design,
 * then redirect them into the editor under THEIR OWN workspace
 * (/{locale}/{theirWorkspaceId}/designs/{designId}). That path is RLS-safe (they
 * own the workspace) and the editor loads the design by id with server-side
 * access checks - an invited editor gets edit access, a viewer read-only.
 */
export default function OpenDesignResolver({
  params
}: {
  params: { designId: string; locale: string }
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession()
        if (!session) {
          router.replace(
            `/${params.locale}/login?next=${encodeURIComponent(
              `/${params.locale}/open/design/${params.designId}`
            )}`
          )
          return
        }

        // Confirm the design exists and this user can at least view it before
        // routing into the editor - gives a clean "no access" message instead
        // of bouncing them into an editor that would 403 on load.
        const res = await fetch(`/api/design/${params.designId}`)
        if (!res.ok) {
          if (!cancelled) {
            setError(
              res.status === 403
                ? "You don't have access to this design. Ask the owner to invite you with your account email."
                : "This design is unavailable or the link is no longer valid."
            )
          }
          return
        }

        const { data: workspaces } = await supabase
          .from("workspaces")
          .select("id")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true })
          .limit(1)
        const workspaceId = workspaces?.[0]?.id
        if (!workspaceId) {
          if (!cancelled) {
            setError(
              "No workspace is available on your account to open this design."
            )
          }
          return
        }

        router.replace(
          `/${params.locale}/${workspaceId}/designs/${params.designId}`
        )
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Couldn't open this design.")
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [params.designId, params.locale, router])

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2 px-4 text-center">
      {error ? (
        <>
          <h1 className="text-xl font-semibold">Can&apos;t open this design</h1>
          <p className="text-muted-foreground max-w-md">{error}</p>
        </>
      ) : (
        <>
          <Loader2 className="size-6 animate-spin" />
          <p className="text-muted-foreground text-sm">Opening design…</p>
        </>
      )}
    </div>
  )
}
