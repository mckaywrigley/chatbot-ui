import { LLM } from "@/types"

const PERPLEXITY_PLATORM_LINK =
  "https://docs.perplexity.ai/docs/getting-started"

// Perplexity Models (UPDATED 3/16/26) -----------------------------
// Documentation: https://docs.perplexity.ai/guides/model-cards

// Sonar Reasoning Pro - Advanced search with Chain of Thought reasoning
const SONAR_REASONING_PRO: LLM = {
  modelId: "sonar-reasoning-pro",
  modelName: "Sonar Reasoning Pro",
  provider: "perplexity",
  hostedId: "sonar-reasoning-pro",
  platformLink: PERPLEXITY_PLATORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 2,
    outputCost: 8
  }
}

// Sonar Reasoning - Cost-effective reasoning model
const SONAR_REASONING: LLM = {
  modelId: "sonar-reasoning",
  modelName: "Sonar Reasoning",
  provider: "perplexity",
  hostedId: "sonar-reasoning",
  platformLink: PERPLEXITY_PLATORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 1,
    outputCost: 5
  }
}

// Sonar Pro - Advanced search for complex queries
const SONAR_PRO: LLM = {
  modelId: "sonar-pro",
  modelName: "Sonar Pro",
  provider: "perplexity",
  hostedId: "sonar-pro",
  platformLink: PERPLEXITY_PLATORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 3,
    outputCost: 15
  }
}

// Sonar - Lightweight model for simple tasks
const SONAR: LLM = {
  modelId: "sonar",
  modelName: "Sonar",
  provider: "perplexity",
  hostedId: "sonar",
  platformLink: PERPLEXITY_PLATORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 1,
    outputCost: 1
  }
}

// Sonar Deep Research - Expert-level research model
const SONAR_DEEP_RESEARCH: LLM = {
  modelId: "sonar-deep-research",
  modelName: "Sonar Deep Research",
  provider: "perplexity",
  hostedId: "sonar-deep-research",
  platformLink: PERPLEXITY_PLATORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 2,
    outputCost: 8
  }
}

export const PERPLEXITY_LLM_LIST: LLM[] = [
  SONAR_REASONING_PRO,
  SONAR_REASONING,
  SONAR_PRO,
  SONAR,
  SONAR_DEEP_RESEARCH
]
