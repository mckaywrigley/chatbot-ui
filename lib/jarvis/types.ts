/**
 * Shared types for the Jarvis memory layer. Mirrors the schema from
 * docs/markdown-vault-memory-guide.md - kept here so the rest of the
 * app can import without pulling in `js-yaml` or the storage adapter.
 */

export interface Episode {
  /** Filename stem, e.g. "2026-05-16-money-spiral-a1b2c3". */
  slug: string
  createdAt: Date
  frontmatter: EpisodeFrontmatter
  /** Markdown body shown to the LLM. */
  body: string
  /** Embedding vector if present (sidecar `.embed.json`). */
  embedding?: number[]
}

/**
 * YAML frontmatter on every episode file. Domain-specific scoring is
 * generic here ("priority" 1-5) since Shadow AI is a research tool, not
 * an emotion app - the moods/techniques fields in the source guide were
 * tuned for a different domain. Keeping the surface scientist-flavoured.
 */
export interface EpisodeFrontmatter {
  /** ISO 8601 timestamp the episode was compressed. */
  created: string
  session_id: string
  title: string
  /**
   * 1-5 priority for re-surfacing later. 5 = "they keep coming back to
   * this", 1 = "ambient chat". Defaults to 3 when the model is unsure.
   */
  priority: number
  /** Single-word tag describing the dominant intent of the arc. */
  intent: string
  /** 2-5 lowercase topic tags - become wikilinks in the body. */
  topics: string[]
  /**
   * Cross-workspace pointers that came up in the arc - design ids,
   * report ids, paper ids, project ids, file ids. Lets the chat agent
   * connect "remind me about that lyophilisation cycle design" to a
   * concrete DB row in a later session.
   */
  references: EpisodeReference[]
  /**
   * Workspace + project context the chat happened in, so retrieval can
   * weight towards the same scope first.
   */
  workspace_id: string
  project_id?: string | null
  /** Tools/actions the agent ran during the arc (e.g. "literature.search"). */
  tools_used: string[]
  /**
   * Optional standout quote worth surfacing months later. Empty
   * string when nothing notable.
   */
  breakthrough_quote: string
}

export interface EpisodeReference {
  /** What kind of entity this points at - matches the rag_source_type enum. */
  kind:
    | "design"
    | "report"
    | "paper"
    | "project"
    | "file"
    | "data_collection"
    | "chat"
  /** Stable id in the corresponding store (Firestore / Supabase). */
  id: string
  /** Human-readable title at compress time (denormalised, survives renames). */
  title: string
}

export interface CompressedEpisode {
  title: string
  summary: string
  topics: string[]
  intent: string
  priority: number
  tools_used: string[]
  references: EpisodeReference[]
  breakthrough_quote: string
}
