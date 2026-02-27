import { LLM } from "@/types"

const AVIAN_PLATFORM_LINK = "https://avian.io"

const DEEPSEEK_V3_2: LLM = {
  modelId: "deepseek/deepseek-v3.2",
  modelName: "DeepSeek V3.2",
  provider: "avian",
  hostedId: "deepseek/deepseek-v3.2",
  platformLink: AVIAN_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.26,
    outputCost: 0.38
  }
}

const KIMI_K2_5: LLM = {
  modelId: "moonshotai/kimi-k2.5",
  modelName: "Kimi K2.5",
  provider: "avian",
  hostedId: "moonshotai/kimi-k2.5",
  platformLink: AVIAN_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.45,
    outputCost: 2.2
  }
}

const GLM_5: LLM = {
  modelId: "z-ai/glm-5",
  modelName: "GLM-5",
  provider: "avian",
  hostedId: "z-ai/glm-5",
  platformLink: AVIAN_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.3,
    outputCost: 2.55
  }
}

const MINIMAX_M2_5: LLM = {
  modelId: "minimax/minimax-m2.5",
  modelName: "MiniMax M2.5",
  provider: "avian",
  hostedId: "minimax/minimax-m2.5",
  platformLink: AVIAN_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.3,
    outputCost: 1.1
  }
}

export const AVIAN_LLM_LIST: LLM[] = [
  DEEPSEEK_V3_2,
  KIMI_K2_5,
  GLM_5,
  MINIMAX_M2_5
]
