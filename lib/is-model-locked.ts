import { Tables } from "@/supabase/types"
import { ModelProvider } from "@/types"

export const isModelLocked = (
  provider: ModelProvider,
  profile: Tables<"profiles">
) => {
  if (!profile) return false

  switch (provider) {
    case "openai":
      return !profile.openai_api_key
    case "google":
      return !profile.google_gemini_api_key
    case "anthropic":
      return !profile.anthropic_api_key
    case "mistral":
      return !profile.mistral_api_key
    case "perplexity":
      return !profile.perplexity_api_key
    default:
      return false
  }
}
