import { ChatSettings } from "@/types"
import { OpenAIChatClient } from "./impl/OpenAIChatClient"
import { ChatClientBase } from "./ChatClientBase"
import { AzureChatClient } from "./impl/AzureChatClient"
import { GroqChatClient } from "./impl/GroqChatClient"
import { ApiError } from "@/lib/error/ApiError"
import { GoogleChatClient } from "./impl/GoogleChatClient"
import { AnthropicChatClient } from "./impl/AnthropicChatClient"
import { MistralChatClient } from "./impl/MistralChatClient"
import { CustomChatClient } from "./impl/CustomChatClient"
import { OpenRouterChatClient } from "./impl/OpenRouterChatClient"
import { PerplexityChatClient } from "./impl/PerplexityChatClient"
import { StreamingTextResponse } from "ai"

export class ChatClientProxy {
  private chatClient: ChatClientBase | undefined
  private provider: string

  constructor(provider: string) {
    this.provider = provider
  }

  initialize(customModelId?: string): Promise<void> {
    switch (this.provider) {
      case "openai":
        this.chatClient = new OpenAIChatClient()
        break
      case "azure":
        this.chatClient = new AzureChatClient()
        break
      case "groq":
        this.chatClient = new GroqChatClient()
        break
      case "google":
        this.chatClient = new GoogleChatClient()
        break
      case "mistral":
        this.chatClient = new MistralChatClient()
        break
      case "anthropic":
        this.chatClient = new AnthropicChatClient()
        break
      case "custom":
        this.chatClient = new CustomChatClient()
        break
      case "openrouter":
        this.chatClient = new OpenRouterChatClient()
        break
      case "perplexity":
        this.chatClient = new PerplexityChatClient()
        break
      default:
        throw new Error("Provider not found")
    }
    return this.chatClient?.initialize(customModelId)
  }

  async createChatCompletion(
    chatSettings: ChatSettings,
    messages: any[]
  ): Promise<StreamingTextResponse> {
    if (!this.chatClient) {
      throw new Error("Chat client not initialized")
    }

    try {
      return await this.chatClient.generateChatCompletionStream(
        chatSettings,
        messages
      )
    } catch (error: any) {
      return this.handleError(error)
    }
  }

  public async parseRequest(request: Request): Promise<{
    chatSettings: ChatSettings
    messages: any[]
    customModelId?: string
  }> {
    try {
      const json = await request.json()
      // Validate that required fields are present
      if (!json.chatSettings || !json.messages) {
        throw new Error("Missing required fields: chatSettings or messages")
      }
      // Optionally include customModelId if present
      const customModelId = json.customModelId ? json.customModelId : undefined
      return {
        chatSettings: json.chatSettings,
        messages: json.messages,
        customModelId: customModelId
      }
    } catch (error: any) {
      // Adjusted to acknowledge the potential for any type of error
      // Handle JSON parsing errors or other errors
      throw new Error(`Failed to parse request body: ${error.message}`)
    }
  }
  private handleError(error: ApiError): Response {
    if (this.chatClient) {
      error = this.chatClient.handleError(error)
    }

    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
