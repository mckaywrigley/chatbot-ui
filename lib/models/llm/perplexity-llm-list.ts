import { LLM } from "@/types"

const PERPLEXITY_PLATFORM_LINK =
  "https://docs.perplexity.ai/docs/model-cards"

// Perplexity Models (UPDATED [DATE]) -----------------------------
// API Documentation: https://docs.perplexity.ai/docs/model-cards

// Sonar Reasoning Pro - Advanced search capabilities with Chain of Thought reasoning
const PERPLEXITY_SONAR_REASONING_PRO: LLM = {
  modelId: "sonar-reasoning-pro",
  modelName: "Sonar Reasoning Pro",
  provider: "perplexity",
  hostedId: "sonar-reasoning-pro",
  platformLink: PERPLEXITY_PLATFORM_LINK,
  imageInput: false
}

// Sonar Reasoning - Cost-effective model for complex queries with Chain of Thought
const PERPLEXITY_SONAR_REASONING: LLM = {
  modelId: "sonar-reasoning",
  modelName: "Sonar Reasoning",
  provider: "perplexity",
  hostedId: "sonar-reasoning",
  platformLink: PERPLEXITY_PLATFORM_LINK,
  imageInput: false
}

// Sonar Pro - Advanced search capabilities for complex queries
const PERPLEXITY_SONAR_PRO: LLM = {
  modelId: "sonar-pro",
  modelName: "Sonar Pro",
  provider: "perplexity",
  hostedId: "sonar-pro",
  platformLink: PERPLEXITY_PLATFORM_LINK,
  imageInput: false
}

// Sonar - Lightweight model for simple tasks, quick completions
const PERPLEXITY_SONAR: LLM = {
  modelId: "sonar",
  modelName: "Sonar",
  provider: "perplexity",
  hostedId: "sonar",
  platformLink: PERPLEXITY_PLATFORM_LINK,
  imageInput: false
}

// Sonar Deep Research - Expert-level research model for comprehensive queries
const PERPLEXITY_SONAR_DEEP_RESEARCH: LLM = {
  modelId: "sonar-deep-research",
  modelName: "Sonar Deep Research",
  provider: "perplexity",
  hostedId: "sonar-deep-research",
  platformLink: PERPLEXITY_PLATFORM_LINK,
  imageInput: false
}

export const PERPLEXITY_LLM_LIST: LLM[] = [
  PERPLEXITY_SONAR_REASONING_PRO,
  PERPLEXITY_SONAR_REASONING,
  PERPLEXITY_SONAR_PRO,
  PERPLEXITY_SONAR,
  PERPLEXITY_SONAR_DEEP_RESEARCH
]
