/**
 * Shared zod schemas for the Design Owned Resource.
 *
 * NOTE: Designs are an Owned Resource (user_id = Owner) but ALSO have a
 * sharing extension (shared_with array, sharing visibility, share_token).
 * Read access via /api/design/[designid] uses the sharing module
 * (lib/design/sharing) - not the strict Owner gate. Only collection-level
 * POST/GET (this file) and DELETE go through the Owner pattern.
 */
import { z } from "zod"

export const DesignCreateInputSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  design: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      problem: z.string().optional(),
      sharing: z.string().optional(),
      folder_id: z.string().nullable().optional(),
      project_id: z.string().nullable().optional()
    })
    .partial()
    .optional()
})
export type DesignCreateInput = z.infer<typeof DesignCreateInputSchema>
