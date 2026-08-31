/**
 * Server-side callables for the Design Owned Resource (collection-level).
 *
 * Item-level routes (`app/api/design/[designid]/...`) intentionally bypass
 * this module - they use `lib/design/sharing` for collaborator-aware access
 * (designs are an Owned Resource with a sharing extension).
 */
import type { QueryDocumentSnapshot } from "firebase-admin/firestore"
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { resolvePendingInvites } from "@/lib/design/sharing"
import { requireUser } from "@/lib/server/require-user"
import {
  badRequest,
  insertOwnedDoc,
  listOwnedDocs,
  serverError,
  withOwnedResource
} from "@/lib/server/firestore-resource"
import { emitRagDocChanged } from "@/lib/rag/emit"
import { DesignCreateInputSchema } from "@/lib/design/types"

const COLLECTION = "designs"

export async function createDesign(request: Request): Promise<Response> {
  try {
    const raw = await request.json().catch(() => null)
    if (!raw || typeof raw !== "object") return badRequest("Invalid JSON body")
    const parsed = DesignCreateInputSchema.safeParse(raw)
    if (!parsed.success) {
      return badRequest("Invalid request body", parsed.error.flatten())
    }

    const auth = await withOwnedResource(request, {
      collection: COLLECTION,
      workspaceIdInBody: true,
      body: parsed.data
    })
    if (auth.response) return auth.response

    const d = parsed.data.design ?? {}
    const doc = await insertOwnedDoc({
      user: auth.user,
      collection: COLLECTION,
      workspaceId: parsed.data.workspaceId,
      payload: {
        project_id: d.project_id ?? null,
        name: d.name || d.problem || "",
        description: d.description ?? "",
        sharing: d.sharing ?? "private",
        share_token: null,
        shared_with: [] as string[],
        forked_from: null,
        folder_id: d.folder_id ?? null
      }
    })
    emitRagDocChanged({
      sourceType: "design",
      sourceId: doc.id,
      workspaceId: doc.workspace_id,
      projectId: (doc as any).project_id ?? null
    })
    return NextResponse.json(doc)
  } catch (error) {
    console.error("[DESIGNS] createDesign failed:", error)
    return serverError("Failed to create design")
  }
}

/**
 * List designs visible to the calling user.
 *
 * Modes:
 *  - default: Owned Resources (user_id = caller). Optionally filtered by
 *    workspaceId or projectId.
 *  - scope=shared-with-me: docs where caller's user id appears in
 *    `shared_with`. NOT an Owned Resource query - bypasses the Owner gate
 *    intentionally (read-only collaborator view).
 *
 * `resolvePendingInvites` is called on every GET so any pending email-based
 * invitations are reified into `design_permissions` before access checks.
 */
export async function listDesigns(request: Request): Promise<Response> {
  try {
    const authResult = await requireUser()
    if (authResult.response) return authResult.response
    const user = authResult.user

    await resolvePendingInvites(user.id, user.email)

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const projectId = searchParams.get("projectId")
    const scope = searchParams.get("scope")

    if (scope === "shared-with-me") {
      // array-contains + orderBy on a different field needs a composite
      // Firestore index. Sort in-memory to keep fresh deployments
      // working out of the box.
      const snapshot = await adminDb
        .collection(COLLECTION)
        .where("shared_with", "array-contains", user.id)
        .get()
      const designs = snapshot.docs
        .map((d: QueryDocumentSnapshot) => ({
          id: d.id,
          ...(d.data() as any)
        }))
        .sort(
          (a: any, b: any) =>
            new Date(b.updated_at ?? 0).getTime() -
            new Date(a.updated_at ?? 0).getTime()
        )
      return NextResponse.json({ designs })
    }

    const where: Array<[string, FirebaseFirestore.WhereFilterOp, unknown]> = []
    if (projectId) {
      where.push(["project_id", "==", projectId])
    } else if (workspaceId) {
      where.push(["workspace_id", "==", workspaceId])
    }

    // user_id (added by listOwnedDocs) + workspace_id/project_id +
    // orderBy(created_at) requires a 3-field composite index. In-memory
    // sort sidesteps it.
    const designs = await listOwnedDocs<Record<string, unknown>>({
      user,
      collection: COLLECTION,
      where,
      orderBy: "in-memory",
      inMemorySort: { field: "created_at", dir: "desc" }
    })
    return NextResponse.json({ designs })
  } catch (error) {
    console.error("[DESIGNS] listDesigns failed:", error)
    return serverError("Failed to fetch designs")
  }
}
