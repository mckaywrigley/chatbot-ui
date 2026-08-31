import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { adminDb } from "@/lib/firebase/admin"
import { emitRagDocChanged } from "@/lib/rag/emit"
import type { QueryDocumentSnapshot } from "firebase-admin/firestore"

export async function GET(request: Request) {
  try {
    const supabase = createClient(cookies())
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      )
    }

    // Two-clause where + orderBy(created_at desc) requires a composite
    // index on (user_id, project_id, created_at). Fresh Firestore
    // projects don't have it, and a missing index returns
    // FAILED_PRECONDITION which surfaced as opaque 500s on the project
    // dashboard. Drop the orderBy and sort in-memory - workspace-sized
    // file lists are small enough that the cost is irrelevant.
    const snapshot = await adminDb
      .collection("project_files")
      .where("user_id", "==", user.id)
      .where("project_id", "==", projectId)
      .get()

    const files = snapshot.docs
      .map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...(doc.data() as any)
      }))
      .sort((a: any, b: any) => {
        const aTs = new Date(a.created_at ?? 0).getTime()
        const bTs = new Date(b.created_at ?? 0).getTime()
        return bTs - aTs
      })

    return NextResponse.json({ files })
  } catch (error: any) {
    console.error("❌ [PROJECT_FILES] Error fetching files:", error)
    // Surface the underlying message (Firestore errors are descriptive
    // - index hints, permission detail) so the chrome console shows
    // something actionable instead of just "Failed to fetch".
    return NextResponse.json(
      {
        error: "Failed to fetch project files",
        detail: error?.message ?? String(error)
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(cookies())
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.warn("[PROJECT_FILES] POST unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      id,
      project_id,
      workspace_id,
      name,
      mime_type,
      size,
      storage_path
    } = body

    console.log("[PROJECT_FILES] POST received", {
      id,
      project_id,
      workspace_id,
      name,
      size,
      hasStoragePath: !!storage_path
    })

    if (!id || !project_id || !workspace_id || !name || !storage_path) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          missing: {
            id: !id,
            project_id: !project_id,
            workspace_id: !workspace_id,
            name: !name,
            storage_path: !storage_path
          }
        },
        { status: 400 }
      )
    }

    const declaredSize = typeof size === "number" ? size : 0
    const MAX_PROJECT_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
    if (declaredSize > MAX_PROJECT_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 25 MB limit" },
        { status: 413 }
      )
    }

    const record = {
      id,
      user_id: user.id,
      project_id,
      workspace_id,
      name,
      mime_type: mime_type || "application/octet-stream",
      size: declaredSize,
      storage_path,
      created_at: new Date().toISOString()
    }

    await adminDb.collection("project_files").doc(id).set(record)
    console.log("[PROJECT_FILES] POST wrote Firestore doc", id)

    emitRagDocChanged({
      sourceType: "project_file",
      sourceId: id,
      workspaceId: workspace_id,
      projectId: project_id
    })

    return NextResponse.json(record)
  } catch (error: any) {
    console.error("❌ [PROJECT_FILES] Error creating file record:", error)
    return NextResponse.json(
      {
        error: "Failed to save file metadata",
        detail: error?.message ?? String(error)
      },
      { status: 500 }
    )
  }
}
