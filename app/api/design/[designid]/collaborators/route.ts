import { NextResponse } from "next/server"
import { cookies, headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { adminDb } from "@/lib/firebase/admin"
import { normalizeEmail, permissionDocId } from "@/lib/design/sharing"
import { sendDesignInviteEmail } from "@/lib/email/send"
import type { CollaboratorRole, DesignPermission } from "@/types/sharing"

const ALLOWED_ROLES: CollaboratorRole[] = ["viewer", "editor"]

async function authorizeOwner(designId: string) {
  const supabase = createClient(cookies())
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()
  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
  const ref = adminDb.collection("designs").doc(designId)
  const doc = await ref.get()
  if (!doc.exists) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  }
  const data = doc.data() as any
  if (data.user_id !== user.id) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { user, ref, data }
}

export async function GET(
  _request: Request,
  { params }: { params: { designid: string } }
) {
  const auth = await authorizeOwner(params.designid)
  if ("error" in auth) return auth.error

  // where + orderBy on a different field requires a composite Firestore
  // index. Drop the orderBy and sort in-memory - collaborator lists are
  // small enough that the cost is negligible.
  const snap = await adminDb
    .collection("design_permissions")
    .where("design_id", "==", params.designid)
    .get()

  const collaborators = snap.docs
    .map((d: any) => ({
      id: d.id,
      ...d.data()
    }))
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
    ) as DesignPermission[]

  return NextResponse.json({ collaborators })
}

export async function POST(
  request: Request,
  { params }: { params: { designid: string } }
) {
  const auth = await authorizeOwner(params.designid)
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => ({}))
  const rawEmail: unknown = body?.email
  const rawRole: unknown = body?.role
  // `notify` lets the UI add/update a collaborator WITHOUT emailing them
  // (e.g. a silent role change, or when "Notify people" is unchecked).
  // Defaults to true to preserve the original invite-always-emails behaviour.
  const notify: boolean = body?.notify !== false

  if (typeof rawEmail !== "string" || !rawEmail.includes("@")) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 }
    )
  }
  const role: CollaboratorRole =
    typeof rawRole === "string" &&
    ALLOWED_ROLES.includes(rawRole as CollaboratorRole)
      ? (rawRole as CollaboratorRole)
      : "viewer"

  const email = normalizeEmail(rawEmail)

  if (email === normalizeEmail(auth.user.email ?? "")) {
    return NextResponse.json(
      { error: "You already own this design" },
      { status: 400 }
    )
  }

  // Try to resolve to an existing Supabase user. Use admin listUsers lookup via
  // service-role client if available; otherwise store as pending invite.
  let resolvedUserId: string | null = null
  try {
    const supabase = createClient(cookies())
    // listUsers isn't exposed to non-service keys; we fall back silently.
    const { data } = (await (supabase as any).auth.admin?.listUsers?.({
      page: 1,
      perPage: 1,
      email
    })) ?? { data: null }
    const match = data?.users?.find(
      (u: any) => normalizeEmail(u.email ?? "") === email
    )
    if (match?.id) resolvedUserId = match.id
  } catch {
    // admin lookup not available - invite stays pending until resolver runs
  }

  const now = new Date().toISOString()
  const docId = permissionDocId(params.designid, email)
  const permission: DesignPermission = {
    id: docId,
    design_id: params.designid,
    user_id: resolvedUserId,
    email,
    role,
    invited_by: auth.user.id,
    invited_by_email: auth.user.email ?? null,
    created_at: now,
    resolved_at: resolvedUserId ? now : null
  }

  await adminDb
    .collection("design_permissions")
    .doc(docId)
    .set(permission, { merge: true })

  if (resolvedUserId) {
    const sharedWith: string[] = Array.isArray(auth.data.shared_with)
      ? auth.data.shared_with
      : []
    if (!sharedWith.includes(resolvedUserId)) {
      await auth.ref.update({
        shared_with: [...sharedWith, resolvedUserId],
        updated_at: now
      })
    }
  }

  // Best-effort invite email. Delivery failures are logged but never block the
  // API response - the permission row is the source of truth for access. We DO
  // report the delivery outcome so the UI can tell the user to share the link
  // manually instead of falsely claiming "invite sent". Skipped entirely when
  // the caller opts out of notifying (notify === false).
  let emailDelivered = false
  let emailError: string | undefined
  if (notify) {
    try {
      const h = headers()
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (h.get("origin") ?? (h.get("host") ? `https://${h.get("host")}` : ""))
      // Link invited collaborators to the workspace-agnostic resolver, which
      // (once they're signed in) routes them INTO the editable design under their
      // own workspace - an editor can edit, a viewer gets read-only. The old
      // `/share/design/{token}` target was read-only, so invited editors could
      // never actually edit. Default locale "en"; the resolver re-localizes.
      const designUrl = origin
        ? `${origin}/en/open/design/${params.designid}`
        : null
      const signupUrl = origin ? `${origin}/login?mode=signup` : null

      const emailResult = await sendDesignInviteEmail({
        to: email,
        inviterName:
          (auth.user.user_metadata as any)?.full_name ||
          auth.user.email ||
          "A collaborator",
        inviterEmail: auth.user.email ?? null,
        designName: auth.data.name || "Untitled design",
        role,
        designUrl,
        signupUrl,
        isPending: !resolvedUserId
      })
      emailDelivered = emailResult.delivered
      emailError = emailResult.delivered
        ? undefined
        : (emailResult.error ?? "Email is not configured on the server")
    } catch (err: any) {
      console.error("[COLLABORATORS] invite email failed", err)
      emailError = err?.message ?? "Email send failed"
    }
  }

  return NextResponse.json({
    collaborator: permission,
    emailDelivered,
    emailError
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: { designid: string } }
) {
  const auth = await authorizeOwner(params.designid)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 })
  }

  const docId = permissionDocId(params.designid, email)
  const permRef = adminDb.collection("design_permissions").doc(docId)
  const permSnap = await permRef.get()
  if (!permSnap.exists) {
    return NextResponse.json({ success: true })
  }
  const perm = permSnap.data() as DesignPermission
  await permRef.delete()

  if (perm.user_id) {
    const sharedWith: string[] = Array.isArray(auth.data.shared_with)
      ? auth.data.shared_with
      : []
    const next = sharedWith.filter(id => id !== perm.user_id)
    if (next.length !== sharedWith.length) {
      await auth.ref.update({
        shared_with: next,
        updated_at: new Date().toISOString()
      })
    }
  }

  return NextResponse.json({ success: true })
}
