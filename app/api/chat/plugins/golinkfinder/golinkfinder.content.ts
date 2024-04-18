import { Message } from "@/types/chat"
import { pluginUrls } from "@/types/plugins"

import {
  createGKEHeaders,
  getCommandFromAIResponse,
  processAIResponseAndUpdateMessage,
  truncateData
} from "../chatpluginhandlers"

import { displayHelpGuideForGoLinkFinder } from "../plugin-helper/help-guides"
import { transformUserQueryToGoLinkFinderCommand } from "../plugin-helper/transform-query-to-command"
import { handlePluginStreamError } from "../plugin-helper/plugin-stream"

interface GoLinkFinderParams {
  domain: string[]
  error: string | null
}

const parseGoLinkFinderCommandLine = (input: string): GoLinkFinderParams => {
  const MAX_INPUT_LENGTH = 1000
  const MAX_ARRAY_SIZE = 1

  const params: GoLinkFinderParams = {
    domain: [],
    error: null
  }

  if (input.length > MAX_INPUT_LENGTH) {
    params.error = `🚨 Input command is too long`
    return params
  }

  const trimmedInput = input.trim().toLowerCase()
  const args = trimmedInput.split(" ")
  args.shift()

  for (let i = 0; i < args.length; i++) {
    try {
      switch (args[i]) {
        case "--domain":
          params.domain = args[++i].split(",")
          if (params.domain.length > MAX_ARRAY_SIZE) {
            params.error = `🚨 Too many elements in domain array`
            return params
          }
          break
        default:
          params.error = `🚨 Invalid or unrecognized flag: ${args[i]}`
          break
      }
    } catch (error) {
      if (error instanceof Error) {
        return { ...params, error: error.message }
      }
    }
  }

  if (!params.domain || params.domain.length === 0) {
    params.error = `🚨 No target domain/URL provided`
    return params
  }

  return params
}

export async function handleGolinkfinderRequest(
  lastMessage: Message,
  enableGoLinkFinderFeature: boolean,
  OpenAIStream: any,
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  invokedByToolId: boolean
) {
  if (!enableGoLinkFinderFeature) {
    return new Response("The GoLinkFinder is disabled.")
  }

  let aiResponse = ""

  const headers = createGKEHeaders()

  const stream = new ReadableStream({
    async start(controller) {
      const sendMessage = (
        data: string,
        addExtraLineBreaks: boolean = false
      ) => {
        const formattedData = addExtraLineBreaks ? `${data}\n\n` : data
        controller.enqueue(new TextEncoder().encode(formattedData))
      }

      if (invokedByToolId) {
        try {
          for await (const chunk of processAIResponseAndUpdateMessage(
            lastMessage,
            transformUserQueryToGoLinkFinderCommand,
            OpenAIStream,
            model,
            messagesToSend,
            answerMessage
          )) {
            sendMessage(chunk, false)
            aiResponse += chunk
          }

          sendMessage("\n\n")
          lastMessage.content = getCommandFromAIResponse(
            lastMessage,
            aiResponse
          )
        } catch (error) {
          return new Response(`Error processing AI response: ${error}`)
        }
      }

      const parts = lastMessage.content.split(" ")
      if (
        parts.includes("-h") ||
        parts.includes("-help") ||
        parts.includes("--help")
      ) {
        sendMessage(displayHelpGuideForGoLinkFinder(), true)
        controller.close()
        return
      }

      const params = parseGoLinkFinderCommandLine(lastMessage.content)

      if (params.error) {
        handlePluginStreamError(
          params.error,
          invokedByToolId,
          sendMessage,
          controller
        )
        return
      }

      let golinkfinderUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/golinkfinder?`

      if (Array.isArray(params.domain)) {
        const targetsString = params.domain.join(" ")
        golinkfinderUrl += `domain=${encodeURIComponent(targetsString)}`
      }

      sendMessage(
        "🚀 URL extraction process initiated. This may take a minute to complete.",
        true
      )

      const intervalId = setInterval(() => {
        sendMessage("⏳ Still working on it, please hold on...", true)
      }, 15000)

      try {
        const golinkfinderResponse = await fetch(golinkfinderUrl, {
          method: "GET",
          headers: {
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`
          }
        })

        let golinkfinderData = await golinkfinderResponse.text()

        let urlsFormatted = processGoLinkFinderData(golinkfinderData)
        urlsFormatted = truncateData(urlsFormatted, 300000)

        if (!urlsFormatted || urlsFormatted.length === 0) {
          const noDataMessage = `🔍 Didn't find any URLs based on the provided command.`
          clearInterval(intervalId)
          sendMessage(noDataMessage, true)
          controller.close()
          return new Response(noDataMessage)
        }

        clearInterval(intervalId)
        sendMessage(
          "✅ URL extraction process is done! Now processing the results...",
          true
        )

        const date = new Date()
        const timezone = "UTC-5"
        const formattedDateTime = date.toLocaleString("en-US", {
          timeZone: "Etc/GMT+5",
          timeZoneName: "short"
        })
        const responseString =
          `# [GoLinkFinder](${pluginUrls.GoLinkFinder}) Results\n` +
          '**Target**: "' +
          params.domain +
          '"\n\n' +
          "**Extraction Date & Time**:" +
          ` ${formattedDateTime} (${timezone}) \n\n` +
          "## URLs Identified:\n" +
          "```\n" +
          urlsFormatted.trim() +
          "\n" +
          "```\n"

        sendMessage(responseString, true)
        controller.close()
      } catch (error) {
        clearInterval(intervalId)
        let errorMessage =
          "🚨 There was a problem during the scan. Please try again."
        if (error instanceof Error) {
          errorMessage = `🚨 Error: ${error.message}`
        }
        sendMessage(errorMessage, true)
        controller.close()
        return new Response(errorMessage)
      }
    }
  })

  return new Response(stream, { headers })
}

const processGoLinkFinderData = (data: string): string => {
  const lines = data.split("\n")
  const processedLines = lines
    .filter(
      line =>
        !line.includes("Still processing...") &&
        !line.includes("goLinkFinder process completed.") &&
        !line.includes("Starting goLinkFinder process...")
    )
    .map(line => {
      if (line.startsWith("data: ")) {
        return line.replace("data: ", "").trim()
      }
      return line.trim()
    })
    .filter(line => line !== "")

  return processedLines.join("\n")
}
