"use client"

/**
 * Compact "how good was this?" strip for a generated output.
 *
 * Design constraints, in order of importance:
 *
 *  - It must not nag. A rating prompt that reappears after it has been
 *    answered gets dismissed reflexively, and reflexive answers are worse than
 *    no answers. Once given, it collapses to a thank-you and stays collapsed
 *    for that subject (remembered per browser).
 *  - The free-text box appears only AFTER a score, and only for low scores.
 *    Asking everyone for prose gets prose from nobody; asking the people who
 *    just said "this was poor" gets the reason, which is the part worth having.
 *  - It never blocks. The rating is fire-and-forget like every other decision.
 */
import { FC, useEffect, useState } from "react"
import { IconCheck } from "@tabler/icons-react"

import { trackDecision } from "@/lib/eval/track"
import { cn } from "@/lib/utils"

interface OutputRatingProps {
  subjectType: "design" | "report"
  subjectId: string
  workspaceId?: string
  /** Distinguishes what is being rated when one subject has several outputs. */
  itemKey?: string
  label?: string
  /** Provenance recorded alongside the score. */
  meta?: Record<string, unknown>
}

const STORAGE_PREFIX = "shadowai:rated:"

export const OutputRating: FC<OutputRatingProps> = ({
  subjectType,
  subjectId,
  workspaceId,
  itemKey,
  label = "How usable is this?",
  meta
}) => {
  const storageKey = `${STORAGE_PREFIX}${subjectType}:${subjectId}:${itemKey ?? "main"}`
  const [score, setScore] = useState<number | null>(null)
  const [note, setNote] = useState("")
  const [done, setDone] = useState(false)
  const [alreadyRated, setAlreadyRated] = useState(false)

  // localStorage can throw (private mode, blocked site data), and a telemetry
  // widget must never take the page down with it.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey)) setAlreadyRated(true)
    } catch {
      /* treat as un-rated */
    }
  }, [storageKey])

  const remember = () => {
    try {
      window.localStorage.setItem(storageKey, "1")
    } catch {
      /* the rating is already sent; remembering is a nicety */
    }
  }

  const send = (value: number, feedback?: string) => {
    trackDecision({
      surface: "rating",
      decision: "rated",
      subjectType,
      subjectId,
      itemKey,
      workspaceId,
      rating: value,
      feedbackText: feedback,
      meta
    })
  }

  if (alreadyRated) return null

  if (done) {
    return (
      <div className="text-ink-3 flex items-center gap-1.5 text-[12px]">
        <IconCheck size={13} className="text-sage-brand" />
        Thanks — that helps us improve what gets generated.
      </div>
    )
  }

  return (
    <div className="border-line bg-paper-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2">
      <span className="text-ink-2 text-[12.5px] font-medium">{label}</span>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            aria-label={`${n} out of 5`}
            onClick={() => {
              setScore(n)
              // Send immediately. If they then add a note it goes as its own
              // row - better than holding the score hostage to a comment they
              // may never write.
              send(n)
              if (n >= 4) {
                remember()
                setDone(true)
              }
            }}
            className={cn(
              "size-7 rounded-md border text-[12px] font-semibold transition-colors",
              score !== null && n <= score
                ? "border-teal-journey bg-teal-journey text-white"
                : "border-line text-ink-3 hover:border-line-strong hover:text-ink"
            )}
          >
            {n}
          </button>
        ))}
      </div>

      {score !== null && score < 4 && (
        <div className="flex min-w-[220px] flex-1 items-center gap-2">
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="What was wrong with it?"
            className="border-line focus:border-ink-300 min-w-0 flex-1 rounded-md border bg-white px-2 py-1 text-[12.5px] outline-none"
            onKeyDown={e => {
              if (e.key === "Enter" && note.trim()) {
                send(score, note.trim())
                remember()
                setDone(true)
              }
            }}
          />
          <button
            type="button"
            disabled={!note.trim()}
            onClick={() => {
              send(score, note.trim())
              remember()
              setDone(true)
            }}
            className="bg-ink text-paper rounded-md px-2.5 py-1 text-[12px] font-semibold disabled:opacity-40"
          >
            Send
          </button>
          <button
            type="button"
            onClick={() => {
              remember()
              setDone(true)
            }}
            className="text-ink-3 hover:text-ink text-[12px]"
          >
            Skip
          </button>
        </div>
      )}
    </div>
  )
}
