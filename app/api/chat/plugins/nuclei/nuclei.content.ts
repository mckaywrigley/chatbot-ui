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

import { displayHelpGuideForNuclei } from "../plugin-helper/help-guides"
import { transformUserQueryToNucleiCommand } from "../plugin-helper/transform-query-to-command"
import {
  handlePluginError,
  handlePluginStreamError
} from "../plugin-helper/plugin-stream"

interface NucleiParams {
  // TARGET
  target: string[]
  list: string
  excludeHosts: string[]
  scanAllIPs: boolean
  ipVersion: string[]

  // TEMPLATES
  newTemplates: boolean
  newTemplatesVersion: string[]
  automaticScan: boolean
  templates: string[]
  templateUrl: string[]
  workflows: string[]
  workflowUrl: string[]
  templateDisplay: boolean
  listTemplates: boolean
  enableCodeProtocol: boolean

  // FILTERING
  author: string[]
  tags: string[]
  excludeTags: string[]
  includeTags: string[]
  templateId: string[]
  excludeId: string[]
  includeTemplates: string[]
  excludeTemplates: string[]
  excludeMatchers: string[]
  severity: string[]
  excludeSeverity: string[]
  type: string[]
  excludeType: string[]
  templateCondition: string[]

  // OUTPUT
  jsonl: boolean

  // CONFIGURATIONS
  followRedirects: boolean
  followHostRedirects: boolean
  maxRedirects: number
  disableRedirects: boolean
  header: string[]
  vars: string[]
  systemResolvers: boolean
  disableClustering: boolean
  passive: boolean
  forceHttp2: boolean
  dialerTimeout: number
  dialerKeepAlive: number
  attackType: string

  // OPTIMIZATIONS
  timeout: number
  maxHostError: number
  noMaxHostError: boolean
  scanStrategy: string
  noHttpx: boolean

  // FILE
  fileContent: string

  // ERROR
  error: string | null
}

interface NucleiRequestBody {
  target?: string[]
  list?: string
  exclude_hosts?: string
  scan_all_ips?: boolean
  ip_version?: string
  new_templates?: boolean
  new_templates_version?: string
  automatic_scan?: boolean
  templates?: string
  template_url?: string
  workflows?: string
  workflow_url?: string
  template_display?: boolean
  list_templates?: boolean
  enable_code_protocol?: boolean
  author?: string
  tags?: string
  exclude_tags?: string
  include_tags?: string
  template_id?: string
  exclude_id?: string
  include_templates?: string
  exclude_templates?: string
  exclude_matchers?: string
  severity?: string
  exclude_severity?: string
  type?: string
  exclude_type?: string
  template_condition?: string
  jsonl?: boolean
  follow_redirects?: boolean
  follow_host_redirects?: boolean
  max_redirects?: number
  disable_redirects?: boolean
  header?: string
  vars?: string
  system_resolvers?: boolean
  disable_clustering?: boolean
  passive?: boolean
  force_http2?: boolean
  dialer_timeout?: number
  dialer_keep_alive?: number
  attack_type?: string
  timeout?: number
  max_host_error?: number
  no_max_host_error?: boolean
  scan_strategy?: string
  no_httpx?: boolean

  // FILE
  fileContent?: string
}

