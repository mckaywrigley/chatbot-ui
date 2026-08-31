/**
 * @jest-environment node
 */
import { NextResponse } from "next/server"

const mockWithOwnedResource = jest.fn()
const mockInsertOwnedDoc = jest.fn()
const mockListOwnedDocs = jest.fn()
const mockDeleteOwnedDoc = jest.fn()

const mockDupGet = jest.fn()
const mockDupRefUpdate = jest.fn()
const mockDupRefGet = jest.fn()

jest.mock("@/lib/server/firestore-resource", () => ({
  __esModule: true,
  withOwnedResource: (...args: any[]) => mockWithOwnedResource(...args),
  insertOwnedDoc: (...args: any[]) => mockInsertOwnedDoc(...args),
  listOwnedDocs: (...args: any[]) => mockListOwnedDocs(...args),
  deleteOwnedDoc: (...args: any[]) => mockDeleteOwnedDoc(...args),
  badRequest: (msg: string, details?: unknown) =>
    NextResponse.json(
      { error: msg, ...(details ? { details } : {}) },
      { status: 400 }
    ),
  serverError: (msg = "Internal server error") =>
    NextResponse.json({ error: msg }, { status: 500 })
}))

jest.mock("@/lib/firebase/admin", () => ({
  __esModule: true,
  adminDb: {
    collection: () => ({
      where: () => ({
        where: () => ({
          where: () => ({
            limit: () => ({
              get: () => mockDupGet()
            })
          })
        })
      })
    })
  }
}))

import { addPaper, deletePaper, listPapers } from "@/lib/paper-library/server"
import { normalizeUrl } from "@/lib/paper-library/types"

const mkUser = () => ({ id: "u1" } as any)

beforeEach(() => {
  mockWithOwnedResource.mockReset()
  mockInsertOwnedDoc.mockReset()
  mockListOwnedDocs.mockReset()
  mockDeleteOwnedDoc.mockReset()
  mockDupGet.mockReset()
  mockDupRefUpdate.mockReset()
  mockDupRefGet.mockReset()
})

describe("normalizeUrl", () => {
  test("strips protocol, www, trailing slash, query+fragment", () => {
    expect(normalizeUrl("https://www.example.com/path/?q=1#x")).toBe(
      "example.com/path"
    )
  })
  test("returns null for empty/null", () => {
    expect(normalizeUrl("")).toBeNull()
    expect(normalizeUrl(null)).toBeNull()
    expect(normalizeUrl(undefined)).toBeNull()
  })
})

describe("addPaper", () => {
  test("400 when workspaceId missing", async () => {
    const res = await addPaper(
      new Request("http://x/api/paper-library", {
        method: "POST",
        body: JSON.stringify({ paper: { title: "T" } })
      })
    )
    expect(res.status).toBe(400)
  })

  test("400 when paper.title missing", async () => {
    const res = await addPaper(
      new Request("http://x/api/paper-library", {
        method: "POST",
        body: JSON.stringify({ workspaceId: "w1", paper: {} })
      })
    )
    expect(res.status).toBe(400)
  })

  test("inserts new paper with normalized url + design trail", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      workspaceId: "w1"
    })
    mockDupGet.mockResolvedValue({ empty: true, docs: [] })
    mockInsertOwnedDoc.mockImplementation(async ({ payload }: any) => ({
      id: "p1",
      ...payload
    }))

    const res = await addPaper(
      new Request("http://x/api/paper-library", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: "w1",
          paper: {
            title: "Foo",
            url: "https://www.example.com/foo",
            summary: "abc",
            authors: ["A"]
          },
          sourceDesignId: "d1"
        })
      })
    )
    expect(res.status).toBe(200)
    const args = mockInsertOwnedDoc.mock.calls[0][0]
    expect(args.payload.title).toBe("Foo")
    expect(args.payload.url_normalized).toBe("example.com/foo")
    expect(args.payload.source_design_ids).toEqual(["d1"])
  })

  test("dedupes by normalized url + appends design trail", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      workspaceId: "w1"
    })
    const existingData = {
      title: "Foo",
      url: "https://example.com/foo",
      url_normalized: "example.com/foo",
      source_design_ids: ["d-old"]
    }
    const updateMock = jest.fn().mockResolvedValue(undefined)
    const ref = {
      update: updateMock,
      get: jest
        .fn()
        .mockResolvedValue({
          id: "existing",
          data: () => ({
            ...existingData,
            source_design_ids: ["d-old", "d-new"]
          })
        })
    }
    mockDupGet.mockResolvedValue({
      empty: false,
      docs: [{ ref, data: () => existingData }]
    })

    const res = await addPaper(
      new Request("http://x/api/paper-library", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: "w1",
          paper: {
            title: "Foo (different cache)",
            url: "https://www.example.com/foo/?utm=x"
          },
          sourceDesignId: "d-new"
        })
      })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.deduplicated).toBe(true)
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(updateMock.mock.calls[0][0].source_design_ids).toEqual([
      "d-old",
      "d-new"
    ])
    expect(mockInsertOwnedDoc).not.toHaveBeenCalled()
  })

  test("skips dedupe path when paper has no URL", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      workspaceId: "w1"
    })
    mockInsertOwnedDoc.mockResolvedValue({ id: "p1" })

    await addPaper(
      new Request("http://x/api/paper-library", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: "w1",
          paper: { title: "Untitled", url: "" }
        })
      })
    )
    expect(mockDupGet).not.toHaveBeenCalled()
    expect(mockInsertOwnedDoc).toHaveBeenCalled()
  })
})

describe("listPapers", () => {
  test("400 missing workspaceId", async () => {
    mockWithOwnedResource.mockResolvedValue({ user: mkUser() })
    const res = await listPapers(new Request("http://x/api/paper-library"))
    expect(res.status).toBe(400)
  })

  test("filters by workspaceId, sorts in-memory by updated_at desc", async () => {
    mockWithOwnedResource.mockResolvedValue({ user: mkUser() })
    mockListOwnedDocs.mockResolvedValue([])
    await listPapers(
      new Request("http://x/api/paper-library?workspaceId=w1")
    )
    const opts = mockListOwnedDocs.mock.calls[0][0]
    expect(opts.where).toEqual([["workspace_id", "==", "w1"]])
    expect(opts.orderBy).toBe("in-memory")
    expect(opts.inMemorySort).toEqual({ field: "updated_at", dir: "desc" })
  })
})

describe("deletePaper", () => {
  test("calls deleteOwnedDoc on owned paper", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      doc: { id: "p1" }
    })
    mockDeleteOwnedDoc.mockResolvedValue(undefined)
    const res = await deletePaper(
      new Request("http://x/api/paper-library/p1", { method: "DELETE" }),
      "p1"
    )
    expect(res.status).toBe(200)
    expect(mockDeleteOwnedDoc).toHaveBeenCalledTimes(1)
  })

  test("403 for non-owner forwarded", async () => {
    mockWithOwnedResource.mockResolvedValue({
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 })
    })
    const res = await deletePaper(
      new Request("http://x/api/paper-library/p1", { method: "DELETE" }),
      "p1"
    )
    expect(res.status).toBe(403)
  })
})
