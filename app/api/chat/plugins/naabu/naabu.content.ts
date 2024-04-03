import { Message } from "@/types/chat"
import endent from "endent"

import { pluginUrls } from "@/app/api/chat/plugins/plugins"

export const isNaabuCommand = (message: string) => {
  if (!message.startsWith("/")) return false

  const trimmedMessage = message.trim()
  const commandPattern = /^\/naabu(?:\s+(-[a-z]+|\S+))*$/

  return commandPattern.test(trimmedMessage)
}

const displayHelpGuide = () => {
  return `
  [Naabu](${pluginUrls.Naabu}) is a port scanning tool written in Go that allows you to enumerate valid ports for hosts in a fast and reliable manner. It is a really simple tool that does fast SYN/CONNECT/UDP scans on the host/list of hosts and lists all ports that return a reply. 

    Usage:
       /naabu [flags]

    Flags:
    INPUT:
       -host string[]   hosts to scan ports for (comma-separated)

    PORT:
       -port, -p string             ports to scan (80,443, 100-200)
       -top-ports, -tp string       top ports to scan (default 100) [100,1000]
       -exclude-ports, -ep string   ports to exclude from scan (comma-separated)
       -port-threshold, -pts int    port threshold to skip port scan for the host
       -exclude-cdn, -ec            skip full port scans for CDN/WAF (only scan for port 80,443)
       -display-cdn, -cdn           display cdn in use    

    CONFIGURATION:
       -scan-all-ips, -sa   scan all the IP's associated with DNS record
       -timeout int         seconds to wait before timing out (default 10)
    
    HOST-DISCOVERY:
       -sn, -host-discovery            Perform Only Host Discovery
       -Pn, -skip-host-discovery       Skip Host discovery
       -pe, -probe-icmp-echo           ICMP echo request Ping (host discovery needs to be enabled)
       -pp, -probe-icmp-timestamp      ICMP timestamp request Ping (host discovery needs to be enabled)
       -pm, -probe-icmp-address-mask   ICMP address mask request Ping (host discovery needs to be enabled)
       -arp, -arp-ping                 ARP ping (host discovery needs to be enabled)
       -nd, -nd-ping                   IPv6 Neighbor Discovery (host discovery needs to be enabled)
       -rev-ptr                        Reverse PTR lookup for input ips

    OUTPUT:
       -j, -json   write output in JSON lines format`
}

interface NaabuParams {
  host: string[] | string
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
    timeout: 10,
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
      case "-j":
      case "-json":
        params.outputJson = true
        break
      default:
        params.error = `🚨 Invalid or unrecognized flag: ${args[i]}`
        return params
    }
  }

  if (!params.host || params.host.length === 0) {
    params.error = `🚨 Error: -host parameter is required.`
  }

  return params
}

