import { LLM } from "@/types"

const MISTRAL_PLATORM_LINK = "https://docs.mistral.ai/"

// Mistral Models (UPDATED 12/21/23) -----------------------------

// Mistral 7B (UPDATED 12/21/23)
const MISTRAL_7B: LLM = {
  modelId: "mistral-tiny",
  modelName: "Mistral Tiny",
  provider: "mistral",
  hostedId: "mistral-tiny",
  platformLink: MISTRAL_PLATORM_LINK,
  imageInput: false
}

// Mixtral (UPDATED 12/21/23)
const MIXTRAL: LLM = {
  modelId: "mistral-small-latest",
  modelName: "Mistral Small",
  provider: "mistral",
  hostedId: "mistral-small-latest",
  platformLink: MISTRAL_PLATORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 2,
    outputCost: 6
  }
}

// Mistral Medium (UPDATED 12/21/23)
const MISTRAL_MEDIUM: LLM = {
  modelId: "mistral-medium-latest",
  modelName: "Mistral Medium",
  provider: "mistral",
  hostedId: "mistral-medium-latest",
  platformLink: MISTRAL_PLATORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 2.7,
    outputCost: 8.1
  }
}

// Mistral Large (UPDATED 03/05/24)
const MISTRAL_LARGE: LLM = {
  modelId: "mistral-large-latest",
  modelName: "Mistral Large",
  provider: "mistral",
  hostedId: "mistral-large-latest",
  platformLink: MISTRAL_PLATORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 8,
    outputCost: 24
  }
}

export const MISTRAL_LLM_LIST: LLM[] = [
  MISTRAL_7B,
  MIXTRAL,
  MISTRAL_MEDIUM,
  MISTRAL_LARGE
]
