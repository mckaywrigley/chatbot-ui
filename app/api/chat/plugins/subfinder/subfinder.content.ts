import { Message } from "@/types/chat"
import endent from "endent"

import { pluginUrls } from "@/app/api/chat/plugins/plugins"

export const isSubfinderCommand = (message: string) => {
  if (!message.startsWith("/")) return false

  const trimmedMessage = message.trim()
  const commandPattern = /^\/subfinder(?:\s+(-[a-z]+|\S+))*$/

  return commandPattern.test(trimmedMessage)
}

const displayHelpGuide = () => {
  return `
  [Subfinder](${pluginUrls.Subfinder}) is a powerful subdomain discovery tool designed to enumerate and uncover valid subdomains of websites efficiently through passive online sources. 

    Usage:
       /subfinder [flags]
  
    Flags:
    INPUT:
       -d, -domain string[]   domains to find subdomains for

    CONFIGURATION:
       -r string[]        comma separated list of resolvers to use
       -nW, -active       display active subdomains only
       -ei, -exclude-ip   exclude IPs from the list of domains

    FILTER:
       -m, -match string[]    subdomain or list of subdomain to match (comma separated)
       -f, -filter string[]   subdomain or list of subdomain to filter (comma separated)

    OUTPUT:
       -oJ, -json              write output in JSONL(ines) format
       -cs, -collect-sources   include all sources in the output
       -oI, -ip                include host IP in output (-active only)
       
    OPTIMIZATIONS:
       -timeout int   seconds to wait before timing out (default 30)`
}

interface SubfinderParams {
  domain: string[]
  // CONFIGURATION
  resolvers: string[]
  onlyActive: boolean
  excludeIP: boolean
  // FILTER
  match: string[]
  filter: string[]
  // OUTPUT
  outputJson: boolean
  includeSources: boolean
  ip: boolean
  // OPTIMIZATIONS:
  timeout: number
  error: string | null
}

