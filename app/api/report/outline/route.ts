import { StateGraph, END, START } from "@langchain/langgraph"
import { getAzureOpenAI, getAzureOpenAIModel } from "@/lib/azure-openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import * as d3 from "d3"
import { createCanvas } from "@napi-rs/canvas"

import { tool } from "@langchain/core/tools"
import { NextResponse } from "next/server"
import {
  backfillFileItemsLocal,
  resolveSupabaseFilesToText
} from "@/lib/report/file-content"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { requireUser } from "@/lib/server/require-user"
import { assertBudget } from "@/lib/billing/account"
import { meterRun } from "@/lib/billing/with-meter"
import {
  budgetErrorResponse,
  isBudgetExceededError
} from "@/lib/billing/errors"
import {
  ReportTheorySchema,
  type ReportTheoryType,
  VisualizationSchema,
  type VisualizationType,
  ReportExecutorSchema,
  type ReportExecutorType,
  DataAnalysisSchema,
  type DataAnalysisType,
  ReportOutputSchema,
  type ReportOutputType
} from "@/lib/report/schemas"

const openai = () => getAzureOpenAI()
const MODEL_NAME = () => getAzureOpenAIModel()

// Report structured-output schemas live in @/lib/report/schemas (so the report
// output contract is unit-tested). Imported below.

// Define interfaces
interface ReportState {
  protocol: string
  paperSummary?: string
  dataFileSummary?: string
  experimentObjective?: string
  /** Flattened answers to the pre-generation clarifying questions. */
  reportSpec?: string
  finalOutput: ReportOutputType
  chartImage?: string
  chartData: VisualizationType
  aim: string
  introduction: string
  principle: string
  material: string
  preparation: string
  procedure: string
  setup: string
  dataAnalysis: string
  results: string
  discussion: string
  conclusion: string
  nextSteps: string
}

