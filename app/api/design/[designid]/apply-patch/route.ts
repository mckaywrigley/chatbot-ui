import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { adminDb } from "@/lib/firebase/admin"
import { evaluateAccess, getPermissionForUser } from "@/lib/design/sharing"
import { applyDesignPatch } from "@/lib/design/apply-patch"
import type { DesignContentV2, GeneratedDesign } from "@/lib/design-agent"
import { emitRagDocChanged } from "@/lib/rag/emit"

/**
 * POST /api/design/[designid]/apply-patch
 *
 * Applies a chat-proposed `<design-patch>` to the design's stored content and
 * persists it - server-side and authoritative. This lets the "Approve & apply"
 * button work from ANYWHERE the chat is shown (the in-design rail OR the
 * full-screen chat page, where the design page isn't mounted to catch a window
 * event). Returns the updated designs so an open editor can sync live.
 *
 * Body: { patch: { sectionHeading, find?, replace?, newBody?, designIndex? },
 *         activeDesignId?: string | null }
 */
export async function POST(
  request: Request,
  { params }: { params: { designid: string } }
) {
  try {
    const designId = params.designid
    if (!designId || designId === "undefined" || designId === "null") {
      return NextResponse.json({ error: "Invalid design ID" }, { status: 400 })
    }

    // Auth: editor (owner or invited editor) only.
    const supabase = createClient(cookies())
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const designDoc = await adminDb.collection("designs").doc(designId).get()
    if (!designDoc.exists) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 })
    }
    const design = { id: designDoc.id, ...designDoc.data() } as any
    const permission = await getPermissionForUser(
      designId,
      user.id,
      user.email ?? null
    )
    const access = evaluateAccess(design, user.id, permission)
    if (!access.canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as {
      patch?: {
        sectionHeading: string
        find?: string
        replace?: string
        newBody?: string
        designIndex?: number
      }
      activeDesignId?: string | null
    } | null
    const patch = body?.patch
    if (!patch?.sectionHeading) {
      return NextResponse.json({ error: "Malformed patch" }, { status: 400 })
    }

    // Parse stored content → DesignContentV2.
    let content: DesignContentV2 | null = null
    try {
      content =
        typeof design.content === "string"
          ? (JSON.parse(design.content) as DesignContentV2)
          : (design.content as DesignContentV2)
    } catch {
      content = null
    }
    const designs: GeneratedDesign[] = content?.designs ?? []
    if (designs.length === 0) {
      return NextResponse.json(
        { error: "There's no generated design to edit yet." },
        { status: 400 }
      )
    }

    const res = applyDesignPatch(designs, body?.activeDesignId ?? null, patch)
    if (res.error || !res.designs) {
      return NextResponse.json(
        { error: res.error ?? "Couldn't apply the edit." },
        { status: 422 }
      )
    }

    const nextContent: DesignContentV2 = { ...content!, designs: res.designs }
    await adminDb
      .collection("designs")
      .doc(designId)
      .update({
        content: JSON.stringify(nextContent),
        updated_at: new Date().toISOString()
      })

    emitRagDocChanged({
      sourceType: "design",
      sourceId: designId,
      workspaceId: design?.workspace_id ?? null,
      projectId: design?.project_id ?? null
    })

    return NextResponse.json({
      ok: true,
      sectionHeading: res.sectionHeading,
      designs: res.designs
    })
  } catch (error) {
    console.error("❌ [DESIGN_API] apply-patch failed:", error)
    return NextResponse.json(
      { error: "Failed to apply the edit." },
      { status: 500 }
    )
  }
}
