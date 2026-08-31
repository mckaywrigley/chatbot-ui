/**
 * GET /api/jarvis/brief
 *
 * Returns the cached daily brief for the authenticated user. Re-runs
 * the generator on demand if the cached entry has expired (6h TTL,
 * see lib/jarvis/brief.ts). Cheap to call - the hero pings it on
 * mount, the response feeds the right-side "Today's brief" panel.
 *
 * Pass `?refresh=1` to force a fresh generation (e.g. from a "Refresh
 * brief" debug button).
 */

import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { getDailyBrief } from "@/lib/jarvis/brief"
import { loadCrossWorkspaceSnapshot } from "@/lib/jarvis/snapshot"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const supabase = createClient(cookies())
  const {
    data: { session }
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ ok: false, items: [] }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const forceFresh = searchParams.get("refresh") === "1"
  const workspaceId = searchParams.get("workspaceId")
  const locale = searchParams.get("locale") ?? "en"

  try {
    const snapshot = await loadCrossWorkspaceSnapshot(
      supabase,
      session.user.id,
      workspaceId
    )
    const brief = await getDailyBrief({
      userId: session.user.id,
      locale,
      snapshot,
      forceFresh
    })
    return NextResponse.json({ ok: true, ...brief })
  } catch (e: any) {
    console.warn("[jarvis-brief] route failed:", e?.message ?? e)
    // Never blank the hero on a brief failure - return an empty list
    // so the UI degrades gracefully.
    return NextResponse.json({
      ok: false,
      items: [],
      generatedAt: new Date().toISOString()
    })
  }
}