async function callDataVisualizationAgent(
  state: ReportState
): Promise<VisualizationType> {
  const systemPrompt = `You are a data visualization expert for biopharma research. Your job is to extract the MOST MEANINGFUL numeric comparison from experimental data and format it for a chart.

RULES:
1. Pick ONE primary numeric metric from the data (e.g. mean viscosity, % recovery, absorbance, yield, concentration). Do NOT mix different metrics or units in the same chart.
2. Choose chartType:
   - "bar" - comparing a numeric metric across conditions / samples / formulations (DEFAULT).
   - "pie" - showing proportion / share / composition of a whole (values should sum to ~100% or represent parts of one whole). Use pie ONLY when parts-of-a-whole is the actual meaning.
3. Use SHORT labels (max 15 characters) for the categories. Abbreviate names (e.g. "C0 Control", "E1", "F2 Glycine").
4. All values within ONE series MUST share a unit. If the data has several metrics, pick the most scientifically relevant one as the PRIMARY chart - and return every OTHER metric in additionalSeries, one entry each, with its own label and units. Do NOT silently drop the other metrics: the researcher uploaded them and expects to be able to see them.
5. Provide a clear chartTitle (e.g. "Mean Viscosity by Formulation") and yAxisLabel WITH units for bar charts (e.g. "Viscosity (mPa·s)"). yAxisLabel can be empty for pie charts.
6. Return only POSITIVE values when possible. If comparing % changes, use absolute values or the raw measurement instead.
7. IMPORTANT: Include ALL data points / conditions / formulations from the dataset. Do NOT skip or drop any rows.`

  const userPrompt = `Extract data for a chart from this experiment.

Objective: ${state.experimentObjective}${state.reportSpec ? `\nReport preferences (tailor the writing - audience, depth, focus, emphasis - to these): ${state.reportSpec}` : ""}
Protocol: ${state.protocol}
Data files: ${state.dataFileSummary}

Return a JSON object with:
- chartTitle: descriptive title
- chartType: "bar" or "pie"
- yAxisLabel: Y-axis label with units (for bar charts)
- data: array of {label, value} pairs with short labels and consistent numeric values
- additionalSeries: one entry per OTHER metric in the data (metric name, yAxisLabel with units, its own data array)`

  try {
    const completion = await openai().beta.chat.completions.parse({
      model: MODEL_NAME(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: zodResponseFormat(
        VisualizationSchema,
        "visualizationSchema"
      )
    })
    const parsed = completion.choices[0].message.parsed!

    return parsed
  } catch (error) {
    console.error("Error in callDataVisualizationAgent:", error)
    throw error
  }
}

async function finalValidatorAgent(
  state: ReportState
): Promise<ReportOutputType> {
  const systemPrompt = `You are an expert at structured data extraction. You will be given unstructured text from a research report and should convert it into the given structure`

  const prompt = `
Report Draft: {reportDraft}
Data Analysis Draft: {dataAnalysisDraft}
  `

  try {
    const completion = await openai().beta.chat.completions.parse({
      model: MODEL_NAME(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      response_format: zodResponseFormat(ReportOutputSchema, "reportOutput")
    })
    const reportOutput = completion.choices[0].message.parsed!

    return reportOutput
  } catch (error) {
    console.error("Error in finalValidatorAgent:", error)
    throw error
  }
}

const COLOR_PALETTE = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#6366f1"
]

const renderPieChart = (
  data: { label: string; value: number }[],
  chartTitle: string
): string => {
  const width = 800
  const height = 500
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, width, height)

  ctx.font = "bold 16px Arial"
  ctx.textAlign = "center"
  ctx.fillStyle = "#111827"
  ctx.fillText(chartTitle || "Data Visualization", width / 2, 28)

  const cx = width * 0.36
  const cy = height / 2 + 10
  const radius = Math.min(width * 0.22, height * 0.36)
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1

  let startAngle = -Math.PI / 2
  data.forEach((d, idx) => {
    const fraction = Math.max(0, d.value) / total
    const endAngle = startAngle + fraction * Math.PI * 2

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, startAngle, endAngle)
    ctx.closePath()
    ctx.fillStyle = COLOR_PALETTE[idx % COLOR_PALETTE.length]
    ctx.fill()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.stroke()

    if (fraction > 0.04) {
      const mid = (startAngle + endAngle) / 2
      const lx = cx + Math.cos(mid) * radius * 0.6
      const ly = cy + Math.sin(mid) * radius * 0.6
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 12px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(`${(fraction * 100).toFixed(1)}%`, lx, ly)
    }

    startAngle = endAngle
  })

  // Legend
  const legendX = width * 0.62
  let legendY = 90
  ctx.textAlign = "left"
  ctx.textBaseline = "middle"
  data.forEach((d, idx) => {
    ctx.fillStyle = COLOR_PALETTE[idx % COLOR_PALETTE.length]
    ctx.fillRect(legendX, legendY - 8, 16, 16)
    ctx.fillStyle = "#1f2937"
    ctx.font = "13px Arial"
    const pct = ((Math.max(0, d.value) / total) * 100).toFixed(1)
    ctx.fillText(`${d.label} - ${d.value} (${pct}%)`, legendX + 24, legendY)
    legendY += 26
  })

  const buffer = canvas.toBuffer("image/png") as Buffer
  return `data:image/png;base64,${buffer.toString("base64")}`
}

