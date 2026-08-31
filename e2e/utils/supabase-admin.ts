/**
 * Service-role helpers used only by the QA suite.
 *
 * Two jobs: delete the throwaway user the signup test creates (so a nightly
 * run doesn't leave 365 junk accounts a year behind), and stage a small data
 * file for the report test. Both need privileges the QA account itself does
 * not have, hence the service-role key.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { env, canAdminister } from "./env"

let cached: SupabaseClient | null = null

export function admin(): SupabaseClient {
  if (!canAdminister()) {
    throw new Error(
      "[e2e] SUPABASE_SERVICE_ROLE_KEY / supabase URL not set - admin actions unavailable"
    )
  }
  if (!cached) {
    cached = createClient(env.supabaseUrl, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  }
  return cached
}

/**
 * Remove a user created by the signup test, with everything hanging off it.
 *
 * Best-effort by design: a cleanup failure must never fail the run and mask
 * the actual health signal, so it reports rather than throws. Deleting the
 * auth user cascades to profiles/workspaces via their FK ON DELETE CASCADE.
 */
export async function deleteUserByEmail(
  email: string
): Promise<{ deleted: boolean; reason?: string }> {
  if (!canAdminister()) return { deleted: false, reason: "no service-role key" }
  try {
    const db = admin()
    // listUsers is paginated; the throwaway account is always the newest, so
    // page 1 sorted by created_at desc is enough.
    const { data, error } = await db.auth.admin.listUsers({
      page: 1,
      perPage: 200
    })
    if (error) return { deleted: false, reason: error.message }
    const user = data.users.find(
      u => (u.email || "").toLowerCase() === email.toLowerCase()
    )
    if (!user) return { deleted: false, reason: "user not found" }

    const { error: delErr } = await db.auth.admin.deleteUser(user.id)
    if (delErr) return { deleted: false, reason: delErr.message }
    return { deleted: true }
  } catch (e: any) {
    return { deleted: false, reason: e?.message ?? String(e) }
  }
}

/** Delete designs and reports the suite created, identified by name prefix. */
export async function purgeQaArtifacts(prefix: string): Promise<void> {
  // Designs and reports live in Firestore, not Postgres, so they are cleaned
  // up through the app's own API by the specs that create them. This hook
  // exists for the Postgres-side rows (files) the report test stages.
  if (!canAdminister()) return
  try {
    const db = admin()
    await db.from("files").delete().like("name", `${prefix}%`)
  } catch {
    // Best-effort.
  }
}

/** Resolve the QA account's user id, needed for storage paths. */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const db = admin()
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) throw new Error(`listUsers failed: ${error.message}`)
  const user = data.users.find(
    u => (u.email || "").toLowerCase() === email.toLowerCase()
  )
  return user?.id ?? null
}

export interface StagedFile {
  id: string
  name: string
  cleanup: () => Promise<void>
}

/**
 * Put a small CSV where the report generator can find it.
 *
 * Mirrors what db/files.ts does client-side: insert the row, link it to the
 * workspace, upload to `files/{user_id}/{base64(file_id)}`, then write the
 * path back. The report route resolves file text straight from storage when
 * there are no indexed chunks, so the embedding step is not needed here -
 * this test is about whether a report gets WRITTEN, not about RAG.
 */
export async function stageCsvFile(args: {
  userId: string
  workspaceId: string
  name: string
  csv: string
}): Promise<StagedFile> {
  const db = admin()
  const bytes = Buffer.from(args.csv, "utf8")

  const { data: row, error } = await db
    .from("files")
    .insert([
      {
        user_id: args.userId,
        name: args.name,
        description: "Nightly QA data file",
        file_path: "",
        size: bytes.byteLength,
        tokens: 0,
        type: "text/csv",
        sharing: "private"
      } as any
    ])
    .select("*")
    .single()
  if (error || !row) {
    throw new Error(`stageCsvFile insert failed: ${error?.message}`)
  }

  const fileId = (row as any).id as string
  const filePath = `${args.userId}/${Buffer.from(fileId).toString("base64")}`

  const up = await db.storage
    .from("files")
    .upload(filePath, bytes, { contentType: "text/csv", upsert: true })
  if (up.error) {
    await db.from("files").delete().eq("id", fileId)
    throw new Error(`stageCsvFile upload failed: ${up.error.message}`)
  }

  await db.from("files").update({ file_path: filePath }).eq("id", fileId)
  await db
    .from("file_workspaces")
    .insert([
      { user_id: args.userId, file_id: fileId, workspace_id: args.workspaceId } as any
    ])
    .then(
      () => undefined,
      () => undefined // link is convenience only; the report reads by id
    )

  return {
    id: fileId,
    name: args.name,
    cleanup: async () => {
      try {
        await db.storage.from("files").remove([filePath])
        await db.from("files").delete().eq("id", fileId)
      } catch {
        /* best-effort */
      }
    }
  }
}
