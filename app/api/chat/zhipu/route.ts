import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { KJUR } from "jsrsasign"

export const runtime = "edge"

function generateToken(apikey: string, expSeconds: number) {
  let id: string, secret: string

  try {
    ;[id, secret] = apikey.split(".") // according to the format of apikey from official document, split it into id and secret
    if (!id || !secret) {
      throw new Error("Invalid API key format")
    }
  } catch (e: any) {
    throw new Error("Invalid API key: " + e.message)
  }

  const nowMillis = KJUR.jws.IntDate.get("now") * 1000
  const payload = {
    api_key: id,
    exp: nowMillis + expSeconds * 1000,
    timestamp: nowMillis
  }

  const header = { alg: "HS256", typ: "JWT", sign_type: "SIGN" }

  const sHeader = JSON.stringify(header)
  const sPayload = JSON.stringify(payload)

  return KJUR.jws.JWS.sign(null, sHeader, sPayload, secret)
}

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  // regenerate button will send blank content, not figure out yet
  if (
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant"
  ) {
    messages.pop()
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.zhipu_api_key, "Zhipu")

    const authToken = generateToken(profile.zhipu_api_key || "", 60 * 60 * 24) // set token valid in 24 hours

    const body = JSON.stringify({
      model: chatSettings.model,
      messages: messages,
      temperature: chatSettings.temperature,
      max_tokens:
        CHAT_SETTING_LIMITS[chatSettings.model].MAX_TOKEN_OUTPUT_LENGTH,
      stream: true
    })

    const response = await fetch(
      "https://open.bigmodel.cn/api/paas/v4/chat/completions/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: body
      }
    )

    const stream = OpenAIStream(response)
    return new StreamingTextResponse(stream)
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Zhipu API Key not found. Please set it in your profile settings."
    } else if (errorCode === 401) {
      errorMessage =
        "Zhipu API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
