import { LLM } from "@/types"

const TOGETHER_PLATFORM_LINK = "https://docs.together.ai/docs/quickstart"

// Together Models (UPDATED 5/5/24) -----------------------------

// Meta Llama 8B Instruct
const METALLAMA_8B_INSTRUCT: LLM = {
  modelId: "meta-llama/Llama-3-8b-chat-hf",
  modelName: "Meta Llama 3 8b Instruct",
  provider: "together",
  hostedId: "meta-llama/Llama-3-8b-chat-hf",
  platformLink: TOGETHER_PLATFORM_LINK,
  imageInput: false
}

// Meta Llama 70B Instruct
const METALLAMA_70B_INSTRUCT: LLM = {
  modelId: "meta-llama/Llama-3-70b-chat-hf",
  modelName: "Meta Llama 3 70b Instruct",
  provider: "together",
  hostedId: "meta-llama/Llama-3-70b-chat-hf",
  platformLink: TOGETHER_PLATFORM_LINK,
  imageInput: false
}

export const TOGETHER_LLM_LIST = [METALLAMA_8B_INSTRUCT, METALLAMA_70B_INSTRUCT]
