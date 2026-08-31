/**
 * Thin callables for Inngest workers (`lib/inngest/functions/rag.ts`)
 * and the admin reindex route. Wraps `indexDoc` with batch + sweep
 * helpers used by `rag.backfill.workspace` and `rag.cron.sweep`.
 */
import { adminDb } from "@/lib/firebase/admin"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/types"

import { indexDoc } from "@/lib/rag/index-doc"
import type { SourceType } from "@/lib/rag/types"

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Order matches the locked plan: small + cheap first so Haiku-context
 * costs surface early, big slow ones last.
 */
const BACKFILL_ORDER: SourceType[] = [
  "paper_library",
  "data_collection",
  "project_file",
  "design",
  "report",
  "chat_message"
]

interface BackfillProgress {
  sourceType: SourceType
  sourceId: string
  ok: boolean
  error?: string
}

/**
 * Yield (sourceType, sourceId, workspace_id, project_id?) for every doc in
 * a workspace, in BACKFILL_ORDER. Runs Firestore queries per source type.
 */
export async function* iterateWorkspaceSources(workspaceId: string) {
  // Firestore-resident
  for (const collection of [
    "paper_library",
    "data_collections",
    "designs",
    "reports"
  ] as const) {
    const sourceType: SourceType = (
      {
        paper_library: "paper_library",
        data_collections: "data_collection",
        designs: "design",
        reports: "report"
      } as const
    )[collection]
    const snap = await adminDb
      .collection(collection)
      .where("workspace_id", "==", workspaceId)
      .get()
    for (const doc of snap.docs) {
      yield {
        sourceType,
        sourceId: doc.id,
        workspaceId,
        projectId: ((doc.data() as any)?.project_id as string) ?? null
      }
    }
  }

  // Postgres-resident: project_files. Cast: `project_files` table exists
  // in the live DB (created by an earlier migration not present in this
  // repo's snapshot of generated Database types). Safe at runtime.
  const supabase = getSupabaseAdmin()
  const { data: pf, error: pfErr } = await (supabase
    .from("project_files" as any)
    .select("id, project_id")
    .eq("workspace_id", workspaceId) as any)
  if (pfErr) throw pfErr
  for (const f of (pf ?? []) as Array<{ id: string; project_id: string }>) {
    yield {
      sourceType: "project_file" as SourceType,
      sourceId: f.id,
      workspaceId,
      projectId: f.project_id
    }
  }

  // Postgres-resident: chat messages
  const { data: chats, error: chatsErr } = await supabase
    .from("chats")
    .select("id, project_id")
    .eq("workspace_id", workspaceId)
  if (chatsErr) throw chatsErr
  for (const chat of chats ?? []) {
    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select("id")
      .eq("chat_id", chat.id)
    if (msgErr) throw msgErr
    for (const m of msgs ?? []) {
      yield {
        sourceType: "chat_message" as SourceType,
        sourceId: m.id,
        workspaceId,
        projectId: chat.project_id ?? null
      }
    }
  }
}

/**
 * Backfill one workspace. Caller should run from an Inngest worker so
 * concurrency is throttled at the queue level.
 *
 * NOTE: file_items → rag_items migration is NOT done here - that's a
 * one-shot SQL backfill in PR-5 (preserves existing OpenAI embeddings).
 */
export async function backfillWorkspace(
  workspaceId: string,
  opts: { onProgress?: (p: BackfillProgress) => void } = {}
): Promise<{ total: number; failed: number }> {
  let total = 0
  let failed = 0
  for await (const item of iterateWorkspaceSources(workspaceId)) {
    total++
    try {
      await indexDoc({
        sourceType: item.sourceType,
        sourceId: item.sourceId
      })
      opts.onProgress?.({ ...item, ok: true })
    } catch (err: any) {
      failed++
      opts.onProgress?.({
        ...item,
        ok: false,
        error: String(err?.message ?? err)
      })
    }
  }
  return { total, failed }
}

/**
 * Find docs whose source updated_at moved past last_indexed_at (or that
 * never indexed) and refire `rag.doc.changed`. Caller is the hourly cron
 * Inngest function.
 *
 * Returns the list of refire intents - the caller is responsible for
 * sending them to Inngest (we don't import the inngest client here to
 * keep this module dependency-free for testing).
 */
export interface StaleDocRef {
  sourceType: SourceType
  sourceId: string
  workspaceId: string
  projectId: string | null
}

export async function findStaleDocs(): Promise<StaleDocRef[]> {
  const stale: StaleDocRef[] = []

  for (const collection of [
    "paper_library",
    "data_collections",
    "designs",
    "reports"
  ] as const) {
    const sourceType: SourceType = (
      {
        paper_library: "paper_library",
        data_collections: "data_collection",
        designs: "design",
        reports: "report"
      } as const
    )[collection]
    const snap = await adminDb.collection(collection).get()
    for (const doc of snap.docs) {
      const data = doc.data() as any
      const lastIndexed = data?.last_indexed_at
      const updated = data?.updated_at
      if (!data?.workspace_id) continue
      if (!lastIndexed || (updated && updated > lastIndexed)) {
        stale.push({
          sourceType,
          sourceId: doc.id,
          workspaceId: data.workspace_id,
          projectId: data.project_id ?? null
        })
      }
    }
  }

  // NOTE: `file` / `project_file` sources are intentionally NOT swept here.
  // They can only be (re)indexed inline via /api/retrieval/process, which holds
  // the extracted text - indexDoc() throws for them on the rag.doc.changed path.
  // Emitting changed-events for stale files just produced unservable events that
  // failed + retried forever ("indexDoc(file) requires a precomputed
  // ExtractorResult"). A stale/failed file is re-indexed on its next upload/
  // re-process; auto-retrying that here would need a re-extract step we don't
  // have. (ragDocChanged also skips these defensively.)

  return stale
}
