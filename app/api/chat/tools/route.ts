import {
  extractOpenapiData,
  openapiDataToFunctions
} from "@/lib/openapi-conversion"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
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

    const convertedSchema = extractOpenapiData(schema)
    console.log("convertedSchema", convertedSchema)
    console.log("\n\n\n")
    const title = convertedSchema.title
    const description = convertedSchema.description
    const url = convertedSchema.url

    console.log("title", title)
    console.log("description", description)
    console.log("url", url)
    console.log("\n\n\n")

    const tools = openapiDataToFunctions(convertedSchema) || []
    console.log("tools", tools)
    console.log("\n\n\n")

    const routeMap = convertedSchema.routes.reduce(
      (map: Record<string, string>, route) => {
        route.methods.forEach(method => {
          map[route.path] = method.operationId
        })

        return map
      },
      {}
    )
    console.log("routeMap", routeMap)
    console.log("\n\n\n")

    const firstResponse = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages,
      tools
    })

    const message = firstResponse.choices[0].message
    messages.push(message)
    const toolCalls = message.tool_calls || []

    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const functionCall = toolCall.function
        const functionName = functionCall.name
        const parsedArgs = JSON.parse(toolCall.function.arguments)

        const path = Object.keys(routeMap).find(
          key => routeMap[key] === functionName
        )
        console.log("path", path)
        console.log("\n\n\n")
        const queryParams = new URLSearchParams(parsedArgs).toString()
        console.log("queryParams", queryParams)
        console.log("\n\n\n")
        const fullUrl = url + path + "?" + queryParams
        console.log("fullUrl", fullUrl)
        console.log("\n\n\n")

        const response = await fetch(fullUrl)

        const data = await response.json()
        console.log("data", data)
        console.log("\n\n\n")

        console.log("stringify data", JSON.stringify(data))
        console.log("\n\n\n")

        console.log({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(data)
        })
        console.log("\n\n\n")

        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(data)
        })
      }
    }

    console.log(messages)
    console.log("\n\n\n")

    const secondResponse = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages,
      stream: true
    })

    const stream = OpenAIStream(secondResponse)

    return new StreamingTextResponse(stream)
  } catch (error: any) {
    console.error(error)
    const errorMessage = error.error?.message || "An unexpected error occurred"
    console.log("errorMessage", errorMessage)
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
