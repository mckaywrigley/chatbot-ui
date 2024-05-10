import { Message } from "@/types/chat"
import { pluginUrls } from "@/types/plugins"
import {
  createGKEHeaders,
  getCommandFromAIResponse,
  processAIResponseAndUpdateMessage
} from "../chatpluginhandlers"

import { displayHelpGuideForSubfinder } from "../plugin-helper/help-guides"
import { transformUserQueryToSubfinderCommand } from "../plugin-helper/transform-query-to-command"
import { handlePluginStreamError } from "../plugin-helper/plugin-stream"

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
  output: string
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
    output: "",
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
      case "-output":
        if (i + 1 < args.length) {
          params.output = args[++i]
        } else {
          params.error = `🚨 Output flag provided without value`
          return params
        }
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
  OpenAIStream: any,
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  invokedByToolId: boolean
) {
  if (!enableSubfinderFeature) {
    return new Response("The Subfinder is disabled.")
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
            transformUserQueryToSubfinderCommand,
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
        sendMessage(displayHelpGuideForSubfinder(), true)
        controller.close()
        return
      }

      const params = parseCommandLine(lastMessage.content)

      if (params.error) {
        handlePluginStreamError(
          params.error,
          invokedByToolId,
          sendMessage,
          controller
        )
        return
      }

      let subfinderUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/subfinder?`

      subfinderUrl += params.domain.map(d => `domain=${d}`).join("&")
      if (params.match && params.match.length > 0) {
        subfinderUrl += "&" + params.match.map(m => `match=${m}`).join("&")
      }
      if (params.resolvers && params.resolvers.length > 0) {
        subfinderUrl +=
          "&" + params.resolvers.map(r => `resolver=${r}`).join("&")
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
          return new Response(noDataMessage)
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
          return new Response(subfinderData)
        }

        if (params.includeSources) {
          const responseString = createResponseString(
            params.domain,
            extractHostsAndSourcesFromData(subfinderData)
          )
          sendMessage(responseString, true)
          controller.close()
          return new Response(subfinderData)
        }

        if (params.ip) {
          const responseString = createResponseString(
            params.domain,
            extractHostIpSourceFromData(subfinderData)
          )
          sendMessage(responseString, true)
          controller.close()
          return new Response(subfinderData)
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
        return new Response(errorMessage)
      }
    }
  })

  return new Response(stream, { headers })
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
    `# [Subfinder](${pluginUrls.SUBFINDER}) Results\n` +
    '**Target**: "' +
    domain +
    '"\n\n' +
    "**Scan Date & Time**: " +
    `${formattedDateTime} (${timezone}) \n\n` +
    `## Results:\n` +
    "```\n" +
    subfinderData +
    "\n" +
    "```\n"
  )
}
