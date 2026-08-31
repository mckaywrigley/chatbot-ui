/**
 * @jest-environment node
 *
 * Report-generation contract guard.
 *
 * Report generation (/api/report/outline) runs three gpt-5.5 structured-output
 * agents whose zod schemas define the sections every report must contain. The
 * report route is too entangled (canvas/d3/langgraph + ESM transitive deps) to
 * import in jest, and Next forbids exporting its agents - so we guard the
 * SCHEMAS (the output contract). The shared parse mechanism (azure Proxy +
 * zodResponseFormat) is already covered by the design-pipeline test.
 *
 * This catches the real report regression class: a section silently dropped /
 * renamed, or the agent schemas drifting out of sync with the final report.
 */
import {
  ReportOutputSchema,
  ReportTheorySchema,
  ReportExecutorSchema,
  DataAnalysisSchema,
  VisualizationSchema
} from "@/lib/report/schemas"

const FULL_REPORT = {
  aim: "Evaluate buffer effect",
  introduction: "Background",
  principle: "Theory",
  material: "Histidine",
  preparation: "Prep buffers",
  procedure: "Formulate + stress",
  setup: "Calibrate instruments",
  dataAnalysis: "ANOVA",
  results: "pH 5.5 lowest HMW",
  discussion: "Matches model",
  conclusion: "Use pH 5.5–6.0",
  nextSteps: "Pilot scale"
}

describe("report output contract", () => {
  it("a complete report (all 12 sections) parses against ReportOutputSchema", () => {
    expect(() => ReportOutputSchema.parse(FULL_REPORT)).not.toThrow()
  })

  it("rejects a report missing a section (drop/rename guard)", () => {
    const { conclusion, ...missingOne } = FULL_REPORT
    void conclusion
    expect(() => ReportOutputSchema.parse(missingOne)).toThrow()
  })

  it("the three agent schemas exactly cover every report section (no gap, no dup)", () => {
    const outputKeys = Object.keys(ReportOutputSchema.shape).sort()
    const sectionKeys = [
      ...Object.keys(ReportTheorySchema.shape),
      ...Object.keys(ReportExecutorSchema.shape),
      ...Object.keys(DataAnalysisSchema.shape)
    ].sort()
    // If someone adds a field to the final report but not to an agent's schema
    // (or vice-versa), the report would have a missing/orphan section - caught here.
    expect(sectionKeys).toEqual(outputKeys)
  })

  it("visualization schema validates a chart spec + enforces the chartType enum", () => {
    expect(() =>
      VisualizationSchema.parse({
        chartTitle: "Aggregation by pH",
        chartType: "bar",
        yAxisLabel: "HMW (%)",
        data: [{ label: "pH 5.5", value: 1.2 }]
      })
    ).not.toThrow()
    expect(() =>
      VisualizationSchema.parse({
        chartTitle: "X",
        chartType: "scatter", // not in ["bar","pie"]
        yAxisLabel: "Y",
        data: []
      })
    ).toThrow()
  })
})
