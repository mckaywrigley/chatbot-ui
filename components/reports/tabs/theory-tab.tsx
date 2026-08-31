"use client"

import { FC } from "react"
import { ReportSection } from "./report-section"

interface TheoryTabProps {
  draft: Record<string, any> | null
  regenerating: string | null
  onRegenerate: (sectionKey: string, feedback: string) => Promise<void>
}

const SECTIONS: Array<{ key: string; title: string }> = [
  { key: "aim", title: "Aim" },
  { key: "introduction", title: "Introduction" },
  { key: "principle", title: "Principle" }
]

export const TheoryTab: FC<TheoryTabProps> = ({
  draft,
  regenerating,
  onRegenerate
}) => {
  return (
    <div className="space-y-4">
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
            accentClassName="text-purple-persona"
          />
        )
      })}
    </div>
  )
}
