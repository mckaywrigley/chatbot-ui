/**
 * @jest-environment node
 *
 * Test surface = the callables in `lib/report/server.ts`. Firestore primitives
 * and auth helpers are mocked so we assert what the Report layer adds on top:
 * zod validation, payload mapping, response shape, error paths.
 */
import { NextResponse } from "next/server"

const mockWithOwnedResource = jest.fn()
const mockInsertOwnedDoc = jest.fn()
const mockListOwnedDocs = jest.fn()
const mockUpdateOwnedDoc = jest.fn()
const mockDeleteOwnedDoc = jest.fn()

jest.mock("@/lib/server/firestore-resource", () => ({
  __esModule: true,
  withOwnedResource: (...args: any[]) => mockWithOwnedResource(...args),
  insertOwnedDoc: (...args: any[]) => mockInsertOwnedDoc(...args),
  listOwnedDocs: (...args: any[]) => mockListOwnedDocs(...args),
  updateOwnedDoc: (...args: any[]) => mockUpdateOwnedDoc(...args),
  deleteOwnedDoc: (...args: any[]) => mockDeleteOwnedDoc(...args),
  badRequest: (msg: string, details?: unknown) =>
    NextResponse.json(
      { error: msg, ...(details ? { details } : {}) },
      { status: 400 }
    ),
  serverError: (msg = "Internal server error") =>
    NextResponse.json({ error: msg }, { status: 500 })
}))

import {
  createReport,
  deleteReport,
  getReport,
  listReports,
  patchReport
} from "@/lib/report/server"

const mkUser = () => ({ id: "user-1", email: "u@example.com" } as any)

const mkPostReq = (body: unknown) =>
  new Request("http://localhost/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })

const mkGetReq = (qs = "") =>
  new Request(`http://localhost/api/reports${qs}`)

const mkPatchReq = (body: unknown) =>
  new Request("http://localhost/api/reports/r1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })

beforeEach(() => {
  mockWithOwnedResource.mockReset()
  mockInsertOwnedDoc.mockReset()
  mockListOwnedDocs.mockReset()
  mockUpdateOwnedDoc.mockReset()
  mockDeleteOwnedDoc.mockReset()
})

describe("createReport", () => {
  test("400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json"
    })
    const res = await createReport(req)
    expect(res.status).toBe(400)
  })

  test("400 on missing workspaceId (zod)", async () => {
    const res = await createReport(mkPostReq({ report: { name: "r" } }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Invalid request body/)
    expect(mockWithOwnedResource).not.toHaveBeenCalled()
  })

  test("forwards 403 from withOwnedResource", async () => {
    mockWithOwnedResource.mockResolvedValue({
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 })
    })
    const res = await createReport(
      mkPostReq({ workspaceId: "w1", report: { name: "r" } })
    )
    expect(res.status).toBe(403)
    expect(mockInsertOwnedDoc).not.toHaveBeenCalled()
  })

  test("inserts mapped payload + returns the new doc", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      workspaceId: "w1"
    })
    mockInsertOwnedDoc.mockImplementation(async ({ payload }: any) => ({
      id: "r1",
      user_id: "user-1",
      workspace_id: "w1",
      created_at: "now",
      updated_at: "now",
      ...payload
    }))

    const res = await createReport(
      mkPostReq({
        workspaceId: "w1",
        report: { name: "My Report", description: "desc" },
        selectedFiles: { protocol: [{ id: "f1" }] },
        collections: [{ id: "c1" }]
      })
    )
    expect(res.status).toBe(200)
    expect(mockInsertOwnedDoc).toHaveBeenCalledTimes(1)
    const args = mockInsertOwnedDoc.mock.calls[0][0]
    expect(args.collection).toBe("reports")
    expect(args.workspaceId).toBe("w1")
    expect(args.payload.name).toBe("My Report")
    expect(args.payload.files.protocol).toEqual([{ id: "f1" }])
    expect(args.payload.files.papers).toEqual([])
    expect(args.payload.collections).toEqual([{ id: "c1" }])

    const json = await res.json()
    expect(json.id).toBe("r1")
  })

  test("falls back to default name when none provided", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      workspaceId: "w1"
    })
    mockInsertOwnedDoc.mockResolvedValue({ id: "r1" })

    await createReport(mkPostReq({ workspaceId: "w1" }))
    expect(mockInsertOwnedDoc.mock.calls[0][0].payload.name).toBe(
      "Untitled report"
    )
  })
})

