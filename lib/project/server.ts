/**
 * Server-side callables for the Project Owned Resource.
 * Auth + ownership + persistence invariants live in lib/server/firestore-resource.
 */
import { NextResponse } from "next/server"
import {
  badRequest,
  deleteOwnedDoc,
  insertOwnedDoc,
  listOwnedDocs,
  serverError,
  updateOwnedDoc,
  withOwnedResource,
  type OwnedDocBase
} from "@/lib/server/firestore-resource"
import {
  ProjectCreateInputSchema,
  ProjectPatchInputSchema,
  type Project
} from "@/lib/project/types"

const COLLECTION = "projects"

const VALID_SORT_FIELDS = new Set(["created_at", "updated_at", "name"])

export async function createProject(request: Request): Promise<Response> {
  try {
    const raw = await request.json().catch(() => null)
    if (!raw || typeof raw !== "object") {
      return badRequest("Invalid JSON body")
    }
    const parsed = ProjectCreateInputSchema.safeParse(raw)
    if (!parsed.success) {
      return badRequest("Invalid request body", parsed.error.flatten())
    }

    const auth = await withOwnedResource(request, {
      collection: COLLECTION,
      workspaceIdInBody: true,
      // ProjectCreateInputSchema uses workspace_id; surface as workspaceId for the gate.
      body: { ...parsed.data, workspaceId: parsed.data.workspace_id }
    })
    if (auth.response) return auth.response

    const doc = await insertOwnedDoc({
      user: auth.user,
      collection: COLLECTION,
      workspaceId: parsed.data.workspace_id,
      payload: {
        name: parsed.data.name || "Untitled Project",
        description: parsed.data.description ?? "",
        tags: parsed.data.tags ?? []
      }
    })
    return NextResponse.json(doc)
  } catch (error) {
    console.error("[PROJECTS] createProject failed:", error)
    return serverError("Failed to create project")
  }
}

export async function listProjects(request: Request): Promise<Response> {
  try {
    const auth = await withOwnedResource(request, { collection: COLLECTION })
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    if (!workspaceId) return badRequest("Workspace ID is required")

    const searchTerm = searchParams.get("searchTerm") || ""
    const tagsParam = searchParams.get("tags") || ""
    const sortByRaw = searchParams.get("sortBy") || "updated_at"
    const sortOrderRaw = searchParams.get("sortOrder") || "desc"
    const sortBy = VALID_SORT_FIELDS.has(sortByRaw) ? sortByRaw : "updated_at"
    const sortOrder: "asc" | "desc" = sortOrderRaw === "asc" ? "asc" : "desc"

    // user_id (added by listOwnedDocs) + workspace_id + orderBy needs a
    // 3-field composite Firestore index. Sort in-memory so fresh
    // deployments work without index management.
    let projects = await listOwnedDocs<Project>({
      user: auth.user,
      collection: COLLECTION,
      where: [["workspace_id", "==", workspaceId]],
      orderBy: "in-memory",
      inMemorySort: { field: sortBy, dir: sortOrder }
    })

    // Firestore doesn't support `ilike` - filter in memory.
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      projects = projects.filter(
        p =>
          p.name?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      )
    }
    if (tagsParam) {
      const tagList = tagsParam.split(",").filter(Boolean)
      projects = projects.filter(p =>
        tagList.some(tag => p.tags?.includes(tag))
      )
    }

    return NextResponse.json({ projects })
  } catch (error) {
    console.error("[PROJECTS] listProjects failed:", error)
    return serverError("Failed to fetch projects")
  }
}

export async function getProject(
  request: Request,
  projectId: string
): Promise<Response> {
  try {
    const auth = await withOwnedResource<Project>(request, {
      collection: COLLECTION,
      docId: projectId
    })
    if (auth.response) return auth.response
    return NextResponse.json(auth.doc)
  } catch (error) {
    console.error("[PROJECTS] getProject failed:", error)
    return serverError("Failed to fetch project")
  }
}

export async function patchProject(
  request: Request,
  projectId: string
): Promise<Response> {
  try {
    const auth = await withOwnedResource<Project>(request, {
      collection: COLLECTION,
      docId: projectId
    })
    if (auth.response) return auth.response

    const raw = await request.json().catch(() => null)
    if (!raw || typeof raw !== "object") return badRequest("Invalid JSON body")
    const parsed = ProjectPatchInputSchema.safeParse(raw)
    if (!parsed.success) {
      return badRequest("Invalid update payload", parsed.error.flatten())
    }

    const updated = await updateOwnedDoc<Project & OwnedDocBase>({
      collection: COLLECTION,
      doc: auth.doc!,
      patch: parsed.data as Partial<Project & OwnedDocBase>
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PROJECTS] patchProject failed:", error)
    return serverError("Failed to update project")
  }
}

export async function deleteProject(
  request: Request,
  projectId: string
): Promise<Response> {
  try {
    const auth = await withOwnedResource<Project>(request, {
      collection: COLLECTION,
      docId: projectId
    })
    if (auth.response) return auth.response

    await deleteOwnedDoc({ collection: COLLECTION, doc: auth.doc! })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[PROJECTS] deleteProject failed:", error)
    return serverError("Failed to delete project")
  }
}
