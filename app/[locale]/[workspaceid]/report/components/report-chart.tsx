"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList
} from "recharts"

export type ChartType = "bar" | "line" | "pie"

interface ReportChartProps {
  data: Array<{ label: string; value: number }>
  chartTitle?: string
  yAxisLabel?: string
  /**
   * Type of plot to render. Defaults to "bar" - persisted on
   * `chart_data.chartType` and toggled via the tab strip above the
   * chart on the report page (#17, #18). When the type changes the
   * client updates state + persists, so refreshing the page keeps the
   * chosen type.
   */
  chartType?: ChartType
}

const COLORS = [
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

function formatValue(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  if (Number.isInteger(value)) return value.toString()
  return value.toFixed(2)
}

/**
 * Split a label into lines of at most `maxChars`.
 *
 * Long unbroken tokens are hard-cut rather than left to overflow: condition
 * labels are routinely written without spaces ("F2-Glycine-50mM"), and the
 * word-only version of this returned them as a single over-long line that ran
 * straight into its neighbours.
 */
function wrapLabel(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]

  const chunks: string[] = []
  for (const word of text.split(/\s+/)) {
    if (word.length <= maxChars) {
      chunks.push(word)
      continue
    }
    for (let i = 0; i < word.length; i += maxChars) {
      chunks.push(word.slice(i, i + maxChars))
    }
  }

  const lines: string[] = []
  let current = ""
  for (const word of chunks) {
    if (current && (current + " " + word).length > maxChars) {
      lines.push(current)
      current = word
    } else {
      current = current ? current + " " + word : word
    }
  }
  if (current) lines.push(current)

  return lines
}

/**
 * Fully custom X-axis tick rendered as a function (not an element).
 * Using a function avoids recharts cloneElement path which can inject
 * unwanted angle/rotation props.
 *
 * Past a handful of categories there is no longer horizontal room for centred
 * text, so the ticks rotate to 45° and anchor at their right edge - each label
 * then runs into empty space below-left of its own tick instead of into its
 * neighbour. This is what "labels all jumbled up" was.
 */
function renderCustomTick(maxCharsPerLine: number, rotate: boolean) {
  const CustomTick = (tickProps: any) => {
    const { x, y, payload } = tickProps
    const lines = wrapLabel(String(payload.value), maxCharsPerLine)

    if (rotate) {
      return (
        <g transform={`translate(${x},${y + 10}) rotate(-45)`}>
          {lines.map((line: string, i: number) => (
            <text
              key={i}
              x={0}
              y={i * 12}
              textAnchor="end"
              fontSize={11}
              fill="#374151"
            >
              {line}
            </text>
          ))}
        </g>
      )
    }

    return (
      <g transform={`translate(${x},${y})`}>
        {lines.map((line: string, i: number) => (
          <text
            key={i}
            x={0}
            y={0}
            dy={i * 14 + 14}
            textAnchor="middle"
            fontSize={11}
            fill="#374151"
          >
            {line}
          </text>
        ))}
      </g>
    )
  }
  CustomTick.displayName = "CustomTick"
  return CustomTick
}

