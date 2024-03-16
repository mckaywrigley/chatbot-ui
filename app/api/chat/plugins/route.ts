import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { ServerRuntime } from "next"

import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import { StreamingTextResponse } from "ai"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, selectedPlugin, isPremium } = json as {
    chatSettings: ChatSettings
    messages: any[]
    selectedPlugin: string
    isPremium: any
  }

  const premiumPlugins = ["nuclei", "katana", "httpx", "naabu"]

  if (premiumPlugins.includes(selectedPlugin) && !isPremium) {
    return new Response(
      "Access Denied: The plugin you're trying to use is exclusive to Pro members. Please upgrade to a Pro account to use this plugin."
    )
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openai_api_key, "OpenAI")

    let model = chatSettings.model.toString()

    let ratelimitmodel
    if (chatSettings.model === "mistral-medium") {
      ratelimitmodel = "hackergpt"
    } else {
      ratelimitmodel = "gpt-4"
    }

    const rateLimitCheckResultForPlugins = await checkRatelimitOnApi(
      profile.user_id,
      "plugins"
    )
    if (rateLimitCheckResultForPlugins !== null) {
      return rateLimitCheckResultForPlugins.response
    }

    const rateLimitCheckResultForChatSettingsModel = await checkRatelimitOnApi(
      profile.user_id,
      ratelimitmodel
    )
    if (rateLimitCheckResultForChatSettingsModel !== null) {
      return rateLimitCheckResultForChatSettingsModel.response
    }

    if (model === "mistral-large" || model === "gpt-4-turbo-preview") {
      model = "gpt-4"
    } else {
      model = "gpt-3.5-turbo-instruct"
    }

    const chatBody = {
      model: model,
      messages: messages,
      toolId: selectedPlugin
    }

    const controller = new AbortController()
    const endpoint = `${process.env.SECRET_ENDPOINT_PLUGINS_HACKERGPT_V2}`
    const fetchResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${process.env.SECRET_AUTH_PLUGINS_HACKERGPT_V2}`
      },
      signal: controller.signal,
      body: JSON.stringify(chatBody)
    })
    console.log(fetchResponse)
    return new StreamingTextResponse(
      fetchResponse.body as ReadableStream<Uint8Array>
    )
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "OpenAI API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "OpenAI API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
