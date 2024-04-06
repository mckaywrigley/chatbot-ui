import { Message } from "@/types/chat"
import { pluginUrls } from "@/types/plugins"
import endent from "endent"

export const isGauCommand = (message: string) => {
  if (!message.startsWith("/")) return false

  const trimmedMessage = message.trim()
  const commandPattern = /^\/gau(?:\s+(-[a-z]+|\S+))*$/

  return commandPattern.test(trimmedMessage)
}

const displayHelpGuide = () => {
  return `
  [GAU](${pluginUrls.Gau}) is a powerful web scraping tool that fetches known URLs from multiple sources, including AlienVault&apos;s Open Threat Exchange, the Wayback Machine, and Common Crawl. 

    Usage:
       /gau [target] [flags]

    Flags:
    CONFIGURATION:
       --from string         fetch URLs from date (format: YYYYMM)
       --to string           fetch URLs to date (format: YYYYMM)
       --providers strings   list of providers to use (wayback, commoncrawl, otx, urlscan)
       --subs                include subdomains of target domain

    FILTER:
       --blacklist strings   list of extensions to skip
       --fc strings          list of status codes to filter
       --ft strings          list of mime-types to filter
       --mc strings          list of status codes to match
       --mt strings          list of mime-types to match
       --fp                  remove different parameters of the same endpoint`
}

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
  OpenAIStream: {
    (
      model: string,
      messages: Message[],
      answerMessage: Message,
      toolId: string
    ): Promise<ReadableStream<any>>
    (arg0: any, arg1: any, arg2: any): any
  },
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  invokedByToolId: boolean
) {
  if (!enableGauFeature) {
    return new Response("The GAU is disabled.", {
      status: 200
    })
  }

  const toolId = "gau"
  let aiResponse = ""

  if (invokedByToolId) {
    const answerPrompt = transformUserQueryToGAUCommand(lastMessage)
    answerMessage.content = answerPrompt

    const openAIResponseStream = await OpenAIStream(
      model,
      messagesToSend,
      answerMessage,
      toolId
    )

    const reader = openAIResponseStream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      aiResponse += new TextDecoder().decode(value, { stream: true })
    }

    try {
      const jsonMatch = aiResponse.match(/```json\n\{.*?\}\n```/s)
      if (jsonMatch) {
        const jsonResponseString = jsonMatch[0].replace(/```json\n|\n```/g, "")
        const jsonResponse = JSON.parse(jsonResponseString)
        lastMessage.content = jsonResponse.command
      } else {
        return new Response(
          `${aiResponse}\n\nNo JSON command found in the AI response.`,
          {
            status: 200
          }
        )
      }
    } catch (error) {
      return new Response(
        `${aiResponse}\n\n'Error extracting and parsing JSON from AI response: ${error}`,
        {
          status: 200
        }
      )
    }
  }

  const parts = lastMessage.content.split(" ")
  if (parts.includes("-h") || parts.includes("-help")) {
    return new Response(displayHelpGuide(), {
      status: 200
    })
  }

  const params = parseGauCommandLine(lastMessage.content)

  if (params.error && invokedByToolId) {
    return new Response(`${aiResponse}\n\n${params.error}`, {
      status: 200
    })
  } else if (params.error) {
    return new Response(params.error, { status: 200 })
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

  const headers = new Headers()
  headers.set("Content-Type", "text/event-stream")
  headers.set("Cache-Control", "no-cache")
  headers.set("Connection", "keep-alive")

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
      }, 20000)

      try {
        const gauResponse = await fetch(gauUrl, {
          method: "GET",
          headers: {
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`
          }
        })

        let gauData = await gauResponse.text()

        if (gauData.length === 0) {
          const noDataMessage = `🔍 Didn't find any URLs based on the provided command.`
          clearInterval(intervalId)
          sendMessage(noDataMessage, true)
          controller.close()
          return new Response(noDataMessage, {
            status: 200
          })
        }

        if (gauData.length > 50000) {
          gauData = gauData.slice(0, 50000)
        }

        clearInterval(intervalId)
        sendMessage("✅ Scan done! Now processing the results...", true)

        let urlsFormatted = processGauData(gauData)

        const date = new Date()
        const timezone = "UTC-5"
        const formattedDateTime = date.toLocaleString("en-US", {
          timeZone: "Etc/GMT+5",
          timeZoneName: "short"
        })
        const responseString =
          `# [Gau](${pluginUrls.Gau}) Results\n` +
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
        return new Response(errorMessage, {
          status: 200
        })
      }
    }
  })

  return new Response(stream, { headers })
}

const transformUserQueryToGAUCommand = (lastMessage: Message) => {
  const answerMessage = endent`
  Query: "${lastMessage.content}"

  Based on this query, generate a command for the 'GAU' tool, designed for fetching URLs from various sources. The command should use the most relevant flags, tailored to the specifics of the target and the user's requirements. If the request involves fetching URLs for a specific target, embed the target directly in the command rather than referencing an external file. The command should follow this structured format for clarity and accuracy:

  ALWAYS USE THIS FORMAT:
  \`\`\`json
  { "command": "gau [target] [flags]" }
  \`\`\`
  Replace '[target]' with the actual target directly included in the command, and '[flags]' with the actual flags and values. Include additional flags only if they are specifically relevant to the request.

  Command Construction Guidelines for Gau:
  1. **Direct Target Inclusion**: When fetching URLs for a specific target, directly embed the target in the command instead of using file references.
  2. **Configuration Flags**:
    - --from: Fetch URLs from date (format: YYYYMM). (optional)
    - --to: Fetch URLs to date (format: YYYYMM). (optional)
    - --providers: List of providers to use (wayback, commoncrawl, otx, urlscan). (optional)
    - --subs: Include subdomains of target domain. Use it if user asks for it. (optional)
  3. **Filter Flags**:
    - --blacklist: List of extensions to skip. (optional)
    - --fc: List of status codes to filter. (optional)
    - --ft: List of mime-types to filter. (optional)
    - --mc: List of status codes to match. (optional)
    - --mt: List of mime-types to match. (optional)
    - --fp: Remove different parameters of the same endpoint. (optional)
  4. **Relevance and Efficiency**:
    Ensure that the selected flags are relevant and contribute to an effective and efficient URL fetching process.

  Example Commands:
  For fetching URLs for a specific target with certain filters directly:
  \`\`\`json
  { "command": "gau example.com --from 202401 --to 202403 --blacklist js,css --fc 404" }
  \`\`\`

  For a request for help or to see all flags:
  \`\`\`json
  { "command": "gau -help" }
  \`\`\`

  Response:`

  return answerMessage
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