export function ReportChart({
  data,
  chartTitle,
  yAxisLabel,
  chartType = "bar"
}: ReportChartProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No chart data available.</p>
    )
  }

  // Compute Y-axis domain with padding so bars never overflow
  const values = data.map(d => d.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || Math.abs(maxVal) || 1
  const yMin = minVal >= 0 ? 0 : Math.floor((minVal - range * 0.1) * 10) / 10
  const yMax = Math.ceil((maxVal + range * 0.15) * 10) / 10

  // Past 8 categories there isn't the horizontal room for centred labels, so
  // they rotate. Rotated text runs diagonally and so gets a generous character
  // budget (it isn't competing with its neighbour for width) and needs a taller
  // axis gutter to sit in.
  const rotateLabels = data.length > 8
  const charsPerLine = rotateLabels
    ? 18
    : data.length <= 4
      ? 16
      : data.length <= 8
        ? 10
        : 8

  // Compute how many lines the tallest label needs, for X-axis height
  const maxLines = Math.max(
    ...data.map(d => wrapLabel(d.label, charsPerLine).length)
  )
  const longestLabel = Math.max(
    ...data.map(d =>
      Math.max(...wrapLabel(d.label, charsPerLine).map(l => l.length))
    )
  )
  const xAxisHeight = rotateLabels
    ? // ~0.62em per char at 11px, projected onto the vertical by sin(45°).
      Math.min(160, Math.round(longestLabel * 6.8 * 0.71) + maxLines * 12 + 16)
    : maxLines * 14 + 20

  // With many bars the per-bar value labels collide with each other just as
  // the axis labels do. The tooltip still gives the exact figure on hover.
  const showValueLabels = data.length <= 12

  // Decide chart body based on chartType. Pie shares the same data
  // shape; bar + line share axis layout.
  const renderBody = () => {
    if (chartType === "pie") {
      const total = data.reduce((acc, d) => acc + d.value, 0) || 1
      return (
        <ResponsiveContainer width="100%" height={420}>
          <PieChart>
            <Tooltip
              formatter={(value: number | undefined, _name: any, ctx: any) => {
                const pct = (((value ?? 0) / total) * 100).toFixed(1)
                return [
                  `${formatValue(value ?? 0)} (${pct}%)`,
                  ctx?.payload?.label
                ]
              }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
            />
            <Legend />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={150}
              /* Per-slice labels overlap once the slices get thin, so past a
                 dozen categories the legend and tooltip carry the naming. */
              label={
                data.length <= 12
                  ? (entry: any) =>
                      `${entry.label}: ${formatValue(Number(entry.value))}`
                  : false
              }
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      )
    }

    const sharedAxes = (
      <>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="label"
          tick={renderCustomTick(charsPerLine, rotateLabels)}
          height={xAxisHeight}
          interval={0}
          tickLine={false}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 12 }}
          tickFormatter={formatValue}
          label={
            yAxisLabel
              ? {
                  value: yAxisLabel,
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fontSize: 13 },
                  offset: -5
                }
              : undefined
          }
        />
        <Tooltip
          formatter={(value: number | undefined) => [
            formatValue(value ?? 0),
            yAxisLabel || "Value"
          ]}
          labelFormatter={(label: any) => String(label)}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
        />
      </>
    )

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={400 + xAxisHeight}>
          <LineChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: yAxisLabel ? 20 : 10,
              bottom: 10
            }}
          >
            {sharedAxes}
            <Line
              type="monotone"
              dataKey="value"
              name={yAxisLabel || "Value"}
              stroke={COLORS[0]}
              strokeWidth={2.5}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            >
              {showValueLabels && (
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={((v: any) => formatValue(Number(v))) as any}
                  style={{ fontSize: 11, fill: "#1f2937" }}
                />
              )}
            </Line>
          </LineChart>
        </ResponsiveContainer>
      )
    }

    // Default: bar chart (the existing renderer).
    return (
      <ResponsiveContainer width="100%" height={400 + xAxisHeight}>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: yAxisLabel ? 20 : 10,
            bottom: 10
          }}
        >
          {sharedAxes}
          <Bar
            dataKey="value"
            name={yAxisLabel || "Value"}
            radius={[4, 4, 0, 0]}
            maxBarSize={80}
          >
            {showValueLabels && (
              <LabelList
                dataKey="value"
                position="top"
                formatter={((v: any) => formatValue(Number(v))) as any}
                style={{ fontSize: 11, fill: "#1f2937" }}
              />
            )}
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="w-full rounded-lg border p-4">
      {chartTitle && (
        <h3 className="mb-4 text-center text-lg font-semibold">{chartTitle}</h3>
      )}
      {renderBody()}
    </div>
  )
}
