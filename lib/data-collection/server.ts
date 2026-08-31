/**
 * Server-side callables for the DataCollection Owned Resource.
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
import { emitRagDocChanged } from "@/lib/rag/emit"
import {
  DataCollectionCreateInputSchema,
  DataCollectionPatchInputSchema,
  defaultTemplate,
  type DataCollection
} from "@/lib/data-collection/types"

const COLLECTION = "data_collections"

export async function createDataCollection(
  request: Request
): Promise<Response> {
  try {
    const raw = await request.json().catch(() => null)
    if (!raw || typeof raw !== "object") return badRequest("Invalid JSON body")
    const parsed = DataCollectionCreateInputSchema.safeParse(raw)
    if (!parsed.success) {
      return badRequest("Invalid request body", parsed.error.flatten())
    }

    const auth = await withOwnedResource(request, {
      collection: COLLECTION,
      workspaceIdInBody: true,
      body: parsed.data
    })
    if (auth.response) return auth.response

    const dc = parsed.data.dataCollection ?? {}
    const { columns, rows } = defaultTemplate({
      hasProtocol: !!dc.protocol_file_id
    })

    const doc = await insertOwnedDoc({
      user: auth.user,
      collection: COLLECTION,
      workspaceId: parsed.data.workspaceId,
      payload: {
        name: dc.name || "Untitled Data Collection",
        description: dc.description ?? "",
        sharing: dc.sharing ?? "private",
        folder_id: dc.folder_id ?? null,
        protocol_file_id: dc.protocol_file_id ?? null,
        protocol_file_name: dc.protocol_file_name ?? null,
        template_columns: columns,
        template_rows: rows,
        messages: [] as unknown[],
        structured_data: null
      }
    })
    emitRagDocChanged({
      sourceType: "data_collection",
      sourceId: doc.id,
      workspaceId: doc.workspace_id,
      projectId: null
    })
    return NextResponse.json(doc)
  } catch (error) {
    console.error("[DATA_COLLECTIONS] createDataCollection failed:", error)
    return serverError("Failed to create data collection")
  }
}

export async function listDataCollections(request: Request): Promise<Response> {
  try {
    const auth = await withOwnedResource(request, { collection: COLLECTION })
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const where: Array<[string, FirebaseFirestore.WhereFilterOp, unknown]> = []
    if (workspaceId) where.push(["workspace_id", "==", workspaceId])

    // No composite index on (user_id, workspace_id, created_at) - sort
    // in-memory so fresh deployments work out of the box. Caller list sizes
    // are small (one workspace's data collections) so the cost is fine.
    const dataCollections = await listOwnedDocs<DataCollection>({
      user: auth.user,
      collection: COLLECTION,
      where,
      orderBy: "in-memory",
      inMemorySort: { field: "created_at", dir: "desc" }
    })
    return NextResponse.json({ dataCollections })
  } catch (error) {
    console.error("[DATA_COLLECTIONS] listDataCollections failed:", error)
    return serverError("Failed to fetch data collections")
  }
}

export async function getDataCollection(
  request: Request,
  id: string
): Promise<Response> {
  try {
    const auth = await withOwnedResource<DataCollection>(request, {
      collection: COLLECTION,
      docId: id
    })
    if (auth.response) return auth.response
    return NextResponse.json(auth.doc)
  } catch (error) {
    console.error("[DATA_COLLECTIONS] getDataCollection failed:", error)
    return serverError("Failed to fetch data collection")
  }
}

export async function patchDataCollection(
  request: Request,
  id: string
): Promise<Response> {
  try {
    const auth = await withOwnedResource<DataCollection>(request, {
      collection: COLLECTION,
      docId: id
    })
    if (auth.response) return auth.response

    const raw = await request.json().catch(() => null)
    if (!raw || typeof raw !== "object") return badRequest("Invalid JSON body")
    const parsed = DataCollectionPatchInputSchema.safeParse(raw)
    if (!parsed.success) {
      return badRequest("Invalid update payload", parsed.error.flatten())
    }

    const updated = await updateOwnedDoc<DataCollection & OwnedDocBase>({
      collection: COLLECTION,
      doc: auth.doc!,
      patch: parsed.data as Partial<DataCollection & OwnedDocBase>
    })
    emitRagDocChanged({
      sourceType: "data_collection",
      sourceId: updated.id,
      workspaceId: updated.workspace_id,
      projectId: null
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("[DATA_COLLECTIONS] patchDataCollection failed:", error)
    return serverError("Failed to update data collection")
  }
}

export async function deleteDataCollection(
  request: Request,
  id: string
): Promise<Response> {
  try {
    const auth = await withOwnedResource<DataCollection>(request, {
      collection: COLLECTION,
      docId: id
    })
    if (auth.response) return auth.response

    await deleteOwnedDoc({ collection: COLLECTION, doc: auth.doc! })
    emitRagDocChanged({
      sourceType: "data_collection",
      sourceId: id,
      workspaceId: auth.doc?.workspace_id,
      projectId: null
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DATA_COLLECTIONS] deleteDataCollection failed:", error)
    return serverError("Failed to delete data collection")
  }
}
