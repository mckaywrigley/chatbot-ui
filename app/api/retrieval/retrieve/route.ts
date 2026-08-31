/**
 * Unified RAG retrieve endpoint.
 *
 * Replaces the legacy file-only retrieve. The chat handler now passes
 * scope information (workspace_id + scope + scope_id) and the endpoint
 * delegates to `lib/rag/retrieve` which:
 *   - hits `match_rag_items` (dense + BM25 hybrid)
 *   - RRF-fuses, applies recency boost + chat-content multiplier
 *   - returns RagItem[] with denormalized citation metadata
 *
 * Back-compat: callers may still pass `fileIds` to restrict retrieval
 * to a set of attached files (preserves the chat-attached-files UX).
 */
import { NextResponse } from "next/server"
import { z } from "zod"

import { retrieve } from "@/lib/rag/retrieve"
import { requireUser } from "@/lib/server/require-user"

const RetrieveBodySchema = z.object({
  userInput: z.string().min(1),
  workspaceId: z.string().min(1).nullable().optional(),
  scope: z.enum(["project", "design", "report"]).nullable().optional(),
  scopeId: z.string().nullable().optional(),
  sourceCount: z.number().int().positive().max(50).optional(),
  fileIds: z.array(z.string()).optional()
})

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response

    const raw = await request.json().catch(() => null)
    const parsed = RetrieveBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { userInput, workspaceId, scope, scopeId, sourceCount, fileIds } =
      parsed.data

    // workspaceId is required for any scope-driven query. The legacy
    // fileIds-only path can run without one (the RPC just filters by
    // source_id) but RLS demands the row's user_id matches caller - and
    // the new retrieve module uses the service-role client. We require a
    // workspaceId to keep tenancy explicit.
    if (!workspaceId) {
      return NextResponse.json(
        { message: "workspaceId is required" },
        { status: 400 }
      )
    }

    const results = await retrieve({
      query: userInput,
      workspaceId,
      scope: scope ?? null,
      scopeId: scopeId ?? null,
      sourceCount,
      fileIds
    })

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error("[retrieve] Error:", error)
    // Surface the underlying message + Postgres/PostgREST hint when
    // present so the browser console shows actionable diagnostics
    // instead of opaque 500s. PostgREST errors carry `code`, `details`,
    // `hint`; pgvector dimension mismatches show up as plain SQL errors.
    return NextResponse.json(
      {
        message: error?.message ?? "Unexpected error",
        detail: error?.details ?? error?.hint ?? error?.code ?? String(error)
      },
      { status: error?.status ?? 500 }
    )
  }
}
