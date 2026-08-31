/**
 * Beacon-on-unload endpoint for the Jarvis memory layer.
 *
 * Compresses the last chat arc, embeds the summary, writes both into
 * the user's vault prefix in Supabase Storage, then fans out per-topic
 * bullets. Wrapped in a single try/catch so any failure here NEVER
 * breaks the main chat flow (this is purely a write-side optimisation).
 */
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { compressChatArc } from "@/lib/jarvis/compress"
import { jarvisVault } from "@/lib/jarvis/vault"
import { episodeSlug } from "@/lib/jarvis/util"
import type { Episode } from "@/lib/jarvis/types"
import { embedBatch } from "@/lib/rag/embed"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  // Always return 200 to the beacon - the client doesn't care about the
  // result, and we don't want a hung promise on `navigator.sendBeacon`.
  try {
    const supabase = createClient(cookies())
    const {
      data: { session }
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ ok: false, reason: "unauthorized" })
    }

    const body = (await req.json().catch(() => ({}))) as {
      messages?: Array<{ role: "user" | "assistant"; content: string }>
      sessionId?: string
      workspaceId?: string
      workspaceName?: string
      projectId?: string | null
      userName?: string
    }

    const messages = body.messages ?? []
    const usable = messages.filter(
      m => m && typeof m.content === "string" && m.content.trim()
    )
    if (usable.length === 0) {
      return NextResponse.json({ ok: true, episode: null })
    }

    const compressed = await compressChatArc({
      messages: usable,
      userName: body.userName,
      workspaceName: body.workspaceName
    })
    if (!compressed) return NextResponse.json({ ok: true, episode: null })

    // Embedding is best-effort. If it fails the episode still lands and
    // future retrieval just falls back to recency.
    const embedText = `${compressed.title}\n\n${compressed.summary}`.slice(
      0,
      8000
    )
    let embedding: number[] | undefined
    try {
      const [vec] = await embedBatch([embedText])
      if (Array.isArray(vec) && vec.length > 0) embedding = vec
    } catch (err: any) {
      console.warn("[jarvis-compress] embed failed:", err?.message ?? err)
    }

    const now = new Date()
    const slug = episodeSlug(compressed.title, now, body.sessionId)
    const ep: Episode = {
      slug,
      createdAt: now,
      frontmatter: {
        created: now.toISOString(),
        session_id: body.sessionId ?? "",
        title: compressed.title,
        priority: compressed.priority,
        intent: compressed.intent,
        topics: compressed.topics,
        references: compressed.references,
        workspace_id: body.workspaceId ?? "",
        project_id: body.projectId ?? null,
        tools_used: compressed.tools_used,
        breakthrough_quote: compressed.breakthrough_quote
      },
      body: renderEpisodeBody(compressed),
      embedding
    }

    const ok = await jarvisVault.writeEpisode(session.user.id, ep)
    if (ok) {
      // Topic fan-out is fire-and-forget. Failures just mean the topic
      // file is one bullet short - never blocks the response.
      await Promise.all(
        ep.frontmatter.topics.map(topic =>
          jarvisVault.appendToTopic(
            session.user.id,
            topic,
            ep.frontmatter.title,
            ep.slug
          )
        )
      )
    }

    // Don't log episode bodies - they may contain personal disclosures.
    // Slug + topic counts are enough (#13 in the implementation guide).
    console.log(
      `[jarvis-compress] uid=${session.user.id} slug=${ep.slug} topics=${ep.frontmatter.topics.length} bytes=${ep.body.length}`
    )

    return NextResponse.json({ ok: true, episode: { slug: ep.slug } })
  } catch (e: any) {
    console.error("[jarvis-compress] unhandled:", e?.message ?? e)
    return NextResponse.json({ ok: false })
  }
}

function renderEpisodeBody(c: {
  title: string
  summary: string
  topics: string[]
  references: Array<{ kind: string; id: string; title: string }>
}): string {
  const lines = [`# ${c.title}`, "", c.summary]
  if (c.topics.length > 0) {
    lines.push("", "## Connections", ...c.topics.map(t => `- [[${t}]]`))
  }
  if (c.references.length > 0) {
    lines.push(
      "",
      "## References",
      ...c.references.map(r => `- ${r.kind}: ${r.title} (\`${r.id}\`)`)
    )
  }
  return lines.join("\n").trim()
}
