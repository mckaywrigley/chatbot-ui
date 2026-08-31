/**
 * Shared utilities for the Jarvis memory layer.
 *
 * Episode-slug logic, frontmatter parse/serialise, and the cosine-sim
 * helpers used by the in-process vector search. Kept dependency-free
 * so this module can be imported from any runtime (edge / node).
 */

import yaml from "js-yaml"

import type { EpisodeFrontmatter } from "./types"

export function slugify(text: string, maxLen = 60): string {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return s.slice(0, maxLen).replace(/-+$/, "") || "untitled"
}

export function episodeSlug(
  title: string,
  when: Date,
  sessionId?: string
): string {
  const date = when.toISOString().slice(0, 10) // YYYY-MM-DD
  const base = `${date}-${slugify(title)}`
  if (!sessionId) return base
  // Append a 6-char suffix so two arcs with the same title on the same
  // day don't overwrite each other (#8.7 in the implementation guide).
  const suffix = sessionId.replace(/[^a-z0-9]/gi, "").slice(0, 6) || "x"
  return `${base}-${suffix}`
}

export function clampInt(
  v: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const n =
    typeof v === "number" ? Math.round(v) : Number.parseInt(String(v), 10)
  if (Number.isNaN(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

/**
 * Tolerant frontmatter parser. Never throws - a malformed episode
 * file must not blank the whole brief.
 */
export function parseFrontmatter(md: string): {
  fm: Partial<EpisodeFrontmatter>
  body: string
} {
  if (!md.startsWith("---")) return { fm: {}, body: md }
  const parts = md.split("---", 3)
  if (parts.length < 3) return { fm: {}, body: md }
  try {
    return {
      fm: (yaml.load(parts[1]) ?? {}) as Partial<EpisodeFrontmatter>,
      body: parts[2].replace(/^\n/, "")
    }
  } catch {
    return { fm: {}, body: md }
  }
}

export function toMarkdown(frontmatter: object, body: string): string {
  const fm = yaml.dump(frontmatter, { sortKeys: false }).trim()
  return `---\n${fm}\n---\n\n${body.trim()}\n`
}

/** L2-normalise a vector in place; return the same array. */
export function normalize(v: number[]): number[] {
  let mag = 0
  for (const x of v) mag += x * x
  mag = Math.sqrt(mag) || 1
  const out = new Array<number>(v.length)
  for (let i = 0; i < v.length; i++) out[i] = v[i] / mag
  return out
}

export function dot(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  let s = 0
  for (let i = 0; i < n; i++) s += a[i] * b[i]
  return s
}
