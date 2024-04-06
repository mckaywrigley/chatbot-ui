import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { ServerRuntime } from "next"

import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import { StreamingTextResponse } from "ai"

import {
  pluginIdToHandlerMapping,
  isCommand,
  handleCommand
} from "@/app/api/chat/plugins/plugins"
import { OpenAIStream } from "@/app/api/chat/plugins/openaistream"
import { PluginID, pluginUrls } from "@/types/plugins"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const {
    chatSettings,
    messages,
    selectedPlugin,
    isPremium,
    fileContent,
    fileName
  } = json as {
    chatSettings: ChatSettings
    messages: any[]
    selectedPlugin: string
    isPremium: any
    fileContent: string
    fileName: string
  }

  const premiumPlugins: PluginID[] = [
    PluginID.NUCLEI,
    PluginID.KATANA,
    PluginID.HTTPX,
    PluginID.NAABU
  ]

  if (premiumPlugins.includes(selectedPlugin as PluginID) && !isPremium) {
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

    let invokedByPluginId = false
    let cleanMessages = messages.slice(1, -1)
    let latestUserMessage = cleanMessages[cleanMessages.length - 1]
    let answerMessage = { role: "user", content: "" }
    model = "gpt-4"

    if (
      latestUserMessage.content.startsWith("/") &&
      (selectedPlugin as PluginID) !== PluginID.CYBERCHEF
    ) {
      const plugins = Object.keys(pluginUrls)
      for (const plugin of plugins) {
        if (isCommand(plugin.toLowerCase(), latestUserMessage.content)) {
          return await handleCommand(
            plugin.toLowerCase(),
            latestUserMessage,
            model,
            cleanMessages,
            answerMessage
          )
        }
      }
    } else if (pluginIdToHandlerMapping.hasOwnProperty(selectedPlugin)) {
      invokedByPluginId = true

      const toolHandler = pluginIdToHandlerMapping[selectedPlugin]
      const response = await toolHandler(
        latestUserMessage,
        process.env[`ENABLE_${selectedPlugin.toUpperCase()}_PLUGIN`] !==
          "FALSE",
        OpenAIStream,
        model,
        cleanMessages,
        answerMessage,
        invokedByPluginId,
        fileContent,
        fileName
      )

      return response
    }
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
