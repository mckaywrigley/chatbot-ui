import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { adminDb } from "@/lib/firebase/admin"
import { generateShareToken } from "@/lib/design/sharing"
import type { Sharing } from "@/types/sharing"

const ALLOWED_SHARING: Sharing[] = ["private", "unlisted", "public"]

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

export async function POST(
  request: Request,
  { params }: { params: { designid: string } }
) {
  const auth = await authorizeOwner(params.designid)
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => ({}))
  const rotate = body?.rotate === true
  const sharingInput: Sharing | undefined = body?.sharing
  const nextSharing: Sharing =
    sharingInput && ALLOWED_SHARING.includes(sharingInput)
      ? sharingInput
      : auth.data.sharing === "private"
        ? "unlisted"
        : auth.data.sharing

  const existingToken: string | null = auth.data.share_token ?? null
  const nextToken =
    rotate || !existingToken ? generateShareToken() : existingToken

  await auth.ref.update({
    sharing: nextSharing,
    share_token: nextToken,
    updated_at: new Date().toISOString()
  })

  return NextResponse.json({
    sharing: nextSharing,
    share_token: nextToken
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: { designid: string } }
) {
  const auth = await authorizeOwner(params.designid)
  if ("error" in auth) return auth.error

  await auth.ref.update({
    sharing: "private",
    share_token: null,
    updated_at: new Date().toISOString()
  })

  return NextResponse.json({ sharing: "private", share_token: null })
}
