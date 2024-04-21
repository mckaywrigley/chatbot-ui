import { Message } from "@/types/chat"
import { pluginUrls } from "@/types/plugins"

import {
  processAIResponseAndUpdateMessage,
  formatScanResults,
  createGKEHeaders,
  ProcessAIResponseOptions,
  truncateData,
  getCommandFromAIResponse
} from "../chatpluginhandlers"

import { displayHelpGuideForNaabu } from "../plugin-helper/help-guides"
import { transformUserQueryToNaabuCommand } from "../plugin-helper/transform-query-to-command"
import { handlePluginStreamError } from "../plugin-helper/plugin-stream"

interface NaabuParams {
  host: string[] | string
  list: string
  port: string
  topPorts: string
  excludePorts: string
  portThreshold: number
  excludeCDN: boolean
  displayCDN: boolean
  scanAllIPs: boolean
  hostDiscovery: boolean
  skipHostDiscovery: boolean
  probeIcmpEcho: boolean
  probeIcmpTimestamp: boolean
  probeIcmpAddressMask: boolean
  arpPing: boolean
  ndPing: boolean
  revPtr: boolean
  timeout: number
  outputJson: boolean
  error: string | null
}

const parseNaabuCommandLine = (input: string): NaabuParams => {
  const MAX_INPUT_LENGTH = 2000
  const MAX_HOST_PARAM_LENGTH = 1000
  const MAX_PARAM_LENGTH = 200
  const MAX_ARRAY_SIZE = 50

  const params: NaabuParams = {
    host: [],
    list: "",
    port: "",
    topPorts: "",
    excludePorts: "",
    portThreshold: 0,
    excludeCDN: false,
    displayCDN: false,
    scanAllIPs: false,
    hostDiscovery: false,
    skipHostDiscovery: false,
    probeIcmpEcho: false,
    probeIcmpTimestamp: false,
    probeIcmpAddressMask: false,
    arpPing: false,
    ndPing: false,
    revPtr: false,
    timeout: 10000,
    outputJson: false,
    error: null
  }

  if (input.length > MAX_INPUT_LENGTH) {
    params.error = `🚨 Input command is too long`
    return params
  }

  const trimmedInput = input.trim().toLowerCase()
  const args = trimmedInput.split(" ")
  args.shift()

  const isValidHostnameOrIP = (value: string) => {
    return (
      /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/.test(
        value
      ) || /^(\d{1,3}\.){3}\d{1,3}$/.test(value)
    )
  }
  const isInteger = (value: string) => /^[0-9]+$/.test(value)
  const isValidPortRange = (port: string) => {
    return port.split(",").every(p => {
      const range = p.split("-")
      return range.every(
        r => /^\d+$/.test(r) && parseInt(r, 10) >= 1 && parseInt(r, 10) <= 65535
      )
    })
  }
  const isValidTopPortsValue = (value: string) => {
    return ["100", "1000"].includes(value)
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (
      arg !== "-host" &&
      args[i + 1] &&
      args[i + 1].length > MAX_PARAM_LENGTH
    ) {
      params.error = `🚨 Parameter value too long for '${arg}'`
      return params
    }

    switch (arg) {
      case "-host":
        if (args[i + 1] && args[i + 1].length > MAX_HOST_PARAM_LENGTH) {
          params.error = `🚨 Host parameter value too long`
          return params
        }
        const hosts = args[++i].split(",")
        if (
          hosts.some(host => !isValidHostnameOrIP(host)) ||
          hosts.length > MAX_ARRAY_SIZE
        ) {
          params.error = "🚨 Invalid host format or too many hosts provided"
          return params
        }
        params.host = hosts
        break
      case "-l":
      case "-list":
        const listArg = args[++i]
        if (!listArg.endsWith(".txt")) {
          params.error = "🚨 List file must be a .txt file"
          return params
        }
        params.list = listArg
        break
      case "-port":
      case "-p":
        const portArg = args[++i]
        if (!isValidPortRange(portArg)) {
          params.error = "🚨 Invalid port range"
          return params
        }
        params.port = portArg
        break
      case "-top-ports":
      case "-tp":
        const topPortsArg = args[++i]
        if (!isValidTopPortsValue(topPortsArg)) {
          params.error = "🚨 Invalid top-ports value"
          return params
        }
        params.topPorts = topPortsArg
        break
      case "-exclude-ports":
      case "-ep":
        const excludePortsArg = args[++i]
        if (!isValidPortRange(excludePortsArg)) {
          params.error = "🚨 Invalid exclude-ports range"
          return params
        }
        params.excludePorts = excludePortsArg
        break
      case "-port-threshold":
      case "-pts":
        if (isInteger(args[i + 1])) {
          params.portThreshold = parseInt(args[++i], 10)
        } else {
          params.error = "🚨 Invalid port-threshold value"
          return params
        }
        break
      case "-exclude-cdn":
      case "-ec":
        params.excludeCDN = true
        break
      case "-display-cdn":
      case "-cdn":
        params.displayCDN = true
        break
      case "-sa":
      case "-scan-all-ips":
        params.scanAllIPs = true
        break
      case "-sn":
      case "-host-discovery":
        params.hostDiscovery = true
        break
      case "-pn":
      case "-skip-host-discovery":
        params.skipHostDiscovery = true
        break
      case "-pe":
      case "-probe-icmp-echo":
        params.probeIcmpEcho = true
        break
      case "-pp":
      case "-probe-icmp-timestamp":
        params.probeIcmpTimestamp = true
        break
      case "-pm":
      case "-probe-icmp-address-mask":
        params.probeIcmpAddressMask = true
        break
      case "-arp":
      case "-arp-ping":
        params.arpPing = true
        break
      case "-nd":
      case "-nd-ping":
        params.ndPing = true
        break
      case "-rev-ptr":
        params.revPtr = true
        break
      case "-timeout":
        if (args[i + 1] && isInteger(args[i + 1])) {
          let timeoutValue = parseInt(args[++i])
          if (timeoutValue > 90000) {
            params.error = `🚨 Timeout value exceeds the maximum limit of 90000 milliseconds`
            return params
          }
          params.timeout = timeoutValue
        } else {
          params.error = `🚨 Invalid timeout value for '${args[i]}' flag`
          return params
        }
        break
      case "-j":
      case "-json":
        params.outputJson = true
        break
      default:
        params.error = `🚨 Invalid or unrecognized flag: ${args[i]}`
        return params
    }
  }

  if ((!params.host || params.host.length === 0) && !params.list) {
    params.error = `🚨 Error: -host or -l/-list parameter is required.`
  }

  return params
}

