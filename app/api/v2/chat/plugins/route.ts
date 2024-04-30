import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { ServerRuntime } from "next"

import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"

import {
  pluginIdToHandlerMapping,
  isCommand,
  handleCommand
} from "@/app/api/chat/plugins/chatpluginhandlers"
import { OpenAIStream } from "@/app/api/chat/plugins/openaistream"
import { PluginID, pluginUrls } from "@/types/plugins"
import { isPremiumUser } from "@/lib/server/subscription-utils"
import { buildFinalMessages } from "@/lib/build-prompt"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { payload, chatImages, selectedPlugin, fileData } = json as {
    payload: any
    chatImages: any[]
    selectedPlugin: string
    fileData?: { fileName: string; fileContent: string }[]
  }

  const premiumPlugins: PluginID[] = [
    PluginID.NUCLEI,
    PluginID.KATANA,
    PluginID.HTTPX,
    PluginID.NAABU,
    PluginID.GAU
    // PluginID.AMASS
  ]

  try {
    const profile = await getServerProfile()
    const isPremium = await isPremiumUser(profile.user_id)

    if (premiumPlugins.includes(selectedPlugin as PluginID) && !isPremium) {
      return new Response(
        "Access Denied: The plugin you're trying to use is exclusive to Pro members. Please upgrade to a Pro account to use this plugin."
      )
    }

    checkApiKey(profile.openai_api_key, "OpenAI")

    let chatSettings = payload.chatSettings
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

    const formattedMessages = (await buildFinalMessages(
      payload,
      profile,
      chatImages,
      selectedPlugin as PluginID
    )) as any

    let invokedByPluginId = false
    let cleanMessages = formattedMessages.slice(1, -1)
    let latestUserMessage = cleanMessages[cleanMessages.length - 1]
    let answerMessage = { role: "user", content: "" }
    model = "gpt-4"

    if (latestUserMessage.content.startsWith("/")) {
      const commandPlugin = Object.keys(pluginUrls)
        .find(plugin =>
          isCommand(plugin.toLowerCase(), latestUserMessage.content)
        )
        ?.toLowerCase()

      if (
        commandPlugin &&
        premiumPlugins.includes(commandPlugin as PluginID) &&
        !isPremium
      ) {
        return new Response(
          "Access Denied: The command you're trying to use is exclusive to Pro members. Please upgrade to a Pro account to use this command."
        )
      }

      if (!commandPlugin) {
        return new Response(
          "Error: Command not recognized. Please check the command and try again."
        )
      }

      if ((selectedPlugin as PluginID) !== PluginID.CYBERCHEF) {
        for (const plugin of Object.keys(pluginUrls)) {
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
        fileData && fileData.length > 0 ? fileData : undefined
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
