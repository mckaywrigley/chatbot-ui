import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ServerRuntime } from "next"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

import {
  replaceWordsInLastUserMessage,
  updateOrAddSystemMessage,
  wordReplacements
} from "@/lib/ai-helper"

import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import {
  buildFinalMessages,
  filterEmptyAssistantMessages
} from "@/lib/build-prompt"

import llmConfig from "@/lib/models/llm/llm-config"

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
  const { payload, chatImages, selectedPlugin } = json as {
    payload: any
    chatImages: any
    selectedPlugin: any
  }

  const chatSettings = payload.chatSettings

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

    const cleanedMessages = (await buildFinalMessages(
      payload,
      profile,
      chatImages,
      selectedPlugin
    )) as any[]

    const systemMessageContent = `${llmConfig.systemPrompts.openai}`
    updateOrAddSystemMessage(cleanedMessages, systemMessageContent)
    filterEmptyAssistantMessages(cleanedMessages)
    replaceWordsInLastUserMessage(cleanedMessages, wordReplacements)

    const res = await fetch(openAiUrl, {
      method: "POST",
      headers: openAiHeaders,
      body: JSON.stringify({
        model: "gpt-4o",
        messages: cleanedMessages as ChatCompletionCreateParamsBase["messages"],
        temperature: 0.4,
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
