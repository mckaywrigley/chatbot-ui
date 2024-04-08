import { Message } from "@/types/chat"
import { pluginUrls } from "@/types/plugins"
import endent from "endent"

import {
  createGKEHeaders,
  processAIResponseAndUpdateMessage,
  truncateData
} from "../chatpluginhandlers"

export const isGolinkfinderCommand = (message: string) => {
  if (!message.startsWith("/")) return false

  const trimmedMessage = message.trim()
  const commandPattern = /^\/golinkfinder(?:\s+(-[a-z]+|\S+))*$/

  return commandPattern.test(trimmedMessage)
}

const displayHelpGuide = () => {
  return `
  [GoLinkFinder](${pluginUrls.GoLinkFinder}) is a minimalistic JavaScript endpoint extractor that efficiently pulls endpoints from HTML and embedded JavaScript files. 

    Usage:
       /golinkfinder --domain [domain]

    Flags:
    CONFIGURATION:
       -d --domain string   Input a URL.`
}

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
  if (!enableGoLinkFinderFeature) {
    return new Response("The GoLinkFinder is disabled.")
  }

  let aiResponse = ""

  if (invokedByToolId) {
    try {
      const { updatedLastMessageContent, aiResponseText } =
        await processAIResponseAndUpdateMessage(
          lastMessage,
          transformUserQueryToGoLinkFinderCommand,
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
  if (
    parts.includes("-h") ||
    parts.includes("-help") ||
    parts.includes("--help")
  ) {
    return new Response(displayHelpGuide())
  }

  const params = parseGoLinkFinderCommandLine(lastMessage.content)

  if (params.error && invokedByToolId) {
    return new Response(`${aiResponse}\n\n${params.error}`)
  } else if (params.error) {
    return new Response(params.error)
  }

  let golinkfinderUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/golinkfinder?`

  if (Array.isArray(params.domain)) {
    const targetsString = params.domain.join(" ")
    golinkfinderUrl += `domain=${encodeURIComponent(targetsString)}`
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

const transformUserQueryToGoLinkFinderCommand = (lastMessage: Message) => {
  const answerMessage = endent`
  Query: "${lastMessage.content}"

  Based on this query, generate a command for the 'GoLinkFinder' tool, tailored to efficiently extract URLs from HTML content. Ensure to utilize the most pertinent flag, '--domain', to specify the target website. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:

  ALWAYS USE THIS FORMAT:
  \`\`\`json
  { "command": "golinkfinder --domain [target-domain]" }
  \`\`\`
  Substitute '[target-domain]' with the actual domain you intend to investigate. It's crucial to directly incorporate the target domain within the command, bypassing the need for external file references.

  **Command Construction Guidelines for GoLinkFinder**:
  1. **Single Domain Focus**: Direct inclusion of the target domain in the command is mandatory. 
      - --domain (string): Specify the target website URL. (required)

  Note: **Selective Flag Application**: Choose flags that directly contribute to the scope of your query. The key flags include:
      - --help: Display a help guide or a full list of available commands and flags.
  Note: **Limitation on Command and Domain Quantity**: 'GoLinkFinder' is designed to process a single command and a single domain at a time. Should there be attempts to include multiple domains or generate multiple commands by user query, respond back with tool's functionality restricts such operations.  

  **Example Commands**:
  - For extracting URLs from a specific domain:
  \`\`\`json
  { "command": "golinkfinder --domain example.com" }
  \`\`\`

  - For a request for help or all flags or if the user asked about how the plugin works:
  \`\`\`json
  { "command": "golinkfinder --help" }
  \`\`\`

  Please adjust the command based on your specific requirements or inquire further if assistance with additional flags is needed.
  
  Response:`

  return answerMessage
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