const parseCommandLine = (input: string) => {
  const MAX_INPUT_LENGTH = 4000
  const MAX_DOMAIN_LENGTH = 2000
  const MAX_URL_LENGTH = 2000

  const params: NucleiParams = {
    // TARGET
    target: [],
    list: "",
    excludeHosts: [],
    scanAllIPs: false,
    ipVersion: ["4"],

    // TEMPLATES
    newTemplates: false,
    newTemplatesVersion: [],
    automaticScan: false,
    templates: [],
    templateUrl: [],
    workflows: [],
    workflowUrl: [],
    templateDisplay: false,
    listTemplates: false,
    enableCodeProtocol: false,

    // FILTERING
    author: [],
    tags: [],
    excludeTags: [],
    includeTags: [],
    templateId: [],
    excludeId: [],
    includeTemplates: [],
    excludeTemplates: [],
    excludeMatchers: [],
    severity: [],
    excludeSeverity: [],
    type: [],
    excludeType: [],
    templateCondition: [],

    // OUTPUT
    jsonl: false,

    // CONFIGURATIONS
    followRedirects: false,
    followHostRedirects: false,
    maxRedirects: 10,
    disableRedirects: false,
    header: [],
    vars: [],
    systemResolvers: false,
    disableClustering: false,
    passive: false,
    forceHttp2: false,
    dialerTimeout: 10,
    dialerKeepAlive: 30,
    attackType: "",

    // OPTIMIZATIONS
    timeout: 30,
    maxHostError: 30,
    noMaxHostError: false,
    scanStrategy: "auto",
    noHttpx: false,

    // FILE
    fileContent: "",

    // ERROR
    error: null
  }

  if (input.length > MAX_INPUT_LENGTH) {
    params.error = `🚨 Input command is too long`
    return params
  }

  const trimmedInput = input.trim().toLowerCase()
  const args = trimmedInput.split(" ")
  args.shift()

  const isValidString = (value: string) => /^[a-zA-Z0-9,._/-]+$/.test(value)
  const isWithinLength = (value: string, maxLength: number) =>
    value.length <= maxLength
  const isValidDomain = (domain: string) =>
    /^[a-zA-Z0-9.-]+$/.test(domain) && isWithinLength(domain, MAX_DOMAIN_LENGTH)
  const isValidIPVersion = (version: string) => ["4", "6"].includes(version)
  const isValidUrl = (url: string) => {
    try {
      return new URL(url).href.length <= MAX_URL_LENGTH
    } catch (e) {
      return false
    }
  }
  const isValidUrlOrDomain = (value: string) => {
    if (value.length > MAX_URL_LENGTH) return false

    try {
      new URL(value)
      return true
    } catch (e) {
      return /^[a-zA-Z0-9.-]+$/.test(value) && value.length <= MAX_DOMAIN_LENGTH
    }
  }
  const isInteger = (value: string) => /^[0-9]+$/.test(value)

  const isValidCommaSeparatedList = (
    value: string,
    validator: (item: string) => boolean
  ) => value.split(",").every(item => validator(item.trim()))

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    const flagsWithoutValue = [
      "-sa",
      "-scan-all-ips",
      "-nt",
      "-new-templates",
      "-as",
      "-automatic-scan",
      "-td",
      "-template-display",
      "-tl",
      "-list-templates",
      "-code",
      "-enable-code-protocol",
      "-j",
      "-jsonl",
      "-fr",
      "-follow-redirects",
      "-fhr",
      "-follow-host-redirects",
      "-dr",
      "-disable-redirects",
      "-sr",
      "-system-resolvers",
      "-dc",
      "-disable-clustering",
      "-passive",
      "-fh2",
      "-force-http2",
      "-nmhe",
      "-no-max-host-error",
      "-nh",
      "-no-httpx"
    ]

    if (!flagsWithoutValue.includes(arg)) {
      if (!nextArg || nextArg.startsWith("-")) {
        params.error = `Missing value for '${arg}'`
        return params
      }
    }

    switch (arg) {
      case "-u":
      case "-target":
        while (args[i + 1] && !args[i + 1].startsWith("-")) {
          const targets = args[++i].split(",")
          for (const target of targets) {
            if (isValidUrlOrDomain(target.trim())) {
              params.target.push(target.trim())
            } else {
              params.error = `Invalid target: ${target}`
              return params
            }
          }
        }
        break
      case "-l":
      case "-list":
        if (args[i + 1] && !args[i + 1].startsWith("-")) {
          const listFilePath = args[++i]
          if (listFilePath.endsWith(".txt")) {
            params.list = listFilePath
          } else {
            params.error = `Invalid list file: ${listFilePath}. Only .txt files are supported.`
            return params
          }
        }
        break
      case "-eh":
      case "-exclude-hosts":
        while (args[i + 1] && !args[i + 1].startsWith("-")) {
          const host = args[++i]
          if (isValidDomain(host)) {
            params.excludeHosts.push(host)
          } else {
            params.error = `Invalid exclude host: ${host}`
            return params
          }
        }
        break
      case "-sa":
      case "-scan-all-ips":
        params.scanAllIPs = true
        break
      case "-iv":
      case "-ip-version":
        if (isValidIPVersion(nextArg)) {
          params.ipVersion.push(nextArg)
          i++
        } else {
          params.error = `Invalid IP version: ${nextArg}`
          return params
        }
        break
      case "-nt":
      case "-new-templates":
        params.newTemplates = true
        break
      case "-ntv":
      case "-new-templates-version":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.newTemplatesVersion = nextArg
            .split(",")
            .map(item => item.trim())
          i++
        } else {
          params.error = "Invalid new templates version format"
          return params
        }
        break
      case "-as":
      case "-automatic-scan":
        params.automaticScan = true
        break
      case "-t":
      case "-templates":
        let templatesList = []
        while (args[i + 1] && !args[i + 1].startsWith("-")) {
          templatesList.push(args[++i])
        }
        for (const template of templatesList) {
          if (isValidString(template.trim())) {
            params.templates.push(template.trim())
          } else {
            params.error = `Invalid template: ${template}`
            return params
          }
        }
        break
      case "-turl":
      case "-template-url":
        if (isValidCommaSeparatedList(nextArg, isValidUrl)) {
          params.templateUrl = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid template URL format"
          return params
        }
        break
      case "-w":
      case "-workflows":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.workflows = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid workflows format"
          return params
        }
        break
      case "-wurl":
      case "-workflow-url":
        if (isValidCommaSeparatedList(nextArg, isValidUrl)) {
          params.workflowUrl = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid workflow URL format"
          return params
        }
        break
      case "-td":
      case "-template-display":
        params.templateDisplay = true
        break
      case "-tl":
        params.listTemplates = true
        break
      case "-code":
        params.enableCodeProtocol = true
        break
      case "-a":
      case "-author":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.author = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid author format"
          return params
        }
        break
      case "-tags":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.tags = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid tags format"
          return params
        }
        break
      case "-etags":
      case "-exclude-tags":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.excludeTags = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid exclude tags format"
          return params
        }
        break
      case "-itags":
      case "-include-tags":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.includeTags = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid include tags format"
          return params
        }
        break
      case "-id":
      case "-template-id":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.templateId = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid template id format"
          return params
        }
        break
      case "-eid":
      case "-exclude-id":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.excludeId = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid exclude id format"
          return params
        }
        break
      case "-it":
      case "-include-templates":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.includeTemplates = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid include templates format"
          return params
        }
        break
      case "-et":
      case "-exclude-templates":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.excludeTemplates = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid exclude templates format"
          return params
        }
        break
      case "-em":
      case "-exclude-matchers":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.excludeMatchers = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid exclude matchers format"
          return params
        }
        break
      case "-s":
      case "-severity":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.severity = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid severity format"
          return params
        }
        break
      case "-es":
      case "-exclude-severity":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.excludeSeverity = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid exclude severity format"
          return params
        }
        break
      case "-pt":
      case "-type":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.type = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid type format"
          return params
        }
        break
      case "-ept":
      case "-exclude-type":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.excludeType = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid exclude type format"
          return params
        }
        break
      case "-tc":
      case "-template-condition":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.templateCondition = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid template condition format"
          return params
        }
        break
      case "-j":
      case "-jsonl":
        params.jsonl = true
        break
      case "-fr":
      case "-follow-redirects":
        params.followRedirects = true
        break
      case "-fhr":
      case "-follow-host-redirects":
        params.followHostRedirects = true
        break
      case "-mr":
      case "-max-redirects":
        if (isInteger(nextArg)) {
          params.maxRedirects = parseInt(nextArg, 10)
          i++
        } else {
          params.error = "Invalid max redirects format"
          return params
        }
        break
      case "-dr":
      case "-disable-redirects":
        params.disableRedirects = true
        break
      case "-H":
      case "-header":
        if (isValidCommaSeparatedList(nextArg, isValidString)) {
          params.header = nextArg.split(",").map(item => item.trim())
          i++
        } else {
          params.error = "Invalid header format"
          return params
        }
        break
      case "-V":
      case "-var":
        if (isValidString(nextArg)) {
          params.vars.push(nextArg.trim())
          i++
        } else {
          params.error = "Invalid var format"
          return params
        }
        break
      case "-sr":
      case "-system-resolvers":
        params.systemResolvers = true
        break
      case "-dc":
      case "-disable-clustering":
        params.disableClustering = true
        break
      case "-passive":
        params.passive = true
        break
      case "-fh2":
      case "-force-http2":
        params.forceHttp2 = true
        break
      case "-dt":
      case "-dialer-timeout":
        if (isInteger(nextArg)) {
          params.dialerTimeout = parseInt(nextArg, 10)
          i++
        } else {
          params.error = "Invalid dialer timeout format"
          return params
        }
        break
      case "-dka":
      case "-dialer-keep-alive":
        if (isInteger(nextArg)) {
          params.dialerKeepAlive = parseInt(nextArg, 10)
          i++
        } else {
          params.error = "Invalid dialer keep alive format"
          return params
        }
        break
      case "-at":
      case "-attack-type":
        if (isValidString(nextArg)) {
          params.attackType = nextArg.trim()
          i++
        } else {
          params.error = "Invalid attack type format"
          return params
        }
        break
      case "-timeout":
        if (isInteger(nextArg)) {
          const timeoutValue = parseInt(nextArg, 10)
          if (timeoutValue > 0 && timeoutValue <= 300) {
            params.timeout = timeoutValue
          } else {
            params.error = "Timeout must be between 1 and 300 seconds"
            return params
          }
          i++
        } else {
          params.error = "Invalid timeout format"
          return params
        }
        break
      case "-mhe":
      case "-max-host-error":
        if (isInteger(nextArg)) {
          params.maxHostError = parseInt(nextArg, 10)
          i++
        } else {
          params.error = "Invalid max host error format"
          return params
        }
        break
      case "-nmhe":
      case "-no-mhe":
        params.noMaxHostError = true
        break
      case "-ss":
      case "-scan-strategy":
        if (isValidString(nextArg)) {
          params.scanStrategy = nextArg.trim()
          i++
        } else {
          params.error = "Invalid scan strategy format"
          return params
        }
        break
      case "-nh":
      case "-no-httpx":
        params.noHttpx = true
        break
      default:
        if (!params.error) {
          params.error = `Invalid or unrecognized flag: ${arg}`
        }
        return params
    }
  }

  if ((!params.target || params.target.length === 0) && !params.list) {
    params.error = "🚨 Error: -u/-target or -l/-list parameter is required."
  }

  return params
}

