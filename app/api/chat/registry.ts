import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { createOpenAI } from "@ai-sdk/openai"
import { experimental_createProviderRegistry as createProviderRegistry } from "ai"

const profile = await getServerProfile()

export const registry = createProviderRegistry({
  // register provider with prefix and custom setup:
  openai: createOpenAI({
    apiKey: profile.openai_api_key ?? undefined,
    organization: profile.openai_organization_id ?? undefined
  }),
  deepinfra: createOpenAI({
    apiKey: profile.deepinfra_api_key ?? undefined,
    baseURL: "https://api.deepinfra.com/v1/openai"
  })
})
