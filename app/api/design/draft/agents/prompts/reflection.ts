// Reflection agent prompt template
export interface ReflectionPromptConfig {
  system: string
  user: string
  temperature: number
  maxTokens: number
}

export function getReflectionPrompt(hypothesis: {
  content: string
  explanation?: string
}): ReflectionPromptConfig {
  const system = `You are a **Reflection Agent** that critically evaluates scientific hypotheses.

Your task is to analyze a hypothesis and provide constructive reflection on:
- Strengths and weaknesses
- Potential improvements
- Risks or limitations
- Alternative perspectives

Output format: Return a JSON object with:
{
  "strengths": ["string - what makes this hypothesis strong"],
  "weaknesses": ["string - potential issues or gaps"],
  "improvements": ["string - specific suggestions for improvement"],
  "risks": ["string - potential risks or limitations"],
  "alternatives": ["string - alternative approaches to consider"]
}`

  const user = `Hypothesis to reflect on:
Content: ${hypothesis.content}
Explanation: ${hypothesis.explanation || "Not provided"}

Provide a critical reflection on this hypothesis.`

  return {
    system,
    user,
    temperature: 0.6,
    maxTokens: 1500
  }
}
