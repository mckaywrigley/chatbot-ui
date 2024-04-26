// import { Message } from "@/types/chat"

// import {
//   ProcessAIResponseOptions,
//   createGKEHeaders,
//   formatScanResults,
//   getCommandFromAIResponse,
//   processAIResponseAndUpdateMessage,
//   truncateData,
//   processGKEData
// } from "../chatpluginhandlers"

// import { displayHelpGuideForAmass } from "../plugin-helper/help-guides"
// import { transformUserQueryToAmassCommand } from "../plugin-helper/transform-query-to-command"
// import { handlePluginStreamError } from "../plugin-helper/plugin-stream"
// import {
//   AmassParams,
//   amassBooleanFlagDefinitions,
//   amassFlagDefinitions,
//   amassRepeatableFlags,
//   FlagDefinitions
// } from "../plugin-helper/plugin-flags"
// import { pluginUrls } from "@/types/plugins"

// const parseCommandLine = (
//   input: string,
//   flagDefinitions: FlagDefinitions<AmassParams>,
//   repeatableFlags: Set<string> = new Set(),
//   fileData?: { fileName: string; fileContent: string }[]
// ): AmassParams => {
//   const MAX_INPUT_LENGTH = 5000
//   const MAX_TIMEOUT_MINUTES = 5

//   const params: AmassParams = {
//     enum: false,
//     intel: false,
//     active: false,
//     addr: "",
//     alts: false,
//     asn: [],
//     aw: "",
//     awm: "",
//     bl: "",
//     blf: "",
//     blfFile: "",
//     brute: false,
//     cidr: [],
//     domain: [],
//     demo: false,
//     df: "",
//     dfFile: "",
//     ef: "",
//     efFile: "",
//     exclude: "",
//     if: "",
//     ifFile: "",
//     iface: "",
//     include: "",
//     ip: false,
//     ipv4: false,
//     ipv6: false,
//     list: false,
//     maxDepth: "",
//     minForRecursive: "",
//     nf: "",
//     nfFile: "",
//     norecursive: false,
//     org: "",
//     p: "",
//     passive: false,
//     r: [],
//     rf: "",
//     rfFile: "",
//     rqps: "",
//     timeout: 1,
//     tr: [],
//     trf: "",
//     trfFile: "",
//     trqps: "",
//     w: "",
//     wFile: "",
//     whois: false,
//     wm: "",
//     error: null
//   }

//   if (input.length > MAX_INPUT_LENGTH) {
//     params.error = "🚨 Input command is too long."
//     return params
//   }

//   const args =
//     input
//       .trim()
//       .match(/'[^']*'|[^\s]+/g)
//       ?.map(arg => arg.replace(/^'|'$/g, "")) || []
//   args.shift()

//   const encounteredFlags: Set<string> = new Set()

//   for (let i = 0; i < args.length; i++) {
//     const arg = args[i]

//     if (flagDefinitions[arg]) {
//       if (encounteredFlags.has(arg) && !repeatableFlags.has(arg)) {
//         params.error = `🚨 Duplicate flag: ${arg}`
//         return params
//       }
//       encounteredFlags.add(arg)

//       const key = flagDefinitions[arg]
//       if (typeof params[key] === "boolean") {
//         ;(params as any)[key] = true
//       } else {
//         const nextArg = args[i + 1]
//         if (nextArg && !nextArg.startsWith("-")) {
//           if (key === "timeout") {
//             const timeoutValue = parseInt(nextArg, 10)
//             if (isNaN(timeoutValue) || timeoutValue > MAX_TIMEOUT_MINUTES) {
//               params.error = `🚨 Timeout value must be a number and cannot exceed 5 minutes (${MAX_TIMEOUT_MINUTES} minutes).`
//               return params
//             }
//           }
//           const fileExtension = nextArg.split(".").pop()?.toLowerCase()
//           if (fileExtension === "txt") {
//             const fileContent = fileData?.find(
//               file => file.fileName === nextArg
//             )?.fileContent
//             if (fileContent) {
//               ;(params as any)[key] = nextArg
//               ;(params as any)[`${key}File`] = fileContent
//             } else {
//               params.error = `🚨 File not found for flag: ${arg}`
//               return params
//             }
//           } else {
//             ;(params as any)[key] = nextArg
//           }
//           i++
//         } else {
//           params.error = `🚨 Value not provided for flag: ${arg}`
//           return params
//         }
//       }
//     } else if (arg === "enum") {
//       params.enum = true
//     } else if (arg === "intel") {
//       params.intel = true
//     } else {
//       params.error = `🚨 Unrecognized flag: ${arg}`
//       return params
//     }
//   }

//   if (params.enum && params.intel) {
//     params.error = "🚨 You cannot use both -enum and -intel at the same time."
//     return params
//   }

//   if (!params.domain && !params.df && params.enum) {
//     params.error =
//       "🚨 You must provide a domain or a file name when using 'enum' subcommand."
//     return params
//   }

