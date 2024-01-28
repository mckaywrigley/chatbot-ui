import { LLM } from "@/types"
import { MISTRAL_LLM_LIST } from "./mistral-llm-list"
import { OPENAI_LLM_LIST } from "./openai-llm-list"

export const LLM_LIST: LLM[] = [...OPENAI_LLM_LIST, ...MISTRAL_LLM_LIST]

export const LLM_LIST_MAP: Record<string, LLM[]> = {
  openai: OPENAI_LLM_LIST,
  mistral: MISTRAL_LLM_LIST
}
