import { NextResponse } from "next/server"
import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"
import * as d3 from "d3"
import { createCanvas } from "@napi-rs/canvas"
import {
  getAzureOpenAIForDesign,
  getDesignDeployment
} from "@/lib/azure-openai"
import { requireUser } from "@/lib/server/require-user"
import { assertBudget, recordCompletionUsage } from "@/lib/billing/account"
import {
  budgetErrorResponse,
  isBudgetExceededError
} from "@/lib/billing/errors"

// chartType added so the user's "switch to pie chart" / "switch to line
// chart" feedback can actually mutate the type, not just the labels.
// The client-side ReportChart renders recharts off this schema, so
// adding "line" + "pie" here is enough - no other downstream change.
const ChartDataSchema = z.object({
  chartTitle: z.string(),
  yAxisLabel: z.string(),
  chartType: z.enum(["bar", "line", "pie"]).default("bar"),
  data: z.array(
    z.object({
      label: z.string(),
      value: z.number()
    })
  )
})

type ChartData = z.infer<typeof ChartDataSchema>

function renderChart(chart: ChartData): string {
  const { chartTitle, yAxisLabel, data } = chart
  const width = 800
  const height = 500
  const margin = {
    top: 50,
    right: 50,
    bottom: 80,
    left: yAxisLabel ? 80 : 60
  }

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext("2d")

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

  const colorPalette = [
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

  ctx.font = "bold 16px Arial"
  ctx.textAlign = "center"
  ctx.fillStyle = "#111827"
  ctx.fillText(chartTitle || "Data Visualization", width / 2, 28)

  data.forEach((d, idx) => {
    ctx.fillStyle = colorPalette[idx % colorPalette.length]
    const barX = x(d.label) ?? 0
    const barY = y(d.value)
    const barW = x.bandwidth()
    const barH = height - margin.bottom - barY
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

    ctx.fillStyle = "#1f2937"
    ctx.font = "bold 11px Arial"
    ctx.textAlign = "center"
    ctx.fillText(d.value.toString(), barX + barW / 2, barY - 6)
  })

  ctx.beginPath()
  ctx.strokeStyle = "#d1d5db"
  ctx.lineWidth = 1
  ctx.moveTo(margin.left, height - margin.bottom)
  ctx.lineTo(width - margin.right, height - margin.bottom)
  ctx.stroke()

  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  ctx.font = "11px Arial"
  ctx.fillStyle = "#374151"

  x.domain().forEach((d: any) => {
    const xCoord = (x(d) ?? 0) + x.bandwidth() / 2
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

  ctx.beginPath()
  ctx.strokeStyle = "#d1d5db"
  ctx.lineWidth = 1
  ctx.moveTo(margin.left, margin.top)
  ctx.lineTo(margin.left, height - margin.bottom)
  ctx.stroke()

  ctx.textAlign = "right"
  ctx.textBaseline = "middle"
  ctx.font = "12px Arial"
  ctx.fillStyle = "#374151"

  const ticks = y.ticks(8)
  ticks.forEach((d: any) => {
    const yCoord = y(d)
    ctx.beginPath()
    ctx.strokeStyle = "#d1d5db"
    ctx.moveTo(margin.left, yCoord)
    ctx.lineTo(margin.left - 6, yCoord)
    ctx.stroke()

    ctx.fillStyle = "#374151"
    ctx.fillText(d.toString(), margin.left - 10, yCoord)

    ctx.beginPath()
    ctx.strokeStyle = "#e5e7eb"
    ctx.setLineDash([3, 3])
    ctx.moveTo(margin.left, yCoord)
    ctx.lineTo(width - margin.right, yCoord)
    ctx.stroke()
    ctx.setLineDash([])
  })

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

  const buffer = canvas.toBuffer("image/png") as Buffer
  return `data:image/png;base64,${buffer.toString("base64")}`
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response

    try {
      await assertBudget(auth.user.id)
    } catch (e) {
      if (isBudgetExceededError(e)) return budgetErrorResponse(e.plan)
    }

    const { currentChartData, userFeedback } = await req.json()

    if (!userFeedback) {
      return new NextResponse("Missing userFeedback", { status: 400 })
    }

    // Use the design Azure client - same deployment the rest of the
    // report pipeline runs on. `getAzureOpenAI()` historically pointed
    // at a different deployment that was failing structured-output
    // requests in prod, which is why "Edit with AI" returned 500s.
    const openai = getAzureOpenAIForDesign()
    const systemPrompt = `You revise chart configurations based on the user's feedback. You must return ONLY valid JSON matching the provided schema. Preserve scientific accuracy - do not invent data values. Apply the user's changes (re-sort, relabel, change title/axis, filter, switch chart type to bar/line/pie when explicitly asked). When the user says "switch to a line chart" set chartType="line"; "pie chart" => "pie"; default to "bar". Recompute values only when the user explicitly requests a transformation.`

    const userPrompt = `Current chart configuration (JSON):\n\n${JSON.stringify(
      currentChartData ?? {
        chartTitle: "",
        yAxisLabel: "",
        chartType: "bar",
        data: []
      },
      null,
      2
    )}\n\nUser feedback:\n${userFeedback}\n\nReturn the revised chart configuration.`

    // beta.chat.completions.parse handles the zod schema + retry path
    // for us, so a non-conforming response surfaces as a structured
    // error instead of throwing inside JSON.parse. The previous .create
    // + manual JSON.parse path was the other reason "Edit with AI"
    // failed - the model occasionally wrapped its JSON in a markdown
    // code fence which JSON.parse rejected.
    const completion = await openai.beta.chat.completions.parse({
      model: getDesignDeployment(),
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: zodResponseFormat(ChartDataSchema, "chart")
    })

    await recordCompletionUsage(
      { userId: auth.user.id, feature: "report", model: getDesignDeployment() },
      completion
    )

    const parsed = completion.choices[0]?.message?.parsed
    if (!parsed) {
      return new NextResponse("No chart output from model", { status: 500 })
    }

    // Server-rendered preview still uses the bar-chart D3 renderer for
    // backwards compat (the PDF/PPT exports embed this PNG). The client
    // now also renders an interactive recharts surface off the same
    // `chartData` payload so the user sees the chosen chartType live.
    const chartImage = renderChart(parsed)

    return NextResponse.json({
      success: true,
      chartData: parsed,
      chartImage
    })
  } catch (error: any) {
    console.error("[REPORT_CHART_REGENERATE_ERROR]", error)
    return new NextResponse(`Internal Error: ${error?.message || "unknown"}`, {
      status: 500
    })
  }
}
