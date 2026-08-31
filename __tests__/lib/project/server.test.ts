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
  createProject,
  deleteProject,
  getProject,
  listProjects,
  patchProject
} from "@/lib/project/server"

const mkUser = () => ({ id: "u1", email: "u@x" } as any)

beforeEach(() => {
  mockWithOwnedResource.mockReset()
  mockInsertOwnedDoc.mockReset()
  mockListOwnedDocs.mockReset()
  mockUpdateOwnedDoc.mockReset()
  mockDeleteOwnedDoc.mockReset()
})

describe("createProject", () => {
  test("400 missing workspace_id", async () => {
    const res = await createProject(
      new Request("http://x/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "p" })
      })
    )
    expect(res.status).toBe(400)
    expect(mockWithOwnedResource).not.toHaveBeenCalled()
  })

  test("maps workspace_id (snake) onto withOwnedResource.workspaceId", async () => {
    mockWithOwnedResource.mockResolvedValue({ user: mkUser(), workspaceId: "w1" })
    mockInsertOwnedDoc.mockResolvedValue({ id: "p1", name: "Untitled Project" })
    await createProject(
      new Request("http://x/api/projects", {
        method: "POST",
        body: JSON.stringify({ workspace_id: "w1" })
      })
    )
    const opts = mockWithOwnedResource.mock.calls[0][1]
    expect(opts.workspaceIdInBody).toBe(true)
    expect(opts.body.workspaceId).toBe("w1")
  })

  test("default name applied", async () => {
    mockWithOwnedResource.mockResolvedValue({ user: mkUser(), workspaceId: "w1" })
    mockInsertOwnedDoc.mockResolvedValue({ id: "p1" })
    await createProject(
      new Request("http://x/api/projects", {
        method: "POST",
        body: JSON.stringify({ workspace_id: "w1" })
      })
    )
    expect(mockInsertOwnedDoc.mock.calls[0][0].payload.name).toBe(
      "Untitled Project"
    )
  })
})

describe("listProjects", () => {
  test("400 missing workspaceId query", async () => {
    mockWithOwnedResource.mockResolvedValue({ user: mkUser() })
    const res = await listProjects(new Request("http://x/api/projects"))
    expect(res.status).toBe(400)
  })

  test("filters by workspaceId, sortBy, sortOrder", async () => {
    mockWithOwnedResource.mockResolvedValue({ user: mkUser() })
    mockListOwnedDocs.mockResolvedValue([
      { id: "p1", name: "Foo", description: "bar", tags: ["x"] }
    ])
    const res = await listProjects(
      new Request(
        "http://x/api/projects?workspaceId=w1&sortBy=name&sortOrder=asc"
      )
    )
    expect(res.status).toBe(200)
    const opts = mockListOwnedDocs.mock.calls[0][0]
    expect(opts.where).toEqual([["workspace_id", "==", "w1"]])
    // Post-index-sweep: orderBy is "in-memory" (composite Firestore
    // index would otherwise be required); sort field carried in
    // `inMemorySort`.
    expect(opts.orderBy).toBe("in-memory")
    expect(opts.inMemorySort).toEqual({ field: "name", dir: "asc" })
  })

  test("rejects unsafe sortBy by falling back to updated_at", async () => {
    mockWithOwnedResource.mockResolvedValue({ user: mkUser() })
    mockListOwnedDocs.mockResolvedValue([])
    await listProjects(
      new Request("http://x/api/projects?workspaceId=w1&sortBy=__proto__")
    )
    expect(mockListOwnedDocs.mock.calls[0][0].inMemorySort.field).toBe(
      "updated_at"
    )
  })

  test("client-side searchTerm filter", async () => {
    mockWithOwnedResource.mockResolvedValue({ user: mkUser() })
    mockListOwnedDocs.mockResolvedValue([
      { id: "1", name: "alpha", description: "" },
      { id: "2", name: "Beta", description: "alphacat" },
      { id: "3", name: "gamma", description: "" }
    ])
    const res = await listProjects(
      new Request("http://x/api/projects?workspaceId=w1&searchTerm=alpha")
    )
    const json = await res.json()
    expect(json.projects.map((p: any) => p.id)).toEqual(["1", "2"])
  })

  test("client-side tags filter", async () => {
    mockWithOwnedResource.mockResolvedValue({ user: mkUser() })
    mockListOwnedDocs.mockResolvedValue([
      { id: "1", tags: ["red", "blue"] },
      { id: "2", tags: ["green"] }
    ])
    const res = await listProjects(
      new Request("http://x/api/projects?workspaceId=w1&tags=red,green")
    )
    const json = await res.json()
    expect(json.projects.map((p: any) => p.id)).toEqual(["1", "2"])
  })
})

describe("getProject + patchProject + deleteProject", () => {
  test("getProject returns owned doc", async () => {
    const doc = { id: "p1", name: "P" }
    mockWithOwnedResource.mockResolvedValue({ user: mkUser(), doc })
    const res = await getProject(
      new Request("http://x/api/projects/p1"),
      "p1"
    )
    expect(await res.json()).toEqual(doc)
  })

  test("patchProject calls updateOwnedDoc", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      doc: { id: "p1" }
    })
    mockUpdateOwnedDoc.mockResolvedValue({ id: "p1", name: "renamed" })
    const res = await patchProject(
      new Request("http://x/api/projects/p1", {
        method: "PATCH",
        body: JSON.stringify({ name: "renamed" })
      }),
      "p1"
    )
    expect(res.status).toBe(200)
    expect(mockUpdateOwnedDoc.mock.calls[0][0].patch).toMatchObject({
      name: "renamed"
    })
  })

  test("deleteProject calls deleteOwnedDoc", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      doc: { id: "p1" }
    })
    mockDeleteOwnedDoc.mockResolvedValue(undefined)
    const res = await deleteProject(
      new Request("http://x/api/projects/p1", { method: "DELETE" }),
      "p1"
    )
    expect(res.status).toBe(200)
    expect(mockDeleteOwnedDoc).toHaveBeenCalledTimes(1)
  })
})
