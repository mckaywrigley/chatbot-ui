// Proximity agent prompt template (for semantic similarity/embedding)
export interface ProximityPromptConfig {
  system: string
  user: string
  temperature: number
  maxTokens: number
}

export function getProximityPrompt(
  hypothesisA: string,
  hypothesisB: string
): ProximityPromptConfig {
  const system = `You are a **Proximity Agent** that evaluates semantic similarity between hypotheses.

Your task is to assess how similar two hypotheses are in terms of:
- Core concepts and variables
- Research approach
- Expected outcomes
- Domain overlap

Output format: Return a JSON object with:
{
  "similarity_score": number (0-1),
  "concept_overlap": number (0-1),
  "approach_similarity": number (0-1),
  "shared_variables": ["string - variables mentioned in both"],
  "key_differences": ["string - main differences"]
}`

  const user = `Compare the semantic similarity of these hypotheses:

Hypothesis A: ${hypothesisA}

Hypothesis B: ${hypothesisB}

Assess their similarity and differences.`

  return {
    system,
    user,
    temperature: 0.3,
    maxTokens: 800
  }
}
