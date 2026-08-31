import { adminDb } from "@/lib/firebase/admin"
import { randomBytes } from "crypto"
import type { CollaboratorRole, DesignPermission } from "@/types/sharing"

const TOKEN_BYTES = 16

export function generateShareToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url")
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function permissionDocId(designId: string, email: string): string {
  return `${designId}:${normalizeEmail(email)}`
}

export interface AccessContext {
  isOwner: boolean
  role: CollaboratorRole | null
  canView: boolean
  canEdit: boolean
}

export function evaluateAccess(
  design: any,
  userId: string | null,
  permission: DesignPermission | null
): AccessContext {
  const isOwner = !!userId && design?.user_id === userId
  const role = permission?.role ?? null
  const canEdit = isOwner || role === "editor"
  const canView =
    isOwner ||
    role === "viewer" ||
    role === "editor" ||
    design?.sharing === "public" ||
    design?.sharing === "unlisted"
  return { isOwner, role, canView, canEdit }
}

export async function getPermissionForUser(
  designId: string,
  userId: string | null,
  userEmail: string | null
): Promise<DesignPermission | null> {
  if (!userId && !userEmail) return null

  if (userEmail) {
    const byEmailRef = adminDb
      .collection("design_permissions")
      .doc(permissionDocId(designId, userEmail))
    const byEmailDoc = await byEmailRef.get()
    if (byEmailDoc.exists) {
      return { id: byEmailDoc.id, ...byEmailDoc.data() } as DesignPermission
    }
  }

  if (userId) {
    const snap = await adminDb
      .collection("design_permissions")
      .where("design_id", "==", designId)
      .where("user_id", "==", userId)
      .limit(1)
      .get()
    if (!snap.empty) {
      const doc = snap.docs[0]
      return { id: doc.id, ...doc.data() } as DesignPermission
    }
  }

  return null
}

/**
 * Resolves pending invites for a newly-authenticated user. Finds any
 * permission docs addressed to their email that have no user_id yet,
 * fills in user_id, and adds them to the design's shared_with array.
 * Safe to call on every authenticated request; short-circuits quickly when
 * there is nothing to resolve.
 */
export async function resolvePendingInvites(
  userId: string,
  email: string | null | undefined
): Promise<number> {
  if (!email) return 0
  const normalized = normalizeEmail(email)

  const pending = await adminDb
    .collection("design_permissions")
    .where("email", "==", normalized)
    .where("user_id", "==", null)
    .get()

  if (pending.empty) return 0

  const now = new Date().toISOString()
  let resolved = 0

  for (const doc of pending.docs) {
    const data = doc.data()
    const designId: string = data.design_id
    try {
      await adminDb.runTransaction(async (tx: any) => {
        const designRef = adminDb.collection("designs").doc(designId)
        const designSnap = await tx.get(designRef)
        if (!designSnap.exists) {
          tx.delete(doc.ref)
          return
        }
        const design = designSnap.data() as any
        const sharedWith: string[] = Array.isArray(design.shared_with)
          ? design.shared_with
          : []
        if (!sharedWith.includes(userId)) {
          tx.update(designRef, {
            shared_with: [...sharedWith, userId],
            updated_at: now
          })
        }
        tx.update(doc.ref, {
          user_id: userId,
          resolved_at: now
        })
      })
      resolved++
    } catch (err) {
      console.error("[SHARING] Failed to resolve pending invite", doc.id, err)
    }
  }

  return resolved
}

export function stripPrivateFieldsForPublic(design: any): any {
  if (!design) return design
  const { shared_with, user_id, ...rest } = design
  return rest
}
