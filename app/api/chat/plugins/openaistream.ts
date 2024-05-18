import { Message } from "@/types/chat"

import {
  replaceWordsInLastUserMessage,
  wordReplacements
} from "@/lib/ai-helper"

import {
  ParsedEvent,
  ReconnectInterval,
  createParser
} from "eventsource-parser"
import llmConfig from "@/lib/models/llm/llm-config"

export class OpenAIError extends Error {
  type: string
  param: string
  code: string

  constructor(message: string, type: string, param: string, code: string) {
    super(message)
    this.name = "OpenAIError"
    this.type = type
    this.param = param
    this.code = code
  }
}

export interface OpenAIModel {
  id: string
  name: string
  maxLength: number
  tokenLimit: number
}

export const OpenAIStream = async (
  model: OpenAIModel["id"],
  messages: Message[],
  answerMessage: Message,
  tools?: any
) => {
  const SYSTEM_PROMPT = llmConfig.systemPrompts.openaiCurrentDateOnly
  const OPENAI_API_KEY = llmConfig.openai.apiKey
  const openAIUrl = `https://api.openai.com/v1/chat/completions`

  replaceWordsInLastUserMessage(messages, wordReplacements)

  const commonBody = {
    model: `gpt-4o`,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      ...messages
    ],
    max_tokens: 1024,
    temperature: 0.1,
    stream: true,
    ...(tools && Object.keys(tools).length > 0
      ? { tools: tools, tool_choice: "auto" }
      : {})
  }

  if (answerMessage.content.trim()) {
    if (
      commonBody["messages"].length > 0 &&
      commonBody["messages"][commonBody["messages"].length - 1].role === "user"
    ) {
      commonBody["messages"].pop()
    }

    commonBody["messages"].push(answerMessage)
  }

  const requestOptions = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(commonBody)
  }

  const res = await fetch(openAIUrl, requestOptions)
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  if (res.status !== 200) {
    const result = await res.json()
    if (result.error) {
      throw new OpenAIError(
        result.error.message,
        result.error.type,
        result.error.param,
        result.error.code
      )
    } else {
      throw new Error(`OpenAI API returned an error: ${result.statusText}`)
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data
          if (data !== "[DONE]") {
            try {
              const json = JSON.parse(data)
              if (json.choices[0].finish_reason != null) {
                controller.close()
                return
              }

              let text = json.choices[0].delta.content

              if (
                tools &&
                Object.keys(tools).length > 0 &&
                json.choices[0].delta.tool_calls &&
                json.choices[0].delta.tool_calls.length > 0
              ) {
                const toolCallArguments =
                  json.choices[0].delta.tool_calls[0].function.arguments
                text = toolCallArguments
              }

              const queue = encoder.encode(text)
              controller.enqueue(queue)
            } catch (e) {
              controller.error(e)
            }
          }
        }
      }

      const parser = createParser(onParse)

      for await (const chunk of res.body as any) {
        const content = decoder.decode(chunk)
        if (content.trim() === "data: [DONE]") {
          controller.close()
        } else {
          parser.feed(content)
        }
      }
    }
  })

  return stream
}