export async function handleNaabuRequest(
  lastMessage: Message,
  enableNaabuFeature: boolean,
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
  if (!enableNaabuFeature) {
    return new Response("The Naabu feature is disabled.", {
      status: 200
    })
  }

  let aiResponse = ""

  if (invokedByToolId) {
    const answerPrompt = transformUserQueryToNaabuCommand(lastMessage)
    answerMessage.content = answerPrompt

    const openAIResponseStream = await OpenAIStream(
      model,
      messagesToSend,
      answerMessage
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

  const params = parseNaabuCommandLine(lastMessage.content)

  if (params.error && invokedByToolId) {
    return new Response(`${aiResponse}\n\n${params.error}`, {
      status: 200
    })
  } else if (params.error) {
    return new Response(params.error, { status: 200 })
  }

  let naabuUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/naabu`

  interface NaabuRequestBody {
    host?: string | string[]
    port?: string
    timeout?: number
    scanAllIPs?: boolean
    outputJson?: boolean
    topPorts?: string
    excludePorts?: string
    portThreshold?: number
    excludeCDN?: boolean
    displayCDN?: boolean
    hostDiscovery?: boolean
    skipHostDiscovery?: boolean
    probeIcmpEcho?: boolean
    probeIcmpTimestamp?: boolean
    probeIcmpAddressMask?: boolean
    arpPing?: boolean
    ndPing?: boolean
    revPtr?: boolean
  }

  let requestBody: NaabuRequestBody = {}

  if (params.host) {
    requestBody.host = params.host
  }
  if (params.port) {
    requestBody.port = params.port
  }
  if (params.timeout && params.timeout !== 10) {
    requestBody.timeout = params.timeout * 1000
  }
  if (params.scanAllIPs) {
    requestBody.scanAllIPs = params.scanAllIPs
  }
  if (params.outputJson) {
    requestBody.outputJson = params.outputJson
  }
  if (params.topPorts) {
    requestBody.topPorts = params.topPorts
  }
  if (params.excludePorts) {
    requestBody.excludePorts = params.excludePorts
  }
  if (params.portThreshold && params.portThreshold > 0) {
    requestBody.portThreshold = params.portThreshold
  }
  if (params.excludeCDN) {
    requestBody.excludeCDN = params.excludeCDN
  }
  if (params.displayCDN) {
    requestBody.displayCDN = params.displayCDN
  }
  if (params.hostDiscovery) {
    requestBody.hostDiscovery = params.hostDiscovery
  }
  if (params.skipHostDiscovery) {
    requestBody.skipHostDiscovery = params.skipHostDiscovery
  }
  if (params.probeIcmpEcho) {
    requestBody.probeIcmpEcho = params.probeIcmpEcho
  }
  if (params.probeIcmpTimestamp) {
    requestBody.probeIcmpTimestamp = params.probeIcmpTimestamp
  }
  if (params.probeIcmpAddressMask) {
    requestBody.probeIcmpAddressMask = params.probeIcmpAddressMask
  }
  if (params.arpPing) {
    requestBody.arpPing = params.arpPing
  }
  if (params.ndPing) {
    requestBody.ndPing = params.ndPing
  }
  if (params.revPtr) {
    requestBody.revPtr = params.revPtr
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

        if (
          outputString &&
          outputString.includes("Error executing Naabu command") &&
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

        if (!outputString || outputString.length === 0) {
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

        const portsFormatted = processPorts(outputString)
        const formattedResponse = formatResponseString(portsFormatted, params)
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

const transformUserQueryToNaabuCommand = (lastMessage: Message) => {
  const answerMessage = endent`
  Query: "${lastMessage.content}"

  Based on this query, generate a command for the 'naabu' tool, focusing on port scanning. The command should use only the most relevant flags, with '-host' being essential. If the request involves scanning a list of hosts, embed the hosts directly in the command rather than referencing an external file. The '-json' flag is optional and should be included only if specified in the user's request. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:

  ALWAYS USE THIS FORMAT:
  \`\`\`json
  { "command": "naabu [flags]" }
  \`\`\`
  Replace '[flags]' with the actual flags and values, directly including the hosts if necessary. Include additional flags only if they are specifically relevant to the request.
  IMPORTANT: Ensure the command is properly escaped to be valid JSON. Ensure the command uses simpler regex patterns compatible with the 'naabu' tool's regex engine. Avoid advanced regex features like negative lookahead.

  Command Construction Guidelines for Naabu:
  1. **Direct Host Inclusion**: When scanning a list of hosts, directly embed them in the command instead of using file references.
    - -host string[]: Identifies the target host(s) for port scanning directly in the command. (required)
  2. **Selective Flag Use**: Include only the flags that are essential to the request. The available flags for Naabu are:
    - -port string: Specify ports to scan (e.g., 80,443, 100-200). (optional)
    - -top-ports string: Scan top N ports (e.g., 100, 1000). (optional)
    - -exclude-ports string: Exclude specific ports from the scan. (optional)
    - -port-threshold int: Set a port threshold to skip port scan for the host. (optional)
    - -exclude-cdn: Exclude full port scans for CDN/WAF. (optional)
    - -display-cdn: Display CDN in use. (optional)
    - -scan-all-ips: Scan all IPs associated with a DNS record. (optional)
    - -timeout int: Set a timeout limit in seconds (default is 10). (optional)
    - -host-discovery: Perform only host discovery. (optional)
    - -skip-host-discovery: Skip host discovery. (optional)
    - -probe-icmp-echo: Use ICMP echo request ping. (optional)
    - -probe-icmp-timestamp: Use ICMP timestamp request ping. (optional)
    - -probe-icmp-address-mask: Use ICMP address mask request ping. (optional)
    - -arp-ping: Use ARP ping. (optional)
    - -nd-ping: Use IPv6 Neighbor Discovery ping. (optional)
    - -rev-ptr: Perform a reverse PTR lookup. (optional)
    - -json: Output results in JSON format. (optional)
    - -help: Display help and all available flags. (optional)
    Use these flags to align with the request's specific requirements or when '-help' is requested for help.
  3. **Relevance and Efficiency**: Ensure that the flags chosen for the command are relevant and contribute to an effective and efficient port discovery process.

  Example Commands:
  For scanning a list of hosts directly:
  \`\`\`json
  { "command": "naabu -host host1.com,host2.com,host3.com -top-ports 100" }
  \`\`\`

  For a request for help or all flags or if the user asked about how the plugin works:
  \`\`\`json
  { "command": "naabu -help" }
  \`\`\`

  Response:`

  return answerMessage
}

function processPorts(outputString: string) {
  return outputString
    .split("\n")
    .filter(subdomain => subdomain.trim().length > 0)
}

function formatResponseString(ports: any[], params: NaabuParams) {
  const date = new Date()
  const timezone = "UTC-5"
  const formattedDateTime = date.toLocaleString("en-US", {
    timeZone: "Etc/GMT+5",
    timeZoneName: "short"
  })

  const portsFormatted = ports.join("\n")

  return (
    `# [Naabu](${pluginUrls.Naabu}) Results\n` +
    '**Target**: "' +
    params.host +
    '"\n\n' +
    "**Scan Date & Time**:" +
    ` ${formattedDateTime} (${timezone}) \n\n` +
    "## Identified Ports:\n" +
    "```\n" +
    portsFormatted +
    "\n" +
    "```\n"
  )
}
