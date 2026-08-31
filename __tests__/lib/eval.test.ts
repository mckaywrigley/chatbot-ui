/**
 * @jest-environment node
 *
 * The only piece of the eval log with real logic. Everything else is a fetch
 * and an INSERT; this decides what "approved with edits" actually means, so a
 * wrong ratio would quietly corrupt the one continuous quality signal we get
 * for free.
 */
import { editedRatio } from "@/lib/eval/types"

describe("editedRatio", () => {
  test("accepted verbatim scores 0", () => {
    expect(editedRatio("Weigh 0.776 g histidine", "Weigh 0.776 g histidine")).toBe(0)
  })

  test("a replaced section scores 1", () => {
    expect(editedRatio("aaaa", "bbbbbbbb")).toBe(1)
  })

  test("changing one number is a small fraction, not a rewrite", () => {
    // The distinction the whole metric exists for: fixing a value must not
    // look like discarding the section.
    const before = "Incubate at 25 C for 30 minutes, then read absorbance."
    const after = "Incubate at 37 C for 30 minutes, then read absorbance."
    const r = editedRatio(before, after)
    expect(r).toBeGreaterThan(0)
    expect(r).toBeLessThan(0.1)
  })

  test("appending a sentence is scored on what changed, not the whole length", () => {
    const before = "Run the assay in triplicate."
    const after = "Run the assay in triplicate. Include a vehicle control."
    const r = editedRatio(before, after)
    expect(r).toBeGreaterThan(0)
    expect(r).toBeLessThan(0.6)
  })

  test("is bounded to 0..1 and handles empty input", () => {
    expect(editedRatio("", "")).toBe(0)
    expect(editedRatio("", "anything")).toBe(1)
    expect(editedRatio("anything", "")).toBe(1)
    for (const [a, b] of [
      ["abc", "abcdef"],
      ["abcdef", "abc"],
      ["x".repeat(500), "y".repeat(10)]
    ]) {
      const r = editedRatio(a, b)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(1)
    }
  })
})
