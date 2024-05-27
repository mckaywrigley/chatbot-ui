import { LLM } from "@/types"

const OPENAI_PLATORM_LINK = "https://platform.openai.com/docs/overview"

// OpenAI Models (UPDATED 12/18/23) -----------------------------

const GPT4o: LLM = {
  modelId: "gpt-4o",
  modelName: "GPT-4o",
  provider: "openai",
  hostedId: "gpt-4o",
  platformLink: OPENAI_PLATORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 5,
    outputCost: 15
  }
}

// GPT-4 Turbo (UPDATED 12/18/23)
const GPT4Turbo: LLM = {
  modelId: "gpt-4-turbo-preview",
  modelName: "GPT-4 Turbo",
  provider: "openai",
  hostedId: "gpt-4-1106-preview",
  platformLink: OPENAI_PLATORM_LINK,
  imageInput: true
}

// GPT-4 Vision (UPDATED 12/18/23)
const GPT4Vision: LLM = {
  modelId: "gpt-4-vision-preview",
  modelName: "GPT-4 Vision",
  provider: "openai",
  hostedId: "gpt-4-vision-preview",
  platformLink: OPENAI_PLATORM_LINK,
  imageInput: true
}

// GPT-3.5 Turbo (UPDATED 12/18/23)
const GPT3_5Turbo: LLM = {
  modelId: "gpt-3.5-turbo-1106",
  modelName: "GPT-3.5 Turbo",
  provider: "openai",
  hostedId: "gpt-3.5-turbo-1106",
  platformLink: OPENAI_PLATORM_LINK,
  imageInput: false
}

export const OPENAI_LLM_LIST: LLM[] = [
  GPT4o,
  GPT4Turbo,
  GPT4Vision,
  GPT4,
  GPT3_5Turbo
]
