import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"

import {
  updateOrAddSystemMessage,
  Message,
  replaceWordsInLastUserMessage,
  wordReplacements
} from "@/lib/ai-helper"
// import { cleanMessagesFromWarnings } from "@/lib/models/clean-messages"
import { isEnglish, translateToEnglish } from "@/lib/models/language-utils"
import preparePineconeQuery from "@/lib/models/prepare-pinecone-query"
import queryPineconeVectorStore from "@/lib/models/query-pinecone"

import llmConfig from "@/lib/models/llm/llm-config"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"

class APIError extends Error {
  code: any
  constructor(message: string | undefined, code: any) {
    super(message)
    this.name = "APIError"
    this.code = code
  }
}

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openrouter_api_key, "OpenRouter")

    const openrouterApiKey = profile.openrouter_api_key || ""

    let modelTemperature = 0.4
    const pineconeTemperature = llmConfig.pinecone.temperature

    const openRouterUrl = llmConfig.openrouter.url
    const openRouterHeaders = {
      Authorization: `Bearer ${openrouterApiKey}`,
      "HTTP-Referer": "https://www.hackergpt.co",
      "X-Title": "HackerGPT",
      "Content-Type": "application/json"
    }

    // const cleanedMessages = await cleanMessagesFromWarnings(messages)
    const cleanedMessages = messages

    let systemMessage: Message = {
      role: "system",
      content: `${llmConfig.systemPrompts.hackerGPT}`
    }

    if (
      llmConfig.usePinecone &&
      cleanedMessages.length > 0 &&
      cleanedMessages[cleanedMessages.length - 1].role === "user" &&
      cleanedMessages[cleanedMessages.length - 1].content.length >
        llmConfig.pinecone.messageLength.min
    ) {
      let combinedContent = preparePineconeQuery(
        cleanedMessages,
        llmConfig.pinecone.messageLength.max
      )

      if (!(await isEnglish(combinedContent))) {
        combinedContent = await translateToEnglish(
          combinedContent,
          openRouterUrl,
          openRouterHeaders,
          llmConfig.models.translation
        )
      }

      const pineconeResults = await queryPineconeVectorStore(
        combinedContent,
        llmConfig.openai.apiKey,
        llmConfig.pinecone
      )

      if (pineconeResults !== "None") {
        modelTemperature = pineconeTemperature

        systemMessage.content =
          `${llmConfig.systemPrompts.hackerGPT} ` +
          `${llmConfig.systemPrompts.pinecone} ` +
          `Context:\n ${pineconeResults}`
      }
    }

    if (cleanedMessages[0]?.role !== "system") {
      cleanedMessages.unshift(systemMessage)
    } else {
      const systemMessageContent = `${llmConfig.systemPrompts.hackerGPT}`
      updateOrAddSystemMessage(messages, systemMessageContent)
    }

    replaceWordsInLastUserMessage(messages, wordReplacements)

    const model1 = llmConfig.models.default
    const model2 = llmConfig.models.hackerGPT
    const selectedModel = Math.random() < 0.8 ? model1 : model2

    const requestBody = {
      model: selectedModel,
      route: "fallback",
      messages: cleanedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: modelTemperature,
      max_tokens: 1024,
      stream: true
    }

    try {
      // rate limit check
      const rateLimitCheckResult = await checkRatelimitOnApi(
        profile.user_id,
        "hackergpt"
      )
      if (rateLimitCheckResult !== null) {
        return rateLimitCheckResult.response
      }

      const res = await fetch(openRouterUrl, {
        method: "POST",
        headers: openRouterHeaders,
        body: JSON.stringify(requestBody)
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

      // Convert the response into a friendly text-stream.
      const stream = OpenAIStream(res)

      // Respond with the stream
      return new StreamingTextResponse(stream)
    } catch (error) {
      if (error instanceof APIError) {
        console.error(
          `API Error - Code: ${error.code}, Message: ${error.message}`
        )
      } else if (error instanceof Error) {
        console.error(`Unexpected Error: ${error.message}`)
      } else {
        console.error(`An unknown error occurred: ${error}`)
      }
    }
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "OpenRouter API Key not found. Please set it in your profile settings."
    } else if (errorCode === 401) {
      errorMessage =
        "OpenRouter API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
