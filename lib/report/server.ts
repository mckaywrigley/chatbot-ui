/**
 * Server-side callables for the Report Owned Resource.
 *
 * Each export takes a `Request` (and an `id` for item routes) and returns a
 * `Response`. Designed so that:
 *  - `app/api/reports/...` adapters are one-line re-exports
 *  - tests target these functions directly without spinning up Next routes
 *
 * Auth + ownership invariants live in `lib/server/firestore-resource.ts`.
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
  ReportCreateInputSchema,
  ReportPatchInputSchema,
  type Report
} from "@/lib/report/types"

const COLLECTION = "reports"

export async function createReport(request: Request): Promise<Response> {
  try {
    const raw = await request.json().catch(() => null)
    if (!raw || typeof raw !== "object") {
      return badRequest("Invalid JSON body")
    }

    const parsed = ReportCreateInputSchema.safeParse(raw)
    if (!parsed.success) {
      return badRequest("Invalid request body", parsed.error.flatten())
    }

    const auth = await withOwnedResource(request, {
      collection: COLLECTION,
      workspaceIdInBody: true,
      body: parsed.data
    })
    if (auth.response) return auth.response

    const { report, selectedFiles, collections } = parsed.data

    const payload = {
      name: report?.name || report?.description || "Untitled report",
      description: report?.description ?? "",
      sharing: report?.sharing ?? "private",
      folder_id: report?.folder_id ?? null,

      // Parent design attribution (reports are spawned from a design).
      source_design_id: report?.source_design_id ?? null,
      source_design_name: report?.source_design_name ?? null,
      design_context: report?.design_context ?? null,
      template_id: report?.template_id ?? null,
      generation_status: report?.generation_status ?? "idle",

      report_outline: report?.report_outline ?? null,
      report_draft: report?.report_draft ?? null,
      chart_image: report?.chart_image ?? null,

      files: {
        protocol: selectedFiles?.protocol ?? [],
        papers: selectedFiles?.papers ?? [],
        dataFiles: selectedFiles?.dataFiles ?? []
      },
      collections: collections ?? []
    }

    const doc = await insertOwnedDoc({
      user: auth.user,
      collection: COLLECTION,
      workspaceId: auth.workspaceId!,
      payload
    })

    emitRagDocChanged({
      sourceType: "report",
      sourceId: doc.id,
      workspaceId: doc.workspace_id,
      projectId: null
    })

    return NextResponse.json(doc)
  } catch (error) {
    console.error("[REPORTS] createReport failed:", error)
    return serverError("Failed to create report")
  }
}

export async function listReports(request: Request): Promise<Response> {
  try {
    const auth = await withOwnedResource(request, { collection: COLLECTION })
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const projectId = searchParams.get("projectId")

    const where: Array<[string, FirebaseFirestore.WhereFilterOp, unknown]> = []
    if (projectId) where.push(["project_id", "==", projectId])
    else if (workspaceId) where.push(["workspace_id", "==", workspaceId])

    // No composite index on (user_id, workspace_id, updated_at) - sort in memory.
    const reports = await listOwnedDocs<Report>({
      user: auth.user,
      collection: COLLECTION,
      where,
      orderBy: "in-memory",
      inMemorySort: { field: "updated_at", dir: "desc" }
    })

    return NextResponse.json({ reports })
  } catch (error) {
    console.error("[REPORTS] listReports failed:", error)
    return serverError("Failed to fetch reports")
  }
}

export async function getReport(
  request: Request,
  reportId: string
): Promise<Response> {
  try {
    const auth = await withOwnedResource<Report>(request, {
      collection: COLLECTION,
      docId: reportId
    })
    if (auth.response) return auth.response
    return NextResponse.json(auth.doc)
  } catch (error) {
    console.error("[REPORTS] getReport failed:", error)
    return serverError("Failed to fetch report")
  }
}

export async function patchReport(
  request: Request,
  reportId: string
): Promise<Response> {
  try {
    const auth = await withOwnedResource<Report>(request, {
      collection: COLLECTION,
      docId: reportId
    })
    if (auth.response) return auth.response

    const raw = await request.json().catch(() => null)
    if (!raw || typeof raw !== "object") {
      return badRequest("Invalid JSON body")
    }
    const parsed = ReportPatchInputSchema.safeParse(raw)
    if (!parsed.success) {
      return badRequest("Invalid update payload", parsed.error.flatten())
    }

    const updated = await updateOwnedDoc<Report & OwnedDocBase>({
      collection: COLLECTION,
      doc: auth.doc!,
      patch: parsed.data as Partial<Report & OwnedDocBase>
    })

    emitRagDocChanged({
      sourceType: "report",
      sourceId: updated.id,
      workspaceId: updated.workspace_id,
      projectId: null
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[REPORTS] patchReport failed:", error)
    return serverError("Failed to update report")
  }
}

export async function deleteReport(
  request: Request,
  reportId: string
): Promise<Response> {
  try {
    const auth = await withOwnedResource<Report>(request, {
      collection: COLLECTION,
      docId: reportId
    })
    if (auth.response) return auth.response

    await deleteOwnedDoc({ collection: COLLECTION, doc: auth.doc! })

    // Emit so the rag worker clears stale rows for this source.
    emitRagDocChanged({
      sourceType: "report",
      sourceId: reportId,
      workspaceId: auth.doc?.workspace_id,
      projectId: null
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[REPORTS] deleteReport failed:", error)
    return serverError("Failed to delete report")
  }
}
