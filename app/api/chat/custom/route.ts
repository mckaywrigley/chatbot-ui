import { Database } from "@/supabase/types"
import { ChatSettings } from "@/types"
import { createClient } from "@supabase/supabase-js"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, customModelId } = json as {
    chatSettings: ChatSettings
    messages: any[]
    customModelId: string
  }

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: customModel, error } = await supabaseAdmin
      .from("models")
      .select("*")
      .eq("id", customModelId)
      .single()

    if (!customModel) {
      throw new Error(error.message)
    }

    if (customModel.name === "miibo") {
      const response = await fetch(customModel.base_url, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: customModel.api_key || "",
          agent_id: customModel.model_id,
          utterance: messages[messages.length - 1]["content"],
          stream: true
        })
      })
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      let newStrIndex = 0
      const stream = new ReadableStream({
        async start(controller) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              controller.close()
              return
            }

            const dataString = decoder.decode(value).split("\n").filter(x => x != "")
            const responseData = dataString[dataString.length - 1]

            const encoder = new TextEncoder()
            if (responseData) {
              try {
                const jsonData = JSON.parse(responseData)
                const responseLines = jsonData.bestResponse.utterance
                const buffer = responseLines.slice(newStrIndex)

                const queue = encoder.encode(buffer)
                controller.enqueue(queue)

                const segmenter = new Intl.Segmenter("ja", {granularity: "grapheme"})
                const segments = segmenter.segment(responseLines)
                newStrIndex = [...segments].length
              } catch (e) {
                console.error("JSON Analysis Error:", e)
              }
            }
          }
        }
      })

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      })
    } else {
      const custom = new OpenAI({
        apiKey: customModel.api_key || "",
        baseURL: customModel.base_url
      })

      const response = await custom.chat.completions.create({
        model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
        messages: messages as ChatCompletionCreateParamsBase["messages"],
        temperature: chatSettings.temperature,
        stream: true
      })

      const stream = OpenAIStream(response)

      return new StreamingTextResponse(stream)
    }
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Custom API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "Custom API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
