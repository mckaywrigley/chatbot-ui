/**
 * @jest-environment node
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
  createDataCollection,
  deleteDataCollection,
  getDataCollection,
  listDataCollections,
  patchDataCollection
} from "@/lib/data-collection/server"
import { defaultTemplate } from "@/lib/data-collection/types"

const mkUser = () => ({ id: "u1" } as any)

beforeEach(() => {
  mockWithOwnedResource.mockReset()
  mockInsertOwnedDoc.mockReset()
  mockListOwnedDocs.mockReset()
  mockUpdateOwnedDoc.mockReset()
  mockDeleteOwnedDoc.mockReset()
})

describe("defaultTemplate", () => {
  test("protocol-aware columns", () => {
    const t = defaultTemplate({ hasProtocol: true })
    expect(t.columns).toContain("Time Point")
    expect(t.rows).toHaveLength(5)
    expect(t.rows[0]).toHaveLength(t.columns.length)
  })
  test("non-protocol columns", () => {
    const t = defaultTemplate({ hasProtocol: false })
    expect(t.columns).toEqual(
      expect.arrayContaining(["Sample ID", "Date", "Parameter", "Value"])
    )
  })
})

describe("createDataCollection", () => {
  test("400 missing workspaceId", async () => {
    const res = await createDataCollection(
      new Request("http://x/api/data-collections", {
        method: "POST",
        body: JSON.stringify({ dataCollection: { name: "n" } })
      })
    )
    expect(res.status).toBe(400)
  })

  test("seeds protocol-aware template when protocol_file_id present", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      workspaceId: "w1"
    })
    mockInsertOwnedDoc.mockResolvedValue({ id: "d1" })

    await createDataCollection(
      new Request("http://x/api/data-collections", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: "w1",
          dataCollection: { protocol_file_id: "f1" }
        })
      })
    )
    const payload = mockInsertOwnedDoc.mock.calls[0][0].payload
    expect(payload.template_columns).toContain("Time Point")
    expect(payload.template_rows).toHaveLength(5)
    expect(payload.protocol_file_id).toBe("f1")
  })

  test("default name applied", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      workspaceId: "w1"
    })
    mockInsertOwnedDoc.mockResolvedValue({ id: "d1" })
    await createDataCollection(
      new Request("http://x/api/data-collections", {
        method: "POST",
        body: JSON.stringify({ workspaceId: "w1" })
      })
    )
    expect(mockInsertOwnedDoc.mock.calls[0][0].payload.name).toBe(
      "Untitled Data Collection"
    )
  })
})

describe("listDataCollections", () => {
  test("filters by workspaceId when provided", async () => {
    mockWithOwnedResource.mockResolvedValue({ user: mkUser() })
    mockListOwnedDocs.mockResolvedValue([])
    await listDataCollections(
      new Request("http://x/api/data-collections?workspaceId=w1")
    )
    expect(mockListOwnedDocs.mock.calls[0][0].where).toEqual([
      ["workspace_id", "==", "w1"]
    ])
  })

  test("sorts in-memory by created_at desc (no composite index)", async () => {
    mockWithOwnedResource.mockResolvedValue({ user: mkUser() })
    mockListOwnedDocs.mockResolvedValue([])
    await listDataCollections(
      new Request("http://x/api/data-collections?workspaceId=w1")
    )
    const opts = mockListOwnedDocs.mock.calls[0][0]
    expect(opts.orderBy).toBe("in-memory")
    expect(opts.inMemorySort).toEqual({ field: "created_at", dir: "desc" })
  })
})

describe("get/patch/delete", () => {
  test("get returns owned doc", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      doc: { id: "d1", name: "x" }
    })
    const res = await getDataCollection(
      new Request("http://x/api/data-collections/d1"),
      "d1"
    )
    expect(await res.json()).toEqual({ id: "d1", name: "x" })
  })

  test("patch calls updateOwnedDoc", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      doc: { id: "d1" }
    })
    mockUpdateOwnedDoc.mockResolvedValue({ id: "d1", name: "renamed" })
    const res = await patchDataCollection(
      new Request("http://x/api/data-collections/d1", {
        method: "PATCH",
        body: JSON.stringify({ name: "renamed" })
      }),
      "d1"
    )
    expect(res.status).toBe(200)
  })

  test("delete calls deleteOwnedDoc", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      doc: { id: "d1" }
    })
    mockDeleteOwnedDoc.mockResolvedValue(undefined)
    const res = await deleteDataCollection(
      new Request("http://x/api/data-collections/d1", { method: "DELETE" }),
      "d1"
    )
    expect(res.status).toBe(200)
  })
})
