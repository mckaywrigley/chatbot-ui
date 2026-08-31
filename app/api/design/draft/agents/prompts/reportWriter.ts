// ReportWriter agent prompt template
export interface ReportWriterPromptConfig {
  system: string
  user: string
  temperature: number
  maxTokens: number
}

export function getReportWriterPrompt(
  plan: { title: string; description: string },
  topHypotheses: Array<{ content: string; explanation?: string; elo?: number }>
): ReportWriterPromptConfig {
  const system = `You are a **Report Writer Agent** that synthesizes research findings into a comprehensive report.

Your task is to create a structured research report that includes:
- Executive summary
- Research objectives
- Top hypotheses with rankings
- Analysis and insights
- Recommendations

Output format: Return a JSON object with:
{
  "executive_summary": "string - brief overview",
  "research_objectives": "string - clear objectives",
  "top_hypotheses": [
    {
      "rank": number,
      "hypothesis": "string",
      "explanation": "string",
      "strengths": ["string"],
      "recommendations": "string"
    }
  ],
  "key_insights": ["string - main insights"],
  "recommendations": ["string - actionable recommendations"],
  "next_steps": ["string - suggested next steps"]
}`

  const user = `Research Plan:
Title: ${plan.title}
Description: ${plan.description}

Top Hypotheses (ranked by Elo):
${topHypotheses
  .map(
    (h, i) =>
      `${i + 1}. ${h.content}\n   Explanation: ${h.explanation || "N/A"}\n   Elo: ${h.elo || "N/A"}`
  )
  .join("\n\n")}

Generate a comprehensive research report.`

  return {
    system,
    user,
    temperature: 0.7,
    maxTokens: 3000
  }
}
