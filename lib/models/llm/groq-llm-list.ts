import { LLM } from "@/types"

const GROQ_PLATORM_LINK = "https://groq.com/"

const LLaMA2_70B: LLM = {
  modelId: "llama2-70b-4096",
  modelName: "LLaMA2-70b-chat",
  provider: "groq",
  hostedId: "llama2-70b-4096",
  platformLink: GROQ_PLATORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.7,
    outputCost: 0.8
  }
}

const MIXTRAL_8X7B: LLM = {
  modelId: "mixtral-8x7b-32768",
  modelName: "Mixtral-8x7b-Instruct-v0.1",
  provider: "groq",
  hostedId: "mixtral-8x7b-32768",
  platformLink: GROQ_PLATORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.27,
    outputCost: 0.27
  }
}

export const GROQ_LLM_LIST: LLM[] = [LLaMA2_70B, MIXTRAL_8X7B]
