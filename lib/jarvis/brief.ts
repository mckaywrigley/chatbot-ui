/**
 * Today's brief generator.
 *
 * Pulls the user's cross-workspace snapshot + recent vault episodes,
 * asks the design LLM for "three things worth your attention before
 * tomorrow", returns a structured payload the hero renders.
 *
 * Cached for 6 hours per user - the brief is meant to feel like a
 * morning paper, not a real-time feed. The cache lives in-memory so
 * Vercel's per-region cold-starts get fresh briefs (acceptable cost).
 * If we want consistency across regions / cold-starts, swap the cache
 * to Supabase Storage at `users/{uid}/daily/{YYYY-MM-DD}.json`.
 */

import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"

import {
  getAzureOpenAIForDesign,
  getDesignDeployment
} from "@/lib/azure-openai"
import { jarvisVault } from "@/lib/jarvis/vault"
import type { CrossWorkspaceSnapshot } from "@/lib/jarvis/snapshot"

export type BriefKind = "pattern" | "blocker" | "literature"

export interface BriefItem {
  kind: BriefKind
  /** ≤ 220 chars. Reads as a single observation, plain English. */
  body: string
  /** Optional CTA chip rendered to the right. */
  ctaLabel?: string
  /** Relative URL the CTA links to. */
  ctaHref?: string
}

export interface DailyBrief {
  items: BriefItem[]
  generatedAt: string
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const cache = new Map<string, { value: DailyBrief; expiresAt: number }>()

const BriefItemSchema = z.object({
  kind: z.enum(["pattern", "blocker", "literature"]),
  body: z.string(),
  ctaLabel: z.string().nullable(),
  ctaHref: z.string().nullable()
})
const BriefResponseSchema = z.object({
  items: z.array(BriefItemSchema).min(0).max(3)
})

const SYSTEM_PROMPT = `You are ShadowAI's morning brief writer. The scientist opens their dashboard and sees three short observations - "Today's brief" - that orient them on what to look at first. You write those three.

Categories:
- pattern: a noteworthy trend, recurrence, or signal in their recent work. e.g. "Across PRJ-407 your xanthan/guar blend has shown stronger shear-thinning than either polymer alone in the last 3 runs."
- blocker: something stalled or waiting on an external dependency. e.g. "PRJ-389 vessel calibration cert still pending from Sartorius - 2 SOP gates can't open until it lands."
- literature: new relevant papers or external context worth a glance. e.g. "8 new arXiv papers tagged 'viscosity' surfaced this week relevant to PRJ-407."

Rules:
- Return 0-3 items. Don't fabricate. If you don't have signal for a category, OMIT it.
- Each body ≤ 220 chars, plain English, scientist-to-scientist.
- ctaLabel + ctaHref: ONLY include when you're naming a concrete entity present in the snapshot (e.g. a design with id D-23). Otherwise null.
- Output JSON only.`

export async function getDailyBrief(opts: {
  userId: string
  locale: string
  snapshot: CrossWorkspaceSnapshot
  forceFresh?: boolean
}): Promise<DailyBrief> {
  const cacheKey = `${opts.userId}:${opts.snapshot.activeWorkspaceId ?? "home"}`
  if (!opts.forceFresh) {
    const hit = cache.get(cacheKey)
    if (hit && hit.expiresAt > Date.now()) return hit.value
  }

  // Gather context: the snapshot + last 5 episodes.
  const recentEpisodes = await jarvisVault
    .listRecentEpisodes(opts.userId, 5)
    .catch(() => [])

  const wsId = opts.snapshot.activeWorkspaceId
  const ctxLines: string[] = [
    `Active workspace: ${opts.snapshot.activeWorkspaceName ?? "-"}`,
    `Totals: ${opts.snapshot.totals.designs} designs, ${opts.snapshot.totals.reports} reports, ${opts.snapshot.totals.papers} papers, ${opts.snapshot.totals.chats} chats.`
  ]
  if (opts.snapshot.recentDesigns.length) {
    ctxLines.push("Recent designs:")
    for (const d of opts.snapshot.recentDesigns) {
      ctxLines.push(`  - "${d.title}" (id=${d.id})`)
    }
  }
  if (opts.snapshot.recentReports.length) {
    ctxLines.push("Recent reports:")
    for (const r of opts.snapshot.recentReports) {
      ctxLines.push(`  - "${r.title}" (id=${r.id})`)
    }
  }
  if (recentEpisodes.length) {
    ctxLines.push("Recent memory episodes:")
    for (const ep of recentEpisodes) {
      ctxLines.push(
        `  - [${ep.createdAt.toISOString().slice(0, 10)}] "${ep.frontmatter.title}" (intent: ${ep.frontmatter.intent}; topics: ${ep.frontmatter.topics.join(", ") || "-"})`
      )
    }
  }
  const userPrompt = [
    "Context for today's brief:",
    "",
    ctxLines.join("\n"),
    "",
    "Write the brief now."
  ].join("\n")

  try {
    const openai = getAzureOpenAIForDesign()
    const completion = await openai.beta.chat.completions.parse({
      model: getDesignDeployment(),
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      response_format: zodResponseFormat(BriefResponseSchema, "dailyBrief")
    })
    const parsed = completion.choices[0]?.message?.parsed
    const items: BriefItem[] = (parsed?.items ?? [])
      .map(it => ({
        kind: it.kind,
        body: it.body.trim().slice(0, 220),
        ctaLabel: it.ctaLabel?.trim() || undefined,
        ctaHref: resolveBriefHref(it.ctaHref, opts.locale, wsId)
      }))
      .filter(it => it.body.length > 0)

    const result: DailyBrief = {
      items,
      generatedAt: new Date().toISOString()
    }
    cache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + CACHE_TTL_MS
    })
    return result
  } catch (e: any) {
    console.warn("[jarvis-brief] generation failed:", e?.message ?? e)
    // Fall back to a sensible "you're up to date" so the hero doesn't
    // blank out on a transient failure.
    return {
      items: [],
      generatedAt: new Date().toISOString()
    }
  }
}

/**
 * Tighten a model-supplied href so we never leak an off-platform link
 * into the brief CTA. If the model returns a fully-qualified URL or
 * something that doesn't look like one of our paths, drop it.
 */
function resolveBriefHref(
  raw: string | null | undefined,
  locale: string,
  workspaceId: string | null
): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith("/")) return trimmed
  // The model sometimes emits "designs/abc" instead of a leading slash.
  // Reattach it to the active locale + workspace prefix when possible.
  if (workspaceId && /^[a-z-]+(\/.+)?$/i.test(trimmed)) {
    return `/${locale}/${workspaceId}/${trimmed.replace(/^\/+/, "")}`
  }
  return undefined
}

/** Test/dev helper. Flushes the in-memory cache. */
export function _clearBriefCache(): void {
  cache.clear()
}
