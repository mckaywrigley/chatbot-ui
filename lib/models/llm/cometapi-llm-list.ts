import { LLM } from "@/types"

const COMETAPI_PLATFORM_LINK = "https://www.cometapi.com/"

// CometAPI Models (OpenAI-compatible) -----------------------------

// GPT-4o mini
const COMETAPI_GPT4o_MINI: LLM = {
  modelId: "cometapi-gpt-4o-mini",
  modelName: "CometAPI GPT-4o mini",
  provider: "cometapi",
  hostedId: "gpt-4o-mini",
  platformLink: COMETAPI_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.15,
    outputCost: 0.6
  }
}

// GPT-4o
const COMETAPI_GPT4o: LLM = {
  modelId: "cometapi-gpt-4o",
  modelName: "CometAPI GPT-4o",
  provider: "cometapi",
  hostedId: "gpt-4o",
  platformLink: COMETAPI_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 5,
    outputCost: 15
  }
}

// GPT-4 Turbo
const COMETAPI_GPT4_TURBO: LLM = {
  modelId: "cometapi-gpt-4-turbo",
  modelName: "CometAPI GPT-4 Turbo",
  provider: "cometapi",
  hostedId: "gpt-4-turbo",
  platformLink: COMETAPI_PLATFORM_LINK,
  imageInput: true,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 10,
    outputCost: 30
  }
}

// GPT-3.5 Turbo
const COMETAPI_GPT35_TURBO: LLM = {
  modelId: "cometapi-gpt-3-5-turbo",
  modelName: "CometAPI GPT-3.5 Turbo",
  provider: "cometapi",
  hostedId: "gpt-3.5-turbo",
  platformLink: COMETAPI_PLATFORM_LINK,
  imageInput: false,
  pricing: {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.5,
    outputCost: 1.5
  }
}

export const COMETAPI_LLM_LIST: LLM[] = [
  COMETAPI_GPT4o_MINI,
  COMETAPI_GPT4o,
  COMETAPI_GPT4_TURBO,
  COMETAPI_GPT35_TURBO
]
