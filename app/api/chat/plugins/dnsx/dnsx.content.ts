import { Message } from "@/types/chat"

import {
  ProcessAIResponseOptions,
  createGKEHeaders,
  formatScanResults,
  getCommandFromAIResponse,
  processAIResponseAndUpdateMessage,
  truncateData,
  processGKEData
} from "../chatpluginhandlers"

import { displayHelpGuideForDnsx } from "../plugin-helper/help-guides"
import { transformUserQueryToDnsxCommand } from "../plugin-helper/transform-query-to-command"
import { handlePluginStreamError } from "../plugin-helper/plugin-stream"
import {
  DnsxParams,
  dnsxBooleanFlagDefinitions,
  dnsxFlagDefinitions,
  dnsxRepeatableFlags,
  FlagDefinitions,
  validRcodes
} from "../plugin-helper/plugin-flags"
import { pluginUrls } from "@/types/plugins"

const parseCommandLine = (
  input: string,
  flagDefinitions: FlagDefinitions<DnsxParams>,
  repeatableFlags: Set<string> = new Set(),
  fileData?: { fileName: string; fileContent: string }[]
): DnsxParams => {
  const MAX_INPUT_LENGTH = 5000

  const params: DnsxParams = {
    list: "",
    domain: [],
    wordlist: [],
    a: false,
    aaaa: false,
    cname: false,
    ns: false,
    txt: false,
    srv: false,
    ptr: false,
    mx: false,
    soa: false,
    axfr: false,
    caa: false,
    recon: false,
    any: false,
    resp: false,
    respOnly: false,
    rcode: [],
    cdn: false,
    asn: false,
    json: false,
    error: null
  }

  if (input.length > MAX_INPUT_LENGTH) {
    params.error = "🚨 Input command is too long."
    return params
  }

  const args =
    input
      .trim()
      .match(/'[^']*'|[^\s]+/g)
      ?.map(arg => arg.replace(/^'|'$/g, "")) || []
  args.shift()

  const encounteredFlags: Set<string> = new Set()

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (flagDefinitions[arg]) {
      if (encounteredFlags.has(arg) && !repeatableFlags.has(arg)) {
        params.error = `🚨 Duplicate flag: ${arg}`
        return params
      }
      encounteredFlags.add(arg)

      const key = flagDefinitions[arg]
      if (typeof params[key] === "boolean") {
        ;(params as any)[key] = true
      } else {
        const nextArg = args[i + 1]
        if (nextArg && !nextArg.startsWith("-")) {
          if (Array.isArray(params[key])) {
            if (key === "rcode") {
              const rcodes = nextArg
                .split(",")
                .map(rcode => rcode.toLowerCase())
              const invalidRcodes = rcodes.filter(
                rcode => !validRcodes.includes(rcode)
              )
              if (invalidRcodes.length > 0) {
                params.error = `🚨 Invalid rcode value(s): ${invalidRcodes.join(", ")}`
                return params
              }
              params[key] = rcodes
            } else {
              const fileExtension = nextArg.split(".").pop()?.toLowerCase()
              if (fileExtension === "txt") {
                const fileContent = fileData?.find(
                  file => file.fileName === nextArg
                )?.fileContent
                if (fileContent) {
                  ;(params as any)[key] = [nextArg]
                  ;(params as any)[`${key}File`] = fileContent
                } else {
                  params.error = `🚨 File not found for flag: ${arg}`
                  return params
                }
              } else {
                ;(params as any)[key] = [nextArg]
              }
            }
          } else {
            const fileExtension = nextArg.split(".").pop()?.toLowerCase()
            if (fileExtension === "txt") {
              const fileContent = fileData?.find(
                file => file.fileName === nextArg
              )?.fileContent
              if (fileContent) {
                ;(params as any)[key] = nextArg
                ;(params as any)[`${key}File`] = fileContent
              } else {
                params.error = `🚨 File not found for flag: ${arg}`
                return params
              }
            } else {
              ;(params as any)[key] = nextArg
            }
          }
          i++
        } else {
          params.error = `🚨 Value not provided for flag: ${arg}`
          return params
        }
      }
    } else {
      params.error = `🚨 Unrecognized flag: ${arg}`
      return params
    }
  }

  if (
    params.domain &&
    params.domain.length > 0 &&
    params.wordlist &&
    params.wordlist.length === 0
  ) {
    params.error =
      "🚨 Missing wordlist (-w) flag required with domain (-d) input."
    return params
  }

  return params
}

export async function handleDnsxRequest(
  lastMessage: Message,
  enableDnsxFeature: boolean,
  OpenAIStream: any,
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  invokedByToolId: boolean,
  fileData?: { fileName: string; fileContent: string }[]
) {
  if (!enableDnsxFeature) {
    return new Response("The CVEMap is disabled.")
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
            transformUserQueryToDnsxCommand,
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
          console.error(
            "Error processing AI response and updating message:",
            error
          )
          return new Response(`Error processing AI response: ${error}`)
        }
      }

      const parts = lastMessage.content.split(" ")
      if (parts.includes("-h") || parts.includes("-help")) {
        sendMessage(displayHelpGuideForDnsx(), true)
        controller.close()
        return
      }

      const params = parseCommandLine(
        lastMessage.content,
        { ...dnsxFlagDefinitions, ...dnsxBooleanFlagDefinitions },
        dnsxRepeatableFlags,
        fileData
      )

      if (params.error) {
        handlePluginStreamError(
          params.error,
          invokedByToolId,
          sendMessage,
          controller
        )
        return
      }

      let dnsxUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/dnsx`

      let requestBody: Partial<DnsxParams> = {}

      for (const [key, value] of Object.entries(params)) {
        if (
          (Array.isArray(value) && value.length > 0) ||
          (typeof value === "boolean" && value) ||
          (typeof value === "number" && value > 0) ||
          (typeof value === "string" && value.length > 0)
        ) {
          ;(requestBody as any)[key] = value
        }
      }
      console.log(requestBody)
      sendMessage("🚀 Starting the scan. It might take a minute.", true)

      const intervalId = setInterval(() => {
        sendMessage(
          "⏳ Searching in progress. We appreciate your patience.",
          true
        )
      }, 15000)

      try {
        const dnsxResponse = await fetch(dnsxUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`
          },
          body: JSON.stringify(requestBody)
        })

        if (dnsxResponse.status !== 200) {
          const errorMessage = `🚨 An error occurred while running your query. Please try again or check your input.`
          sendMessage(`${errorMessage}`, true)
          controller.close()
          return new Response(errorMessage)
        }

        let dnsxData = await dnsxResponse.json()
        dnsxData = dnsxData.output
        dnsxData = processGKEData(dnsxData)
        dnsxData = truncateData(dnsxData, 300000)

        if (!dnsxData || dnsxData.length === 0) {
          const noDataMessage = `🔍 No results found with the given parameters.`
          clearInterval(intervalId)
          sendMessage(noDataMessage, true)
          controller.close()
          return new Response(noDataMessage)
        }

        clearInterval(intervalId)
        sendMessage("✅ Scan done! Now processing the results...", true)

        const target = params.list ? params.list : params.domain
        const formattedResults = formatScanResults({
          pluginName: "dnsx",
          pluginUrl: pluginUrls.DNSX,
          target: target || "",
          results: dnsxData
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
