/**
 * Shared (browser + server) zod schemas for the Report Owned Resource.
 * Server uses for validation. Client may import the inferred types and the
 * input schemas for forms.
 */
import { z } from "zod"

export const ReportFileSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional()
  })
  .passthrough()

export const ReportCollectionSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional()
  })
  .passthrough()

export const ReportSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  workspace_id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  sharing: z.string().default("private"),
  folder_id: z.string().nullable().default(null),

  // Parent design this report was generated from. Reports are now always
  // spawned from a completed design, so these attribute the report back to
  // its source. `source_design_name` is denormalised so list/slab views
  // don't have to resolve the design doc.
  source_design_id: z.string().nullable().default(null),
  source_design_name: z.string().nullable().default(null),
  /**
   * Markdown snapshot of the source design at the time the report was
   * created. Fed to the generator as the protocol/method context and
   * rendered read-only in the report's design side-panel.
   */
  design_context: z.string().nullable().default(null),

  // Generated content (filled in over time).
  report_outline: z.unknown().nullable().default(null),
  report_draft: z.unknown().nullable().default(null),
  chart_image: z.unknown().nullable().default(null),

  // Snapshots so reports don't depend on Supabase joins.
  files: z
    .object({
      protocol: z.array(ReportFileSchema).default([]),
      papers: z.array(ReportFileSchema).default([]),
      dataFiles: z.array(ReportFileSchema).default([])
    })
    .default({ protocol: [], papers: [], dataFiles: [] }),

  collections: z.array(ReportCollectionSchema).default([]),

  created_at: z.string(),
  updated_at: z.string()
})
export type Report = z.infer<typeof ReportSchema>

/** POST /api/reports body. */
export const ReportCreateInputSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  report: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      sharing: z.string().optional(),
      folder_id: z.string().nullable().optional(),
      source_design_id: z.string().nullable().optional(),
      source_design_name: z.string().nullable().optional(),
      design_context: z.string().nullable().optional(),
      template_id: z.string().nullable().optional(),
      generation_status: z.string().optional(),
      report_outline: z.unknown().optional(),
      report_draft: z.unknown().optional(),
      chart_image: z.unknown().optional()
    })
    .partial()
    .optional(),
  selectedFiles: z
    .object({
      protocol: z.array(ReportFileSchema).optional(),
      papers: z.array(ReportFileSchema).optional(),
      dataFiles: z.array(ReportFileSchema).optional()
    })
    .optional(),
  collections: z.array(ReportCollectionSchema).optional()
})
export type ReportCreateInput = z.infer<typeof ReportCreateInputSchema>

/** PATCH /api/reports/[id] body - open shape, but trims server-managed fields. */
export const ReportPatchInputSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    sharing: z.string().optional(),
    folder_id: z.string().nullable().optional(),
    report_outline: z.unknown().optional(),
    report_draft: z.unknown().optional(),
    chart_image: z.unknown().optional(),
    files: z.unknown().optional(),
    collections: z.array(ReportCollectionSchema).optional()
  })
  .passthrough()
export type ReportPatchInput = z.infer<typeof ReportPatchInputSchema>
