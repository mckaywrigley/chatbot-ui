import { ChatSettings } from "@/types"
import OpenAI from "openai"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatClientBase } from "../ChatClientBase"
import { ApiError } from "@/lib/error/ApiError"

export class PerplexityChatClient extends ChatClientBase {
  private perplexity: OpenAI | undefined

  async initialize() {
    const profile = await getServerProfile()
    checkApiKey(profile.perplexity_api_key, "Perplexity")
    this.perplexity = new OpenAI({
      apiKey: profile.perplexity_api_key || "",
      baseURL: "https://api.perplexity.ai/"
    })
  }

  async generateChatCompletion(
    chatSettings: ChatSettings,
    messages: any[]
  ): Promise<any> {
    if (!this.perplexity) {
      throw new Error("Perplexity client is not initialized")
    }

    return this.perplexity.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: messages as ChatCompletionCreateParamsBase["messages"],
      temperature: chatSettings.temperature,
      max_tokens: chatSettings.model === "gpt-4-vision-preview" ? 4096 : null,
      stream: true
    })
  }

  async generateChatCompletionStream(
    chatSettings: ChatSettings,
    messages: any[]
  ): Promise<StreamingTextResponse> {
    const response = await this.generateChatCompletion(chatSettings, messages)
    return new StreamingTextResponse(OpenAIStream(response))
  }

  handleError(error: ApiError): ApiError {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Perplexity API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "Perplexity API Key is incorrect. Please fix it in your profile settings."
    }

    return new ApiError(errorMessage, errorCode)
  }
}
