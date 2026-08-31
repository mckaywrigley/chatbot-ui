/**
 * Admin backfill trigger.
 *
 * POST { workspaceId } - fires `rag.backfill.workspace` Inngest event
 * which iterates every Owned Resource source type in the locked order
 * (paper_library → data_collections → project_files → designs →
 * reports → chat_messages) and re-indexes each via `indexDoc`.
 *
 * Auth: any authenticated user can trigger backfill of THEIR own
 * workspace. Cross-workspace requests still get RLS-blocked at write
 * time inside the worker.
 */
import { NextResponse } from "next/server"
import { z } from "zod"

import { inngest } from "@/lib/inngest/client"
import { requireUser } from "@/lib/server/require-user"
import { userOwnsWorkspace } from "@/lib/server/require-user"

const BackfillInputSchema = z.object({
  workspaceId: z.string().min(1)
})

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response

    const raw = await request.json().catch(() => null)
    const parsed = BackfillInputSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (!(await userOwnsWorkspace(auth.user.id, parsed.data.workspaceId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await inngest.send({
      name: "rag.backfill.workspace",
      data: { workspaceId: parsed.data.workspaceId }
    })

    return NextResponse.json({
      queued: true,
      workspaceId: parsed.data.workspaceId,
      message:
        "Backfill queued. Worker iterates all source types in batches; check Inngest dashboard or `rag_items` table for progress."
    })
  } catch (error: any) {
    console.error("[rag/backfill] failed:", error)
    return NextResponse.json(
      { error: error?.message ?? "Internal error" },
      { status: 500 }
    )
  }
}
