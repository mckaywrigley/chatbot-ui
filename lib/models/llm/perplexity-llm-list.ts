import { LLM } from "@/types"

const PERPLEXITY_PLATORM_LINK =
  "https://docs.perplexity.ai/docs/getting-started"

// Perplexity Models (UPDATED 1/31/24) -----------------------------

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

// Perplexity Chat 7B (UPDATED 1/31/24)
const PERPLEXITY_CHAT_7B: LLM = {
  modelId: "pplx-7b-chat",
  modelName: "Perplexity Chat 7B",
  provider: "perplexity",
  hostedId: "pplx-7b-chat",
  platformLink: PERPLEXITY_PLATORM_LINK,
  imageInput: false
}

// Perplexity Chat 70B (UPDATED 1/31/24)
const PERPLEXITY_CHAT_70B: LLM = {
  modelId: "pplx-70b-chat",
  modelName: "Perplexity Chat 70B",
  provider: "perplexity",
  hostedId: "pplx-70b-chat",
  platformLink: PERPLEXITY_PLATORM_LINK,
  imageInput: false
}

// Mixtral 8x7B Instruct (UPDATED 1/31/24)
const MIXTRAL_8X7B_INSTRUCT: LLM = {
  modelId: "mixtral-8x7b-instruct",
  modelName: "Mixtral 8x7B Instruct",
  provider: "perplexity",
  hostedId: "mixtral-8x7b-instruct",
  platformLink: PERPLEXITY_PLATORM_LINK,
  imageInput: false
}

// Mistral 7B Instruct (UPDATED 1/31/24)
const MISTRAL_7B_INSTRUCT: LLM = {
  modelId: "mistral-7b-instruct",
  modelName: "Mistral 7B Instruct",
  provider: "perplexity",
  hostedId: "mistral-7b-instruct",
  platformLink: PERPLEXITY_PLATORM_LINK,
  imageInput: false
}

// Llama2 70B Chat (UPDATED 1/31/24)
const LLAMA_2_70B_CHAT: LLM = {
  modelId: "llama-2-70b-chat",
  modelName: "Llama2 70B Chat",
  provider: "perplexity",
  hostedId: "llama-2-70b-chat",
  platformLink: PERPLEXITY_PLATORM_LINK,
  imageInput: false
}

// CodeLlama 34B Instruct (UPDATED 1/31/24)
const CODELLAMA_34B_INSTRUCT: LLM = {
  modelId: "codellama-34b-instruct",
  modelName: "CodeLlama 34B Instruct",
  provider: "perplexity",
  hostedId: "codellama-34b-instruct",
  platformLink: PERPLEXITY_PLATORM_LINK,
  imageInput: false
}

// CodeLlama 70B Instruct (UPDATED 1/31/24)
const CODELLAMA_70B_INSTRUCT: LLM = {
  modelId: "codellama-70b-instruct",
  modelName: "CodeLlama 70B Instruct",
  provider: "perplexity",
  hostedId: "codellama-70b-instruct",
  platformLink: PERPLEXITY_PLATORM_LINK,
  imageInput: false
}

export const PERPLEXITY_LLM_LIST: LLM[] = [
  PERPLEXITY_ONLINE_7B,
  PERPLEXITY_ONLINE_70B,
  PERPLEXITY_CHAT_7B,
  PERPLEXITY_CHAT_70B,
  MIXTRAL_8X7B_INSTRUCT,
  MISTRAL_7B_INSTRUCT,
  LLAMA_2_70B_CHAT,
  CODELLAMA_34B_INSTRUCT,
  CODELLAMA_70B_INSTRUCT
]
