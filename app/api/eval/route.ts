import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

import { requireUser } from "@/lib/server/require-user"
import {
  EVAL_FEEDBACK_MAX,
  EVAL_LABEL_MAX,
  EVAL_MAX_CANDIDATES,
  type EvalCandidate,
  type EvalDecisionInput
} from "@/lib/eval/types"

/**
 * Append one human decision to the eval log.
 *
 * Service-role insert behind an authenticated session: the user_id comes from
 * the session, never from the body, so a row can never be attributed to
 * someone else. The client has no INSERT policy at all.
 *
 * Always returns 2xx. This endpoint exists to OBSERVE the product, and a
 * telemetry endpoint that can fail its caller is a liability. The client
 * ignores the response, so a bad row is dropped quietly and logged
 * server-side rather than surfaced to a researcher mid-experiment.
 */

const SURFACES = new Set([
  "literature",
  "hypotheses",
  "hypothesis_own",
  "clarify",
  "design_section",
  "design_patch",
  "design_regenerate",
  "simulation_changes",
  "assumptions",
  "report_section",
  "report_chart",
  "rating"
])

const DECISIONS = new Set([
  "selected",
  "rejected",
  "approved_as_is",
  "approved_with_edits",
  "regenerated",
  "skipped",
  "rated"
])

const str = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null

/**
 * Trim the offered set to what is worth keeping: identity, position, score and
 * a SHORT label. Full bodies are deliberately not stored - the point is which
 * option won at which rank, and a decision row must never become a second copy
 * of the researcher's document.
 */
function sanitizeCandidates(raw: unknown): EvalCandidate[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  return raw.slice(0, EVAL_MAX_CANDIDATES).map((c: any) => {
    const id = str(c?.id, 128)
    const label = str(c?.label, EVAL_LABEL_MAX)
    const rank = num(c?.rank)
    const score = num(c?.score)
    return {
      ...(id ? { id } : {}),
      ...(label ? { label } : {}),
      ...(rank !== null ? { rank } : {}),
      ...(score !== null ? { score } : {}),
      chosen: !!c?.chosen
    }
  })
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response

    const body = (await request
      .json()
      .catch(() => null)) as EvalDecisionInput | null
    if (!body || !SURFACES.has(body.surface) || !DECISIONS.has(body.decision)) {
      return NextResponse.json({ ok: false, reason: "invalid" })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      console.warn("[eval] service role not configured - decision dropped")
      return NextResponse.json({ ok: false, reason: "unconfigured" })
    }

    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const rating = num(body.rating)
    const ratio = num(body.editedRatio)

    const { error } = await db.from("eval_decisions").insert([
      {
        user_id: auth.user.id,
        workspace_id: str(body.workspaceId, 64),
        surface: body.surface,
        decision: body.decision,
        subject_type:
          body.subjectType === "design" || body.subjectType === "report"
            ? body.subjectType
            : null,
        subject_id: str(body.subjectId, 128),
        item_key: str(body.itemKey, 256),
        offered_count: num(body.offeredCount),
        chosen_count: num(body.chosenCount),
        candidates: sanitizeCandidates(body.candidates),
        edited_ratio: ratio === null ? null : Math.min(1, Math.max(0, ratio)),
        rating:
          rating === null ? null : Math.min(5, Math.max(1, Math.round(rating))),
        feedback_text: str(body.feedbackText, EVAL_FEEDBACK_MAX),
        meta: body.meta && typeof body.meta === "object" ? body.meta : {}
      } as any
    ])

    if (error) {
      console.warn("[eval] insert failed:", error.message)
      return NextResponse.json({ ok: false, reason: "insert_failed" })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.warn("[eval] unexpected:", e?.message ?? e)
    return NextResponse.json({ ok: false, reason: "error" })
  }
}
