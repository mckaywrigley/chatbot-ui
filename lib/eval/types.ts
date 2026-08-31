/**
 * Shared shapes for the human-decision log.
 *
 * Kept free of server imports so the client helper and the API route agree on
 * one contract without dragging Supabase into the browser bundle.
 */

export type EvalSurface =
  | "literature"
  | "hypotheses"
  | "hypothesis_own"
  | "clarify"
  | "design_section"
  | "design_patch"
  | "design_regenerate"
  | "simulation_changes"
  | "assumptions"
  | "report_section"
  | "report_chart"
  | "rating"

export type EvalDecision =
  | "selected"
  | "rejected"
  | "approved_as_is"
  | "approved_with_edits"
  | "regenerated"
  | "skipped"
  | "rated"

/**
 * One offered option. `chosen` is what turns a log line into an eval datum:
 * without the refused alternatives you can never tell whether the ranker put
 * the right thing first.
 */
export interface EvalCandidate {
  id?: string
  /** Human-readable, truncated server-side - never a whole section body. */
  label?: string
  /** 1-based position as SHOWN to the user. */
  rank?: number
  /** Model's own score, when it had one. */
  score?: number
  chosen?: boolean
}

export interface EvalDecisionInput {
  surface: EvalSurface
  decision: EvalDecision
  subjectType?: "design" | "report"
  subjectId?: string
  itemKey?: string
  workspaceId?: string
  candidates?: EvalCandidate[]
  offeredCount?: number
  chosenCount?: number
  /** 0 = accepted verbatim, 1 = replaced wholesale. */
  editedRatio?: number
  rating?: number
  feedbackText?: string
  meta?: Record<string, unknown>
}

/** Labels are capped so a decision row can never carry a whole document. */
export const EVAL_LABEL_MAX = 300
export const EVAL_FEEDBACK_MAX = 2000
export const EVAL_MAX_CANDIDATES = 50

/**
 * Fraction of `before` that had to change to become `after`, 0..1.
 *
 * A character-level ratio using the common prefix and suffix rather than a
 * true edit distance: Levenshtein on two multi-kilobyte sections is O(n*m) and
 * would run on the UI thread for no extra insight. This distinguishes "fixed a
 * number" from "rewrote it", which is the distinction we actually want.
 */
export function editedRatio(before: string, after: string): number {
  const a = before ?? ""
  const b = after ?? ""
  if (a === b) return 0
  if (!a.length) return 1

  let start = 0
  const max = Math.min(a.length, b.length)
  while (start < max && a[start] === b[start]) start++

  let end = 0
  while (end < max - start && a[a.length - 1 - end] === b[b.length - 1 - end]) {
    end++
  }

  const changed = Math.max(a.length, b.length) - start - end
  return Math.min(1, Math.max(0, changed / Math.max(a.length, b.length)))
}
