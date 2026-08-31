/**
 * Cross-workspace live snapshot for the Jarvis assistant.
 *
 * Hits both Supabase (workspaces, projects, chats) and Firestore
 * (designs, reports, paper_library) directly, server-side. Returns
 * raw counts + a small recent-titles list so the system prompt can
 * say "you have 14 designs across 3 workspaces; the freshest is …"
 * without round-tripping through the UI.
 *
 * Defensive on purpose - every call is wrapped so a single backend
 * hiccup degrades to an empty list, never a 500. The compressed
 * memory layer covers the rest.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

import { adminDb } from "@/lib/firebase/admin"
import type { Database } from "@/supabase/types"

export interface WorkspaceLite {
  id: string
  name: string
  isHome: boolean
}

export interface EntityLite {
  id: string
  title: string
  workspaceId?: string
  updatedAt?: string
}

export interface CrossWorkspaceSnapshot {
  workspaces: WorkspaceLite[]
  /** Designs / reports / chats summed across every workspace the user touches. */
  totals: {
    workspaces: number
    designs: number
    reports: number
    chats: number
    papers: number
  }
  /** Top 5 most-recently-touched designs across all workspaces. */
  recentDesigns: EntityLite[]
  /** Top 5 most-recently-touched reports across all workspaces. */
  recentReports: EntityLite[]
  /** Pinned hint of which workspace the chat is happening in, if known. */
  activeWorkspaceId: string | null
  activeWorkspaceName: string | null
}

const EMPTY: CrossWorkspaceSnapshot = {
  workspaces: [],
  totals: { workspaces: 0, designs: 0, reports: 0, chats: 0, papers: 0 },
  recentDesigns: [],
  recentReports: [],
  activeWorkspaceId: null,
  activeWorkspaceName: null
}

export async function loadCrossWorkspaceSnapshot(
  supabase: SupabaseClient<Database>,
  userId: string,
  hintedWorkspaceId?: string | null
): Promise<CrossWorkspaceSnapshot> {
  try {
    // ── Workspaces ──────────────────────────────────────────────
    // user_id == own + workspace_users membership table. We pull
    // owned-only first to keep the query simple; multi-tenant
    // membership is an option we'll add when the `workspace_users`
    // surface lights up (it exists but isn't broadly populated yet).
    const { data: workspaceRows, error: wsErr } = await supabase
      .from("workspaces")
      .select("id, name, is_home")
      .eq("user_id", userId)
      .order("is_home", { ascending: false })
    if (wsErr) {
      console.warn("[jarvis-snapshot] workspaces fetch failed:", wsErr.message)
    }
    const workspaces: WorkspaceLite[] = (workspaceRows ?? []).map(w => ({
      id: w.id,
      name: w.name,
      isHome: !!w.is_home
    }))
    const wsIds = workspaces.map(w => w.id)

    // Pick active workspace - hinted by the request, else the home one,
    // else the first listed. Used by the chat route to scope follow-up
    // queries.
    const activeWorkspace =
      (hintedWorkspaceId && workspaces.find(w => w.id === hintedWorkspaceId)) ||
      workspaces.find(w => w.isHome) ||
      workspaces[0] ||
      null

    if (wsIds.length === 0) return EMPTY

    // ── Chats count (Supabase) ──────────────────────────────────
    const chatsResult = await supabase
      .from("chats")
      .select("id", { count: "exact", head: true })
      .in("workspace_id", wsIds)
    const chatsCount = chatsResult.count ?? 0

    // ── Firestore: designs + reports + papers ──────────────────
    // Three independent fan-outs, parallel. Each fall-back returns
    // zeros so the agent gets a partial snapshot rather than a
    // failed turn. `adminDb` may be null if the Firebase Admin SDK
    // failed to initialise (missing FIREBASE_* env vars); in that
    // case we short-circuit to nulls and let the rest of the
    // snapshot run from Supabase alone.
    const safeQuery = async (collection: string) => {
      if (!adminDb) return null
      try {
        return await adminDb
          .collection(collection)
          .where("user_id", "==", userId)
          .get()
      } catch (e) {
        console.warn(`[jarvis-snapshot] ${collection} fetch failed:`, e)
        return null
      }
    }
    const [designSnap, reportSnap, paperSnap] = await Promise.all([
      safeQuery("designs"),
      safeQuery("reports"),
      safeQuery("paper_library")
    ])

    const recentDesigns: EntityLite[] = ((designSnap?.docs ?? []) as any[])
      .map((d: any) => {
        const raw = d.data() as Record<string, any>
        return {
          id: d.id as string,
          title: (raw.name as string) ?? "Untitled design",
          workspaceId: (raw.workspace_id as string) ?? undefined,
          updatedAt:
            (raw.updated_at as string) ??
            (raw.created_at as string) ??
            undefined
        } satisfies EntityLite
      })
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
      .slice(0, 5)

    const recentReports: EntityLite[] = ((reportSnap?.docs ?? []) as any[])
      .map((d: any) => {
        const raw = d.data() as Record<string, any>
        return {
          id: d.id as string,
          title: (raw.name as string) ?? "Untitled report",
          workspaceId: (raw.workspace_id as string) ?? undefined,
          updatedAt:
            (raw.updated_at as string) ??
            (raw.created_at as string) ??
            undefined
        } satisfies EntityLite
      })
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
      .slice(0, 5)

    return {
      workspaces,
      totals: {
        workspaces: workspaces.length,
        designs: designSnap?.size ?? 0,
        reports: reportSnap?.size ?? 0,
        chats: chatsCount,
        papers: paperSnap?.size ?? 0
      },
      recentDesigns,
      recentReports,
      activeWorkspaceId: activeWorkspace?.id ?? null,
      activeWorkspaceName: activeWorkspace?.name ?? null
    }
  } catch (e: any) {
    console.warn(
      "[jarvis-snapshot] loadCrossWorkspaceSnapshot failed:",
      e?.message ?? e
    )
    return EMPTY
  }
}

/**
 * Render the snapshot as a system-prompt block. Compact + structured
 * so the LLM can scan it without burning many tokens.
 */
export function renderSnapshotForPrompt(snap: CrossWorkspaceSnapshot): string {
  if (snap.workspaces.length === 0) {
    return "LIVE CONTEXT: the user has no workspaces yet."
  }
  const lines: string[] = ["LIVE CONTEXT:"]
  lines.push(
    `- Workspaces: ${snap.totals.workspaces} (active: ${snap.activeWorkspaceName ?? "-"})`
  )
  lines.push(
    `- Across all workspaces: ${snap.totals.designs} design${snap.totals.designs === 1 ? "" : "s"}, ${snap.totals.reports} report${snap.totals.reports === 1 ? "" : "s"}, ${snap.totals.chats} chat${snap.totals.chats === 1 ? "" : "s"}, ${snap.totals.papers} paper${snap.totals.papers === 1 ? "" : "s"} in library`
  )
  if (snap.recentDesigns.length) {
    lines.push("- Recent designs:")
    for (const d of snap.recentDesigns) {
      lines.push(`  · "${d.title}" (id=${d.id})`)
    }
  }
  if (snap.recentReports.length) {
    lines.push("- Recent reports:")
    for (const r of snap.recentReports) {
      lines.push(`  · "${r.title}" (id=${r.id})`)
    }
  }
  return lines.join("\n")
}
