import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

import {
  replaceWordsInLastUserMessage,
  wordReplacements
} from "@/lib/word-replacer"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openai_api_key, "OpenAI")

    const openai = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id
    })

    replaceWordsInLastUserMessage(messages, wordReplacements)

    const systemMessageContent = `${process.env.SECRET_OPENAI_SYSTEM_PROMPT}`
    const systemInstructions = "User Instructions:\n"
    const existingSystemMessageIndex = messages.findIndex(
      msg => msg.role === "system"
    )

    if (existingSystemMessageIndex !== -1) {
      // Existing system message found
      const existingSystemMessage = messages[existingSystemMessageIndex]

      if (!existingSystemMessage.content.includes(systemInstructions)) {
        // Append new content if "User Instructions:" is not found
        existingSystemMessage.content += `${systemMessageContent}` // Added a newline for separation
      }

      // Move the updated system message to the start
      messages.unshift(messages.splice(existingSystemMessageIndex, 1)[0])
    } else {
      // No system message exists, create a new one
      messages.unshift({
        role: "system",
        content: systemMessageContent
      })
    }

    const response = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: messages as ChatCompletionCreateParamsBase["messages"],
      // temperature: chatSettings.temperature,
      temperature: 0.4,
      // max_tokens: chatSettings.model === "gpt-4-vision-preview" ? 4096 : null,
      max_tokens: 1024,
      stream: true
    })

    const stream = OpenAIStream(response)

    return new StreamingTextResponse(stream)
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
