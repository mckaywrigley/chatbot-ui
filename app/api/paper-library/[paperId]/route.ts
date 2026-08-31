import { deletePaper } from "@/lib/paper-library/server"

type Ctx = { params: { paperId: string } }

export const DELETE = (req: Request, { params }: Ctx) =>
  deletePaper(req, params.paperId)
