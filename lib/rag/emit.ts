/**
 * Fire-and-forget helper for `rag.doc.changed` events.
 *
 * Used by every Owned-Resource PATCH/POST handler so a single helper
 * isolates all the call sites from the Inngest client + provides
 * uniform "log on failure but never block the user response" behavior.
 *
 * Returns immediately; no await needed at call sites. The Inngest
 * dispatch happens via fire-and-forget Promise - if dispatch fails the
 * cron sweep (rag.cron.sweep) will catch the doc next time around.
 */
import { inngest } from "@/lib/inngest/client"
import type { SourceType } from "@/lib/rag/types"

export interface EmitDocChanged {
  sourceType: SourceType
  sourceId: string
  workspaceId?: string | null
  projectId?: string | null
}

export function emitRagDocChanged(payload: EmitDocChanged): void {
  // Skip when caller can't tell us which workspace this lives in - the
  // worker can still run via the cron-sweep fallback.
  if (!payload?.sourceType || !payload?.sourceId) return

  // Wrap the entire dispatch - including the synchronous portion of
  // `inngest.send()` - so a missing INNGEST_EVENT_KEY or a transport
  // glitch can never bubble out and crash the calling user-facing
  // handler. Cron-sweep is the ultimate fallback.
  try {
    void inngest
      .send({
        name: "rag.doc.changed",
        data: {
          sourceType: payload.sourceType,
          sourceId: payload.sourceId,
          workspaceId: payload.workspaceId ?? undefined,
          projectId: payload.projectId ?? null
        }
      })
      .catch(err => {
        console.warn(
          `[rag/emit] rag.doc.changed for ${payload.sourceType}:${payload.sourceId} failed async (non-fatal):`,
          err
        )
      })
  } catch (err) {
    console.warn(
      `[rag/emit] rag.doc.changed for ${payload.sourceType}:${payload.sourceId} failed sync (non-fatal):`,
      err
    )
  }
}
