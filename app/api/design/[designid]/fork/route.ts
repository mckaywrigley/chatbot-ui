import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { adminDb } from "@/lib/firebase/admin"
import { evaluateAccess, getPermissionForUser } from "@/lib/design/sharing"
import { isPubliclyViewable } from "@/types/sharing"

export async function POST(
  request: Request,
  { params }: { params: { designid: string } }
) {
  const supabase = createClient(cookies())
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const workspaceId: string | undefined = body?.workspaceId
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId is required" },
      { status: 400 }
    )
  }
  const projectId: string | null = body?.projectId ?? null
  // When duplicating a completed design to branch a variant, reopen it for
  // editing: the agent outputs (papers, hypotheses, generated designs) are
  // preserved, but the approved phases are cleared so the copy is "in
  // progress" and the user can re-select papers/hypotheses. The public
  // "Fork to workspace" path leaves this false (an exact copy).
  const resetApproval: boolean = body?.resetApproval === true

  const srcRef = adminDb.collection("designs").doc(params.designid)
  const srcDoc = await srcRef.get()
  if (!srcDoc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const src = { id: srcDoc.id, ...srcDoc.data() } as any

  const permission = await getPermissionForUser(
    params.designid,
    user.id,
    user.email ?? null
  )
  const access = evaluateAccess(src, user.id, permission)
  if (!access.canView && !isPubliclyViewable(src.sharing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const newId = crypto.randomUUID()
  const now = new Date().toISOString()
  // Place the copy DIRECTLY ABOVE the design it was cloned from in the
  // recency-ordered lists (dashboard + designs page both sort by updated_at
  // desc). Giving the fork `updated_at = now` shoved it to the very top of
  // the list instead of next to its source, so it looked like "nothing
  // happened" until a refresh. Anchoring updated_at 1s after the source makes
  // it land immediately above the original - both in the optimistic client
  // insert and after any refetch.
  const srcUpdatedMs = src.updated_at
    ? new Date(src.updated_at).getTime()
    : Date.now()
  const forkUpdatedAt = Number.isFinite(srcUpdatedMs)
    ? new Date(srcUpdatedMs + 1000).toISOString()
    : now

  // Optionally clear approvedPhases so the duplicate is editable again.
  let forkContent = src.content ?? null
  if (resetApproval && forkContent != null) {
    try {
      const wasString = typeof forkContent === "string"
      const parsed = wasString ? JSON.parse(forkContent) : { ...forkContent }
      if (parsed && typeof parsed === "object") {
        parsed.approvedPhases = []
        forkContent = wasString ? JSON.stringify(parsed) : parsed
      }
    } catch {
      // Leave content untouched if it isn't parseable JSON.
    }
  }

  const fork = {
    id: newId,
    user_id: user.id,
    workspace_id: workspaceId,
    project_id: projectId,
    folder_id: null,
    name: src.name ? `Copy of ${src.name}` : "Copy of design",
    description: src.description ?? "",
    sharing: "private",
    share_token: null,
    shared_with: [],
    forked_from: {
      design_id: src.id,
      user_id: src.user_id,
      name: src.name ?? ""
    },
    content: forkContent,
    domain: src.domain ?? null,
    phase: src.phase ?? null,
    objectives: src.objectives ?? null,
    objective: src.objective ?? null,
    variables: src.variables ?? null,
    known_variables: src.known_variables ?? null,
    unknown_variables: src.unknown_variables ?? null,
    material: src.material ?? null,
    time: src.time ?? null,
    equipment: src.equipment ?? null,
    special_considerations: src.special_considerations ?? null,
    created_at: now,
    updated_at: forkUpdatedAt
  }

  await adminDb.collection("designs").doc(newId).set(fork)

  return NextResponse.json({ design: fork })
}
