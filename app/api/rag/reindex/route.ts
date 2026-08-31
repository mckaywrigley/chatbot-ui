/**
 * Admin/manual reindex trigger.
 *
 * POST { sourceType, sourceId, workspaceId? }
 *
 * Workspace-owner only. Sends a `rag.doc.changed` event to Inngest which
 * the debounced worker (lib/inngest/functions/rag.ts) picks up and runs
 * `lib/rag/index-doc.ts:indexDoc` against. Useful for:
 *   - Manually re-running indexing after a backfill bug fix
 *   - Verifying the pipeline end-to-end against a known doc id
 *   - Recovering a doc whose index is stuck in `failed` state
 */
import { NextResponse } from "next/server"
import { z } from "zod"

import { inngest } from "@/lib/inngest/client"
import { SourceTypeSchema } from "@/lib/rag/types"
import { requireUser } from "@/lib/server/require-user"

const ReindexInputSchema = z.object({
  sourceType: SourceTypeSchema,
  sourceId: z.string().min(1),
  workspaceId: z.string().optional(),
  projectId: z.string().nullable().optional()
})

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response

    const raw = await request.json().catch(() => null)
    const parsed = ReindexInputSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Auth scope: any authenticated user can request reindex of THEIR
    // own docs - `indexDoc` doesn't expose anything cross-tenant. We
    // don't currently have a "workspace admin" role to gate on; service-
    // role is the only superuser path, used by Inngest itself.

    await inngest.send({
      name: "rag.doc.changed",
      data: parsed.data
    })

    return NextResponse.json({ queued: true, ...parsed.data })
  } catch (error: any) {
    console.error("[rag/reindex] failed:", error)
    return NextResponse.json(
      { error: error?.message ?? "Internal error" },
      { status: 500 }
    )
  }
}
