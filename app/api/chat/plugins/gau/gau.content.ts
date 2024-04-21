import { Message } from "@/types/chat"
import { pluginUrls } from "@/types/plugins"

import {
  createGKEHeaders,
  getCommandFromAIResponse,
  processAIResponseAndUpdateMessage,
  truncateData
} from "../chatpluginhandlers"

import { displayHelpGuideForGau } from "../plugin-helper/help-guides"
import { transformUserQueryToGAUCommand } from "../plugin-helper/transform-query-to-command"
import { handlePluginStreamError } from "../plugin-helper/plugin-stream"

interface GauParams {
  targets: string[]
  blacklist: string[]
  fc: number[]
  fromDate: string
  ft: string[]
  fp: boolean
  json: boolean
  mc: number[]
  mt: string[]
  providers: string[]
  includeSubdomains: boolean
  toDate: string
  verbose: boolean
  error: string | null
}

const parseGauCommandLine = (input: string): GauParams => {
  const MAX_INPUT_LENGTH = 2000
  const MAX_PARAM_LENGTH = 100
  const MAX_ARRAY_SIZE = 50

  const params: GauParams = {
    targets: [],
    blacklist: [],
    fc: [],
    fromDate: "",
    ft: [],
    fp: false,
    json: false,
    mc: [],
    mt: [],
    providers: [],
    includeSubdomains: false,
    toDate: "",
    verbose: false,
    error: null
  }

  if (input.length > MAX_INPUT_LENGTH) {
    params.error = `🚨 Input command is too long`
    return params
  }

  const trimmedInput = input.trim().toLowerCase()
  const args = trimmedInput.split(" ")
  args.shift()

  // const isInteger = (value: string) => /^[0-9]+$/.test(value);
  const isDateFormat = (value: string) => /^\d{6}$/.test(value)
  const isValidDomainOrUrl = (url: string) =>
    /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(url)

  let domainOrUrlFound = false

  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith("--") && isValidDomainOrUrl(args[i])) {
      params.targets.push(args[i])
      domainOrUrlFound = true
      continue
    } else if (!args[i].startsWith("--") && !isValidDomainOrUrl(args[i])) {
      params.error = `🚨 Invalid domain or URL: ${args[i]}`
      return params
    }

    try {
      switch (args[i]) {
        case "--blacklist":
          params.blacklist = args[++i].split(",")
          if (params.blacklist.length > MAX_ARRAY_SIZE) {
            params.error = `🚨 Too many elements in blacklist array`
            return params
          }
          break
        case "--fc":
          params.fc = args[++i].split(",").map(Number)
          if (params.fc.some(isNaN) || params.fc.length > MAX_ARRAY_SIZE) {
            params.error = `🚨 Invalid filter codes or too many elements`
            return params
          }
          break
        case "--from":
          params.fromDate = args[++i]
          if (!isDateFormat(params.fromDate)) {
            params.error = `🚨 Invalid date format for '--from' flag`
            return params
          }
          break
        case "--ft":
          params.ft = args[++i].split(",")
          if (params.ft.length > MAX_ARRAY_SIZE) {
            params.error = `🚨 Too many MIME types in filter`
            return params
          }
          break
        case "--fp":
          params.fp = true
          break
        case "--mc":
          params.mc = args[++i].split(",").map(Number)
          if (params.mc.some(isNaN) || params.mc.length > MAX_ARRAY_SIZE) {
            params.error = `🚨 Invalid match codes or too many elements`
            return params
          }
          break
        case "--mt":
          params.mt = args[++i].split(",")
          if (params.mt.length > MAX_ARRAY_SIZE) {
            params.error = `🚨 Too many MIME types in match`
            return params
          }
          break
        case "--providers":
          params.providers = args[++i].split(",")
          if (params.providers.length > MAX_ARRAY_SIZE) {
            params.error = `🚨 Too many elements in providers array`
            return params
          }
          break
        case "--subs":
          params.includeSubdomains = true
          break
        case "--to":
          params.toDate = args[++i]
          if (!isDateFormat(params.toDate)) {
            params.error = `🚨 Invalid date format for '--to' flag`
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

  if (!params.targets || params.targets.length === 0) {
    params.error = `🚨 No target domain/URL provided`
    return params
  }

  return params
}

export async function handleGauRequest(
  lastMessage: Message,
  enableGauFeature: boolean,
  OpenAIStream: any,
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  invokedByToolId: boolean
) {
  if (!enableGauFeature) {
    return new Response("The GAU is disabled.")
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
            transformUserQueryToGAUCommand,
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
      if (parts.includes("-h") || parts.includes("-help")) {
        sendMessage(displayHelpGuideForGau(), true)
        controller.close()
        return
      }

      const params = parseGauCommandLine(lastMessage.content)

      if (params.error) {
        handlePluginStreamError(
          params.error,
          invokedByToolId,
          sendMessage,
          controller
        )
        return
      }

      let gauUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/gau?`

      if (Array.isArray(params.targets)) {
        const targetsString = params.targets.join(" ")
        gauUrl += `target=${encodeURIComponent(targetsString)}`
      }
      if (params.blacklist.length > 0) {
        gauUrl += `&blacklist=${params.blacklist.join(",")}`
      }
      if (params.fc.length > 0) {
        gauUrl += `&fc=${params.fc.join(",")}`
      }
      if (params.fromDate) {
        gauUrl += `&fromDate=${params.fromDate}`
      }
      if (params.ft.length > 0) {
        gauUrl += `&ft=${params.ft.join(",")}`
      }
      if (params.fp) {
        gauUrl += `&fp=true`
      }
      if (params.mc.length > 0) {
        gauUrl += `&mc=${params.mc.join(",")}`
      }
      if (params.mt.length > 0) {
        gauUrl += `&mt=${params.mt.join(",")}`
      }
      if (params.providers.length > 0) {
        gauUrl += `&providers=${params.providers.join(",")}`
      }
      if (params.includeSubdomains) {
        gauUrl += `&subs=true`
      }
      if (params.toDate) {
        gauUrl += `&toDate=${params.toDate}`
      }

      sendMessage("🚀 Starting the scan. It might take a minute.", true)

      const intervalId = setInterval(() => {
        sendMessage("⏳ Still working on it, please hold on...", true)
      }, 20000)

      try {
        const gauResponse = await fetch(gauUrl, {
          method: "GET",
          headers: {
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`
          }
        })

        let gauData = await gauResponse.text()

        let urlsFormatted = processGauData(gauData)
        urlsFormatted = truncateData(urlsFormatted, 300000)

        if (!urlsFormatted || urlsFormatted.length === 0) {
          const noDataMessage = `🔍 Didn't find any URLs based on the provided command.`
          clearInterval(intervalId)
          sendMessage(noDataMessage, true)
          controller.close()
          return new Response(noDataMessage)
        }

        clearInterval(intervalId)
        sendMessage("✅ Scan done! Now processing the results...", true)

        const date = new Date()
        const timezone = "UTC-5"
        const formattedDateTime = date.toLocaleString("en-US", {
          timeZone: "Etc/GMT+5",
          timeZoneName: "short"
        })
        const responseString =
          `# [Gau](${pluginUrls.GAU}) Results\n` +
          '**Target**: "' +
          params.targets +
          '"\n\n' +
          "**Scan Date & Time**:" +
          ` ${formattedDateTime} (${timezone}) \n\n` +
          "## Identified Urls:\n" +
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

const processGauData = (data: string): string => {
  const lines = data.split("\n")

  const urls = lines
    .map(line => {
      try {
        const json = JSON.parse(line)
        return json.url || ""
      } catch (error) {
        return ""
      }
    })
    .filter(url => url !== "")

  return urls.join("\n")
}
