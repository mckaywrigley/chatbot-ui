import { Message } from "@/types/chat"
import { pluginUrls } from "@/types/plugins"
import endent from "endent"

import {
  createGKEHeaders,
  processAIResponseAndUpdateMessage
} from "../chatpluginhandlers"

export const isKatanaCommand = (message: string) => {
  if (!message.startsWith("/")) return false

  const trimmedMessage = message.trim()
  const commandPattern = /^\/katana(?:\s+(-[a-z]+|\S+))*$/

  return commandPattern.test(trimmedMessage)
}

const displayHelpGuide = () => {
  const helpPrefix = "```\nUsage:\n" + "   katana [flags]\n\n" + "Flags:\n"

  const sections = {
    input: "INPUT:\n" + "  -u, -list string[]  target url / list to crawl\n",
    configuration:
      "CONFIGURATION:\n" +
      "  -jc, -js-crawl               enable endpoint parsing / crawling in javascript file\n" +
      "  -iqp, -ignore-query-params   Ignore crawling same path with different query-param values\n" +
      "  -timeout int                 time to wait for request in seconds (default 15)\n",
    headless:
      "HEADLESS:\n" +
      // '  -hl, -headless          enable headless hybrid crawling (experimental)\n' +
      "  -xhr, -xhr-extraction   extract xhr request url,method in jsonl output\n",
    scope:
      "SCOPE:\n" +
      "  -cs, -crawl-scope string[]        in scope url regex to be followed by crawler\n" +
      "  -cos, -crawl-out-scope string[]   out of scope url regex to be excluded by crawler\n" +
      "  -do, -display-out-scope           display external endpoint from scoped crawling\n",
    filter:
      "FILTER:\n" +
      "  -mr, -match-regex string[]        regex or list of regex to match on output url (cli, file)\n" +
      "  -fr, -filter-regex string[]       regex or list of regex to filter on output url (cli, file)\n" +
      "  -em, -extension-match string[]    match output for given extension (eg, -em php,html,js)\n" +
      "  -ef, -extension-filter string[]   filter output for given extension (eg, -ef png,css)\n" +
      "  -mdc, -match-condition string     match response with dsl based condition\n" +
      "  -fdc, -filter-condition string    filter response with dsl based condition\n"
  }

  const fullHelpGuide =
    `[Katana](${pluginUrls.Katana}) is a fast crawler focused on execution in automation pipelines offering both headless and non-headless crawling.\n\n` +
    helpPrefix +
    sections.input +
    "\n" +
    sections.configuration +
    "\n" +
    sections.headless +
    "\n" +
    sections.scope +
    "\n" +
    sections.filter +
    "\n```"

  return fullHelpGuide
}

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
  help?: string
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
    error: null,
    help: undefined
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
  OpenAIStream: {
    (
      model: string,
      messages: Message[],
      answerMessage: Message
    ): Promise<ReadableStream<any>>
    (arg0: any, arg1: any, arg2: any): any
  },
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  invokedByToolId: boolean
) {
  if (!enableKatanaFeature) {
    return new Response("The Katana feature is disabled.", {
      status: 200
    })
  }

  let aiResponse = ""

  if (invokedByToolId) {
    try {
      const { updatedLastMessageContent, aiResponseText } =
        await processAIResponseAndUpdateMessage(
          lastMessage,
          transformUserQueryToKatanaCommand,
          OpenAIStream,
          model,
          messagesToSend,
          answerMessage
        )
      lastMessage.content = updatedLastMessageContent
      aiResponse = aiResponseText
    } catch (error) {
      console.error("Error processing AI response and updating message:", error)
      return new Response(`Error processing AI response: ${error}`)
    }
  }

  const parts = lastMessage.content.split(" ")
  if (parts.includes("-h") || parts.includes("-help")) {
    return new Response(displayHelpGuide(), {
      status: 200
    })
  }

  const params = parseKatanaCommandLine(lastMessage.content)
  if (params.error && invokedByToolId) {
    return new Response(`${aiResponse}\n\n${params.error}`, {
      status: 200
    })
  } else if (params.error) {
    return new Response(params.error, { status: 200 })
  }

  if (params.error) {
    return new Response(params.error, { status: 200 })
  }

  let katanaUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/katana`

  interface KatanaRequestBody {
    urls?: string[]
    depth?: number
    jsCrawl?: boolean
    ignoreQueryParams?: boolean
    headless?: boolean
    xhrExtraction?: boolean
    crawlScope?: string[]
    crawlOutScope?: string[]
    displayOutScope?: boolean
    matchRegex?: string[]
    filterRegex?: string[]
    extensionMatch?: string[]
    extensionFilter?: string[]
    matchCondition?: string
    filterCondition?: string
    timeout?: number
  }

  let requestBody: KatanaRequestBody = {}

  if (params.urls && params.urls.length > 0) {
    requestBody.urls = params.urls
  }
  if (params.depth && params.depth !== 3) {
    requestBody.depth = params.depth
  }
  if (params.jsCrawl) {
    requestBody.jsCrawl = params.jsCrawl
  }
  if (params.ignoreQueryParams) {
    requestBody.ignoreQueryParams = params.ignoreQueryParams
  }
  if (params.headless) {
    requestBody.headless = params.headless
  }
  if (params.xhrExtraction) {
    requestBody.xhrExtraction = params.xhrExtraction
  }
  if (params.crawlScope && params.crawlScope.length > 0) {
    requestBody.crawlScope = params.crawlScope
  }
  if (params.crawlOutScope && params.crawlOutScope.length > 0) {
    requestBody.crawlOutScope = params.crawlOutScope
  }
  if (params.displayOutScope) {
    requestBody.displayOutScope = params.displayOutScope
  }
  if (params.matchRegex && params.matchRegex.length > 0) {
    requestBody.matchRegex = params.matchRegex
  }
  if (params.filterRegex && params.filterRegex.length > 0) {
    requestBody.filterRegex = params.filterRegex
  }
  if (params.extensionMatch && params.extensionMatch.length > 0) {
    requestBody.extensionMatch = params.extensionMatch
  }
  if (params.extensionFilter && params.extensionFilter.length > 0) {
    requestBody.extensionFilter = params.extensionFilter
  }
  if (params.matchCondition) {
    requestBody.matchCondition = params.matchCondition
  }
  if (params.filterCondition) {
    requestBody.filterCondition = params.filterCondition
  }
  if (params.timeout && params.timeout !== 15) {
    requestBody.timeout = params.timeout
  }

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
        sendMessage(aiResponse, true)
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

        if (
          outputString &&
          outputString.includes("Error executing Katana command") &&
          outputString.includes("Error reading output file")
        ) {
          const errorMessage = `🚨 An error occurred while running your query. Please try again or check your input.`
          clearInterval(intervalId)
          sendMessage(errorMessage, true)
          controller.close()
          return new Response(errorMessage, {
            status: 200
          })
        }

        if (!outputString && outputString.length === 0) {
          const noDataMessage = `🔍 No results found with the given parameters.`
          clearInterval(intervalId)
          sendMessage(noDataMessage, true)
          controller.close()
          return new Response(noDataMessage, {
            status: 200
          })
        }

        clearInterval(intervalId)
        sendMessage("✅ Scan done! Now processing the results...", true)

        const urls = processurls(outputString)
        const formattedResponse = formatResponseString(urls, params)
        sendMessage(formattedResponse, true)

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
        return new Response(errorMessage, {
          status: 200
        })
      }
    }
  })

  return new Response(stream, { headers })
}

const transformUserQueryToKatanaCommand = (lastMessage: Message) => {
  const answerMessage = endent`
  Query: "${lastMessage.content}"

  Based on this query, generate a command for the 'katana' tool, focusing on URL crawling and filtering. The command should utilize the most relevant flags, with '-u' or '-list' being essential to specify the target URL or list. If the request involves scanning a list of domains, embed the domains directly in the command rather than referencing an external file. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:

  ALWAYS USE THIS FORMAT:
  \`\`\`json
  { "command": "katana [flags]" }
  \`\`\`
  In this context, replace '[flags]' with '-help' to generate the appropriate help command. The '-help' flag is crucial as it instructs the 'katana' tool to display its help guide, offering an overview of all available flags and their purposes. This format ensures the command is both valid JSON and specifically tailored to users' inquiries about help or flag functionalities. 

  Example Command for Requesting Help:
  \`\`\`json
  { "command": "katana -help" }
  \`\`\`

  This command will instruct the 'katana' tool to provide its help documentation, making it easier for users to understand how to use the tool and which flags are at their disposal for specific tasks. It's important to ensure that the command remains simple and directly addresses the user's request for help.

  Command Construction Guidelines:
  1. **Direct Domain Inclusion**: When scanning a list of domains, directly embed them in the command instead of using file references.
    - -u, -list: Specify the target URL or list to crawl. (required)
  2. **Selective Flag Use**: Carefully choose flags that are pertinent to the task. The available flags for the 'katana' tool include:
    - -js-crawl: Enable crawling of JavaScript files. (optional)
    - -ignore-query-params: Ignore different query parameters in the same path. (optional)
    - -timeout: Set a time limit in seconds (default 15 seconds). (optional)
    - -xhr-extraction: Extract XHR request URL and method in JSONL format. (optional)
    - -crawl-scope: Define in-scope URL regex for crawling. (optional)
    - -crawl-out-scope: Define out-of-scope URL regex to exclude from crawling. (optional)
    - -display-out-scope: Show external endpoints from scoped crawling. (optional)
    - -match-regex: Match output URLs with specified regex patterns. (optional)
    - -filter-regex: Filter output URLs using regex patterns. (optional)
    - -extension-match: Match output for specified file extensions. (optional)
    - -extension-filter: Filter output for specified file extensions. (optional)
    - -match-condition: Apply DSL-based conditions for matching responses. (optional)
    - -filter-condition: Apply DSL-based conditions for filtering responses. (optional)
    - -help: Display help and all available flags. (optional)
    Use these flags to align with the request's specific requirements or when '-help' is requested for help.
  3. **Relevance and Efficiency**: Ensure that the selected flags are relevant and contribute to an effective and efficient URL crawling and filtering process.

  Example Commands:
  For scanning a list of domains directly:
  \`\`\`json
  { "command": "katana -list domain1.com,domain2.com,domain3.com" }
  \`\`\`

  For a request for help or to see all flags:
  \`\`\`json
  { "command": "katana -help" }
  \`\`\`

  Response:`

  return answerMessage
}

function processurls(outputString: string) {
  return outputString
    .split("\n")
    .filter(subdomain => subdomain.trim().length > 0)
}

function formatResponseString(urls: any[], params: KatanaParams) {
  const date = new Date()
  const timezone = "UTC-5"
  const formattedDateTime = date.toLocaleString("en-US", {
    timeZone: "Etc/GMT+5",
    timeZoneName: "short"
  })

  const urlsFormatted = urls.join("\n")
  return (
    `# [Katana](${pluginUrls.Katana}) Results\n` +
    '**Target**: "' +
    params.urls +
    '"\n\n' +
    "**Scan Date & Time**:" +
    ` ${formattedDateTime} (${timezone}) \n\n` +
    "## Identified Urls:\n" +
    "```\n" +
    urlsFormatted +
    "\n" +
    "```\n"
  )
}