export async function handleNucleiRequest(
  lastMessage: Message,
  enableNucleiFeature: boolean,
  OpenAIStream: any,
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  invokedByToolId: boolean,
  fileData?: { fileName: string; fileContent: string }[]
) {
  if (!enableNucleiFeature) {
    return new Response("The Nuclei is disabled.")
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
            transformUserQueryToNucleiCommand,
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
        sendMessage(displayHelpGuideForNuclei(), true)
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

      let nucleiUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/nuclei`

      let requestBody: NucleiRequestBody = {}

      // TARGET
      if (params.target && params.target.length > 0)
        requestBody.target = params.target
      if (params.excludeHosts && params.excludeHosts.length > 0)
        requestBody.exclude_hosts = params.excludeHosts.join(",")
      if (params.scanAllIPs) requestBody.scan_all_ips = true
      if (
        params.ipVersion &&
        params.ipVersion.length > 0 &&
        params.ipVersion.join(",") !== "4"
      )
        requestBody.ip_version = params.ipVersion.join(",")

      // TEMPLATES
      if (params.newTemplates) requestBody.new_templates = true
      if (params.newTemplatesVersion && params.newTemplatesVersion.length > 0)
        requestBody.new_templates_version = params.newTemplatesVersion.join(",")
      if (params.automaticScan) requestBody.automatic_scan = true
      if (params.templates && params.templates.length > 0)
        requestBody.templates = params.templates.join(",")
      if (params.templateUrl && params.templateUrl.length > 0)
        requestBody.template_url = params.templateUrl.join(",")
      if (params.workflows && params.workflows.length > 0)
        requestBody.workflows = params.workflows.join(",")
      if (params.workflowUrl && params.workflowUrl.length > 0)
        requestBody.workflow_url = params.workflowUrl.join(",")
      if (params.templateDisplay) requestBody.template_display = true
      if (params.listTemplates) requestBody.list_templates = true
      if (params.enableCodeProtocol) requestBody.enable_code_protocol = true

      // FILTERING
      if (params.author && params.author.length > 0)
        requestBody.author = params.author.join(",")
      if (params.tags && params.tags.length > 0)
        requestBody.tags = params.tags.join(",")
      if (params.excludeTags && params.excludeTags.length > 0)
        requestBody.exclude_tags = params.excludeTags.join(",")
      if (params.includeTags && params.includeTags.length > 0)
        requestBody.include_tags = params.includeTags.join(",")
      if (params.templateId && params.templateId.length > 0)
        requestBody.template_id = params.templateId.join(",")
      if (params.excludeId && params.excludeId.length > 0)
        requestBody.exclude_id = params.excludeId.join(",")
      if (params.includeTemplates && params.includeTemplates.length > 0)
        requestBody.include_templates = params.includeTemplates.join(",")
      if (params.excludeTemplates && params.excludeTemplates.length > 0)
        requestBody.exclude_templates = params.excludeTemplates.join(",")
      if (params.excludeMatchers && params.excludeMatchers.length > 0)
        requestBody.exclude_matchers = params.excludeMatchers.join(",")
      if (params.severity && params.severity.length > 0)
        requestBody.severity = params.severity.join(",")
      if (params.excludeSeverity && params.excludeSeverity.length > 0)
        requestBody.exclude_severity = params.excludeSeverity.join(",")
      if (params.type && params.type.length > 0)
        requestBody.type = params.type.join(",")
      if (params.excludeType && params.excludeType.length > 0)
        requestBody.exclude_type = params.excludeType.join(",")
      if (params.templateCondition && params.templateCondition.length > 0)
        requestBody.template_condition = params.templateCondition.join(",")

      // OUTPUT
      if (params.jsonl) requestBody.jsonl = true

      // CONFIGURATIONS
      if (params.followRedirects) requestBody.follow_redirects = true
      if (params.followHostRedirects) requestBody.follow_host_redirects = true
      if (params.maxRedirects !== 10)
        requestBody.max_redirects = params.maxRedirects
      if (params.disableRedirects) requestBody.disable_redirects = true
      if (params.header && params.header.length > 0)
        requestBody.header = params.header.join(",")
      if (params.vars && params.vars.length > 0)
        requestBody.vars = params.vars.join(",")
      if (params.systemResolvers) requestBody.system_resolvers = true
      if (params.disableClustering) requestBody.disable_clustering = true
      if (params.passive) requestBody.passive = true
      if (params.forceHttp2) requestBody.force_http2 = true
      if (params.dialerTimeout && params.dialerTimeout !== 10)
        requestBody.dialer_timeout = params.dialerTimeout
      if (params.dialerKeepAlive && params.dialerKeepAlive !== 30)
        requestBody.dialer_keep_alive = params.dialerKeepAlive
      if (params.attackType) requestBody.attack_type = params.attackType

      // OPTIMIZATIONS
      if (params.timeout !== 30) requestBody.timeout = params.timeout
      if (params.maxHostError !== 30)
        requestBody.max_host_error = params.maxHostError
      if (params.noMaxHostError) requestBody.no_max_host_error = true
      if (params.scanStrategy !== "auto")
        requestBody.scan_strategy = params.scanStrategy
      if (params.noHttpx) requestBody.no_httpx = true

      if (fileContentIncluded) {
        ;(requestBody as any).fileContent =
          fileData?.map(file => file.fileContent).join("\n") || ""
      }

      sendMessage("🚀 Starting the scan. It might take a minute.", true)

      const intervalId = setInterval(() => {
        sendMessage("⏳ Still working on it, please hold on...", true)
      }, 15000)

      try {
        const nucleiResponse = await fetch(nucleiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`
          },
          body: JSON.stringify(requestBody)
        })

        const errorHandling = handlePluginError(
          nucleiResponse,
          intervalId,
          controller,
          sendMessage
        )
        await errorHandling()

        const jsonResponse = await nucleiResponse.json()
        const outputString = jsonResponse.output

        let urlsFormatted = processurls(outputString)
        urlsFormatted = truncateData(urlsFormatted, 300000)

        if (
          outputString &&
          outputString.includes("Error executing nuclei command") &&
          outputString.includes("Error reading output file")
        ) {
          const errorMessage = `🚨 An error occurred while running your query. Please try again or check your input.`
          clearInterval(intervalId)
          sendMessage(errorMessage, true)
          controller.close()
          return new Response(errorMessage)
        }

        if (!urlsFormatted || urlsFormatted.length === 0) {
          const noDataMessage = `🔍 No results found with the given parameters.`
          clearInterval(intervalId)
          sendMessage(noDataMessage, true)
          controller.close()
          return new Response(noDataMessage)
        }

        clearInterval(intervalId)
        sendMessage("✅ Scan done! Now processing the results...", true)

        const target = params.list ? params.list : params.target
        const formattedResults = formatScanResults({
          pluginName: "Nuclei",
          pluginUrl: pluginUrls.NUCLEI,
          target: target,
          results: urlsFormatted
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

function processurls(outputString: string) {
  return outputString.split("\n").filter(target => target.trim().length > 0)
}