//   return params
// }

// export async function handleAmassRequest(
//   lastMessage: Message,
//   enableAmassFeature: boolean,
//   OpenAIStream: any,
//   model: string,
//   messagesToSend: Message[],
//   answerMessage: Message,
//   invokedByToolId: boolean,
//   fileData?: { fileName: string; fileContent: string }[]
// ) {
//   if (!enableAmassFeature) {
//     return new Response("The CVEMap is disabled.")
//   }

//   const fileContentIncluded = !!fileData && fileData.length > 0
//   let aiResponse = ""

//   const headers = createGKEHeaders()

//   const stream = new ReadableStream({
//     async start(controller) {
//       const sendMessage = (
//         data: string,
//         addExtraLineBreaks: boolean = false
//       ) => {
//         const formattedData = addExtraLineBreaks ? `${data}\n\n` : data
//         controller.enqueue(new TextEncoder().encode(formattedData))
//       }

//       if (invokedByToolId) {
//         const options: ProcessAIResponseOptions = {
//           fileContentIncluded: fileContentIncluded,
//           fileNames: fileData?.map(file => file.fileName) || []
//         }

//         try {
//           for await (const chunk of processAIResponseAndUpdateMessage(
//             lastMessage,
//             transformUserQueryToAmassCommand,
//             OpenAIStream,
//             model,
//             messagesToSend,
//             answerMessage,
//             options
//           )) {
//             sendMessage(chunk, false)
//             aiResponse += chunk
//           }

//           sendMessage("\n\n")
//           lastMessage.content = getCommandFromAIResponse(
//             lastMessage,
//             aiResponse
//           )
//         } catch (error) {
//           console.error(
//             "Error processing AI response and updating message:",
//             error
//           )
//           return new Response(`Error processing AI response: ${error}`)
//         }
//       }

//       const parts = lastMessage.content.split(" ")
//       if (parts.includes("-h") || parts.includes("-help")) {
//         sendMessage(displayHelpGuideForAmass(), true)
//         controller.close()
//         return
//       }

//       const params = parseCommandLine(
//         lastMessage.content,
//         { ...amassFlagDefinitions, ...amassBooleanFlagDefinitions },
//         amassRepeatableFlags,
//         fileData
//       )

//       if (params.error) {
//         handlePluginStreamError(
//           params.error,
//           invokedByToolId,
//           sendMessage,
//           controller
//         )
//         return
//       }

//       let amassUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/amass`

//       let requestBody: Partial<AmassParams> = {}

//       for (const [key, value] of Object.entries(params)) {
//         if (
//           (Array.isArray(value) && value.length > 0) ||
//           (typeof value === "boolean" && value) ||
//           (typeof value === "number" && value > 0) ||
//           (typeof value === "string" && value.length > 0)
//         ) {
//           ;(requestBody as any)[key] = value
//         }
//       }

//       sendMessage("🚀 Starting the scan. It might take a minute or two.", true)

//       const intervalId = setInterval(() => {
//         sendMessage("⏳ Still working on it, please hold on...", true)
//       }, 30000)

//       try {
//         const amassResponse = await fetch(amassUrl, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `${process.env.SECRET_AUTH_PLUGINS}`
//           },
//           body: JSON.stringify(requestBody)
//         })

//         let amassData = await amassResponse.json()

//         if (amassResponse.status !== 200) {
//           amassData = amassData.message
//           sendMessage(
//             `🚨 Amass scan failed with status ${amassResponse.status}`,
//             true
//           )
//           sendMessage(`\`\`\` ${amassData} \`\`\``)
//           controller.close()
//           return new Response()
//         }

//         amassData = amassData.output
//         amassData = processGKEData(amassData)
//         amassData = truncateData(amassData, 300000)

//         if (!amassData || amassData.length === 0) {
//           const noDataMessage = `🔍 No results found with the given parameters.`
//           clearInterval(intervalId)
//           sendMessage(noDataMessage, true)
//           controller.close()
//           return new Response(noDataMessage)
//         }

//         clearInterval(intervalId)
//         sendMessage("✅ Scan done! Now processing the results...", true)

//         const target = params.domain ? params.domain : params.df
//         const formattedResults = formatScanResults({
//           pluginName: "Amass",
//           pluginUrl: pluginUrls.AMASS,
//           target: target || "",
//           results: amassData
//         })
//         sendMessage(formattedResults, true)

//         controller.close()
//       } catch (error) {
//         clearInterval(intervalId)
//         let errorMessage =
//           "🚨 There was a problem during the scan. Please try again."
//         if (error instanceof Error) {
//           errorMessage = `🚨 Error: ${error.message}`
//         }
//         sendMessage(errorMessage, true)
//         controller.close()
//         return new Response(errorMessage)
//       }
//     }
//   })

//   return new Response(stream, { headers })
// }