const parseCommandLine = (input: string) => {
  const MAX_INPUT_LENGTH = 500
  const maxDomainLength = 255
  const maxSubdomainLength = 100

  const params: SubfinderParams = {
    domain: [],
    // CONFIGURATION
    resolvers: [],
    onlyActive: false,
    excludeIP: false,
    // FILTER
    match: [],
    filter: [],
    // OUTPUT
    outputJson: false,
    includeSources: false,
    ip: false,
    // OPTIMIZATIONS:
    timeout: 30,
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
  const isValidDomain = (domain: string) =>
    /^[a-zA-Z0-9.-]+$/.test(domain) && domain.length <= maxDomainLength
  const isValidSubdomain = (subdomain: string) =>
    /^[a-zA-Z0-9.-]+$/.test(subdomain)
  const isValidIpAddress = (ip: string) => {
    const regexPattern =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return regexPattern.test(ip)
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "-d":
      case "-domain":
        const domainArgs = args[++i].split(",")
        for (const domain of domainArgs) {
          if (
            isValidDomain(domain.trim()) &&
            domain.length <= maxDomainLength
          ) {
            params.domain.push(domain.trim())
          } else {
            params.error = `🚨 Invalid or too long domain provided (max ${maxDomainLength} characters)`
            return params
          }
        }
        break
      case "-r":
        const resolverArgs = args[++i].split(",")
        for (const resolver of resolverArgs) {
          if (isValidIpAddress(resolver.trim())) {
            params.resolvers.push(resolver.trim())
          } else {
            params.error = `🚨 Invalid IP address provided for resolver`
            return params
          }
        }
        break
      case "-m":
      case "-match":
        while (args[i + 1] && !args[i + 1].startsWith("-")) {
          const match = args[++i]
          if (isValidSubdomain(match) && match.length <= maxSubdomainLength) {
            params.match.push(match)
          } else {
            params.error = `🚨 Invalid or too long match pattern provided (max ${maxSubdomainLength} characters)`
            return params
          }
        }
        break
      case "-f":
      case "-filter":
        while (args[i + 1] && !args[i + 1].startsWith("-")) {
          const filter = args[++i]
          if (isValidSubdomain(filter) && filter.length <= maxSubdomainLength) {
            params.filter.push(filter)
          } else {
            params.error = `🚨 Invalid or too long filter pattern provided (max ${maxSubdomainLength} characters)`
            return params
          }
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
      case "-nw":
      case "-active":
        params.onlyActive = true
        break
      case "-ei":
      case "-exclude-ip":
        params.excludeIP = true
        break
      case "-cs":
      case "-collect-sources":
        params.includeSources = true
        break
      case "-oj":
      case "-json":
        params.outputJson = true
        break
      case "-oi":
      case "-ip":
        params.ip = true
        break
      default:
        params.error = `🚨 Invalid or unrecognized flag: ${args[i]}`
        return params
    }
  }

  if (!params.domain.length || params.domain.length === 0) {
    params.error = "🚨 Error: -d/-domain parameter is required."
  }

  return params
}

export async function handleSubfinderRequest(
  lastMessage: Message,
  enableSubfinderFeature: boolean,
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
  if (!enableSubfinderFeature) {
    return new Response("The Subfinder is disabled.", {
      status: 200
    })
  }

  const toolId = "subfinder"
  let aiResponse = ""

  if (invokedByToolId) {
    const answerPrompt = transformUserQueryToSubfinderCommand(lastMessage)
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

  const params = parseCommandLine(lastMessage.content)

  if (params.error && invokedByToolId) {
    return new Response(`${aiResponse}\n\n${params.error}`, {
      status: 200
    })
  } else if (params.error) {
    return new Response(params.error, { status: 200 })
  }

  let subfinderUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/subfinder?`

  subfinderUrl += params.domain.map(d => `domain=${d}`).join("&")
  if (params.match && params.match.length > 0) {
    subfinderUrl += "&" + params.match.map(m => `match=${m}`).join("&")
  }
  if (params.resolvers && params.resolvers.length > 0) {
    subfinderUrl += "&" + params.resolvers.map(r => `resolver=${r}`).join("&")
  }
  if (params.filter && params.filter.length > 0) {
    subfinderUrl += "&" + params.filter.map(f => `filter=${f}`).join("&")
  }
  if (params.onlyActive) {
    subfinderUrl += `&onlyActive=true`
  }
  if (params.excludeIP) {
    subfinderUrl += `&excludeIP=true`
  }
  if (params.includeSources) {
    subfinderUrl += `&includeSources=true`
  }
  if (params.ip) {
    subfinderUrl += `&ip=true`
  }
  if (params.timeout !== 30) {
    subfinderUrl += `&timeout=${params.timeout}`
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
      }, 15000)

      try {
        const subfinderResponse = await fetch(subfinderUrl, {
          method: "GET",
          headers: {
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`
          }
        })

        let subfinderData = await subfinderResponse.text()

        subfinderData = processSubfinderData(subfinderData)

        if (!subfinderData || subfinderData.length === 0) {
          const noDataMessage = `🔍 Alright, I've looked into "${params.domain.join(
            ", "
          )}" based on your command: "${
            lastMessage.content
          }". Turns out, there are no subdomains to report back on this time.`
          clearInterval(intervalId)
          sendMessage(noDataMessage, true)
          controller.close()
          return new Response(noDataMessage, {
            status: 200
          })
        }

        clearInterval(intervalId)
        sendMessage("✅ Scan done! Now processing the results...", true)

        if (params.outputJson) {
          const responseString = createResponseString(
            params.domain,
            subfinderData
          )
          sendMessage(responseString, true)
          controller.close()
          return new Response(subfinderData, {
            status: 200
          })
        }

        if (params.includeSources) {
          const responseString = createResponseString(
            params.domain,
            extractHostsAndSourcesFromData(subfinderData)
          )
          sendMessage(responseString, true)
          controller.close()
          return new Response(subfinderData, {
            status: 200
          })
        }

        if (params.ip) {
          const responseString = createResponseString(
            params.domain,
            extractHostIpSourceFromData(subfinderData)
          )
          sendMessage(responseString, true)
          controller.close()
          return new Response(subfinderData, {
            status: 200
          })
        }

        const responseString = createResponseString(
          params.domain,
          extractHostsFromSubfinderData(subfinderData)
        )
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

