import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { stripPrivateFieldsForPublic } from "@/lib/design/sharing"
import { isPubliclyViewable } from "@/types/sharing"

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 })
  }

  const snap = await adminDb
    .collection("designs")
    .where("share_token", "==", token)
    .limit(1)
    .get()

  if (snap.empty) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const doc = snap.docs[0]
  const data = { id: doc.id, ...doc.data() } as any

  if (!isPubliclyViewable(data.sharing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(stripPrivateFieldsForPublic(data))
}
