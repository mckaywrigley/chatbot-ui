import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { adminDb } from "@/lib/firebase/admin"
import { emitRagDocChanged } from "@/lib/rag/emit"

export async function DELETE(
  _request: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    const supabase = createClient(cookies())
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const docRef = adminDb.collection("project_files").doc(params.fileId)
    const snap = await docRef.get()

    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const data = snap.data()
    if (data?.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await docRef.delete()

    emitRagDocChanged({
      sourceType: "project_file",
      sourceId: params.fileId,
      workspaceId: data?.workspace_id ?? null,
      projectId: data?.project_id ?? null
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("❌ [PROJECT_FILES] Error deleting file:", error)
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    )
  }
}
