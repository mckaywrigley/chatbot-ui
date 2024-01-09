import { LLM } from "@/types"

const PERPLEXITY_PLATORM_LINK =
  "https://docs.perplexity.ai/docs/getting-started"

// Perplexity Models (UPDATED 12/21/23) -----------------------------

// Perplexity Online 7B (UPDATED 12/21/23)
const PERPLEXITY_ONLINE_7B: LLM = {
  modelId: "pplx-7b-online",
  modelName: "Perplexity Online 7B",
  provider: "perplexity",
  hostedId: "pplx-7b-online",
  platformLink: PERPLEXITY_PLATORM_LINK,
  imageInput: false
}

// Perplexity Online 70B (UPDATED 12/21/23)
const PERPLEXITY_ONLINE_70B: LLM = {
  modelId: "pplx-70b-online",
  modelName: "Perplexity Online 70B",
  provider: "perplexity",
  hostedId: "pplx-70b-online",
  platformLink: PERPLEXITY_PLATORM_LINK,
  imageInput: false
}

export const PERPLEXITY_LLM_LIST: LLM[] = [
  PERPLEXITY_ONLINE_7B,
  PERPLEXITY_ONLINE_70B
]
