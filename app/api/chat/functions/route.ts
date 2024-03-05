import recallAssistants from "@/lib/assistants"
import {
  checkApiKey,
  getServerProfile,
  functionCalledByOpenAI
} from "@/lib/server/server-chat-helpers"
import { Tables } from "@/supabase/types"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, chatId, recallAssistantFunctions } = json as {
    chatSettings: ChatSettings
    messages: any[]
    selectedTools: Tables<"tools">[]
    chatId: string
    recallAssistantFunctions: OpenAI.Chat.Completions.ChatCompletionTool[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openai_api_key, "OpenAI")

    const openai = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id
    })

    const firstResponse = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages,
      tools: recallAssistantFunctions
    })

    const message = firstResponse.choices[0].message
    messages.push(message)
    const toolCalls = message.tool_calls || []

    console.log("firstResponse message:", message)

    if (toolCalls.length === 0) {
      // If no tool calls, return the first response directly without a second OpenAI call
      console.log("No tool calls")
      return new Response(message.content, {
        headers: {
          "Content-Type": "application/json"
        }
      })
    }
    // assume only one tool call
    const toolCall = toolCalls[0]

    let functionName = toolCall.function.name
    const argumentsString = toolCall.function.arguments.trim()
    const parsedArgs = JSON.parse(argumentsString)

    let functionResponse = {}
    let bodyContent = parsedArgs.requestBody || parsedArgs
    let toolId = toolCall.id

    if (functionName === "recall_complete") {
      // call openAI with scoring recall agent
      messages.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: functionName,
        content: JSON.stringify({ success: true })
      })

      const secondResponse = await openai.chat.completions.create({
        model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
        messages
      })

      const recallSummary = secondResponse.choices[0].message.content

      const scoreRecallAssistant = recallAssistants.find(
        assistant => assistant.name === "score"
      )

      if (!scoreRecallAssistant) {
        throw new Error("No score assistant found")
      }

      messages.push({
        role: "user",
        content: scoreRecallAssistant?.prompt
      })

      functionName = "updateTopicQuizResult"
      const updateTopicQuizResultFunction = scoreRecallAssistant.functions.find(
        func => func.function.name === functionName
      )
      // error if no updateTopicQuizResultFunction is found
      if (!updateTopicQuizResultFunction) {
        throw new Error("No updateTopicQuizResult function found")
      }

      const scoreFirstResponse = await openai.chat.completions.create({
        model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
        messages,
        tools: [updateTopicQuizResultFunction] // Wrap the function in an array
      })

      const scoreMessage = scoreFirstResponse.choices[0].message
      messages.push(scoreMessage)

      const scoreToolCalls = scoreMessage.tool_calls || []
      const finalMessageContent = scoreFirstResponse.choices[0].message.content

      if (scoreToolCalls.length === 0) {
        return new Response(finalMessageContent, {
          headers: {
            "Content-Type": "application/json",
            "FUNCTION-NAME": functionName
          }
        })
      }

      const scoreToolCall = scoreToolCalls[0]

      const updateTopicQuizArgumentsString =
        scoreToolCall.function.arguments.trim()
      const updateTopicQuizParsedArgs = JSON.parse(
        updateTopicQuizArgumentsString
      )

      bodyContent =
        updateTopicQuizParsedArgs.requestBody || updateTopicQuizParsedArgs

      toolId = scoreToolCall.id
    }

    functionResponse = await functionCalledByOpenAI(
      functionName,
      bodyContent,
      chatId
    )

    messages.push({
      tool_call_id: toolId,
      role: "tool",
      name: functionName,
      content: JSON.stringify(functionResponse)
    })

    const finalResponse = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages,
      stream: true
    })

    const stream = OpenAIStream(finalResponse)

    return new StreamingTextResponse(stream, {
      headers: {
        "FUNCTION-NAME": functionName,
        "X-RATE-LIMIT": "lol"
      }
    })
  } catch (error: any) {
    console.error(error)
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
