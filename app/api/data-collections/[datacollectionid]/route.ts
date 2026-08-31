import {
  deleteDataCollection,
  getDataCollection,
  patchDataCollection
} from "@/lib/data-collection/server"

type Ctx = { params: { datacollectionid: string } }

export const GET = (req: Request, { params }: Ctx) =>
  getDataCollection(req, params.datacollectionid)

export const PATCH = (req: Request, { params }: Ctx) =>
  patchDataCollection(req, params.datacollectionid)

export const DELETE = (req: Request, { params }: Ctx) =>
  deleteDataCollection(req, params.datacollectionid)
