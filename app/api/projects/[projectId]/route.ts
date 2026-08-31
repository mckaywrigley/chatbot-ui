import { deleteProject, getProject, patchProject } from "@/lib/project/server"

type Ctx = { params: { projectId: string } }

export const GET = (req: Request, { params }: Ctx) =>
  getProject(req, params.projectId)

export const PATCH = (req: Request, { params }: Ctx) =>
  patchProject(req, params.projectId)

export const DELETE = (req: Request, { params }: Ctx) =>
  deleteProject(req, params.projectId)
