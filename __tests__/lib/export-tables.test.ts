/**
 * @jest-environment node
 *
 * Guards the markdown-table parser behind the design PDF export. The model
 * emits conditions/materials tables that are often slightly malformed (cells
 * with embedded newlines, ragged column counts). The PDF used to dump raw `|`
 * pipes as text, which jsPDF then mangled. parseMarkdownBlocks must turn these
 * into clean {head, rows} so jspdf-autotable can render a real grid.
 */
import { parseMarkdownBlocks } from "@/lib/design/export"

describe("parseMarkdownBlocks", () => {
  it("parses a clean table into head + rows, keeping prose around it as text", () => {
    const body = [
      "Intro sentence before the table.",
      "",
      "| Group | Condition | n |",
      "| --- | --- | --- |",
      "| Control | untreated | 1 |",
      "| pH 6.0 | histidine pH 6.0 | 1 |",
      "",
      "Closing note after the table."
    ].join("\n")

    const blocks = parseMarkdownBlocks(body)
    const tables = blocks.filter(b => b.type === "table")
    const texts = blocks.filter(b => b.type === "text")
    expect(tables).toHaveLength(1)
    expect(texts).toHaveLength(2) // before + after prose preserved
    const t = tables[0] as Extract<(typeof tables)[number], { type: "table" }>
    expect(t.head).toEqual(["Group", "Condition", "n"])
    expect(t.rows).toEqual([
      ["Control", "untreated", "1"],
      ["pH 6.0", "histidine pH 6.0", "1"]
    ])
  })

  it("folds a newline-wrapped cell back into the previous row's last cell", () => {
    // The model wrapped a long cell onto a second physical line (no pipes) -
    // this is the exact shape that produced the mangled PDF output.
    const body = [
      "| Arm | Composition | Readout |",
      "| --- | --- | --- |",
      "| pH 6.0 arm | 20 mM histidine, pH 6.0 | viscosity, SEC,",
      "DLS where volume permits |"
    ].join("\n")

    const blocks = parseMarkdownBlocks(body)
    const t = blocks.find(b => b.type === "table") as Extract<
      ReturnType<typeof parseMarkdownBlocks>[number],
      { type: "table" }
    >
    expect(t).toBeTruthy()
    expect(t.rows).toHaveLength(1)
    expect(t.rows[0][0]).toBe("pH 6.0 arm")
    // the orphan continuation line is merged into the last cell, not dropped
    expect(t.rows[0][2]).toBe("viscosity, SEC, DLS where volume permits")
  })

  it("normalizes ragged rows to the header column count", () => {
    const body = [
      "| A | B | C |",
      "| --- | --- | --- |",
      "| 1 | 2 |", // short row → padded
      "| x | y | z | extra |" // long row → tail merged into last col
    ].join("\n")

    const t = parseMarkdownBlocks(body).find(
      b => b.type === "table"
    ) as Extract<
      ReturnType<typeof parseMarkdownBlocks>[number],
      { type: "table" }
    >
    expect(t.rows[0]).toEqual(["1", "2", ""])
    expect(t.rows[1]).toEqual(["x", "y", "z extra"])
  })

  it("treats a body with no table as a single text block", () => {
    const blocks = parseMarkdownBlocks(
      "Just a **paragraph** of prose.\nSecond line."
    )
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe("text")
  })
})
