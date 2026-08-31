/**
 * @jest-environment node
 *
 * The design chat applies AI-proposed edits via a `<design-patch>`. The apply
 * step must locate the section + the find-text. Exact match works with gpt-5.x,
 * but a single stray space used to turn a valid edit into a hard failure - these
 * guard the tolerant fallbacks (and that exact behaviour still works).
 */
import { applyDesignPatch, applyFindReplace } from "@/lib/design/apply-patch"

const design: any = {
  id: "d1",
  hypothesisId: "h1",
  title: "Screen",
  saved: true,
  sections: [
    {
      heading: "Materials & Setup",
      body: "Prepare 20 mM L-histidine, pH 6.0."
    },
    { heading: "Statistical Analysis", body: "Two-way ANOVA across pH." }
  ]
}

describe("applyFindReplace", () => {
  it("exact match", () => {
    expect(applyFindReplace("Prepare 20 mM buffer", "20 mM", "25 mM")).toBe(
      "Prepare 25 mM buffer"
    )
  })
  it("whitespace-tolerant fallback (re-wrapped quote)", () => {
    // model quoted with collapsed/extra whitespace vs the body's newlines
    const body = "Step 1.\nWeigh   0.776 g   histidine\nbase."
    const out = applyFindReplace(
      body,
      "Weigh 0.776 g histidine base.",
      "Weigh 0.871 g arginine base."
    )
    expect(out).toBe("Step 1.\nWeigh 0.871 g arginine base.")
  })
  it("returns null when genuinely absent", () => {
    expect(applyFindReplace("abc", "xyz", "q")).toBeNull()
  })
  it("does not treat $ in replace as a regex backref", () => {
    expect(applyFindReplace("cost is X", "X", "$5 (USD)")).toBe(
      "cost is $5 (USD)"
    )
  })
})

describe("applyDesignPatch", () => {
  it("applies an exact find/replace and returns new designs", () => {
    const res = applyDesignPatch([design], "d1", {
      sectionHeading: "Materials & Setup",
      find: "20 mM L-histidine",
      replace: "25 mM L-histidine"
    })
    expect(res.error).toBeUndefined()
    expect(res.designs?.[0].sections[0].body).toContain("25 mM L-histidine")
    // original is not mutated
    expect(design.sections[0].body).toContain("20 mM L-histidine")
  })

  it("matches the heading tolerantly (trim / case)", () => {
    const res = applyDesignPatch([design], "d1", {
      sectionHeading: "  materials & setup ",
      newBody: "New materials."
    })
    expect(res.error).toBeUndefined()
    expect(res.designs?.[0].sections[0].body).toBe("New materials.")
  })

  it("errors clearly on an unknown heading", () => {
    const res = applyDesignPatch([design], "d1", {
      sectionHeading: "Nonexistent",
      newBody: "x"
    })
    expect(res.designs).toBeUndefined()
    expect(res.error).toMatch(/No section called/)
  })

  it("errors when the find-text can't be located at all", () => {
    const res = applyDesignPatch([design], "d1", {
      sectionHeading: "Materials & Setup",
      find: "phosphate buffer that isn't here",
      replace: "x"
    })
    expect(res.error).toMatch(/Couldn't locate/)
  })

  it("targets the active design by id when designIndex is absent", () => {
    const d2 = {
      ...design,
      id: "d2",
      sections: [{ heading: "X", body: "old" }]
    }
    const res = applyDesignPatch([design, d2], "d2", {
      sectionHeading: "X",
      newBody: "new"
    })
    expect(res.designs?.[1].sections[0].body).toBe("new")
    expect(res.designs?.[0]).toBe(design) // untouched
  })
})