const transformUserQueryToSubfinderCommand = (lastMessage: Message) => {
  const answerMessage = endent`
  Query: "${lastMessage.content}"

  Based on this query, generate a command for the 'subfinder' tool, focusing on subdomain discovery. The command should use only the most relevant flags, with '-domain' being essential. If the request involves discovering subdomains for a specific domain, embed the domain directly in the command rather than referencing an external file. The '-json' flag is optional and should be included only if specified in the user's request. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:
  
  ALWAYS USE THIS FORMAT:
  \`\`\`json
  { "command": "subfinder -domain [domain] [additional flags as needed]" }
  \`\`\`
  Replace '[domain]' with the actual domain name and directly include it in the command. Include any of the additional flags only if they align with the specifics of the request. Ensure the command is properly escaped to be valid JSON.

  Command Construction Guidelines:
  1. **Direct Domain Inclusion**: When discovering subdomains for a specific domain, directly embed the domain in the command instead of using file references.
    - -domain string[]: Identifies the target domain(s) for subdomain discovery directly in the command. (required)
  2. **Selective Flag Use**: Carefully select flags that are directly pertinent to the task. The available flags are:
    - -r string[]: Use specified resolvers. (e.g., 8.8.8.8) (optional)
    - -active: Display only active subdomains. (optional)
    - -exclude-ip: Exclude IPs from the domain list. (optional)
    - -match string[]: Match specific subdomains in comma-separated format. (optional)
    - -filter string[]: Exclude certain subdomains in comma-separated format. (optional)
    - -json: Output in JSON format. (optional)
    - -collect-sources: Include source information for each subdomain. (optional)
    - -ip: Include host IP in output (always should go with -active flag). (optional)
    - -timeout int: Set timeout limit (default 30 seconds). (optional)
    - -help: Display help and all available flags. (optional)
    Do not include any flags not listed here. Use these flags to align with the request's specific requirements or when '-help' is requested for help.
  3. **Relevance and Efficiency**: Ensure that the flags chosen for the command are relevant and contribute to an effective and efficient subdomain discovery process.

  Example Commands:
  For discovering subdomains for a specific domain directly:
  \`\`\`json
  { "command": "subfinder -domain example.com" }
  \`\`\`

  For a request for help or all flags or if the user asked about how the plugin works:
  \`\`\`json
  { "command": "subfinder -help" }
  \`\`\`

  Response:`

  return answerMessage
}

const processSubfinderData = (data: string) => {
  return data
    .split("\n")
    .filter(line => line && !line.startsWith("data:") && line.trim() !== "")
    .join("")
}

const extractHostsFromSubfinderData = (data: string) => {
  try {
    const validJsonString = "[" + data.replace(/}{/g, "},{") + "]"

    const jsonData = JSON.parse(validJsonString)

    return jsonData
      .map((item: { host: any }) => item.host)
      .filter((host: undefined) => host !== undefined)
      .join("\n")
  } catch (error) {
    console.error("Error processing data:", error)
    return ""
  }
}

const extractHostsAndSourcesFromData = (data: string) => {
  try {
    const validJsonString = "[" + data.replace(/}{/g, "},{") + "]"

    const jsonData = JSON.parse(validJsonString)

    return jsonData
      .map((item: { host: any; sources: any[] }) => {
        const host = item.host
        const sources = item.sources ? `[${item.sources.join(", ")}]` : "[]"
        return `${host},${sources}`
      })
      .join("\n")
  } catch (error) {
    console.error("Error processing data:", error)
    return ""
  }
}

const extractHostIpSourceFromData = (data: string) => {
  try {
    const validJsonString = "[" + data.replace(/}{/g, "},{") + "]"

    const jsonData = JSON.parse(validJsonString)

    return jsonData
      .map((item: { host: string; ip: string; source: string }) => {
        const host = item.host || ""
        const ip = item.ip || ""
        const source = item.source || ""
        return `${host},${ip},${source}`
      })
      .join("\n")
  } catch (error) {
    console.error("Error processing data:", error)
    return ""
  }
}

const createResponseString = (
  domain: string | string[],
  subfinderData: string
) => {
  const date = new Date()
  const timezone = "UTC-5"
  const formattedDateTime = date.toLocaleString("en-US", {
    timeZone: "Etc/GMT+5",
    timeZoneName: "short"
  })

  return (
    `# [Subfinder](${pluginUrls.Subfinder}) Results\n` +
    '**Target**: "' +
    domain +
    '"\n\n' +
    "**Scan Date & Time**: " +
    `${formattedDateTime} (${timezone}) \n\n` +
    `## Identified Subdomains:\n` +
    "```\n" +
    subfinderData +
    "\n" +
    "```\n"
  )
}
