import { createOpenAI } from "@ai-sdk/openai"
import { experimental_createProviderRegistry as createProviderRegistry } from "ai"

export const registry = createProviderRegistry({
  // register provider with prefix and custom setup:
  openai: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY
  }),
  deepinfra: createOpenAI({
    apiKey: process.env.DEEPINFRA_API_KEY,
    baseURL: "https://api.deepinfra.com/v1/openai"
  })
})
