/**
 * @jest-environment node
 *
 * Only collection-level callables (createDesign, listDesigns) are covered
 * here. Item-level routes intentionally bypass the Owned Resource seam - see
 * `lib/design/server.ts` notes.
 */
import { NextResponse } from "next/server"

const mockWithOwnedResource = jest.fn()
const mockInsertOwnedDoc = jest.fn()
const mockListOwnedDocs = jest.fn()
const mockRequireUser = jest.fn()
const mockResolvePendingInvites = jest.fn()
const mockSharedSnapshot = jest.fn()

jest.mock("@/lib/server/firestore-resource", () => ({
  __esModule: true,
  withOwnedResource: (...args: any[]) => mockWithOwnedResource(...args),
  insertOwnedDoc: (...args: any[]) => mockInsertOwnedDoc(...args),
  listOwnedDocs: (...args: any[]) => mockListOwnedDocs(...args),
  badRequest: (msg: string, details?: unknown) =>
    NextResponse.json(
      { error: msg, ...(details ? { details } : {}) },
      { status: 400 }
    ),
  serverError: (msg = "Internal server error") =>
    NextResponse.json({ error: msg }, { status: 500 })
}))

jest.mock("@/lib/server/require-user", () => ({
  __esModule: true,
  requireUser: (...args: any[]) => mockRequireUser(...args)
}))

jest.mock("@/lib/design/sharing", () => ({
  __esModule: true,
  resolvePendingInvites: (...args: any[]) =>
    mockResolvePendingInvites(...args)
}))

jest.mock("@/lib/firebase/admin", () => ({
  __esModule: true,
  adminDb: {
    // Post-Firestore-index-sweep, the shared-with-me path drops
    // `.orderBy(...)` (composite index would otherwise be required) and
    // sorts in-memory. Mock now resolves `.where(...).get()` directly.
    collection: () => ({
      where: () => ({
        get: () => mockSharedSnapshot()
      })
    })
  }
}))

import { createDesign, listDesigns } from "@/lib/design/server"

const mkUser = () => ({ id: "u1", email: "u@x" } as any)

beforeEach(() => {
  mockWithOwnedResource.mockReset()
  mockInsertOwnedDoc.mockReset()
  mockListOwnedDocs.mockReset()
  mockRequireUser.mockReset()
  mockResolvePendingInvites.mockReset().mockResolvedValue(undefined)
  mockSharedSnapshot.mockReset()
})

describe("createDesign", () => {
  test("400 missing workspaceId", async () => {
    const res = await createDesign(
      new Request("http://x/api/designs", {
        method: "POST",
        body: JSON.stringify({ design: { name: "d" } })
      })
    )
    expect(res.status).toBe(400)
  })

  test("name wins over problem when both supplied", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      workspaceId: "w1"
    })
    mockInsertOwnedDoc.mockResolvedValue({ id: "d1" })
    await createDesign(
      new Request("http://x/api/designs", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: "w1",
          design: { name: "My Title", problem: "Why is X?" }
        })
      })
    )
    expect(mockInsertOwnedDoc.mock.calls[0][0].payload.name).toBe("My Title")
  })

  test("falls back to problem when name absent", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      workspaceId: "w1"
    })
    mockInsertOwnedDoc.mockResolvedValue({ id: "d1" })
    await createDesign(
      new Request("http://x/api/designs", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: "w1",
          design: { problem: "Why is X?" }
        })
      })
    )
    expect(mockInsertOwnedDoc.mock.calls[0][0].payload.name).toBe("Why is X?")
  })

  test("seeds sharing defaults", async () => {
    mockWithOwnedResource.mockResolvedValue({
      user: mkUser(),
      workspaceId: "w1"
    })
    mockInsertOwnedDoc.mockResolvedValue({ id: "d1" })
    await createDesign(
      new Request("http://x/api/designs", {
        method: "POST",
        body: JSON.stringify({ workspaceId: "w1" })
      })
    )
    const payload = mockInsertOwnedDoc.mock.calls[0][0].payload
    expect(payload.sharing).toBe("private")
    expect(payload.share_token).toBeNull()
    expect(payload.shared_with).toEqual([])
    expect(payload.forked_from).toBeNull()
  })
})

describe("listDesigns", () => {
  test("401 forwarded from requireUser", async () => {
    mockRequireUser.mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    })
    const res = await listDesigns(new Request("http://x/api/designs"))
    expect(res.status).toBe(401)
  })

  test("calls resolvePendingInvites on every list", async () => {
    mockRequireUser.mockResolvedValue({ user: mkUser() })
    mockListOwnedDocs.mockResolvedValue([])
    await listDesigns(new Request("http://x/api/designs"))
    expect(mockResolvePendingInvites).toHaveBeenCalledWith("u1", "u@x")
  })

  test("scope=shared-with-me bypasses Owner filter", async () => {
    mockRequireUser.mockResolvedValue({ user: mkUser() })
    mockSharedSnapshot.mockResolvedValue({
      docs: [{ id: "d1", data: () => ({ name: "shared" }) }]
    })
    const res = await listDesigns(
      new Request("http://x/api/designs?scope=shared-with-me")
    )
    expect(res.status).toBe(200)
    expect(mockListOwnedDocs).not.toHaveBeenCalled()
    const json = await res.json()
    expect(json.designs).toEqual([{ id: "d1", name: "shared" }])
  })

  test("projectId filter takes precedence over workspaceId", async () => {
    mockRequireUser.mockResolvedValue({ user: mkUser() })
    mockListOwnedDocs.mockResolvedValue([])
    await listDesigns(
      new Request("http://x/api/designs?projectId=p1&workspaceId=w1")
    )
    expect(mockListOwnedDocs.mock.calls[0][0].where).toEqual([
      ["project_id", "==", "p1"]
    ])
  })

  test("workspaceId filter when no projectId", async () => {
    mockRequireUser.mockResolvedValue({ user: mkUser() })
    mockListOwnedDocs.mockResolvedValue([])
    await listDesigns(new Request("http://x/api/designs?workspaceId=w1"))
    expect(mockListOwnedDocs.mock.calls[0][0].where).toEqual([
      ["workspace_id", "==", "w1"]
    ])
  })
})
