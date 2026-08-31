/**
 * Structured-output schemas for the report-generation pipeline
 * (app/api/report/outline). Extracted so the report's output CONTRACT - the
 * sections every generated report must contain - is unit-tested and can't
 * silently drift. The route imports these for its agents' `zodResponseFormat`.
 */
import { z } from "zod"

export const ReportTheorySchema = z
  .object({
    aim: z.string(),
    introduction: z.string(),
    principle: z.string()
  })
  .required()
export type ReportTheoryType = z.infer<typeof ReportTheorySchema>

export const VisualizationSchema = z.object({
  chartTitle: z
    .string()
    .describe(
      "A descriptive title for the chart, e.g. 'Mean Viscosity by Formulation'"
    ),
  chartType: z
    .enum(["bar", "pie"])
    .describe(
      "Choose 'bar' for comparing a single numeric metric across conditions, 'pie' when showing proportion/share of a whole summing to ~100%."
    ),
  yAxisLabel: z
    .string()
    .describe("Label for the Y axis including units, e.g. 'Viscosity (mPa·s)'"),
  data: z.array(
    z.object({
      label: z.string().describe("Short category/group name"),
      value: z.number().describe("Numeric value to plot")
    })
  ),
  /**
   * Every OTHER metric in the uploaded data, one entry each.
   *
   * This is the field the report actually persists and the viewer reads. It was
   * previously only added to the chart-rendering TOOL's schema, which is a
   * different call - so the visualization agent, bound to THIS schema by
   * zodResponseFormat, could not emit the field however firmly the prompt asked
   * for it. Structured output can only return what the schema declares, so the
   * extra metrics were dropped at the source and the report showed one dataset
   * no matter how many were uploaded.
   *
   * `data` above stays the headline chart and the rendered PNG; these are what
   * the reader switches between.
   */
  additionalSeries: z
    .array(
      z.object({
        metric: z
          .string()
          .describe("What this series measures, e.g. 'SEC monomer'"),
        yAxisLabel: z
          .string()
          .describe("Axis label WITH units, e.g. 'Monomer (%)'"),
        chartType: z.enum(["bar", "pie"]).optional(),
        data: z.array(z.object({ label: z.string(), value: z.number() }))
      })
    )
    .max(8)
    .optional()
    .describe(
      "One entry per ADDITIONAL metric present in the data. Omit ONLY when the data genuinely contains a single metric."
    )
})
export type VisualizationType = z.infer<typeof VisualizationSchema>

export const ReportExecutorSchema = z
  .object({
    material: z.string(),
    preparation: z.string(),
    procedure: z.string(),
    setup: z.string()
  })
  .required()
export type ReportExecutorType = z.infer<typeof ReportExecutorSchema>

export const DataAnalysisSchema = z
  .object({
    dataAnalysis: z.string(),
    results: z.string(),
    discussion: z.string(),
    conclusion: z.string(),
    nextSteps: z.string()
  })
  .required()
export type DataAnalysisType = z.infer<typeof DataAnalysisSchema>

export const ReportOutputSchema = z
  .object({
    aim: z.string(),
    introduction: z.string(),
    principle: z.string(),
    material: z.string(),
    preparation: z.string(),
    procedure: z.string(),
    setup: z.string(),
    dataAnalysis: z.string(),
    results: z.string(),
    discussion: z.string(),
    conclusion: z.string(),
    nextSteps: z.string()
  })
  .required()
export type ReportOutputType = z.infer<typeof ReportOutputSchema>
