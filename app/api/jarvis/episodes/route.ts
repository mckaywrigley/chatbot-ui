/**
 * GET /api/jarvis/episodes - list recent vault episodes for the
 * authenticated user (default 20).
 * DELETE /api/jarvis/episodes?slug=… - remove a single episode + its
 * embedding sidecar from the vault. Soft for now: we never offer
 * "undo" beyond Supabase's own object versioning.
 *
 * Powers the "memory drawer" the user can pop from the dashboard to
 * audit / forget what the assistant remembers.
 */

import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { jarvisVault } from "@/lib/jarvis/vault"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const supabase = createClient(cookies())
  const {
    data: { session }
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ ok: false, episodes: [] }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const limit = clampInt(searchParams.get("limit"), 1, 100, 20)

  try {
    const eps = await jarvisVault.listRecentEpisodes(session.user.id, limit)
    return NextResponse.json({
      ok: true,
      episodes: eps.map(ep => ({
        slug: ep.slug,
        createdAt: ep.createdAt.toISOString(),
        title: ep.frontmatter.title,
        intent: ep.frontmatter.intent,
        priority: ep.frontmatter.priority,
        topics: ep.frontmatter.topics,
        references: ep.frontmatter.references,
        // Truncate body for the drawer summary; full content is only
        // exposed on explicit fetch (future endpoint) to keep payloads
        // small.
        excerpt: ep.body.slice(0, 400)
      }))
    })
  } catch (e: any) {
    console.warn("[jarvis-episodes] list failed:", e?.message ?? e)
    return NextResponse.json({ ok: false, episodes: [] })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient(cookies())
  const {
    data: { session }
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get("slug")
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    return NextResponse.json(
      { ok: false, error: "missing or invalid slug" },
      { status: 400 }
    )
  }
  try {
    await jarvisVault.deleteEpisode(session.user.id, slug)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.warn("[jarvis-episodes] delete failed:", e?.message ?? e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

function clampInt(
  v: string | null,
  min: number,
  max: number,
  fallback: number
): number {
  if (!v) return fallback
  const n = Number.parseInt(v, 10)
  if (Number.isNaN(n)) return fallback
  return Math.max(min, Math.min(max, n))
}
