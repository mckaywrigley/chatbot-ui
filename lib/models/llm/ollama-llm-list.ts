import { LLM } from "@/types"

const OLLAMACPP: LLM = {
  modelId: "llama-2-70b-chat",
  modelName: "Prozorro assistant", // Todo
  provider: "ollamacpp",
  hostedId: "ollamacpp-preview",
  platformLink: "",
  imageInput: true
}

export const OLLAMACPP_LIST: LLM[] = [OLLAMACPP]
