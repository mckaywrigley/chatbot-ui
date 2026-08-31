/**
 * Inngest workers for the unified RAG corpus.
 *
 *   rag.doc.changed       - debounced 60s per (sourceType, sourceId).
 *                           Re-indexes the affected doc.
 *   rag.cron.sweep        - hourly. Finds docs whose source updated_at
 *                           moved past last_indexed_at and refires
 *                           rag.doc.changed.
 *   rag.backfill.workspace - one-shot per workspace. Iterates every
 *                           source type in the locked order.
 *
 * Event payload typing kept loose - Inngest doesn't propagate types
 * automatically and we want one less hand-written `events` type to
 * maintain.
 */
import { inngest } from "@/lib/inngest/client"
import { indexDoc } from "@/lib/rag/index-doc"
import { backfillWorkspace, findStaleDocs } from "@/lib/rag/server"
import type { SourceType } from "@/lib/rag/types"

interface DocChangedPayload {
  sourceType: SourceType
  sourceId: string
  workspaceId?: string
  projectId?: string | null
}

export const ragDocChanged = inngest.createFunction(
  {
    id: "rag-doc-changed",
    name: "RAG: index changed doc",
    retries: 3,
    // Coalesce bursts: if the same doc is saved repeatedly, only the
    // last event in a 60s window actually fires the worker. Saves Haiku
    // + embedding cost on rapid edits.
    debounce: {
      key: "event.data.sourceType + ':' + event.data.sourceId",
      period: "60s"
    }
  },
  { event: "rag.doc.changed" },
  async ({ event, step }) => {
    const data = event.data as DocChangedPayload
    if (!data?.sourceType || !data?.sourceId) {
      throw new Error(
        `[rag.doc.changed] missing sourceType or sourceId in event data`
      )
    }

    // `file` / `project_file` sources can only be indexed INLINE - their binary
    // text is extracted in /api/retrieval/process and handed to indexDoc as a
    // precomputed ExtractorResult. indexDoc() throws for them on this path
    // ("requires a precomputed ExtractorResult"), so a changed-event for a file
    // is unservable. Skip it cleanly instead of throwing + retrying 3× (this was
    // spamming prod with thousands of indexDoc(file) errors via the hourly sweep
    // + the admin reindex route).
    if (data.sourceType === "file" || data.sourceType === "project_file") {
      return {
        skipped: true,
        reason: "inline-indexed source type (not servable via rag.doc.changed)",
        sourceType: data.sourceType,
        sourceId: data.sourceId
      }
    }

    const result = await step.run("index-doc", async () => {
      return indexDoc({
        sourceType: data.sourceType,
        sourceId: data.sourceId
      })
    })

    return result
  }
)

export const ragCronSweep = inngest.createFunction(
  {
    id: "rag-cron-sweep",
    name: "RAG: hourly stale-doc sweep",
    retries: 1
  },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const stale = await step.run("find-stale", async () => findStaleDocs())

    if (stale.length === 0) return { refired: 0 }

    // Refire individually so each one inherits the per-doc debounce.
    await step.run("refire", async () => {
      await Promise.all(
        stale.map(s =>
          inngest.send({
            name: "rag.doc.changed",
            data: {
              sourceType: s.sourceType,
              sourceId: s.sourceId,
              workspaceId: s.workspaceId,
              projectId: s.projectId
            }
          })
        )
      )
    })

    return { refired: stale.length }
  }
)

interface BackfillPayload {
  workspaceId: string
}

export const ragBackfillWorkspace = inngest.createFunction(
  {
    id: "rag-backfill-workspace",
    name: "RAG: workspace backfill",
    retries: 1,
    // Cap concurrency so a multi-workspace backfill doesn't saturate
    // the Anthropic + Azure quota.
    concurrency: { limit: 4 }
  },
  { event: "rag.backfill.workspace" },
  async ({ event, step }) => {
    const data = event.data as BackfillPayload
    if (!data?.workspaceId) {
      throw new Error("[rag.backfill.workspace] missing workspaceId")
    }

    const summary = await step.run("backfill", async () =>
      backfillWorkspace(data.workspaceId)
    )
    return summary
  }
)
