/**
 * Shared zod schemas for the DataCollection Owned Resource.
 */
import { z } from "zod"

export const DataCollectionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  workspace_id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  sharing: z.string().default("private"),
  folder_id: z.string().nullable().default(null),
  protocol_file_id: z.string().nullable().default(null),
  protocol_file_name: z.string().nullable().default(null),
  template_columns: z.array(z.string()).default([]),
  template_rows: z.array(z.array(z.string())).default([]),
  messages: z.array(z.unknown()).default([]),
  structured_data: z.unknown().nullable().default(null),
  created_at: z.string(),
  updated_at: z.string()
})
export type DataCollection = z.infer<typeof DataCollectionSchema>

export const DataCollectionCreateInputSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  dataCollection: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      sharing: z.string().optional(),
      folder_id: z.string().nullable().optional(),
      protocol_file_id: z.string().nullable().optional(),
      protocol_file_name: z.string().nullable().optional()
    })
    .partial()
    .optional()
})
export type DataCollectionCreateInput = z.infer<
  typeof DataCollectionCreateInputSchema
>

export const DataCollectionPatchInputSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    sharing: z.string().optional(),
    folder_id: z.string().nullable().optional(),
    template_columns: z.array(z.string()).optional(),
    template_rows: z.array(z.array(z.string())).optional(),
    messages: z.array(z.unknown()).optional(),
    structured_data: z.unknown().optional()
  })
  .passthrough()
export type DataCollectionPatchInput = z.infer<
  typeof DataCollectionPatchInputSchema
>

/** Default template seeding - protocol-aware columns. */
export function defaultTemplate(opts: { hasProtocol: boolean }): {
  columns: string[]
  rows: string[][]
} {
  const columns = opts.hasProtocol
    ? [
        "Sample ID",
        "Date",
        "Condition",
        "Time Point",
        "Measurement 1",
        "Measurement 2",
        "Temperature (°C)",
        "pH",
        "Notes"
      ]
    : ["Sample ID", "Date", "Parameter", "Value", "Unit", "Notes"]
  const emptyRow = columns.map(() => "")
  const rows = Array.from({ length: 5 }, () => [...emptyRow])
  return { columns, rows }
}
