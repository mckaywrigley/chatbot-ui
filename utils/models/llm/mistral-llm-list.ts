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
  modelId: "mistral-small",
  modelName: "Mistral Small",
  provider: "mistral",
  hostedId: "mistral-small",
  platformLink: MISTRAL_PLATORM_LINK,
  imageInput: false
}

// Mistral Medium (UPDATED 12/21/23)
const MISTRAL_MEDIUM: LLM = {
  modelId: "mistral-medium",
  modelName: "Mistral Medium",
  provider: "mistral",
  hostedId: "mistral-medium",
  platformLink: MISTRAL_PLATORM_LINK,
  imageInput: false
}

export const MISTRAL_LLM_LIST: LLM[] = [MISTRAL_7B, MIXTRAL, MISTRAL_MEDIUM]
