/**
 * Server-side callables for the workspace paper library Owned Resource.
 *
 * `addPaperToLibrary` is upsert-style: if a paper with the same normalized
 * URL already exists for this user + workspace, we append the design id
 * onto its `source_design_ids` rather than creating a duplicate.
 */
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import {
  badRequest,
  deleteOwnedDoc,
  insertOwnedDoc,
  listOwnedDocs,
  serverError,
  withOwnedResource
} from "@/lib/server/firestore-resource"
import { emitRagDocChanged } from "@/lib/rag/emit"
import {
  PaperLibraryAddInputSchema,
  normalizeUrl,
  type PaperLibraryEntry
} from "@/lib/paper-library/types"

const COLLECTION = "paper_library"

export async function addPaper(request: Request): Promise<Response> {
  try {
    const raw = await request.json().catch(() => null)
    if (!raw || typeof raw !== "object") return badRequest("Invalid JSON body")
    const parsed = PaperLibraryAddInputSchema.safeParse(raw)
    if (!parsed.success) {
      return badRequest("Invalid request body", parsed.error.flatten())
    }

    const auth = await withOwnedResource(request, {
      collection: COLLECTION,
      workspaceIdInBody: true,
      body: parsed.data
    })
    if (auth.response) return auth.response

    const p = parsed.data.paper
    const normalized = normalizeUrl(p.url || null)

    // Dupe check by normalized URL (cheaper than full doc scan if URL exists).
    if (normalized) {
      const dupSnap = await adminDb
        .collection(COLLECTION)
        .where("user_id", "==", auth.user.id)
        .where("workspace_id", "==", parsed.data.workspaceId)
        .where("url_normalized", "==", normalized)
        .limit(1)
        .get()
      if (!dupSnap.empty) {
        const existing = dupSnap.docs[0]
        const existingData = existing.data() as PaperLibraryEntry
        const sourceDesignIds = parsed.data.sourceDesignId
          ? Array.from(
              new Set([
                ...(existingData.source_design_ids ?? []),
                parsed.data.sourceDesignId
              ])
            )
          : (existingData.source_design_ids ?? [])
        await existing.ref.update({
          source_design_ids: sourceDesignIds,
          updated_at: new Date().toISOString()
        })
        const fresh = await existing.ref.get()
        emitRagDocChanged({
          sourceType: "paper_library",
          sourceId: fresh.id,
          workspaceId: parsed.data.workspaceId,
          projectId: null
        })
        return NextResponse.json({
          id: fresh.id,
          ...fresh.data(),
          deduplicated: true
        })
      }
    }

    const doc = await insertOwnedDoc({
      user: auth.user,
      collection: COLLECTION,
      workspaceId: parsed.data.workspaceId,
      payload: {
        title: p.title,
        url: p.url || null,
        url_normalized: normalized,
        summary: p.summary ?? "",
        authors: p.authors ?? [],
        year: p.year || null,
        journal: p.journal || null,
        source: p.source ?? null,
        source_design_ids: parsed.data.sourceDesignId
          ? [parsed.data.sourceDesignId]
          : []
      }
    })
    emitRagDocChanged({
      sourceType: "paper_library",
      sourceId: doc.id,
      workspaceId: doc.workspace_id,
      projectId: null
    })
    return NextResponse.json(doc)
  } catch (error) {
    console.error("[PAPER_LIBRARY] addPaper failed:", error)
    return serverError("Failed to add paper to library")
  }
}

export async function listPapers(request: Request): Promise<Response> {
  try {
    const auth = await withOwnedResource(request, { collection: COLLECTION })
    if (auth.response) return auth.response

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    if (!workspaceId) return badRequest("Workspace ID is required")

    const papers = await listOwnedDocs<PaperLibraryEntry>({
      user: auth.user,
      collection: COLLECTION,
      where: [["workspace_id", "==", workspaceId]],
      orderBy: "in-memory",
      inMemorySort: { field: "updated_at", dir: "desc" }
    })
    return NextResponse.json({ papers })
  } catch (error) {
    console.error("[PAPER_LIBRARY] listPapers failed:", error)
    return serverError("Failed to fetch paper library")
  }
}

export async function deletePaper(
  request: Request,
  paperId: string
): Promise<Response> {
  try {
    const auth = await withOwnedResource<PaperLibraryEntry>(request, {
      collection: COLLECTION,
      docId: paperId
    })
    if (auth.response) return auth.response

    await deleteOwnedDoc({ collection: COLLECTION, doc: auth.doc! })
    emitRagDocChanged({
      sourceType: "paper_library",
      sourceId: paperId,
      workspaceId: auth.doc?.workspace_id,
      projectId: null
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[PAPER_LIBRARY] deletePaper failed:", error)
    return serverError("Failed to delete paper")
  }
}
