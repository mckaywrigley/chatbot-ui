import { Database, Tables } from "@/supabase/types"
import { VALID_KEYS } from "@/types/valid-keys"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function getServerProfile() {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  const user = (await supabase.auth.getUser()).data.user
  if (!user) {
    throw new Error("User not found")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    throw new Error("Profile not found")
  }

  const profileWithKeys = addApiKeysToProfile(profile)

  return profileWithKeys
}

function addApiKeysToProfile(profile: Tables<"profiles">) {
  // map VALID_KEYS to profile attributes
  const apiKeys = {
    [VALID_KEYS.OPENAI_API_KEY]: "openai_api_key",
    [VALID_KEYS.ANTHROPIC_API_KEY]: "anthropic_api_key",
    [VALID_KEYS.GOOGLE_GEMINI_API_KEY]: "google_gemini_api_key",
    [VALID_KEYS.MISTRAL_API_KEY]: "mistral_api_key",
    [VALID_KEYS.PERPLEXITY_API_KEY]: "perplexity_api_key",
    [VALID_KEYS.AZURE_OPENAI_API_KEY]: "azure_openai_api_key",
    [VALID_KEYS.OPENROUTER_API_KEY]: "openrouter_api_key"
  }

  for (const [envKey, profileKey] of Object.entries(apiKeys)) {
    if (process.env[envKey]) {
      ;(profile as any)[profileKey] = process.env[envKey]
    }
  }

  return profile
}

export function checkApiKey(apiKey: string | null, keyName: string) {
  if (apiKey === null || apiKey === "") {
    throw new Error(`${keyName} API Key not found`)
  }
}
