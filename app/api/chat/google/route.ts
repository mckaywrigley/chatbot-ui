import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const runtime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.google_gemini_api_key, "Google")

    const genAI = new GoogleGenerativeAI(profile.google_gemini_api_key || "")
    const googleModel = genAI.getGenerativeModel({ model: chatSettings.model })

    if (chatSettings.model === "gemini-pro") {
      const lastMessage = messages.pop()

      const chat = googleModel.startChat({
        history: messages,
        generationConfig: {
          temperature: chatSettings.temperature
        }
      })

      const response = await chat.sendMessageStream(lastMessage.parts)

      const encoder = new TextEncoder()
      const readableStream = new ReadableStream({
        async start(controller) {
          for await (const chunk of response.stream) {
            const chunkText = chunk.text()
            controller.enqueue(encoder.encode(chunkText))
          }
          controller.close()
        }
      })

      return new Response(readableStream, {
        headers: { "Content-Type": "text/plain" }
      })
    } else if (chatSettings.model === "gemini-pro-vision") {
      // FIX: Hacky until chat messages are supported
      const HACKY_MESSAGE = messages[messages.length - 1]

      const result = await googleModel.generateContent([
        HACKY_MESSAGE.prompt,
        HACKY_MESSAGE.imageParts
      ])

      const response = result.response

      const text = response.text()

      return new Response(text, {
        headers: { "Content-Type": "text/plain" }
      })
    }
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Google Gemini API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("api key not valid")) {
      errorMessage =
        "Google Gemini API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
