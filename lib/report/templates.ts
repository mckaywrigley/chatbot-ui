export type ReportSectionDef = {
  key: string
  title: string
  group: string
  accentClassName: string
}

export type ReportTemplate = {
  id: string
  name: string
  description: string
  /**
   * Short use-case caption shown below the section/visualization summary
   * on the template card. Scientist-facing: "use this when…". Kept to
   * 3-5 words by convention.
   */
  useCase: string
  sections: ReportSectionDef[]
  includeChart: boolean
}

const ACCENT_BY_GROUP: Record<string, string> = {
  Theory: "text-purple-persona",
  Method: "text-orange-product",
  "Data Analysis": "text-sage-brand",
  Analysis: "text-sage-brand",
  Summary: "text-teal-journey"
}

const accent = (group: string) => ACCENT_BY_GROUP[group] ?? "text-ink-900"

const fullSections: ReportSectionDef[] = [
  {
    key: "aim",
    title: "Aim",
    group: "Theory",
    accentClassName: accent("Theory")
  },
  {
    key: "introduction",
    title: "Introduction",
    group: "Theory",
    accentClassName: accent("Theory")
  },
  {
    key: "principle",
    title: "Principle",
    group: "Theory",
    accentClassName: accent("Theory")
  },
  {
    key: "material",
    title: "Material",
    group: "Method",
    accentClassName: accent("Method")
  },
  {
    key: "preparation",
    title: "Preparation",
    group: "Method",
    accentClassName: accent("Method")
  },
  {
    key: "procedure",
    title: "Procedure",
    group: "Method",
    accentClassName: accent("Method")
  },
  {
    key: "setup",
    title: "Setup",
    group: "Method",
    accentClassName: accent("Method")
  },
  {
    key: "dataAnalysis",
    title: "Data Analysis",
    group: "Data Analysis",
    accentClassName: accent("Data Analysis")
  },
  {
    key: "results",
    title: "Results",
    group: "Data Analysis",
    accentClassName: accent("Data Analysis")
  },
  {
    key: "discussion",
    title: "Discussion",
    group: "Data Analysis",
    accentClassName: accent("Data Analysis")
  },
  {
    key: "conclusion",
    title: "Conclusion",
    group: "Data Analysis",
    accentClassName: accent("Data Analysis")
  },
  {
    key: "nextSteps",
    title: "Next Steps",
    group: "Data Analysis",
    accentClassName: accent("Data Analysis")
  }
]

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "scientific",
    name: "Scientific Report",
    description:
      "Full lab-style report with Theory, Method, and Data Analysis sections.",
    useCase: "Documentation / record keeping",
    sections: fullSections,
    includeChart: true
  },
  {
    id: "data-analysis",
    name: "Data Analysis Report",
    description: "Focused on results, charts, discussion, and next steps.",
    useCase: "Sharing findings with PI",
    sections: [
      {
        key: "aim",
        title: "Aim",
        group: "Summary",
        accentClassName: accent("Summary")
      },
      {
        key: "dataAnalysis",
        title: "Data Analysis",
        group: "Data Analysis",
        accentClassName: accent("Data Analysis")
      },
      {
        key: "results",
        title: "Results",
        group: "Data Analysis",
        accentClassName: accent("Data Analysis")
      },
      {
        key: "discussion",
        title: "Discussion",
        group: "Data Analysis",
        accentClassName: accent("Data Analysis")
      },
      {
        key: "conclusion",
        title: "Conclusion",
        group: "Data Analysis",
        accentClassName: accent("Data Analysis")
      },
      {
        key: "nextSteps",
        title: "Next Steps",
        group: "Data Analysis",
        accentClassName: accent("Data Analysis")
      }
    ],
    includeChart: true
  },
  {
    id: "executive-summary",
    name: "Executive Summary",
    description: "A short overview with aim, key results, and conclusion.",
    useCase: "Group meeting / presentation update",
    sections: [
      {
        key: "aim",
        title: "Aim",
        group: "Summary",
        accentClassName: accent("Summary")
      },
      {
        key: "introduction",
        title: "Introduction",
        group: "Summary",
        accentClassName: accent("Summary")
      },
      {
        key: "results",
        title: "Key Results",
        group: "Data Analysis",
        accentClassName: accent("Data Analysis")
      },
      {
        key: "conclusion",
        title: "Conclusion",
        group: "Data Analysis",
        accentClassName: accent("Data Analysis")
      }
    ],
    includeChart: true
  }
]

export const DEFAULT_TEMPLATE_ID = "scientific"

export const getTemplate = (id?: string | null): ReportTemplate => {
  const match = REPORT_TEMPLATES.find(t => t.id === id)
  return match ?? REPORT_TEMPLATES[0]
}

export const getSectionGroups = (template: ReportTemplate) => {
  const groups: Array<{
    label: string
    accentClassName: string
    sections: ReportSectionDef[]
  }> = []
  for (const section of template.sections) {
    const existing = groups.find(g => g.label === section.group)
    if (existing) {
      existing.sections.push(section)
    } else {
      groups.push({
        label: section.group,
        accentClassName: section.accentClassName,
        sections: [section]
      })
    }
  }
  return groups
}
