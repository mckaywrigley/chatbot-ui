"use client"

/**
 * Full-screen "Refine" step. A sharp-reviewer Q&A shown between Problem →
 * Literature and Hypothesis → Design. MCQ (model-picked options) + always-on
 * free-text "other" + a per-question "Not sure / skip". Adaptive: a second
 * round drills in if the model wants more - capped (CLARIFY_MAX_*). On finish
 * it hands the accumulated answers back; failures fall through (never block).
 */

import { FC, useCallback, useEffect, useState } from "react"
import { IconArrowRight, IconLoader2, IconSparkles } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CLARIFY_MAX_ROUNDS,
  CLARIFY_MAX_TOTAL,
  type ClarifyCheckpoint
} from "@/lib/design/clarify-shared"
import type { ClarifyAnswer, ClarifyQuestion } from "@/lib/design-agent"
import { cn } from "@/lib/utils"

interface ClarifyStepProps {
  designId: string
  checkpoint: ClarifyCheckpoint
  /** The design's short working title, shown so the researcher keeps context
   *  while this step replaces the whole page. */
  designTitle?: string
  onComplete: (answers: ClarifyAnswer[]) => void
  onCancel: () => void
}

export const ClarifyStep: FC<ClarifyStepProps> = ({
  designId,
  checkpoint,
  designTitle,
  onComplete,
  onCancel
}) => {
  const [round, setRound] = useState(1)
  const [questions, setQuestions] = useState<ClarifyQuestion[] | null>(null)
  const [accumulated, setAccumulated] = useState<ClarifyAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Per-question working state for the current round.
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [other, setOther] = useState<Record<string, string>>({})
  const [skipped, setSkipped] = useState<Record<string, boolean>>({})
  // Free-text notes the researcher can add alongside the answers — any extra
  // instruction/context that the questions didn't cover. Folded into the
  // answers as an extra entry so downstream prompts honour it.
  const [notes, setNotes] = useState("")

  // Append the notes (if any) as a synthetic answer the flattener will pick up.
  const withNotes = (answers: ClarifyAnswer[]): ClarifyAnswer[] =>
    notes.trim()
      ? [
          ...answers,
          {
            id: "researcher-notes",
            prompt: "Additional notes / instructions from the researcher",
            selected: [],
            other: notes.trim(),
            skipped: false
          }
        ]
      : answers

  const title =
    checkpoint === "problem"
      ? "Refine - sharpen the literature search"
      : checkpoint === "hypothesis"
        ? "Refine - sharpen the hypotheses"
        : "Refine - make the design specific"
  const subtitle =
    checkpoint === "problem"
      ? "A few questions so I find the right primary research and scope the study to your system."
      : checkpoint === "hypothesis"
        ? "A few questions so the hypotheses build sharply on the papers you selected - mechanism, direction, and what would falsify them."
        : "A few questions so the generated design uses your real parameters, controls, and conditions."

  const fetchRound = useCallback(
    async (roundNo: number, prior: ClarifyAnswer[]) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/design/${designId}/clarify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkpoint,
            round: roundNo,
            priorAnswers: prior
          })
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          // A genuine budget block (402) shouldn't pretend to ask questions -
          // skip straight through. Any other failure (timeout/5xx) surfaces a
          // retry instead of silently dumping the user into literature.
          if (res.status === 402) {
            onComplete(prior)
            return
          }
          setError(
            "I couldn't generate the questions just now. Retry, or skip ahead."
          )
          return
        }
        const qs: ClarifyQuestion[] = Array.isArray(json?.questions)
          ? json.questions
          : []
        if (qs.length === 0) {
          // On a follow-up round an empty set is a real signal: nothing more to
          // ask. On the FIRST round it never is - it means the generator failed
          // or judged the inputs complete, and silently sailing through looked
          // to the researcher like the step had been skipped entirely. Offer a
          // retry instead, and let them skip deliberately if they want to.
          if (roundNo === 1) {
            setError(
              "I couldn't come up with questions for this one. Retry, or skip ahead and I'll design with what you've already given me."
            )
            return
          }
          onComplete(prior)
          return
        }
        setQuestions(qs)
        setSelected({})
        setOther({})
        setSkipped({})
      } catch {
        setError("I couldn't reach the question service. Retry, or skip ahead.")
      } finally {
        setLoading(false)
      }
    },
    [designId, checkpoint, onComplete]
  )

  useEffect(() => {
    void fetchRound(1, [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleOption = (q: ClarifyQuestion, opt: string) => {
    setSkipped(s => ({ ...s, [q.id]: false }))
    setSelected(prev => {
      const cur = prev[q.id] ?? []
      if (q.kind === "single") {
        // Clicking the already-selected option deselects it (#10)
        return { ...prev, [q.id]: cur[0] === opt ? [] : [opt] }
      }
      return {
        ...prev,
        [q.id]: cur.includes(opt) ? cur.filter(o => o !== opt) : [...cur, opt]
      }
    })
  }

  const collectAnswers = (qs: ClarifyQuestion[]): ClarifyAnswer[] =>
    qs.map(q => ({
      id: q.id,
      prompt: q.prompt,
      selected: selected[q.id] ?? [],
      other: (other[q.id] ?? "").trim() || undefined,
      skipped:
        skipped[q.id] ||
        ((selected[q.id]?.length ?? 0) === 0 && !(other[q.id] ?? "").trim())
    }))

  const handleContinue = async () => {
    if (!questions) return
    setSubmitting(true)
    const answersThisRound = collectAnswers(questions)
    const all = [...accumulated, ...answersThisRound]
    setAccumulated(all)

    const nextRound = round + 1
    const canAskMore =
      nextRound <= CLARIFY_MAX_ROUNDS && all.length < CLARIFY_MAX_TOTAL
    if (canAskMore) {
      setRound(nextRound)
      await fetchRound(nextRound, all)
      setSubmitting(false)
      return
    }
    onComplete(withNotes(all))
  }

  const handleSkipAll = () => {
    if (!questions) {
      onComplete(accumulated)
      return
    }
    const skippedAll: ClarifyAnswer[] = questions.map(q => ({
      id: q.id,
      prompt: q.prompt,
      selected: [],
      skipped: true
    }))
    onComplete(withNotes([...accumulated, ...skippedAll]))
  }

  return (
    <div className="bg-ink-50 flex h-full flex-col">
      <div className="border-ink-200 shrink-0 border-b bg-white px-6 py-5">
        <div className="text-teal-journey flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.13em]">
          <IconSparkles size={13} /> Refine
          {designTitle ? (
            <span className="text-ink-400 min-w-0 truncate font-medium normal-case tracking-normal">
              · {designTitle}
            </span>
          ) : null}
        </div>
        <h1 className="text-ink-900 mt-1 text-2xl font-extrabold tracking-tight">
          {title}
        </h1>
        <p className="text-ink-500 mt-1 text-sm">{subtitle}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-[760px]">
          {loading ? (
            <div className="text-ink-400 flex items-center justify-center gap-2 py-20 text-sm">
              <IconLoader2 className="animate-spin" size={18} /> Thinking of the
              right questions…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <p className="text-ink-500 max-w-sm text-sm">{error}</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => void fetchRound(round, accumulated)}
                >
                  Retry
                </Button>
                <Button
                  variant="ghost"
                  className="text-ink-500"
                  onClick={() => onComplete(accumulated)}
                >
                  Skip ahead
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {round > 1 && (
                <div className="text-ink-400 text-xs">
                  A couple of follow-ups based on your answers.
                </div>
              )}
              {(questions ?? []).map((q, i) => (
                <div
                  key={q.id}
                  className="border-ink-200 rounded-2xl border bg-white p-5"
                >
                  <div className="text-ink-900 text-[15px] font-semibold">
                    {i + 1}. {q.prompt}
                  </div>
                  {q.rationale && (
                    <div className="text-ink-400 mt-1 text-xs">
                      {q.rationale}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {q.options.map(opt => {
                      const on = (selected[q.id] ?? []).includes(opt)
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleOption(q, opt)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                            on
                              ? "border-brick bg-brick text-white"
                              : "border-ink-200 text-ink-700 hover:border-ink-300"
                          )}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                  <Input
                    value={other[q.id] ?? ""}
                    onChange={e => {
                      setOther(o => ({ ...o, [q.id]: e.target.value }))
                      if (e.target.value.trim())
                        setSkipped(s => ({ ...s, [q.id]: false }))
                    }}
                    placeholder={
                      q.kind === "multi"
                        ? "Other / add detail…"
                        : "Other (free text)…"
                    }
                    className="mt-3"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSkipped(s => ({ ...s, [q.id]: !s[q.id] }))
                    }
                    className={cn(
                      "mt-2 text-[12px] underline-offset-2 hover:underline",
                      skipped[q.id] ? "text-brick font-medium" : "text-ink-400"
                    )}
                  >
                    {skipped[q.id]
                      ? "Marked: not sure / skip"
                      : "Not sure / skip"}
                  </button>
                </div>
              ))}

              {/* Free-text notes — considered alongside the answers above. */}
              <div className="border-ink-200 rounded-2xl border bg-white p-5">
                <div className="text-ink-900 text-[15px] font-semibold">
                  Anything else? (optional)
                </div>
                <div className="text-ink-400 mt-1 text-xs">
                  Extra context or instructions for the agent — considered
                  together with your answers above.
                </div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. prioritise excipients we already have in-house; keep osmolality isotonic; avoid polysorbates."
                  className="border-ink-200 focus:border-ink-300 mt-3 w-full rounded-lg border p-3 text-[13px] outline-none transition-colors"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-ink-200 shrink-0 border-t bg-white px-6 py-3">
        <div className="mx-auto flex max-w-[760px] items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="text-ink-400 hover:text-ink-700 text-[13px]"
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleSkipAll}
              disabled={loading || submitting}
              className="text-ink-500"
            >
              Skip & continue
            </Button>
            <Button
              onClick={handleContinue}
              disabled={loading || submitting || !questions}
              className="bg-brick hover:bg-brick-hover gap-2"
            >
              {submitting ? (
                <IconLoader2 size={16} className="animate-spin" />
              ) : (
                <IconArrowRight size={16} />
              )}
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
