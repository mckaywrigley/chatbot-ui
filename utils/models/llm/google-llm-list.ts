import { LLM } from "@/types"

const GOOGLE_PLATORM_LINK = "https://ai.google.dev/"

// Google Models (UPDATED 12/22/23) -----------------------------

// Gemini Pro (UPDATED 12/22/23)
const GEMINI_PRO: LLM = {
  modelId: "gemini-pro",
  modelName: "Gemini Pro",
  provider: "google",
  hostedId: "gemini-pro",
  platformLink: GOOGLE_PLATORM_LINK,
  imageInput: false
}

// Gemini Pro Vision (UPDATED 12/22/23)
const GEMINI_PRO_VISION: LLM = {
  modelId: "gemini-pro-vision",
  modelName: "Gemini Pro Vision",
  provider: "google",
  hostedId: "gemini-pro-vision",
  platformLink: GOOGLE_PLATORM_LINK,
  imageInput: true
}

export const GOOGLE_LLM_LIST: LLM[] = [GEMINI_PRO, GEMINI_PRO_VISION]
