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

import { displayHelpGuideForKatana } from "../plugin-helper/help-guides"
import { transformUserQueryToKatanaCommand } from "../plugin-helper/transform-query-to-command"
import { handlePluginStreamError } from "../plugin-helper/plugin-stream"

interface KatanaParams {
  urls: string[]
  depth: number
  jsCrawl: boolean
  ignoreQueryParams: boolean
  headless: boolean
  xhrExtraction: boolean
  crawlScope: string[]
  crawlOutScope: string[]
  displayOutScope: boolean
  matchRegex: string[]
  filterRegex: string[]
  extensionMatch: string[]
  extensionFilter: string[]
  matchCondition: string
  filterCondition: string
  timeout: number
  error: string | null
}

const parseKatanaCommandLine = (input: string): KatanaParams => {
  const MAX_INPUT_LENGTH = 2000
  const MAX_URL_PARAM_LENGTH = 1000
  const MAX_PARAM_LENGTH = 200

  const params: KatanaParams = {
    urls: [],
    depth: 3,
    jsCrawl: false,
    ignoreQueryParams: false,
    headless: false,
    xhrExtraction: false,
    crawlScope: [],
    crawlOutScope: [],
    displayOutScope: false,
    matchRegex: [],
    filterRegex: [],
    extensionMatch: [],
    extensionFilter: [],
    matchCondition: "",
    filterCondition: "",
    timeout: 15,
    error: null
  }

  if (input.length > MAX_INPUT_LENGTH) {
    params.error = `🚨 Input command is too long`
    return params
  }

  const trimmedInput = input.trim().toLowerCase()
  const args = trimmedInput.split(" ")
  args.shift()

  const isInteger = (value: string) => /^[0-9]+$/.test(value)
  const isWithinLength = (value: string, maxLength: number) =>
    value.length <= maxLength
  const isValidUrl = (url: string) =>
    /^https?:\/\/[^\s]+$/.test(url) || /^[^\s]+\.[^\s]+$/.test(url)

  const isValidRegex = (pattern: string) => {
    try {
      new RegExp(pattern)
      return true
    } catch {
      return false
    }
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    if (arg === "-u" || arg === "-list") {
      if (
        nextArg &&
        !nextArg.startsWith("-") &&
        !isWithinLength(nextArg, MAX_URL_PARAM_LENGTH)
      ) {
        return {
          error: `URL parameter value too long: ${nextArg}`
        } as KatanaParams
      }
    } else if (
      nextArg &&
      !nextArg.startsWith("-") &&
      !isWithinLength(nextArg, MAX_PARAM_LENGTH)
    ) {
      return {
        error: `Parameter value too long for '${arg}': ${nextArg}`
      } as KatanaParams
    }

    switch (arg) {
      case "-u":
      case "-list":
        while (args[i + 1] && !args[i + 1].startsWith("-")) {
          const url = args[++i]
          if (!isValidUrl(url)) {
            params.error = `🚨 Invalid URL provided for '${
              args[i - 1]
            }' flag: ${url}`
            return params
          }
          params.urls.push(url)
        }
        if (params.urls.length === 0) {
          params.error = `🚨 No URL provided for '${args[i]}' flag`
          return params
        }
        break
      case "-d":
      case "-depth":
        if (args[i + 1] && isInteger(args[i + 1])) {
          params.depth = parseInt(args[++i])
        } else {
          params.error = `🚨 Invalid depth value for '${args[i]}' flag`
          return params
        }
        break
      case "-jc":
      case "-js-crawl":
        params.jsCrawl = true
        break
      case "-iqp":
      case "-ignore-query-params":
        params.ignoreQueryParams = true
        break
      // case '-hl':
      // case '-headless':
      //   params.headless = true;
      //   break;
      case "-xhr":
      case "-xhr-extraction":
        params.xhrExtraction = true
        break
      case "-cs":
      case "-crawl-scope":
        while (args[i + 1] && !args[i + 1].startsWith("-")) {
          const scope = args[++i]
          if (!isValidRegex(scope)) {
            params.error = `🚨 Invalid crawl scope regex pattern for '${
              args[i - 1]
            }' flag: ${scope}`
            return params
          }
          params.crawlScope.push(scope)
        }
        if (params.crawlScope.length === 0) {
          params.error = `🚨 No crawl scope regex pattern provided for '${args[i]}' flag`
          return params
        }
        break
      case "-cos":
      case "-crawl-out-scope":
        while (args[i + 1] && !args[i + 1].startsWith("-")) {
          const outScope = args[++i]
          if (!isValidRegex(outScope)) {
            params.error = `🚨 Invalid crawl out-scope regex pattern for '${
              args[i - 1]
            }' flag: ${outScope}`
            return params
          }
          params.crawlOutScope.push(outScope)
        }
        if (params.crawlOutScope.length === 0) {
          params.error = `🚨 No crawl out-scope regex pattern provided for '${args[i]}' flag`
          return params
        }
        break
      case "-do":
      case "-display-out-scope":
        params.displayOutScope = true
        break
      case "-mr":
      case "-match-regex":
        while (args[i + 1] && !args[i + 1].startsWith("-")) {
          const regex = args[++i]
          if (!isValidRegex(regex)) {
            params.error = `🚨 Invalid match regex for '${
              args[i - 1]
            }' flag: ${regex}`
            return params
          }
          params.matchRegex.push(regex)
        }
        if (params.matchRegex.length === 0) {
          params.error = `🚨 No match regex provided for '${args[i]}' flag`
          return params
        }
        break
      case "-fr":
      case "-filter-regex":
        while (args[i + 1] && !args[i + 1].startsWith("-")) {
          const regex = args[++i]
          if (!isValidRegex(regex)) {
            params.error = `🚨 Invalid filter regex for '${
              args[i - 1]
            }' flag: ${regex}`
            return params
          }
          params.filterRegex.push(regex)
        }
        if (params.filterRegex.length === 0) {
          params.error = `🚨 No filter regex provided for '${args[i]}' flag`
          return params
        }
        break
      case "-em":
      case "-extension-match":
        while (args[i + 1] && !args[i + 1].startsWith("-")) {
          const ext = args[++i]
          params.extensionMatch.push(ext)
        }
        if (params.extensionMatch.length === 0) {
          params.error = `🚨 No extension match provided for '${args[i]}' flag`
          return params
        }
        break
      case "-ef":
      case "-extension-filter":
        while (args[i + 1] && !args[i + 1].startsWith("-")) {
          const ext = args[++i]
          params.extensionFilter.push(ext)
        }
        if (params.extensionFilter.length === 0) {
          params.error = `🚨 No extension filter provided for '${args[i]}' flag`
          return params
        }
        break
      case "-mdc":
      case "-match-condition":
        if (args[i + 1] && !args[i + 1].startsWith("-")) {
          params.matchCondition = args[++i]
        } else {
          params.error = `🚨 No match condition provided for '${args[i]}' flag`
          return params
        }
        break
      case "-fdc":
      case "-filter-condition":
        if (args[i + 1] && !args[i + 1].startsWith("-")) {
          params.filterCondition = args[++i]
        } else {
          params.error = `🚨 No filter condition provided for '${args[i]}' flag`
          return params
        }
        break
      case "-timeout":
        if (args[i + 1] && isInteger(args[i + 1])) {
          let timeoutValue = parseInt(args[++i])
          if (timeoutValue > 90) {
            params.error = `🚨 Timeout value exceeds the maximum limit of 90 seconds`
            return params
          }
          params.timeout = timeoutValue
        } else {
          params.error = `🚨 Invalid timeout value for '${args[i]}' flag`
          return params
        }
        break
      default:
        params.error = `🚨 Invalid or unrecognized flag: ${args[i]}`
        return params
    }
  }

  if (!params.urls.length || params.urls.length === 0) {
    params.error = "🚨 Error: -u/-list parameter is required."
  }

  return params
}

