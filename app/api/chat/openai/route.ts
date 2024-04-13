import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { ServerRuntime } from "next"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

import {
  replaceWordsInLastUserMessage,
  updateOrAddSystemMessage,
  wordReplacements
} from "@/lib/ai-helper"

import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"

export const runtime: ServerRuntime = "edge"

class APIError extends Error {
  code: any
  constructor(message: string | undefined, code: any) {
    super(message)
    this.name = "APIError"
    this.code = code
  }
}

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openai_api_key, "OpenAI")

    const openAiUrl = "https://api.openai.com/v1/chat/completions"

    const openAiHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${profile.openai_api_key}`
    }

    // rate limit check
    const rateLimitCheckResult = await checkRatelimitOnApi(
      profile.user_id,
      chatSettings.model
    )
    if (rateLimitCheckResult !== null) {
      return rateLimitCheckResult.response
    }

    replaceWordsInLastUserMessage(messages, wordReplacements)

    const systemMessageContent = `${process.env.SECRET_OPENAI_SYSTEM_PROMPT}`

    updateOrAddSystemMessage(messages, systemMessageContent)

    const res = await fetch(openAiUrl, {
      method: "POST",
      headers: openAiHeaders,
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: messages as ChatCompletionCreateParamsBase["messages"],
        // temperature: chatSettings.temperature,
        temperature: 0.4,
        // max_tokens: chatSettings.model === "gpt-4-vision-preview" ? 4096 : null,
        max_tokens: 1024,
        stream: true
      })
    })

    if (!res.ok) {
      const result = await res.json()
      let errorMessage = result.error?.message || "An unknown error occurred"

      switch (res.status) {
        case 400:
          throw new APIError(`Bad Request: ${errorMessage}`, 400)
        case 401:
          throw new APIError(`Invalid Credentials: ${errorMessage}`, 401)
        case 402:
          throw new APIError(`Out of Credits: ${errorMessage}`, 402)
        case 403:
          throw new APIError(`Moderation Required: ${errorMessage}`, 403)
        case 408:
          throw new APIError(`Request Timeout: ${errorMessage}`, 408)
        case 429:
          throw new APIError(`Rate Limited: ${errorMessage}`, 429)
        case 502:
          throw new APIError(`Service Unavailable: ${errorMessage}`, 502)
        default:
          throw new APIError(`HTTP Error: ${errorMessage}`, res.status)
      }
    }

    if (!res.body) {
      throw new Error("Response body is null")
    }
    return res
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "OpenAI API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "OpenAI API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
