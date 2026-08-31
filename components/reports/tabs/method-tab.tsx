"use client"

import { FC } from "react"
import { ReportSection } from "./report-section"

interface MethodTabProps {
  draft: Record<string, any> | null
  regenerating: string | null
  onRegenerate: (sectionKey: string, feedback: string) => Promise<void>
}

const SECTIONS: Array<{ key: string; title: string }> = [
  { key: "material", title: "Material" },
  { key: "preparation", title: "Preparation" },
  { key: "procedure", title: "Procedure" },
  { key: "setup", title: "Setup" }
]

export const MethodTab: FC<MethodTabProps> = ({
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
            accentClassName="text-orange-product"
          />
        )
      })}
    </div>
  )
}
