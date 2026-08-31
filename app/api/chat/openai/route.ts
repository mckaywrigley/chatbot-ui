import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const shouldRetryWithoutTemperature = (error: any) => {
      const msg = (error?.error?.message || error?.message || "") as string
      return (
        /temperature/i.test(msg) &&
        /Only the default \(1\) value is supported/i.test(msg)
      )
    }

    const profile = await getServerProfile()

    // If the user has Azure OpenAI configured, route through the Azure chat endpoint
    if (profile.use_azure_openai) {
      checkApiKey(profile.azure_openai_api_key, "Azure OpenAI")

      const ENDPOINT = profile.azure_openai_endpoint
      const KEY = profile.azure_openai_api_key
      const DEPLOYMENT_ID = profile.azure_openai_45_turbo_id || ""

      if (!ENDPOINT || !KEY || !DEPLOYMENT_ID) {
        return new Response(
          JSON.stringify({ message: "Azure resources not found" }),
          { status: 400 }
        )
      }

      const azureOpenai = new OpenAI({
        apiKey: KEY,
        baseURL: `${ENDPOINT}/openai/deployments/${DEPLOYMENT_ID}`,
        defaultQuery: { "api-version": "2024-08-06-preview" },
        defaultHeaders: { "api-key": KEY }
      })

      const params: any = {
        model: DEPLOYMENT_ID as ChatCompletionCreateParamsBase["model"],
        messages: messages as ChatCompletionCreateParamsBase["messages"],
        temperature: chatSettings.temperature,
        max_tokens:
          chatSettings.model === "gpt-4-vision-preview" ||
          chatSettings.model === "gpt-4o"
            ? 4096
            : undefined, // Do not send `null` (provider validation error).
        stream: true
      }

      // Defensive: never send nullish max_tokens (some providers error hard)
      if (params.max_tokens == null) delete params.max_tokens

      let response: any
      try {
        response = await azureOpenai.chat.completions.create(params)
      } catch (error: any) {
        if (shouldRetryWithoutTemperature(error)) {
          // Some models (e.g. reasoning models) only accept the default temperature.
          const { temperature: _temperature, ...withoutTemperature } =
            params as any
          response =
            await azureOpenai.chat.completions.create(withoutTemperature)
        } else {
          throw error
        }
      }

      const stream = OpenAIStream(response as any)
      return new StreamingTextResponse(stream)
    }

    checkApiKey(profile.openai_api_key, "OpenAI")

    const openai = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id
    })

    const params: any = {
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: messages as ChatCompletionCreateParamsBase["messages"],
      temperature: chatSettings.temperature,
      max_tokens:
        chatSettings.model === "gpt-4-vision-preview" ||
        chatSettings.model === "gpt-4o"
          ? 4096
          : undefined, // Do not send `null` (provider validation error).
      stream: true
    }

    // Defensive: never send nullish max_tokens (some providers error hard)
    if (params.max_tokens == null) delete params.max_tokens

    let response: any
    try {
      response = await openai.chat.completions.create(params)
    } catch (error: any) {
      if (shouldRetryWithoutTemperature(error)) {
        // Some models (e.g. reasoning models) only accept the default temperature.
        const { temperature: _temperature, ...withoutTemperature } =
          params as any
        response = await openai.chat.completions.create(withoutTemperature)
      } else {
        throw error
      }
    }

    const stream = OpenAIStream(response as any)

    return new StreamingTextResponse(stream)
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
