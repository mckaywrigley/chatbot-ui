import { Message } from "@/types/chat"
import { pluginUrls } from "@/types/plugins"

import {
  ProcessAIResponseOptions,
  createGKEHeaders,
  formatScanResults,
  getCommandFromAIResponse,
  processAIResponseAndUpdateMessage,
  truncateData
} from "../chatpluginhandlers"

import { displayHelpGuideForAlterx } from "../plugin-helper/help-guides"
import { transformUserQueryToAlterxCommand } from "../plugin-helper/transform-query-to-command"
import { handlePluginStreamError } from "../plugin-helper/plugin-stream"

interface AlterxParams {
  list: string[]
  pattern: string[]
  enrich: boolean
  limit: number
  payload: Map<string, string>
  error: string | null
}

const parseAlterxCommandLine = (input: string): AlterxParams => {
  const MAX_INPUT_LENGTH = 2000
  const MAX_PARAM_LENGTH_LIST = 1000
  const MAX_PARAM_LENGTH = 200
  const MAX_ARRAY_SIZE = 50

  const params: AlterxParams = {
    list: [],
    pattern: [],
    enrich: false,
    limit: 0,
    payload: new Map(),
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
    const arg = args[i]

    if (arg === "-l" || arg === "-list") {
      if (args[i + 1] && args[i + 1].length > MAX_PARAM_LENGTH_LIST) {
        params.error = `🚨 List parameter is too long`
        return params
      }
    } else if (args[i + 1] && args[i + 1].length > MAX_PARAM_LENGTH) {
      params.error = `🚨 Parameter value too long for '${arg}'`
      return params
    }

    switch (arg) {
      case "-l":
      case "-list":
        if (i + 1 < args.length) {
          const listInput = args[++i]
          params.list = listInput.split(",").slice(0, MAX_ARRAY_SIZE)
        } else {
          params.error = `🚨 List flag provided without value`
          return params
        }
        break
      case "-p":
      case "-pattern":
        if (i + 1 < args.length) {
          const patternInput = args[++i]
          params.pattern = patternInput.split(",").slice(0, MAX_ARRAY_SIZE)
        } else {
          params.error = `🚨 Pattern flag provided without value`
          return params
        }
        break
      case "-en":
      case "-enrich":
        params.enrich = true
        break
      case "-limit":
        if (i + 1 < args.length && !isNaN(parseInt(args[i + 1]))) {
          params.limit = parseInt(args[++i])
        } else {
          params.error = `🚨 Invalid limit value`
          return params
        }
        break
      default:
        params.error = `🚨 Invalid or unrecognized flag: ${args[i]}`
        return params
    }
  }

  if (!params.list.length || params.list.length === 0) {
    params.error = `🚨 Error: -l/-list parameter is required.`
    return params
  }

  return params
}

export async function handleAlterxRequest(
  lastMessage: Message,
  enableAlterxFeature: boolean,
  OpenAIStream: any,
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  invokedByToolId: boolean,
  fileContent?: string,
  fileName?: string
) {
  if (!enableAlterxFeature) {
    return new Response("The Alterx is disabled.")
  }

  const headers = createGKEHeaders()

  const fileContentIncluded = !!fileContent && fileContent.length > 0
  let aiResponse = ""

  const stream = new ReadableStream({
    async start(controller) {
      const sendMessage = (data: string, addExtraLineBreaks = false) => {
        const formattedData = addExtraLineBreaks ? `${data}\n\n` : data
        controller.enqueue(new TextEncoder().encode(formattedData))
      }

      if (invokedByToolId) {
        const options: ProcessAIResponseOptions = {
          fileContentIncluded: fileContentIncluded,
          fileName: fileName
        }

        try {
          for await (const chunk of processAIResponseAndUpdateMessage(
            lastMessage,
            transformUserQueryToAlterxCommand,
            OpenAIStream,
            model,
            messagesToSend,
            answerMessage,
            options
          )) {
            sendMessage(chunk, false)
            aiResponse += chunk
          }

          sendMessage("\n\n")
          lastMessage.content = getCommandFromAIResponse(
            lastMessage,
            messagesToSend,
            aiResponse
          )
        } catch (error) {
          console.error(
            "Error processing AI response and updating message:",
            error
          )
          return new Response(`Error processing AI response: ${error}`)
        }
      }

      const parts = lastMessage.content.split(" ")
      if (parts.includes("-h") || parts.includes("-help")) {
        sendMessage(displayHelpGuideForAlterx(), true)
        controller.close()
        return
      }

      const params = parseAlterxCommandLine(lastMessage.content)

      if (params.error) {
        handlePluginStreamError(
          params.error,
          invokedByToolId,
          sendMessage,
          controller
        )
        return
      }

      let alterxUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/alterx`

      let requestBody: Partial<AlterxParams> = {}

      for (const [key, value] of Object.entries(params)) {
        if (
          (Array.isArray(value) && value.length > 0) ||
          (typeof value === "boolean" && value) ||
          (typeof value === "number" && value > 0) ||
          (typeof value === "string" && value.length > 0)
        ) {
          ;(requestBody as any)[key] = value
        }
      }

      if (
        fileContentIncluded &&
        typeof fileContent === "string" &&
        fileContent.length > 0
      ) {
        ;(requestBody as any).fileContent = fileContent
      }

      sendMessage(
        "🚀 Initiating the wordlist generation. This may take a moment.",
        true
      )

      let isFetching = true

      const intervalId = setInterval(() => {
        if (isFetching) {
          sendMessage("⏳ Still working on it, please hold on...", true)
        }
      }, 10000)

      try {
        const alterxResponse = await fetch(alterxUrl, {
          method: "POST",
          headers: {
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        })
        isFetching = false

        const jsonResponse = await alterxResponse.json()
        const outputString = jsonResponse.output

        let subdomains = processSubdomains(outputString)
        subdomains = truncateData(subdomains, 300000)

        if (!subdomains || subdomains.length === 0) {
          const noDataMessage = `🔍 Unable to generate wordlist for "${params.list.join(
            ", "
          )}"`
          clearInterval(intervalId)
          sendMessage(noDataMessage, true)
          controller.close()
          return
        }

        clearInterval(intervalId)
        sendMessage(
          "✅ Wordlist generation complete! Now finalizing the results...'",
          true
        )

        const formattedResults = formatScanResults({
          pluginName: "AlterX",
          pluginUrl: pluginUrls.Alterx,
          target: params.list,
          results: subdomains
        })
        sendMessage(formattedResults, true)

        controller.close()
      } catch (error) {
        isFetching = false
        clearInterval(intervalId)
        console.error("Error:", error)
        const errorMessage =
          error instanceof Error
            ? `🚨 Error: ${error.message}`
            : "🚨 There was a problem during the scan. Please try again."
        sendMessage(errorMessage, true)
        controller.close()
      }
    }
  })

  return new Response(stream, { headers })
}

function processSubdomains(outputString: string) {
  return outputString
    .split("\n")
    .filter(subdomain => subdomain.trim().length > 0)
}
