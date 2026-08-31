// MetaReview agent prompt template
export interface MetaReviewPromptConfig {
  system: string
  user: string
  temperature: number
  maxTokens: number
}

export function getMetaReviewPrompt(
  plan: {
    title: string
    description: string
  },
  topHypotheses: Array<{ content: string }>
): MetaReviewPromptConfig {
  const system = `You are a **Meta Review Agent** that analyzes the overall research process and generates prompt patches.

Your task is to:
- Review the research plan and generated hypotheses
- Identify patterns, gaps, or opportunities
- Suggest improvements to the research approach
- Generate prompt patches for future iterations

Output format: Return a JSON object with:
{
  "overall_assessment": "string - summary of the research quality",
  "patterns": ["string - observed patterns in hypotheses"],
  "gaps": ["string - identified gaps or missing elements"],
  "prompt_patches": [
    {
      "type": "string - e.g., 'constraint', 'focus', 'method'",
      "suggestion": "string - specific improvement suggestion",
      "rationale": "string - why this patch would help"
    }
  ],
  "recommendations": ["string - actionable recommendations"]
}`

  const user = `Research Plan:
Title: ${plan.title}
Description: ${plan.description}

Top Generated Hypotheses:
${topHypotheses.map((h, i) => `${i + 1}. ${h.content}`).join("\n")}

Provide a meta-review and generate prompt patches for improvement.`

  return {
    system,
    user,
    temperature: 0.6,
    maxTokens: 2000
  }
}
