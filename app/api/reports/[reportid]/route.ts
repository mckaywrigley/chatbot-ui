import { deleteReport, getReport, patchReport } from "@/lib/report/server"

type Ctx = { params: { reportid: string } }

export const GET = (req: Request, { params }: Ctx) =>
  getReport(req, params.reportid)

export const PATCH = (req: Request, { params }: Ctx) =>
  patchReport(req, params.reportid)

export const DELETE = (req: Request, { params }: Ctx) =>
  deleteReport(req, params.reportid)
