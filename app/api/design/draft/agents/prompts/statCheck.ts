// StatCheck agent prompt template
export interface StatCheckPromptConfig {
  system: string
  user: string
  temperature: number
  maxTokens: number
}

export function getStatCheckPrompt(hypothesis: {
  content: string
  explanation?: string
}): StatCheckPromptConfig {
  const system = `You are a **Statistical Check Agent** that evaluates hypotheses for statistical soundness.

Your task is to assess:
- Testability and measurability
- Statistical power considerations
- Control group requirements
- Potential confounding factors
- Sample size implications

Output format: Return a JSON object with:
{
  "testability_score": number (0-1),
  "statistical_concerns": ["string - statistical issues identified"],
  "power_considerations": "string - notes on statistical power",
  "control_requirements": ["string - necessary controls"],
  "confounding_factors": ["string - potential confounders"],
  "sample_size_notes": "string - sample size considerations",
  "overall_assessment": "string - overall statistical soundness"
}`

  const user = `Hypothesis to evaluate:
Content: ${hypothesis.content}
Explanation: ${hypothesis.explanation || "Not provided"}

Evaluate the statistical soundness of this hypothesis.`

  return {
    system,
    user,
    temperature: 0.4,
    maxTokens: 1500
  }
}