export async function handleKatanaRequest(
  lastMessage: Message,
  enableKatanaFeature: boolean,
  OpenAIStream: any,
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  invokedByToolId: boolean,
  fileData?: { fileName: string; fileContent: string }[]
) {
  if (!enableKatanaFeature) {
    return new Response("The Katana feature is disabled.")
  }

  const fileContentIncluded = !!fileData && fileData.length > 0
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
        const options: ProcessAIResponseOptions = {
          fileContentIncluded: fileContentIncluded,
          fileNames: fileData?.map(file => file.fileName) || []
        }

        try {
          for await (const chunk of processAIResponseAndUpdateMessage(
            lastMessage,
            transformUserQueryToKatanaCommand,
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
            aiResponse
          )
        } catch (error) {
          return new Response(`Error processing AI response: ${error}`)
        }
      }

      const parts = lastMessage.content.split(" ")
      if (parts.includes("-h") || parts.includes("-help")) {
        sendMessage(displayHelpGuideForKatana(), true)
        controller.close()
        return
      }

      const params = parseKatanaCommandLine(lastMessage.content)
      if (params.error) {
        handlePluginStreamError(
          params.error,
          invokedByToolId,
          sendMessage,
          controller
        )
        return
      }

      let katanaUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/katana`

      let requestBody: Partial<KatanaParams> = {}

      for (const [key, value] of Object.entries(params)) {
        if (
          (Array.isArray(value) && value.length > 0) ||
          (typeof value === "boolean" && value) ||
          (typeof value === "number" &&
            value > 0 &&
            !(key === "depth" && value === 3) &&
            !(key === "timeout" && value === 15)) ||
          (typeof value === "string" && value.length > 0)
        ) {
          ;(requestBody as any)[key] = value
        }
      }

      if (fileContentIncluded) {
        ;(requestBody as any).fileContent =
          fileData?.map(file => file.fileContent).join("\n") || ""
      }

      sendMessage("🚀 Starting the scan. It might take a minute.", true)

      const intervalId = setInterval(() => {
        sendMessage("⏳ Still working on it, please hold on...", true)
      }, 15000)

      try {
        const katanaResponse = await fetch(katanaUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`
          },
          body: JSON.stringify(requestBody)
        })

        if (!katanaResponse.ok) {
          throw new Error(`HTTP error! status: ${katanaResponse.status}`)
        }

        const jsonResponse = await katanaResponse.json()
        const outputString = jsonResponse.output

        let urlsFormatted = processurls(outputString)
        urlsFormatted = truncateData(urlsFormatted, 300000)

        if (
          outputString &&
          outputString.includes("Error executing Katana command") &&
          outputString.includes("Error reading output file")
        ) {
          const errorMessage = `🚨 An error occurred while running your query. Please try again or check your input.`
          clearInterval(intervalId)
          sendMessage(errorMessage, true)
          controller.close()
          return new Response(errorMessage)
        }

        if (!urlsFormatted || urlsFormatted.length === 0) {
          const noDataMessage = `🔍 No results found with the given parameters.`
          clearInterval(intervalId)
          sendMessage(noDataMessage, true)
          controller.close()
          return new Response(noDataMessage)
        }

        clearInterval(intervalId)
        sendMessage("✅ Scan done! Now processing the results...", true)

        const formattedResults = formatScanResults({
          pluginName: "Katana",
          pluginUrl: pluginUrls.KATANA,
          target: params.urls,
          results: urlsFormatted
        })
        sendMessage(formattedResults, true)

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

function processurls(outputString: string) {
  return outputString
    .split("\n")
    .filter(subdomain => subdomain.trim().length > 0)
}