describe("listReports", () => {
  test("forwards 401 from withOwnedResource", async () => {
    mockWithOwnedResource.mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    })
    const res = await listReports(mkGetReq())
    expect(res.status).toBe(401)
    expect(mockListOwnedDocs).not.toHaveBeenCalled()
  })

  test("filters by workspaceId when provided", async () => {
    mockWithOwnedResource.mockResolvedValue({ user: mkUser() })
    mockListOwnedDocs.mockResolvedValue([{ id: "r1" }])

    const res = await listReports(mkGetReq("?workspaceId=w1"))
    expect(res.status).toBe(200)
    const args = mockListOwnedDocs.mock.calls[0][0]
    expect(args.where).toEqual([["workspace_id", "==", "w1"]])
    expect(args.orderBy).toBe("in-memory")
    expect(args.inMemorySort).toEqual({ field: "updated_at", dir: "desc" })
    const json = await res.json()
    expect(json.reports).toEqual([{ id: "r1" }])
  })

  test("no workspace filter when not provided (Owner-only)", async () => {
    mockWithOwnedResource.mockResolvedValue({ user: mkUser() })
    mockListOwnedDocs.mockResolvedValue([])
    await listReports(mkGetReq())
    expect(mockListOwnedDocs.mock.calls[0][0].where).toEqual([])
  })
})

describe("getReport", () => {
  test("returns the owned doc", async () => {
    const doc = { id: "r1", user_id: "user-1", name: "x" }
    mockWithOwnedResource.mockResolvedValue({ user: mkUser(), doc })
    const res = await getReport(mkGetReq(), "r1")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(doc)
    expect(mockWithOwnedResource.mock.calls[0][1]).toEqual({
      collection: "reports",
      docId: "r1"
    })
  })

  test("forwards 404 when doc missing", async () => {
    mockWithOwnedResource.mockResolvedValue({
      response: NextResponse.json({ error: "Not found" }, { status: 404 })
    })
    const res = await getReport(mkGetReq(), "missing")
    expect(res.status).toBe(404)
  })
})

describe("patchReport", () => {
  test("403 forwarded from withOwnedResource (non-owner)", async () => {
    mockWithOwnedResource.mockResolvedValue({
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 })
    })
    const res = await patchReport(mkPatchReq({ name: "x" }), "r1")
    expect(res.status).toBe(403)
    expect(mockUpdateOwnedDoc).not.toHaveBeenCalled()
  })

  test("400 on invalid JSON body", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      doc: { id: "r1" }
    })
    const req = new Request("http://localhost/api/reports/r1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json"
    })
    const res = await patchReport(req, "r1")
    expect(res.status).toBe(400)
  })

  test("calls updateOwnedDoc with parsed patch", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      doc: { id: "r1", user_id: "user-1" }
    })
    mockUpdateOwnedDoc.mockResolvedValue({ id: "r1", name: "renamed" })
    const res = await patchReport(mkPatchReq({ name: "renamed" }), "r1")
    expect(res.status).toBe(200)
    const args = mockUpdateOwnedDoc.mock.calls[0][0]
    expect(args.collection).toBe("reports")
    expect(args.doc.id).toBe("r1")
    expect(args.patch).toMatchObject({ name: "renamed" })
  })
})

describe("deleteReport", () => {
  test("403 forwarded for non-owner", async () => {
    mockWithOwnedResource.mockResolvedValue({
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 })
    })
    const res = await deleteReport(mkGetReq(), "r1")
    expect(res.status).toBe(403)
    expect(mockDeleteOwnedDoc).not.toHaveBeenCalled()
  })

  test("calls deleteOwnedDoc and returns success", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      doc: { id: "r1" }
    })
    mockDeleteOwnedDoc.mockResolvedValue(undefined)
    const res = await deleteReport(mkGetReq(), "r1")
    expect(res.status).toBe(200)
    expect(mockDeleteOwnedDoc).toHaveBeenCalledTimes(1)
    expect(mockDeleteOwnedDoc.mock.calls[0][0].doc.id).toBe("r1")
    expect(await res.json()).toEqual({ success: true })
  })
})
