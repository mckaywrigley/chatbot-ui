import { ChatSettings } from "@/types"
import Anthropic from "@anthropic-ai/sdk"
import { AnthropicStream, StreamingTextResponse } from "ai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatClientBase } from "../ChatClientBase"
import { ApiError } from "@/lib/error/ApiError"
import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"

export class AnthropicChatClient extends ChatClientBase {
  private anthropic: Anthropic | undefined

  async initialize() {
    const profile = await getServerProfile()
    checkApiKey(profile.anthropic_api_key, "Anthropic")
    this.anthropic = new Anthropic({
      apiKey: profile.anthropic_api_key || ""
    })
  }

  async generateChatCompletion(
    chatSettings: ChatSettings,
    messages: any[]
  ): Promise<any> {
    if (!this.anthropic) {
      throw new Error("Anthropic client is not initialized")
    }

    let formattedMessages: any = messages.slice(1) // Assuming the first message is the system message based on the route context

    return this.anthropic.messages.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: formattedMessages,
      temperature: chatSettings.temperature,
      system: messages[0].content, // Assuming the first message is always the system message
      max_tokens:
        CHAT_SETTING_LIMITS[chatSettings.model].MAX_TOKEN_OUTPUT_LENGTH,
      stream: true
    })
  }

  async generateChatCompletionStream(
    chatSettings: ChatSettings,
    messages: any[]
  ): Promise<StreamingTextResponse> {
    const response = await this.generateChatCompletion(chatSettings, messages)
    return new StreamingTextResponse(AnthropicStream(response))
  }

  handleError(error: ApiError): ApiError {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Anthropic API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "Anthropic API Key is incorrect. Please fix it in your profile settings."
    }

    return new ApiError(errorMessage, errorCode)
  }
}
