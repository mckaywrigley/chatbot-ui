import { ChatClientProxy } from "@/lib/chat/client/ChatClientProxy"

export const runtime: "edge" = "edge"

export async function POST(request: Request) {
  const url = new URL(request.url)
  const provider = url.pathname.split("/").pop()

  const chatClientProxy = new ChatClientProxy(provider || ``)
  const { chatSettings, messages, customModelId } =
    await chatClientProxy.parseRequest(request)

  try {
    await chatClientProxy.initialize(customModelId)
    return await chatClientProxy.createChatCompletion(chatSettings, messages)
  } catch (error: any) {
    return new Response(JSON.stringify({ message: error.message }), {
      status: error.status || 500
    })
  }
}
