/**
 * Workspace-scoped paper library - every time a user clicks "Download" on a
 * paper from a design's literature tab, the paper metadata is persisted
 * here. Owned Resource pattern: user_id is the access oracle, workspace_id
 * scopes membership.
 *
 * Same paper can show up in multiple designs; we identify duplicates by
 * normalized URL. The library record carries `source_design_ids` so users
 * can trace where a paper came from.
 */
import { z } from "zod"

export const PaperLibraryEntrySchema = z.object({
  id: z.string(),
  user_id: z.string(),
  workspace_id: z.string(),

  title: z.string(),
  url: z.string().nullable().default(null),
  url_normalized: z.string().nullable().default(null),
  summary: z.string().default(""),
  authors: z.array(z.string()).default([]),
  year: z.string().nullable().default(null),
  journal: z.string().nullable().default(null),
  source: z.string().nullable().default(null),

  /** Designs this paper has been added from. Append-only. */
  source_design_ids: z.array(z.string()).default([]),

  created_at: z.string(),
  updated_at: z.string()
})
export type PaperLibraryEntry = z.infer<typeof PaperLibraryEntrySchema>

export const PaperLibraryAddInputSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  paper: z.object({
    title: z.string().min(1),
    url: z.string().url().optional().or(z.literal("")),
    summary: z.string().optional(),
    authors: z.array(z.string()).optional(),
    year: z.string().optional().or(z.literal("")),
    journal: z.string().optional().or(z.literal("")),
    source: z.string().optional()
  }),
  /** Optional - if the paper was added from a specific design, record the trail. */
  sourceDesignId: z.string().optional()
})
export type PaperLibraryAddInput = z.infer<typeof PaperLibraryAddInputSchema>

/** Strip protocol, www, trailing slash, query/fragment for dupe matching. */
export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim().toLowerCase()
  if (!trimmed) return null
  return trimmed
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
}
