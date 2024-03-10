import { ChatSettings } from "@/types"
import OpenAI from "openai"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatClientBase } from "../ChatClientBase"
import { ApiError } from "@/lib/error/ApiError"

export class AzureChatClient extends ChatClientBase {
  private azureOpenai: OpenAI | undefined

  async initialize() {
    const profile = await getServerProfile()
    checkApiKey(profile.azure_openai_api_key, "Azure OpenAI")
    this.azureOpenai = new OpenAI({
      apiKey: profile.azure_openai_api_key || "",
      baseURL: `${profile.azure_openai_endpoint}/openai/deployments/${profile.azure_openai_35_turbo_id || profile.azure_openai_45_turbo_id || profile.azure_openai_45_vision_id}`,
      defaultQuery: { "api-version": "2023-12-01-preview" },
      defaultHeaders: { "api-key": profile.azure_openai_api_key }
    })
  }

  async generateChatCompletion(
    chatSettings: ChatSettings,
    messages: any[]
  ): Promise<any> {
    if (!this.azureOpenai) {
      throw new Error("Azure OpenAI client is not initialized")
    }

    let deploymentId = ""
    switch (chatSettings.model) {
      case "gpt-3.5-turbo":
        deploymentId = (await getServerProfile()).azure_openai_35_turbo_id || ""
        break
      case "gpt-4-turbo-preview":
        deploymentId = (await getServerProfile()).azure_openai_45_turbo_id || ""
        break
      case "gpt-4-vision-preview":
        deploymentId =
          (await getServerProfile()).azure_openai_45_vision_id || ""
        break
      default:
        throw new ApiError("Model not found", 400)
    }

    return this.azureOpenai.chat.completions.create({
      model: deploymentId as ChatCompletionCreateParamsBase["model"],
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
        "Azure OpenAI API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "Azure OpenAI API Key is incorrect. Please fix it in your profile settings."
    }

    return new ApiError(errorMessage, errorCode)
  }
}
