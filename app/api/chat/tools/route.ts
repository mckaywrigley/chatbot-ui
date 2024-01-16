import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { ServerRuntime } from "next"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, schema } = json as {
    chatSettings: ChatSettings
    messages: any[]
    schema: string
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openai_api_key, "OpenAI")

    const openai = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id
    })

    // get openapi spec
    // form tools from spec
    const tools = []
    // check if tools exist
    //

    const response = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: messages,
      tools
    })

    const message = response.choices[0].message
    const toolCalls = message.tool_calls || []
    console.log(toolCalls)

    // if tool called, call tool
    if (toolCalls.length > 0) {
      // loop through tool calls
      for (const toolCall of toolCalls) {
        const functionCall = toolCall.function
        console.log(functionCall)
      }
    }
  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
