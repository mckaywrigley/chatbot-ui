/**
 * @jest-environment node
 *
 * Pure flattening of Refine answers → the directive text injected into the
 * literature / design prompts. (Question generation hits Azure and is covered
 * out of band.)
 */
import { clarifyAnswersToText } from "@/lib/design/clarify"
import type { ClarifyAnswer } from "@/lib/design-agent"

const a = (over: Partial<ClarifyAnswer>): ClarifyAnswer => ({
  id: "q",
  prompt: "P",
  selected: [],
  ...over
})

describe("clarifyAnswersToText", () => {
  it("joins selected options + free-text other per answered question", () => {
    const out = clarifyAnswersToText([
      a({ prompt: "Working concentration?", selected: ["1–10 mM"] }),
      a({
        prompt: "Controls?",
        selected: ["Vehicle", "Untreated"],
        other: "plus a heat-stressed arm"
      })
    ])
    // When a question has BOTH picked options and free text, the two are
    // labelled rather than run together with a dash: downstream prompts were
    // reading "Vehicle, Untreated - plus a heat-stressed arm" as one value and
    // honouring only the chips.
    expect(out).toBe(
      "- Working concentration?: 1–10 mM\n" +
        "- Controls?: Vehicle, Untreated (additional context: plus a heat-stressed arm)"
    )
  })

  it("drops skipped questions entirely", () => {
    const out = clarifyAnswersToText([
      a({ prompt: "Temp?", skipped: true, selected: ["40°C"] }),
      a({ prompt: "pH?", selected: ["6.0"] })
    ])
    expect(out).toBe("- pH?: 6.0")
  })

  it("drops answered-but-empty questions", () => {
    expect(clarifyAnswersToText([a({ prompt: "X", selected: [] })])).toBe("")
  })

  it("is empty for no answers", () => {
    expect(clarifyAnswersToText([])).toBe("")
  })
})
