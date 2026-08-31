/**
 * Supabase Storage-backed vault for the Jarvis memory layer.
 *
 * Mirrors the S3/R2/Blob pattern from
 * `docs/markdown-vault-memory-guide.md` adapted to the bucket created
 * by migration 20260511. Object keys live under `{uid}/episodes/...`,
 * `{uid}/topics/...`, etc. Reads/writes go through the service-role
 * client so the compress pipeline can run after the user's session
 * tab has been closed (beacon-on-unload pattern).
 *
 * The bucket is private; RLS allows the user to read their own prefix
 * if we ever want to expose a "download my vault" surface to the
 * client, but everything else funnels through this module.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/supabase/types"
import { embedBatch } from "@/lib/rag/embed"

import type { Episode } from "./types"
import { dot, normalize, parseFrontmatter, slugify, toMarkdown } from "./util"

const BUCKET = "jarvis_vault"

function getServiceClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Jarvis vault: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    )
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

function keyOf(uid: string, rel: string): string {
  return `${uid}/${rel}`
}

export class JarvisVault {
  private client: SupabaseClient<Database>

  constructor(client?: SupabaseClient<Database>) {
    this.client = client ?? getServiceClient()
  }

  /**
   * Persist one compressed episode + its embedding sidecar. Best-
   * effort - storage failures log + return false rather than throwing,
   * so the caller (compress endpoint) can return a 200 to the beacon.
   */
  async writeEpisode(uid: string, ep: Episode): Promise<boolean> {
    try {
      const mdKey = keyOf(uid, `episodes/${ep.slug}.md`)
      const mdBody = toMarkdown(ep.frontmatter, ep.body)
      const { error: mdErr } = await this.client.storage
        .from(BUCKET)
        .upload(mdKey, new Blob([mdBody], { type: "text/markdown" }), {
          upsert: true,
          contentType: "text/markdown; charset=utf-8"
        })
      if (mdErr) {
        console.warn("[jarvis-vault] writeEpisode md failed:", mdErr.message)
        return false
      }

      if (ep.embedding && ep.embedding.length > 0) {
        const embedKey = keyOf(uid, `episodes/${ep.slug}.embed.json`)
        const payload = JSON.stringify({
          slug: ep.slug,
          created_at: ep.createdAt.toISOString(),
          dim: ep.embedding.length,
          vec: ep.embedding
        })
        const { error: embedErr } = await this.client.storage
          .from(BUCKET)
          .upload(embedKey, new Blob([payload], { type: "application/json" }), {
            upsert: true,
            contentType: "application/json"
          })
        if (embedErr) {
          console.warn(
            "[jarvis-vault] writeEpisode embed failed:",
            embedErr.message
          )
        }
      }
      return true
    } catch (e: any) {
      console.warn("[jarvis-vault] writeEpisode threw:", e?.message ?? e)
      return false
    }
  }

  /**
   * Read the most-recently-compressed episodes. Sort is lexicographic
   * on key - works because the slug prefix is the YYYY-MM-DD date.
   */
  async listRecentEpisodes(uid: string, limit = 5): Promise<Episode[]> {
    try {
      const folder = `${uid}/episodes`
      const { data, error } = await this.client.storage
        .from(BUCKET)
        .list(folder, {
          limit: 1000,
          sortBy: { column: "name", order: "desc" }
        })
      if (error || !data) return []
      const recent = data
        .filter(o => o.name.endsWith(".md"))
        .slice(0, limit)
        .map(o => `${folder}/${o.name}`)
      const out: Episode[] = []
      for (const key of recent) {
        const ep = await this.readEpisodeByKey(key)
        if (ep) out.push(ep)
      }
      return out
    } catch (e: any) {
      console.warn("[jarvis-vault] listRecentEpisodes failed:", e?.message ?? e)
      return []
    }
  }

  /**
   * Score every embedded episode against the query and return the top
   * `k` matches. In-process cosine - fine for the < 500 episodes/user
   * volumes the implementation guide assumes. Past that, swap to
   * pgvector in `rag_items` (already on disk).
   */
  async searchEpisodes(uid: string, query: string, k = 5): Promise<Episode[]> {
    if (!query.trim()) return []
    try {
      const [queryVec] = await embedBatch([query])
      if (!queryVec) return []
      const queryNorm = normalize(queryVec)

      const folder = `${uid}/episodes`
      const { data, error } = await this.client.storage
        .from(BUCKET)
        .list(folder, { limit: 1000 })
      if (error || !data) return []

      const embedKeys = data
        .filter(o => o.name.endsWith(".embed.json"))
        .map(o => `${folder}/${o.name}`)

      const scored: { key: string; score: number }[] = []
      for (const key of embedKeys) {
        try {
          const { data: blob, error: dErr } = await this.client.storage
            .from(BUCKET)
            .download(key)
          if (dErr || !blob) continue
          const text = await blob.text()
          const json = JSON.parse(text) as { vec: number[] }
          if (!Array.isArray(json.vec)) continue
          const v = normalize(json.vec)
          const score = dot(queryNorm, v)
          scored.push({
            key: key.replace(".embed.json", ".md"),
            score
          })
        } catch {
          // skip bad sidecar
        }
      }
      scored.sort((a, b) => b.score - a.score)
      const top = scored.slice(0, k)
      const out: Episode[] = []
      for (const { key } of top) {
        const ep = await this.readEpisodeByKey(key)
        if (ep) out.push(ep)
      }
      return out
    } catch (e: any) {
      console.warn("[jarvis-vault] searchEpisodes failed:", e?.message ?? e)
      return []
    }
  }

  /**
   * Append a new bullet to the user's topic file. Race-tolerant via
   * upsert - at one writer per user this is fine. If we ever batch
   * compress (multiple arcs per second), swap to an append-only log
   * + nightly compactor.
   */
  async appendToTopic(
    uid: string,
    topic: string,
    line: string,
    episodeSlug: string
  ): Promise<void> {
    const slug = slugify(topic)
    const key = keyOf(uid, `topics/${slug}.md`)
    let existing = ""
    try {
      const { data, error } = await this.client.storage
        .from(BUCKET)
        .download(key)
      if (!error && data) {
        existing = await data.text()
      }
    } catch {
      // first-mention path - existing stays empty
    }
    if (!existing) {
      const firstSeen = new Date().toISOString().slice(0, 10)
      existing = `---\nfirst_seen: ${firstSeen}\nepisodes_count: 0\n---\n\n# ${topic}\n\n## Episodes\n`
    }
    const today = new Date().toISOString().slice(0, 10)
    const bullet = `- ${today} - [[${episodeSlug}]] ${line.trim()}`
    const newContent = existing.trimEnd() + "\n" + bullet + "\n"
    await this.client.storage
      .from(BUCKET)
      .upload(key, new Blob([newContent], { type: "text/markdown" }), {
        upsert: true,
        contentType: "text/markdown; charset=utf-8"
      })
      .catch(e =>
        console.warn(
          "[jarvis-vault] appendToTopic upload failed:",
          e?.message ?? e
        )
      )
  }

  /**
   * Remove one episode (markdown + embedding sidecar) from the vault.
   * Used by the user-facing memory drawer's "forget" action.
   *
   * Validates the slug so a crafted request can't traverse out of the
   * user's prefix - only `[a-z0-9-]+` is allowed in the API route.
   */
  async deleteEpisode(uid: string, slug: string): Promise<void> {
    try {
      const keys = [
        keyOf(uid, `episodes/${slug}.md`),
        keyOf(uid, `episodes/${slug}.embed.json`)
      ]
      await this.client.storage.from(BUCKET).remove(keys)
    } catch (e: any) {
      console.warn("[jarvis-vault] deleteEpisode failed:", e?.message ?? e)
    }
  }

  /**
   * Recursively delete every object under `{uid}/`. Called from the
   * profile-deletion path so we comply with GDPR right-to-erasure
   * (#12 in the implementation guide).
   */
  async deleteUserVault(uid: string): Promise<void> {
    try {
      const folders = ["episodes", "topics", "daily", "insights"]
      const all: string[] = [`${uid}/profile.md`]
      for (const folder of folders) {
        const { data } = await this.client.storage
          .from(BUCKET)
          .list(`${uid}/${folder}`, { limit: 10000 })
        for (const obj of data ?? []) {
          all.push(`${uid}/${folder}/${obj.name}`)
        }
      }
      if (all.length) {
        await this.client.storage.from(BUCKET).remove(all)
      }
    } catch (e: any) {
      console.warn("[jarvis-vault] deleteUserVault failed:", e?.message ?? e)
    }
  }

  // ── helpers ────────────────────────────────────────────────────────

  private async readEpisodeByKey(key: string): Promise<Episode | null> {
    try {
      const { data, error } = await this.client.storage
        .from(BUCKET)
        .download(key)
      if (error || !data) return null
      const raw = await data.text()
      const { fm, body } = parseFrontmatter(raw)
      const slug = key.split("/").pop()!.replace(".md", "")
      const created = fm.created ? new Date(fm.created) : new Date()
      return {
        slug,
        createdAt: created,
        frontmatter: {
          created: fm.created ?? created.toISOString(),
          session_id: fm.session_id ?? "",
          title: fm.title ?? slug,
          priority: typeof fm.priority === "number" ? fm.priority : 3,
          intent: fm.intent ?? "chat",
          topics: Array.isArray(fm.topics) ? fm.topics : [],
          references: Array.isArray(fm.references) ? fm.references : [],
          workspace_id: fm.workspace_id ?? "",
          project_id: fm.project_id ?? null,
          tools_used: Array.isArray(fm.tools_used) ? fm.tools_used : [],
          breakthrough_quote: fm.breakthrough_quote ?? ""
        },
        body
      }
    } catch (e: any) {
      console.warn("[jarvis-vault] readEpisodeByKey failed:", e?.message ?? e)
      return null
    }
  }
}

export const jarvisVault = new JarvisVault()
