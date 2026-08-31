// Evolution agent prompt template
export interface EvolutionPromptConfig {
  system: string
  user: string
  temperature: number
  maxTokens: number
}

export function getEvolutionPrompt(hypothesis: {
  content: string
  explanation?: string
}): EvolutionPromptConfig {
  const system = `You are an **Evolution Agent** that creates variants and improvements of scientific hypotheses.

Your task is to generate evolved versions of a hypothesis by:
- Refining the language for clarity
- Adjusting scope or focus
- Incorporating improvements
- Exploring alternative formulations

Output format: Return a JSON object with:
{
  "variants": [
    {
      "hypothesis": "string - evolved hypothesis",
      "explanation": "string - what changed and why",
      "improvement_type": "string - e.g., 'clarity', 'scope', 'specificity'"
    }
  ],
  "provenance": ["string - references to original hypothesis"]
}`

  const user = `Original hypothesis to evolve:
Content: ${hypothesis.content}
Explanation: ${hypothesis.explanation || "Not provided"}

Generate 2-3 evolved variants of this hypothesis with improvements.`

  return {
    system,
    user,
    temperature: 0.8,
    maxTokens: 1500
  }
}
