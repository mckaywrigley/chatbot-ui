/**
 * @jest-environment node
 *
 * Verifies extractors produce expected chunk counts + section titles +
 * denormalized metadata for each source type.
 */
import {
  extractChatMessage,
  extractDataCollection,
  extractDesign,
  extractPaperLibrary,
  extractReport
} from "@/lib/rag/chunking"

const ws = "ws-1"
const uid = "u-1"

describe("extractDesign", () => {
  test("flattens problem + sections + hypotheses + papers", async () => {
    const result = await extractDesign({
      id: "d1",
      user_id: uid,
      workspace_id: ws,
      project_id: null,
      name: "Test design",
      content: {
        problem: {
          title: "Test design",
          problemStatement: "Why does X happen at high pH?",
          objective: "Determine root cause"
        },
        hypotheses: [
          { id: "h1", text: "Aggregation increases above pH 7." }
        ],
        papers: [
          {
            id: "p1",
            title: "mAb stability",
            summary: "Aggregation observed at high pH in 3 mAbs."
          }
        ],
        designs: [
          {
            id: "g1",
            title: "Plate experiment",
            sections: [
              {
                heading: "Materials",
                body: "200 µL pipette, 10 wells per condition"
              },
              { heading: "Statistical Analysis", body: "Two-way ANOVA" }
            ]
          }
        ]
      }
    })
    const sections = result.chunks.map(c => c.sectionTitle)
    expect(sections).toContain("Problem")
    expect(sections).toContain("Objective")
    expect(sections.some(s => s?.startsWith("Hypothesis"))).toBe(true)
    expect(sections.some(s => s?.startsWith("Paper:"))).toBe(true)
    expect(sections.some(s => s?.includes("Materials"))).toBe(true)
    expect(sections.some(s => s?.includes("Statistical Analysis"))).toBe(true)
    expect(result.denormalizedMetadata.source_type).toBe("design")
    expect(result.denormalizedMetadata.source_url).toBe("/designs/d1")
    expect(result.denormalizedMetadata.source_title).toBe("Test design")
  })

  test("skips designVersions (not in current schema mapping)", async () => {
    const result = await extractDesign({
      id: "d2",
      user_id: uid,
      workspace_id: ws,
      content: {
        problem: { title: "T", problemStatement: "P" },
        // @ts-expect-error - unknown field intentionally probed
        designVersions: [{ sections: [{ heading: "Old", body: "stale text" }] }]
      }
    })
    expect(result.chunks.some(c => c.content.includes("stale"))).toBe(false)
  })

  test("handles content as JSON string (legacy storage shape)", async () => {
    const result = await extractDesign({
      id: "d3",
      user_id: uid,
      workspace_id: ws,
      content: JSON.stringify({
        problem: { title: "JSON", problemStatement: "From string" }
      })
    })
    expect(result.chunks[0].content).toContain("From string")
  })
})

describe("extractReport", () => {
  test("includes outline + draft sections + description", async () => {
    const result = await extractReport({
      id: "r1",
      user_id: uid,
      workspace_id: ws,
      name: "Q1 report",
      description: "Summary of Q1 experiments",
      report_outline: { sections: ["intro", "results"] },
      report_draft: {
        introduction: "We ran X experiments.",
        results: "Found Y."
      }
    })
    const sections = result.chunks.map(c => c.sectionTitle)
    expect(sections).toContain("Description")
    expect(sections).toContain("Outline")
    expect(sections).toContain("Introduction")
    expect(sections).toContain("Results")
    expect(result.denormalizedMetadata.source_url).toBe("/reports/r1")
  })

  test("skips _chartData control key", async () => {
    const result = await extractReport({
      id: "r2",
      user_id: uid,
      workspace_id: ws,
      report_draft: { _chartData: "not for embedding", body: "real text" }
    })
    expect(result.chunks.every(c => !c.content.includes("not for embedding"))).toBe(
      true
    )
  })
})

describe("extractPaperLibrary", () => {
  test("emits at least one chunk with title + summary", async () => {
    const result = await extractPaperLibrary({
      id: "p1",
      user_id: uid,
      workspace_id: ws,
      title: "On stability",
      summary: "Some abstract text about stability",
      authors: ["Smith"],
      year: "2024",
      url: "https://example.com/p1"
    })
    expect(result.chunks.length).toBeGreaterThan(0)
    expect(result.denormalizedMetadata.source_url).toBe("https://example.com/p1")
    expect(result.denormalizedMetadata.metadata.year).toBe("2024")
  })

  test("falls back to title-only when summary is empty", async () => {
    const result = await extractPaperLibrary({
      id: "p2",
      user_id: uid,
      workspace_id: ws,
      title: "Just a title"
    })
    expect(result.chunks.length).toBe(1)
    expect(result.chunks[0].content).toBe("Just a title")
  })
})

describe("extractDataCollection", () => {
  test("includes columns + structured_data; skips rows", async () => {
    const result = await extractDataCollection({
      id: "dc1",
      user_id: uid,
      workspace_id: ws,
      name: "pH sweep",
      template_columns: ["sample", "pH", "OD"],
      structured_data: { mean: 0.5, n: 12 }
    })
    const sections = result.chunks.map(c => c.sectionTitle)
    expect(sections).toContain("Columns")
    expect(sections).toContain("Structured data")
  })
})

describe("extractChatMessage", () => {
  test("returns null below 50-char threshold", async () => {
    const result = await extractChatMessage({
      id: "m1",
      chat_id: "c1",
      user_id: uid,
      workspace_id: ws,
      role: "user",
      content: "ok"
    })
    expect(result).toBeNull()
  })

  test("emits a chunk with role in metadata", async () => {
    const text = "x".repeat(100)
    const result = await extractChatMessage({
      id: "m2",
      chat_id: "c1",
      user_id: uid,
      workspace_id: ws,
      role: "assistant",
      content: text
    })
    expect(result).not.toBeNull()
    expect(result!.denormalizedMetadata.metadata.role).toBe("assistant")
    expect(result!.denormalizedMetadata.source_url).toBe("/chat/c1#m-m2")
  })
})
