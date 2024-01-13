import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"

export const runtime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.mistral_api_key, "Mistral")

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${profile.mistral_api_key}`
      },
      body: JSON.stringify({
        model: chatSettings.model,
        messages: messages,
        temperature: chatSettings.temperature,
        stream: true
      })
    })

    const readableStream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          throw new Error("No response body!")
        }

        const reader = response.body.getReader()
        let isFirstChunk = true
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            controller.close()
            break
          }
          const chunk = new TextDecoder("utf-8").decode(value)
          const dataParts = chunk.split("data: ")
          const data =
            isFirstChunk && dataParts[2] ? dataParts[2] : dataParts[1]
          if (data) {
            const parsedData = JSON.parse(data)
            const messageContent = parsedData.choices[0].delta.content
            controller.enqueue(new TextEncoder().encode(messageContent))
          }
          isFirstChunk = false
        }
      }
    })

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain" }
    })
  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
