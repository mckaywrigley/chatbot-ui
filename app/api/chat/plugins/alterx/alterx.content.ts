import { Message } from "@/types/chat"
import { pluginUrls } from "@/types/plugins"
import endent from "endent"

import {
  ProcessAIResponseOptions,
  createGKEHeaders,
  formatScanResults,
  getCommandFromAIResponse,
  processAIResponseAndUpdateMessage,
  truncateData
} from "../chatpluginhandlers"

export const isAlterxCommand = (message: string) => {
  if (!message.startsWith("/")) return false

  const trimmedMessage = message.trim()
  const commandPattern = /^\/alterx(?:\s+(-[a-z]+|\S+))*$/

  return commandPattern.test(trimmedMessage)
}

const displayHelpGuide = () => {
  return `
  [Alterx](${pluginUrls.Alterx}) is a fast and customizable subdomain wordlist generator using DSL.

    Usage:
       /alterx [flags]

    Flags:
    INPUT:
       -l, -list string[]      subdomains to use when creating permutations (stdin, comma-separated, file)
       -p, -pattern string[]   custom permutation patterns input to generate (comma-seperated, file)

    CONFIGURATION:
       -en, -enrich   enrich wordlist by extracting words from input
       -limit int     limit the number of results to return (default 0)`
}

interface AlterxParams {
  list: string[]
  pattern: string[]
  enrich: boolean
  limit: number
  payload: Map<string, string>
  fileContent: string
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
    fileContent: "",
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
        sendMessage(displayHelpGuide(), true)
        controller.close()
        return
      }

      const params = parseAlterxCommandLine(lastMessage.content)

      if (params.error && invokedByToolId) {
        return new Response(`\n\n${params.error}`)
      } else if (params.error) {
        return new Response(`${params.error}`)
      }

      let alterxUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/alterx`

      let requestBody: Partial<AlterxParams> = {}

      if (params.list.length > 0) {
        requestBody.list = params.list
      }
      if (params.pattern.length > 0) {
        requestBody.pattern = params.pattern
      }
      if (params.enrich) {
        requestBody.enrich = true
      }
      if (params.limit > 0) {
        requestBody.limit = params.limit
      }
      // FILE
      if (fileContentIncluded) {
        requestBody.fileContent = fileContent
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
          sendMessage(noDataMessage, true)
          return
        }

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
      } catch (error) {
        console.error("Error:", error)
        const errorMessage =
          error instanceof Error
            ? `🚨 Error: ${error.message}`
            : "🚨 There was a problem during the scan. Please try again."
        sendMessage(errorMessage, true)
      } finally {
        isFetching = false
        clearInterval(intervalId)
        controller.close()
      }
    }
  })

  return new Response(stream, { headers })
}

const transformUserQueryToAlterxCommand = (
  lastMessage: Message,
  fileContentIncluded?: boolean,
  fileName?: string
) => {
  const alterxIntroduction = fileContentIncluded
    ? `Based on this query, generate a command for the 'alterx' tool, a customizable subdomain wordlist generator. The command should use the most relevant flags, with '-list' being essential for specifying subdomains filename to use when creating permutations. If the request involves generating a wordlist from a list of subdomains, embed the subdomains filename directly in the command. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`
    : `Based on this query, generate a command for the 'alterx' tool, a customizable subdomain wordlist generator. The command should use the most relevant flags, with '-list' being essential for specifying subdomains to use when creating permutations. If the request involves generating a wordlist from a list of subdomains, embed the subdomains directly in the command rather than referencing an external file. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`

  const domainOrFilenameInclusionText = fileContentIncluded
    ? endent`**Filename Inclusion**: Use the -list string[] flag followed by the file name (e.g., -list ${fileName}) containing the list of domains in the correct format. Alterx supports direct file inclusion, making it convenient to use files like '${fileName}' that already contain the necessary domains. (required)`
    : endent`**Domain/Subdomain Inclusion**: Directly specify the main domain or subdomains using the -list string[] flag. For a single domain, format it as -list domain.com. For multiple subdomains, separate them with commas (e.g., -list subdomain1.domain.com,subdomain2.domain.com). (required)`

  const alterxExampleText = fileContentIncluded
    ? endent`For generating a wordlist using a file named '${fileName}' containing list of domains:
      \`\`\`json
      { "command": "alterx -list ${fileName}" }
      \`\`\``
    : endent`For generating a wordlist with a single subdomain:
      \`\`\`json
      { "command": "alterx -list subdomain1.com" }
      \`\`\`

      For generating a wordlist with multiple subdomains:
      \`\`\`json
      { "command": "alterx -list subdomain1.com,subdomain2.com" }
      \`\`\``

  const answerMessage = endent`
  Query: "${lastMessage.content}"

  ${alterxIntroduction}
  
  ALWAYS USE THIS FORMAT:
  \`\`\`json
  { "command": "alterx [flags]" }
  \`\`\`
  Replace '[flags]' with the actual flags and values. Include additional flags only if they are specifically relevant to the request. Ensure the command is properly escaped to be valid JSON.

  Command Construction Guidelines:
  1. ${domainOrFilenameInclusionText}
  2. **Selective Flag Use**: Carefully choose flags that are pertinent to the task. The available flags for the 'Alterx' tool include:
    - -pattern: Custom permutation patterns input to generate (optional).
    - -enrich: Enrich wordlist by extracting words from input (optional).
    - -limit: Limit the number of results to return, with the default being 0 (optional).
    - -help: Display help and all available flags. (optional)
    Use these flags to align with the request's specific requirements or when '-help' is requested for help.
  3. **Relevance and Efficiency**: Ensure that the selected flags are relevant and contribute to an effective and efficient wordlist generation process.

  Example Commands:

  ${alterxExampleText}

  For a request for help or all flags or if the user asked about how the plugin works:
  \`\`\`json
  { "command": "alterx -help" }
  \`\`\`
  
  Response:`

  return answerMessage
}

function processSubdomains(outputString: string) {
  return outputString
    .split("\n")
    .filter(subdomain => subdomain.trim().length > 0)
}