const chartTool = tool(
  async ({ data, chartTitle, yAxisLabel, chartType }) => {
    if (chartType === "pie") {
      return renderPieChart(data, chartTitle || "Data Visualization")
    }

    const width = 800
    const height = 500
    const margin = {
      top: 50,
      right: 50,
      bottom: 80,
      left: yAxisLabel ? 80 : 60
    }

    // Create a canvas
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext("2d")

    // Fill the background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)

    const x = d3
      .scaleBand()
      .domain(data.map(d => d.label))
      .range([margin.left, width - margin.right])
      .padding(0.3)

    const y = d3
      .scaleLinear()
      .domain([0, (d3.max(data, (d: any) => d.value) || 0) * 1.15])
      .nice()
      .range([height - margin.bottom, margin.top])

    const colorPalette = COLOR_PALETTE

    // Draw chart title
    ctx.font = "bold 16px Arial"
    ctx.textAlign = "center"
    ctx.fillStyle = "#111827"
    ctx.fillText(chartTitle || "Data Visualization", width / 2, 28)

    // Draw bars with rounded top effect
    data.forEach((d, idx) => {
      ctx.fillStyle = colorPalette[idx % colorPalette.length]

      const barX = x(d.label) ?? 0
      const barY = y(d.value)
      const barW = x.bandwidth()
      const barH = height - margin.bottom - barY

      // Draw bar with slight rounded top corners
      const radius = Math.min(4, barW / 4)
      ctx.beginPath()
      ctx.moveTo(barX, barY + radius)
      ctx.quadraticCurveTo(barX, barY, barX + radius, barY)
      ctx.lineTo(barX + barW - radius, barY)
      ctx.quadraticCurveTo(barX + barW, barY, barX + barW, barY + radius)
      ctx.lineTo(barX + barW, barY + barH)
      ctx.lineTo(barX, barY + barH)
      ctx.closePath()
      ctx.fill()

      // Add value label on top of each bar
      ctx.fillStyle = "#1f2937"
      ctx.font = "bold 11px Arial"
      ctx.textAlign = "center"
      ctx.fillText(d.value.toString(), barX + barW / 2, barY - 6)
    })

    // Draw x-axis line
    ctx.beginPath()
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 1
    ctx.moveTo(margin.left, height - margin.bottom)
    ctx.lineTo(width - margin.right, height - margin.bottom)
    ctx.stroke()

    // Draw x-axis labels (horizontal, centered under each bar)
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.font = "11px Arial"
    ctx.fillStyle = "#374151"

    x.domain().forEach((d: any) => {
      const xCoord = (x(d) ?? 0) + x.bandwidth() / 2
      // Word-wrap long labels
      const maxWidth = x.bandwidth() + 10
      const words = d.split(/\s+/)
      let line = ""
      let lineY = height - margin.bottom + 8
      for (const word of words) {
        const testLine = line ? line + " " + word : word
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && line) {
          ctx.fillText(line, xCoord, lineY)
          line = word
          lineY += 14
        } else {
          line = testLine
        }
      }
      if (line) ctx.fillText(line, xCoord, lineY)
    })

    // Draw y-axis line
    ctx.beginPath()
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 1
    ctx.moveTo(margin.left, margin.top)
    ctx.lineTo(margin.left, height - margin.bottom)
    ctx.stroke()

    // Draw y-axis labels and grid lines
    ctx.textAlign = "right"
    ctx.textBaseline = "middle"
    ctx.font = "12px Arial"
    ctx.fillStyle = "#374151"

    const ticks = y.ticks(8)
    ticks.forEach((d: any) => {
      const yCoord = y(d)

      // Draw tick
      ctx.beginPath()
      ctx.strokeStyle = "#d1d5db"
      ctx.moveTo(margin.left, yCoord)
      ctx.lineTo(margin.left - 6, yCoord)
      ctx.stroke()

      // Draw label
      ctx.fillStyle = "#374151"
      ctx.fillText(d.toString(), margin.left - 10, yCoord)

      // Draw grid line
      ctx.beginPath()
      ctx.strokeStyle = "#e5e7eb"
      ctx.setLineDash([3, 3])
      ctx.moveTo(margin.left, yCoord)
      ctx.lineTo(width - margin.right, yCoord)
      ctx.stroke()
      ctx.setLineDash([])
    })

    // Draw Y-axis label (rotated)
    if (yAxisLabel) {
      ctx.save()
      ctx.font = "13px Arial"
      ctx.fillStyle = "#374151"
      ctx.textAlign = "center"
      ctx.translate(18, (margin.top + height - margin.bottom) / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(yAxisLabel, 0, 0)
      ctx.restore()
    }

    // Convert canvas to a buffer containing a PNG image
    const buffer = canvas.toBuffer("image/png") as Buffer

    // Convert buffer to base64 string
    const base64Image = buffer.toString("base64")

    // Return the base64-encoded image
    return `data:image/png;base64,${base64Image}`
  },
  {
    name: "generate_chart",
    description:
      "Generates a bar or pie chart from an array of data points and returns it as a base64-encoded PNG image.",
    schema: z.object({
      data: z.array(
        z.object({
          label: z.string(),
          value: z.number()
        })
      ),
      chartTitle: z.string().optional().describe("Title for the chart"),
      chartType: z
        .enum(["bar", "pie"])
        .optional()
        .describe("Chart type: 'bar' or 'pie'. Defaults to 'bar'."),
      yAxisLabel: z
        .string()
        .optional()
        .describe("Label for the Y axis with units (bar charts only)"),
      /**
       * EVERY other metric present in the data, one entry each. The primary
       * `data` above stays the headline chart (and the rendered PNG); these let
       * the researcher switch to the other readouts instead of losing them.
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
          "One entry per ADDITIONAL metric in the data. Omit only if the data truly has a single metric."
        )
    })
  }
)

async function callTheoryAgent(state: ReportState): Promise<ReportTheoryType> {
  const systemPrompt = `You are an experienced senior scientist writing the theoretical foundation for a biopharma research report. Your job is to document Aim, Introduction, and Principle in a scientifically rigorous, scannable manner.

FORMATTING RULES (apply strictly):
- Use GitHub-Flavored Markdown.
- Lead every section with a concise 1–2 sentence summary paragraph.
- Then use **bullet points** for key items (objectives, hypotheses, background drivers, parameters, mechanisms).
- Use **bold** for key terms. Use \`code\` style for variables/units where helpful.
- Use subheadings (####) to organize when the section has multiple facets.
- Do NOT produce wall-of-text paragraphs. Favor short, pointwise structure that a reader can scan in under a minute.

Your primary tasks: Aim, Introduction, Principle.

1. Aim:
   - One short paragraph stating what is being evaluated and why.
   - Then a bulleted list titled "**Objectives:**" with 3–5 concrete, measurable objectives.

2. Introduction:
   - Open with 1–2 sentences of context.
   - Use short subsections (####) such as: Background, Significance, Rationale.
   - Under each subheading, use bullet points (2–4 bullets) with the key facts; avoid multi-sentence bullets where possible.

3. Principle:
   - Open with 1–2 sentences stating the core principle.
   - Use subheadings like: #### Underlying Theory, #### Key Parameters, #### How It Works.
   - Under each subheading use bullet points. Put equations inline or on their own line using markdown code/math formatting.

Constraints:
- Focus only on theory; no procedure, materials, or data analysis.
- Maintain a scientific, objective tone.
- Be concise - aim for scannability and accuracy, not verbosity.
`

  const userPrompt = `Generate aim, introduction, and principle using the following:

Objective: ${state.experimentObjective}${state.reportSpec ? `\nReport preferences (tailor the writing - audience, depth, focus, emphasis - to these): ${state.reportSpec}` : ""}
Protocol: ${state.protocol}
Data files: ${state.dataFileSummary}`

  console.log("userPrompt: " + userPrompt)

  try {
    const completion = await openai().beta.chat.completions.parse({
      model: MODEL_NAME(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: zodResponseFormat(ReportTheorySchema, "reportTheory")
    })
    const reportOutput = completion.choices[0].message.parsed!

    return reportOutput
  } catch (error) {
    console.error("Error in reportTheoryAgent:", error)
    throw error
  }
}

async function callDataAnalystAgent(
  state: ReportState
): Promise<DataAnalysisType> {
  const systemPrompt = `You are an expert data analyst and senior scientist documenting Data Analysis, Results, Discussion, Conclusion, and Next Steps for a biopharma research report.

FORMATTING RULES (apply strictly):
- Use GitHub-Flavored Markdown.
- Favor pointwise structure - bullets, numbered lists, and tables - over long paragraphs.
- Every numeric value must carry its unit.
- Use subheadings (####) to organize subsections.
- Every section starts with one short 1–2 sentence intro, then switches to bullets / tables / numbered lists.

1. Data Analysis:
   - One-line intro describing the analytical objective.
   - Include a markdown **table** summarizing numerical results (each row = one sample / condition; columns include values with units).
   - Then subheadings: #### Approach (bullets covering methodology, software, parameters, controls) and #### Key Trends (bullets calling out trends, outliers, statistically notable comparisons).
   - Chart is rendered directly after this section in the UI, so reference "the chart below" rather than re-stating every value.

2. Results:
   - Bullet list of key numeric findings.
   - Each bullet stands alone with specific values and units.
   - Reference figures/tables. No interpretation here.

3. Discussion:
   - Subheadings with bullets under each:
     #### Interpretation - what the results mean.
     #### Implications - practical significance / downstream impact.
     #### Limitations - specific caveats of this study.

4. Conclusion:
   - 3–5 concise bullet points summarizing the key takeaways.

5. Next Steps:
   - Numbered list of 3–7 recommended follow-up actions, each a single clear action.

Constraints:
- Focus only on analysis, interpretation, and conclusions; no theory or procedural detail.
- Be concise and rigorous. Favor scannability.
`

  const userPrompt = `To generate the content, refer to the following:
Objective: ${state.experimentObjective}${state.reportSpec ? `\nReport preferences (tailor the writing - audience, depth, focus, emphasis - to these): ${state.reportSpec}` : ""}
Data Files: ${state.dataFileSummary}
Protocol: ${state.protocol}`

  try {
    const completion = await openai().beta.chat.completions.parse({
      model: MODEL_NAME(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: zodResponseFormat(DataAnalysisSchema, "dataAnalysis")
    })
    const reportOutput = completion.choices[0].message.parsed!

    return reportOutput
  } catch (error) {
    console.error("Error in DataAnalysisAgent:", error)
    throw error
  }
}

async function callExecutorAgent(
  state: ReportState
): Promise<ReportExecutorType> {
  const systemPrompt = `You are a seasoned scientist documenting the practical aspects of a biopharma experiment: Materials, Preparation, Procedure, and Setup. Write in past tense - how things were done.

FORMATTING RULES (apply strictly):
- Use GitHub-Flavored Markdown.
- Favor **pointwise structure** - bullet points and numbered lists - over long paragraphs.
- Use **tables** for materials / reagents (columns like Item, Quantity, Specification, Catalog #).
- Use **numbered lists** for step-by-step procedures.
- Use subheadings (####) to organize subsections.
- Open each section with one short paragraph, then switch to bullets / tables / numbered lists.
- Do NOT produce large walls of text.

Your primary tasks: Material needed, Preparation, Procedure, Setup.

1. Material:
   - One-line intro.
   - A markdown table: | Item | Quantity | Specification | Source |
   - Group via subheadings if useful: #### Reagents, #### Equipment, #### Consumables.

2. Preparation:
   - One-line intro.
   - Use subheadings (#### Buffer Preparation, #### Instrument Setup, #### Reagent Preparation).
   - Under each subheading, use a numbered list with exact quantities (e.g. "1. Dissolved 8 g NaCl in 800 mL deionized water.").

3. Procedure:
   - One-line intro.
   - Use subheadings for phases (#### Sample Loading, #### Measurement, #### Cleanup).
   - Under each, use a numbered list capturing the actual steps in past tense with volumes, temperatures, times, and instrument settings.

4. Setup:
   - One short paragraph of context.
   - A bulleted list of layout / labeling / configuration details (sample IDs, condition codes, vial positions, instrument config).

Constraints:
- Focus only on practical details; no theory or data interpretation.
- Every numeric value should carry its unit.
- Favor pointwise structure for scannability and reproducibility.
`

  const userPrompt = `Generate material, preparation, procedure, and setup using the following:
Objective: ${state.experimentObjective}${state.reportSpec ? `\nReport preferences (tailor the writing - audience, depth, focus, emphasis - to these): ${state.reportSpec}` : ""}
Protocol: ${state.protocol}
Data Files: ${state.dataFileSummary}
`

  try {
    const completion = await openai().beta.chat.completions.parse({
      model: MODEL_NAME(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: zodResponseFormat(ReportExecutorSchema, "reportTheory")
    })
    const reportOutput = completion.choices[0].message.parsed!

    return reportOutput
  } catch (error) {
    console.error("Error in reportTheoryAgent:", error)
    throw error
  }
}

// Define the workflow
const workflow = new StateGraph<ReportState>({
  channels: {
    aim: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    introduction: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    principle: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    material: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    preparation: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    procedure: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    setup: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    dataAnalysis: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    results: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    discussion: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    conclusion: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    nextSteps: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    protocol: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    paperSummary: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    dataFileSummary: {
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    },
    finalOutput: {
      value: (left?: ReportOutputType, right?: ReportOutputType) =>
        right ?? left ?? ({} as ReportOutputType),
      default: () => ({}) as ReportOutputType
    },
    chartData: {
      value: (left?: VisualizationType, right?: VisualizationType) =>
        right ??
        left ??
        ({
          chartTitle: "",
          chartType: "bar",
          yAxisLabel: "",
          data: []
        } as VisualizationType),
      default: () =>
        ({
          chartTitle: "",
          chartType: "bar",
          yAxisLabel: "",
          data: []
        }) as VisualizationType
    },
    chartImage: {
      // Added chartImage channel
      value: (left?: string, right?: string) => right ?? left ?? "",
      default: () => ""
    }
  }
})

  .addNode("reportWriterTheoryAgent", async (state: ReportState) => {
    try {
      const finalOutput = await callTheoryAgent(state)
      return {
        ...state,
        aim: finalOutput.aim,
        principle: finalOutput.principle,
        introduction: finalOutput.introduction
      }
    } catch (error) {
      console.error("Error in finalValidatorAgent:", error)
      throw error
    }
  })
  .addNode("reportWriterExecutorAgent", async (state: ReportState) => {
    try {
      const finalOutput = await callExecutorAgent(state)
      return {
        ...state,
        material: finalOutput.material,
        preparation: finalOutput.preparation,
        procedure: finalOutput.procedure,
        setup: finalOutput.setup
      }
    } catch (error) {
      console.error("Error in reportWriterExecutorAgent:", error)
      throw error
    }
  })
  .addNode("dataVisualizationAgent", async (state: ReportState) => {
    try {
      const content = await callDataVisualizationAgent(state)

      return { ...state, chartData: content }
    } catch (error) {
      console.error("Error in dataVisualizationAgent:", error)
      throw error
    }
  })

  .addNode("dataAnalystAgent", async (state: ReportState) => {
    try {
      const finalOutput = await callDataAnalystAgent(state)
      return {
        ...state,
        dataAnalysis: finalOutput.dataAnalysis,
        results: finalOutput.results,
        discussion: finalOutput.discussion,
        conclusion: finalOutput.conclusion,
        nextSteps: finalOutput.nextSteps
      }
    } catch (error) {
      console.error("Error in reportWriterExecutorAgent:", error)
      throw error
    }
  })
  .addNode("generateChart", async (state: ReportState) => {
    try {
      // Parse data from chartData and pass title/label for the D3 image
      const parsedData = state.chartData?.data || []
      const chartImage = await chartTool.func({
        data: parsedData,
        chartTitle: state.chartData?.chartTitle || "Data Visualization",
        chartType: state.chartData?.chartType || "bar",
        yAxisLabel: state.chartData?.yAxisLabel || ""
      })
      return { ...state, chartImage }
    } catch (error) {
      console.error("Error in generateChart:", error)
      throw error
    }
  })
  // .addNode("finalValidatorAgent", async (state: ReportState) => {
  //   try {
  //     const finalOutput = await finalValidatorAgent(state)
  //     return { ...state, finalOutput }
  //   } catch (error) {
  //     console.error("Error in finalValidatorAgent:", error)
  //     throw error
  //   }
  // })
  .addEdge(START, "reportWriterTheoryAgent")
  .addEdge("reportWriterTheoryAgent", "reportWriterExecutorAgent")
  .addEdge("reportWriterExecutorAgent", "dataVisualizationAgent") // Add this edge
  .addEdge("dataVisualizationAgent", "dataAnalystAgent") // Add this edge
  .addEdge("dataAnalystAgent", "generateChart")
  .addEdge("generateChart", END)

// Helper function to parse data
function parseDataFromSummary(
  summary: string
): { label: string; value: number }[] {
  // Implement your logic to parse data from summary
  // For demonstration, returning dummy data
  return [
    { label: "Parsed Category 1", value: 25 },
    { label: "Parsed Category 2", value: 35 },
    { label: "Parsed Category 3", value: 45 }
  ]
}

// Compile the graph

export async function POST(req: Request) {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response
    const userId = auth.user.id

    try {
      await assertBudget(userId)
    } catch (e) {
      if (isBudgetExceededError(e)) return budgetErrorResponse(e.plan)
    }

    const {
      protocol,
      papers,
      dataFiles,
      experimentObjective,
      designContext,
      reportSpec
    } = (await req.json()) as {
      protocol?: string[]
      papers?: string[]
      dataFiles?: string[]
      experimentObjective?: string
      /** Flattened pre-generation clarifying answers (audience, type, focus). */
      reportSpec?: string
      /**
       * Markdown summary of the parent design. When a report is generated
       * from a design the design itself supplies the protocol/method, so
       * the client passes it here instead of (or alongside) protocol files.
       */
      designContext?: string
    }

    const protocolIds = Array.isArray(protocol) ? protocol : []
    const paperIds = Array.isArray(papers) ? papers : []
    const dataFileIds = Array.isArray(dataFiles) ? dataFiles : []

    // Hybrid resolution:
    // 1) Prefer existing `file_items` (fast path)
    // 2) Fallback to downloading/parsing the raw file from Supabase Storage (works even when `file_items` is empty)
    const resolved = await resolveSupabaseFilesToText(
      [...protocolIds, ...paperIds, ...dataFileIds],
      { maxCharsPerFile: 40_000 }
    )

    const byId = new Map(resolved.map(r => [r.fileId, r]))

    const protocolFromFiles = protocolIds
      .map(id => byId.get(id)?.content || "")
      .filter(Boolean)
      .join("\n\n")
    // Prepend the parent design summary (when generating from a design) so
    // the report writer treats the design as the authoritative protocol.
    const designContextText =
      typeof designContext === "string" ? designContext.trim() : ""
    const protocolText = [
      designContextText
        ? `# Source design (use as the protocol/method)\n\n${designContextText}`
        : "",
      protocolFromFiles
    ]
      .filter(Boolean)
      .join("\n\n")
    const paperText = paperIds
      .map(id => byId.get(id)?.content || "")
      .filter(Boolean)
      .join("\n\n")
    const dataFileText = dataFileIds
      .map(id => byId.get(id)?.content || "")
      .filter(Boolean)
      .join("\n\n")

    const fallbackUsed = resolved
      .filter(r => r.source === "raw")
      .map(r => r.fileId)
    if (fallbackUsed.length > 0) {
      console.log(
        "[REPORT_OUTLINE] Fallback used (no file_items found) for fileIds:",
        fallbackUsed
      )
      const warnings = resolved
        .filter(r => r.source === "raw" && r.warnings?.length)
        .map(r => ({ fileId: r.fileId, warnings: r.warnings }))
      if (warnings.length) {
        console.warn("[REPORT_OUTLINE] File parsing warnings:", warnings)
      }
    }

    // Optional backfill: populate `file_items` so future runs can use fast path.
    // Enabled via env var to avoid surprising compute in production/serverless.
    if (
      process.env.REPORT_BACKFILL_FILE_ITEMS === "true" &&
      fallbackUsed.length
    ) {
      try {
        const profile = await getServerProfile()
        const { backfilledFileIds, skippedFileIds } =
          await backfillFileItemsLocal(profile.user_id, resolved)
        console.log(
          "[REPORT_OUTLINE] Backfilled file_items:",
          backfilledFileIds
        )
        if (skippedFileIds.length) {
          console.warn(
            "[REPORT_OUTLINE] Backfill skipped fileIds:",
            skippedFileIds
          )
        }
      } catch (e) {
        console.warn("[REPORT_OUTLINE] Backfill failed:", e)
      }
    }

    const initialState: ReportState = {
      aim: "",
      introduction: "",
      principle: "",
      material: "",
      preparation: "",
      procedure: "",
      setup: "",
      dataAnalysis: "",
      results: "",
      discussion: "",
      conclusion: "",
      nextSteps: "",
      experimentObjective: experimentObjective || "",
      reportSpec:
        typeof reportSpec === "string"
          ? reportSpec.trim() || undefined
          : undefined,
      protocol: protocolText || "",
      paperSummary: paperText || "",
      dataFileSummary: dataFileText || "",
      finalOutput: {} as ReportOutputType,
      chartData: {
        chartTitle: "",
        chartType: "bar",
        yAxisLabel: "",
        data: []
      } as VisualizationType,
      chartImage: "" // Initialize chartImage
    }

    let finalState: ReportState | undefined

    // Meter every LLM call the LangGraph nodes make: the ALS scope is active
    // for the whole graph run, so the azure-openai Proxy auto-captures each
    // node's token usage and we flush once at the end.
    await meterRun({ userId, feature: "report" }, async () => {
      for await (const event of await app.stream(initialState)) {
        for (const [key, value] of Object.entries(event)) {
          finalState = value as ReportState
          // console.log(`Updated state for ${key}:`, finalState)
        }
      }
    })

    if (finalState) {
      console.log("Final state:", finalState)
      return NextResponse.json({
        reportOutline: [
          "aim",
          "introduction",
          "principle",
          "material",
          "preparation",
          "procedure",
          "setup",
          "dataAnalysis",
          "charts",
          "results",
          "discussion",
          "conclusion",
          "nextSteps"
        ],
        reportDraft: {
          aim: finalState.aim,
          introduction: finalState.introduction,
          principle: finalState.principle,
          material: finalState.material,
          preparation: finalState.preparation,
          procedure: finalState.procedure,
          setup: finalState.setup,
          dataAnalysis: finalState.dataAnalysis,
          charts: finalState.chartImage,
          results: finalState.results,
          discussion: finalState.discussion,
          conclusion: finalState.conclusion,
          nextSteps: finalState.nextSteps,
          _chartData: finalState.chartData || null // Embed chart data inside draft for persistence
        },
        chartImage: finalState.chartImage,
        chartData: finalState.chartData // Include raw chart data for client-side rendering
      })
    }

    return new NextResponse("Failed to generate report", { status: 500 })
  } catch (error) {
    console.error("[REPORT_ERROR]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

const app = workflow.compile()

export const config = {
  api: {
    bodyParser: process.env.NODE_ENV !== "production"
  }
}
