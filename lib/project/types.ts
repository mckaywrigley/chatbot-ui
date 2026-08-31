/**
 * Shared zod schemas for the Project Owned Resource.
 */
import { z } from "zod"

export const ProjectSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  workspace_id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  tags: z.array(z.string()).default([]),
  created_at: z.string(),
  updated_at: z.string()
})
export type Project = z.infer<typeof ProjectSchema>

export const ProjectCreateInputSchema = z.object({
  workspace_id: z.string().min(1, "Workspace ID is required"),
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional()
})
export type ProjectCreateInput = z.infer<typeof ProjectCreateInputSchema>

export const ProjectPatchInputSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
  .passthrough()
export type ProjectPatchInput = z.infer<typeof ProjectPatchInputSchema>

export const ProjectListQuerySchema = z.object({
  workspaceId: z.string().min(1),
  searchTerm: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(["created_at", "updated_at", "name"]).default("updated_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
})