export async function handleNaabuRequest(
  lastMessage: Message,
  enableNaabuFeature: boolean,
  OpenAIStream: any,
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  invokedByToolId: boolean,
  fileData?: { fileName: string; fileContent: string }[]
) {
  if (!enableNaabuFeature) {
    return new Response("The Naabu feature is disabled.")
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
            transformUserQueryToNaabuCommand,
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
        sendMessage(displayHelpGuideForNaabu(), true)
        controller.close()
        return
      }

      const params = parseNaabuCommandLine(lastMessage.content)

      if (params.error) {
        handlePluginStreamError(
          params.error,
          invokedByToolId,
          sendMessage,
          controller
        )
        return
      }

      let naabuUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/naabu`

      let requestBody: Partial<NaabuParams> = {}

      for (const [key, value] of Object.entries(params)) {
        if (
          (Array.isArray(value) && value.length > 0) ||
          (typeof value === "boolean" && value) ||
          (typeof value === "number" &&
            value > 0 &&
            !(key === "timeout" && value === 10000)) ||
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
        const naabuResponse = await fetch(naabuUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`
          },
          body: JSON.stringify(requestBody)
        })

        if (!naabuResponse.ok) {
          throw new Error(
            `HTTP error! status: ${naabuResponse.status}, ${naabuResponse.statusText}`
          )
        }

        const jsonResponse = await naabuResponse.json()
        const outputString = jsonResponse.output

        let portsFormatted = processPorts(outputString)
        portsFormatted = truncateData(portsFormatted, 300000)

        if (
          outputString &&
          outputString.includes("Error executing Naabu command") &&
          outputString.includes("Error reading output file")
        ) {
          const errorMessage = `🚨 An error occurred while running your query. Please try again or check your input.`
          clearInterval(intervalId)
          sendMessage(errorMessage, true)
          controller.close()
          return new Response(errorMessage)
        }

        if (!portsFormatted || portsFormatted.length === 0) {
          const noDataMessage = `🔍 No results found with the given parameters.`
          clearInterval(intervalId)
          sendMessage(noDataMessage, true)
          controller.close()
          return new Response(noDataMessage)
        }

        clearInterval(intervalId)
        sendMessage("✅ Scan done! Now processing the results...", true)

        const target = params.list ? params.list : params.host
        const formattedResults = formatScanResults({
          pluginName: "Naabu",
          pluginUrl: pluginUrls.NAABU,
          target: target,
          results: portsFormatted
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

function processPorts(outputString: string) {
  return outputString
    .split("\n")
    .filter(subdomain => subdomain.trim().length > 0)
}
