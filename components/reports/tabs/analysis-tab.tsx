"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FC } from "react"
import { ReportSection } from "./report-section"

interface AnalysisTabProps {
  draft: Record<string, any> | null
  chartImage: string | null
  regenerating: string | null
  onRegenerate: (sectionKey: string, feedback: string) => Promise<void>
}

const SECTIONS: Array<{ key: string; title: string }> = [
  { key: "dataAnalysis", title: "Data Analysis" },
  { key: "results", title: "Results" },
  { key: "discussion", title: "Discussion" },
  { key: "conclusion", title: "Conclusion" },
  { key: "nextSteps", title: "Next Steps" }
]

export const AnalysisTab: FC<AnalysisTabProps> = ({
  draft,
  chartImage,
  regenerating,
  onRegenerate
}) => {
  return (
    <div className="space-y-4">
      {chartImage && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sage-brand text-lg">Chart</CardTitle>
          </CardHeader>
          <CardContent>
            {/* chartImage is a base64 data URI from the chart backend -
                next/image doesn't support data URIs. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={chartImage}
              alt="Report chart"
              className="border-ink-100 max-w-full rounded-lg border"
            />
          </CardContent>
        </Card>
      )}

      {SECTIONS.map(section => {
        const raw = draft?.[section.key]
        const content =
          typeof raw === "string"
            ? raw
            : raw
              ? JSON.stringify(raw, null, 2)
              : ""
        return (
          <ReportSection
            key={section.key}
            sectionKey={section.key}
            title={section.title}
            content={content}
            onRegenerate={onRegenerate}
            isBusy={regenerating === section.key}
            accentClassName="text-sage-brand"
          />
        )
      })}
    </div>
  )
}
