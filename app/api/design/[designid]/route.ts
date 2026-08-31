import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { adminDb } from "@/lib/firebase/admin"
import {
  evaluateAccess,
  getPermissionForUser,
  resolvePendingInvites,
  stripPrivateFieldsForPublic
} from "@/lib/design/sharing"
import { isPubliclyViewable } from "@/types/sharing"
import { emitRagDocChanged } from "@/lib/rag/emit"

export async function GET(
  request: Request,
  { params }: { params: { designid: string } }
) {
  try {
    if (
      !params.designid ||
      params.designid === "undefined" ||
      params.designid === "null"
    ) {
      return NextResponse.json(
        { error: "Invalid design ID provided" },
        { status: 400 }
      )
    }

    const designDoc = await adminDb
      .collection("designs")
      .doc(params.designid)
      .get()

    if (!designDoc.exists) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 })
    }

    const design = { id: designDoc.id, ...designDoc.data() } as any

    const supabase = createClient(cookies())
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (user) {
      await resolvePendingInvites(user.id, user.email)
    }

    const permission = user
      ? await getPermissionForUser(params.designid, user.id, user.email ?? null)
      : null
    const access = evaluateAccess(design, user?.id ?? null, permission)

    if (!access.canView) {
      if (isPubliclyViewable(design.sharing)) {
        return NextResponse.json(stripPrivateFieldsForPublic(design))
      }
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      ...design,
      _access: {
        isOwner: access.isOwner,
        role: access.role,
        canEdit: access.canEdit
      }
    })
  } catch (error) {
    console.error("❌ [DESIGN_API] Error fetching design:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function authorizeEditor(designId: string) {
  const supabase = createClient(cookies())
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
  const designDoc = await adminDb.collection("designs").doc(designId).get()
  if (!designDoc.exists) {
    return {
      error: NextResponse.json({ error: "Design not found" }, { status: 404 })
    }
  }
  const design = { id: designDoc.id, ...designDoc.data() } as any
  const permission = await getPermissionForUser(
    designId,
    user.id,
    user.email ?? null
  )
  const access = evaluateAccess(design, user.id, permission)
  if (!access.canEdit) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { user, design, access }
}

export async function PUT(
  request: Request,
  { params }: { params: { designid: string } }
) {
  try {
    const designId = params.designid
    if (!designId || designId === "undefined" || designId === "null") {
      return NextResponse.json(
        { error: "Invalid design ID provided" },
        { status: 400 }
      )
    }

    const auth = await authorizeEditor(designId)
    if ("error" in auth) return auth.error

    const payload = await request.json()
    const {
      content,
      name,
      description,
      domain,
      phase,
      objectives,
      objective,
      variables,
      knownVariables,
      unknownVariables,
      material,
      time,
      equipment,
      specialConsiderations
    } = payload ?? {}

    if (
      typeof content === "undefined" &&
      typeof name === "undefined" &&
      typeof description === "undefined"
    ) {
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 }
      )
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (typeof content !== "undefined") {
      updates.content =
        typeof content === "string" ? content : JSON.stringify(content)
    }
    if (typeof name !== "undefined") updates.name = name
    if (typeof description !== "undefined") updates.description = description
    if (typeof domain !== "undefined") updates.domain = domain
    if (typeof phase !== "undefined") updates.phase = phase
    if (typeof objectives !== "undefined") updates.objectives = objectives
    if (typeof objective !== "undefined") updates.objective = objective
    if (typeof variables !== "undefined") updates.variables = variables
    if (typeof knownVariables !== "undefined")
      updates.known_variables = knownVariables
    if (typeof unknownVariables !== "undefined")
      updates.unknown_variables = unknownVariables
    if (typeof material !== "undefined") updates.material = material
    if (typeof time !== "undefined") updates.time = time
    if (typeof equipment !== "undefined") updates.equipment = equipment
    if (typeof specialConsiderations !== "undefined") {
      updates.special_considerations = specialConsiderations
    }

    const designRef = adminDb.collection("designs").doc(designId)
    await designRef.update(updates)

    const updatedDoc = await designRef.get()
    const updatedDesign = { id: updatedDoc.id, ...updatedDoc.data() } as any

    emitRagDocChanged({
      sourceType: "design",
      sourceId: designId,
      workspaceId: updatedDesign?.workspace_id ?? null,
      projectId: updatedDesign?.project_id ?? null
    })

    return NextResponse.json({ success: true, design: updatedDesign })
  } catch (error) {
    console.error("❌ [DESIGN_API] Error updating design:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { designid: string } }
) {
  try {
    const designId = params.designid
    if (!designId || designId === "undefined" || designId === "null") {
      return NextResponse.json({ error: "Invalid design ID" }, { status: 400 })
    }

    const auth = await authorizeEditor(designId)
    if ("error" in auth) return auth.error

    const updates = await request.json()

    // Editors cannot change sharing/ownership fields - owner-only via /share
    // and /collaborators endpoints.
    if (!auth.access.isOwner) {
      delete updates.sharing
      delete updates.share_token
      delete updates.shared_with
      delete updates.user_id
      delete updates.forked_from
    }

    await adminDb
      .collection("designs")
      .doc(designId)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })

    const updated = await adminDb.collection("designs").doc(designId).get()
    const data = updated.data() as any

    emitRagDocChanged({
      sourceType: "design",
      sourceId: designId,
      workspaceId: data?.workspace_id ?? null,
      projectId: data?.project_id ?? null
    })

    return NextResponse.json({ id: updated.id, ...data })
  } catch (error) {
    console.error("❌ [DESIGN_API] Error updating design:", error)
    return NextResponse.json(
      { error: "Failed to update design" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { designid: string } }
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

    const designId = params.designid

    if (!designId || designId === "undefined" || designId === "null") {
      return NextResponse.json({ error: "Invalid design ID" }, { status: 400 })
    }

    const designDoc = await adminDb.collection("designs").doc(designId).get()

    if (!designDoc.exists) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 })
    }

    const designData = designDoc.data()
    if (designData?.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await adminDb.collection("designs").doc(designId).delete()

    const permSnap = await adminDb
      .collection("design_permissions")
      .where("design_id", "==", designId)
      .get()
    const batch = adminDb.batch()
    permSnap.docs.forEach((d: any) => batch.delete(d.ref))
    if (!permSnap.empty) await batch.commit()

    emitRagDocChanged({
      sourceType: "design",
      sourceId: designId,
      workspaceId: designData?.workspace_id ?? null,
      projectId: designData?.project_id ?? null
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ [DESIGN_API] Error deleting design:", error)
    return NextResponse.json(
      { error: "Failed to delete design" },
      { status: 500 }
    )
  }
}
