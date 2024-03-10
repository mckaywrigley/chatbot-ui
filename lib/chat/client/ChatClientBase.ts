import { ApiError } from "@/lib/error/ApiError"
import { ChatSettings } from "@/types"
import { StreamingTextResponse } from "ai"

export abstract class ChatClientBase {
  abstract initialize(customModelId?: string): Promise<void>

  abstract generateChatCompletion(
    chatSettings: ChatSettings,
    messages: any[]
  ): Promise<any>

  abstract generateChatCompletionStream(
    chatSettings: ChatSettings,
    messages: any[]
  ): Promise<StreamingTextResponse>

  abstract handleError(error: ApiError): ApiError
}
