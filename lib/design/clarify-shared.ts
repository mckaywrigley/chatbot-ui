/**
 * Client-safe pieces of the Refine flow - constants, the checkpoint type, and
 * the pure answer→text flattener. Kept FREE of the Azure/OpenAI SDK so client
 * components (the design page, ClarifyStep) can import them without dragging
 * server-only deps (node:async_hooks) into the browser bundle. The server-only
 * question generator lives in ./clarify.
 */
import type { ClarifyAnswer } from "@/lib/design-agent"

export type ClarifyCheckpoint = "problem" | "hypothesis" | "design"

/**
 * Hard caps. ROUNDS = 1 keeps every checkpoint to a SINGLE page of questions
 * (the user wants "ask the questions on 1 page every time" - no multi-step
 * drill-down), with up to TOTAL questions on that one page.
 */
export const CLARIFY_MAX_ROUNDS = 1
export const CLARIFY_MAX_TOTAL = 8

/**
 * Flatten answered questions into the directive block injected into the
 * literature / hypotheses / design prompts (carried via additionalDetails /
 * designSpec so the existing phases need no change).
 */
export function clarifyAnswersToText(answers: ClarifyAnswer[]): string {
  const lines = answers
    .filter(a => !a.skipped)
    .map(a => {
      const hasSelected = a.selected.length > 0
      const hasOther = !!a.other?.trim()
      let val = ""
      if (hasSelected && hasOther) {
        // Both: make it explicit so the model uses both, not just the chip
        val = `${a.selected.join(", ")} (additional context: ${a.other!.trim()})`
      } else if (hasSelected) {
        val = a.selected.join(", ")
      } else if (hasOther) {
        val = a.other!.trim()
      }
      return val ? `- ${a.prompt}: ${val}` : ""
    })
    .filter(Boolean)
  return lines.join("\n")
}
