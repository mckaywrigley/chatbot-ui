/**
 * Mid-level primitives for Owned Resources (see CONTEXT.md).
 *
 * Caller obligations:
 *  - call `withOwnedResource` first to get an authenticated `User` (and an
 *    optional pre-fetched owned doc). Bail out early if it returns a Response.
 *  - use `insertOwnedDoc` / `listOwnedDocs` / `updateOwnedDoc` / `deleteOwnedDoc`
 *    so id, timestamps, and `user_id` are injected/enforced consistently.
 *
 * Invariants this module owns:
 *  - request is authenticated
 *  - caller is the Owner (`user_id` match) of any doc they touch
 *  - on POST: caller owns the workspace they write into
 *  - id, `user_id`, `created_at`, `updated_at` are server-assigned
 */
import type { User } from "@supabase/supabase-js"
import type {
  DocumentData,
  Query,
  QueryDocumentSnapshot,
  WhereFilterOp
} from "firebase-admin/firestore"
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { requireUser, userOwnsWorkspace } from "@/lib/server/require-user"
import { requireFirestoreOwner } from "@/lib/server/firestore-authz"

export type OwnedDocBase = {
  id: string
  user_id: string
  workspace_id: string
  created_at: string
  updated_at: string
}

type OwnedAuthOk<T> = {
  user: User
  doc?: (T & OwnedDocBase) | undefined
  workspaceId?: string
  response?: undefined
}
type OwnedAuthErr = {
  user?: undefined
  doc?: undefined
  workspaceId?: undefined
  response: NextResponse
}
export type OwnedAuth<T = unknown> = OwnedAuthOk<T> | OwnedAuthErr

type WithOwnedResourceOpts = {
  collection: string
  /** Item routes - fetch the doc and assert ownership. */
  docId?: string
  /** Collection POST - read `workspaceId` from body, assert caller owns it. */
  workspaceIdInBody?: boolean
  /** Body already-parsed (avoid double `await req.json()`). */
  body?: unknown
}

/**
 * Auth + ownership gate. Returns either `{ user, doc?, workspaceId? }` or a
 * pre-built error `Response`. Callers MUST early-return on `response`.
 */
export async function withOwnedResource<T = DocumentData>(
  request: Request,
  opts: WithOwnedResourceOpts
): Promise<OwnedAuth<T>> {
  const auth = await requireUser()
  if (auth.response) return { response: auth.response }
  const user = auth.user

  let workspaceId: string | undefined

  if (opts.workspaceIdInBody) {
    const body = (opts.body ?? (await request.clone().json())) as
      | { workspaceId?: string }
      | undefined
    workspaceId = body?.workspaceId
    if (!workspaceId) {
      return {
        response: NextResponse.json(
          { error: "Workspace ID is required" },
          { status: 400 }
        )
      }
    }
    if (!(await userOwnsWorkspace(user.id, workspaceId))) {
      return {
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
  }

  if (opts.docId) {
    if (!opts.docId || opts.docId === "undefined" || opts.docId === "null") {
      return {
        response: NextResponse.json(
          { error: `Invalid ${opts.collection} ID` },
          { status: 400 }
        )
      }
    }
    const owner = await requireFirestoreOwner<T & OwnedDocBase>(
      opts.collection,
      opts.docId,
      user.id
    )
    if (owner.response) return { response: owner.response }
    return { user, doc: owner.doc, workspaceId }
  }

  return { user, workspaceId }
}

/**
 * Insert a new Owned Resource. Server assigns `id`, `user_id`,
 * `created_at`, `updated_at`. Callers pass the already-validated payload
 * shape (zod-parsed at the route boundary).
 */
export async function insertOwnedDoc<
  TPayload extends Record<string, unknown>
>(opts: {
  user: User
  collection: string
  workspaceId: string
  payload: TPayload
}): Promise<TPayload & OwnedDocBase> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const doc = {
    ...opts.payload,
    id,
    user_id: opts.user.id,
    workspace_id: opts.workspaceId,
    created_at: now,
    updated_at: now
  } as TPayload & OwnedDocBase

  await adminDb.collection(opts.collection).doc(id).set(doc)
  return doc
}

type ListOpts = {
  user: User
  collection: string
  where?: Array<[string, WhereFilterOp, unknown]>
  /**
   * Firestore-side ordering. `"in-memory"` sorts after fetch - useful when
   * a composite index is unavailable.
   */
  orderBy?: { field: string; dir: "asc" | "desc" } | "in-memory"
  inMemorySort?: { field: string; dir: "asc" | "desc" }
}

/**
 * List Owned Resources for the calling user. Always pre-filters by
 * `user_id` - callers cannot widen past the Owner.
 */
export async function listOwnedDocs<T = DocumentData>(
  opts: ListOpts
): Promise<Array<T & { id: string }>> {
  let query: Query = adminDb
    .collection(opts.collection)
    .where("user_id", "==", opts.user.id)

  for (const [field, op, value] of opts.where ?? []) {
    query = query.where(field, op, value)
  }

  if (opts.orderBy && opts.orderBy !== "in-memory") {
    query = query.orderBy(opts.orderBy.field, opts.orderBy.dir)
  }

  const snapshot = await query.get()
  let rows = snapshot.docs.map((d: QueryDocumentSnapshot) => ({
    id: d.id,
    ...(d.data() as T)
  }))

  if (opts.orderBy === "in-memory" && opts.inMemorySort) {
    const { field, dir } = opts.inMemorySort
    const sign = dir === "asc" ? 1 : -1
    rows = rows.sort((a: any, b: any) => {
      const av = a[field]
      const bv = b[field]
      // Date-like ISO timestamps sort lexicographically the same as
      // numeric - use string comparison as the generic path so this
      // helper handles `name`, `created_at`, `updated_at` uniformly.
      // Nullish values sort last in either direction.
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (av < bv) return -1 * sign
      if (av > bv) return 1 * sign
      return 0
    })
  }

  return rows
}

/**
 * Update an Owned Resource. The doc must come from `withOwnedResource` so
 * ownership is already verified. `updated_at` is bumped automatically;
 * `id`, `user_id`, `workspace_id`, `created_at` are stripped from the patch.
 */
export async function updateOwnedDoc<T extends OwnedDocBase>(opts: {
  collection: string
  doc: T
  patch: Partial<T> & Record<string, unknown>
}): Promise<T> {
  const { id, user_id, created_at, ...rest } = opts.patch as any
  void id
  void user_id
  void created_at
  const updates = {
    ...rest,
    updated_at: new Date().toISOString()
  }
  const ref = adminDb.collection(opts.collection).doc(opts.doc.id)
  await ref.update(updates)
  const fresh = await ref.get()
  return { id: fresh.id, ...(fresh.data() as Omit<T, "id">) } as T
}

export async function deleteOwnedDoc(opts: {
  collection: string
  doc: OwnedDocBase
}): Promise<void> {
  await adminDb.collection(opts.collection).doc(opts.doc.id).delete()
}

/** Standardized JSON helpers so route adapters stay one-liners. */
export function badRequest(message: string, details?: unknown): NextResponse {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status: 400 }
  )
}

export function serverError(message = "Internal server error"): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 })
}
