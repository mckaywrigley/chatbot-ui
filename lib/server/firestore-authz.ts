import { adminDb } from "@/lib/firebase/admin"
import { NextResponse } from "next/server"

type OwnerCheckOk<T> = { doc: T & { id: string }; response?: undefined }
type OwnerCheckErr = { doc?: undefined; response: NextResponse }

export async function requireFirestoreOwner<T = any>(
  collection: string,
  docId: string,
  userId: string,
  opts?: { userField?: string }
): Promise<OwnerCheckOk<T> | OwnerCheckErr> {
  const userField = opts?.userField ?? "user_id"
  const snap = await adminDb.collection(collection).doc(docId).get()

  if (!snap.exists) {
    return {
      response: NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  const data = snap.data() || {}

  // Fail closed: if the document predates ownership tracking and has no owner
  // field, treat it as inaccessible rather than silently allowing any caller.
  if (data[userField] == null || data[userField] !== userId) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  return { doc: { id: snap.id, ...data } as T & { id: string } }
}
