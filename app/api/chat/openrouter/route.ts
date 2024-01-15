import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { ErrorResponse, ErrorResponseSchema } from "@/types/error-response"
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
    const profile = await getServerProfile()

    checkApiKey(profile.openrouter_api_key, "OpenRouter")

    const openai = new OpenAI({
      apiKey: profile.openrouter_api_key || "",
      baseURL: "https://openrouter.ai/api/v1"
    })

    const response = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: messages as ChatCompletionCreateParamsBase["messages"],
      temperature: chatSettings.temperature,
      max_tokens: undefined,
      stream: true
    })

    const stream = OpenAIStream(response)

    return new StreamingTextResponse(stream)
  } catch (e: ErrorResponse | any) {
    const { error } = await ErrorResponseSchema.parseAsync(e).catch(e => {
      // If the error is not an ErrorResponse try pulling the error code and message from the standard error object, otherwise return default error
      return ErrorResponseSchema.parse({
        error: {
          message: e.message,
          code: e.status
        }
      })
    })
    const errorCode = error.code
    const errorMessage = error.message

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
