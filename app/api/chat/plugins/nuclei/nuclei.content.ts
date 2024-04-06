import { Message } from "@/types/chat"
import { pluginUrls } from "@/types/plugins"
import endent from "endent"

import {
  processAIResponseAndUpdateMessage,
  formatScanResults
} from "@/app/api/chat/plugins/plugins"

export const isNucleiCommand = (message: string) => {
  if (!message.startsWith("/")) return false

  const trimmedMessage = message.trim()
  const commandPattern = /^\/nuclei(?:\s+(-[a-z]+|\S+))*$/

  return commandPattern.test(trimmedMessage)
}

const displayHelpGuide = () => {
  return `
  [Nuclei](${pluginUrls.Nuclei}) is a fast exploitable vulnerability scanner designed to probe modern applications, infrastructure, cloud platforms, and networks, aiding in the identification and mitigation of vulnerabilities. 

    Usage:
       /nuclei [flags]
  
    Flags:
    TARGET:
       -u, -target string[]          target URLs/hosts to scan
       -l, -list string              path to file containing a list of target URLs/hosts to scan (one per line)
       -eh, -exclude-hosts string[]  hosts to exclude to scan from the input list (ip, cidr, hostname)
       -sa, -scan-all-ips            scan all the IP's associated with dns record
       -iv, -ip-version string[]     IP version to scan of hostname (4,6) - (default 4)

    TEMPLATES:
       -nt, -new-templates                    run only new templates added in latest nuclei-templates release
       -ntv, -new-templates-version string[]  run new templates added in specific version
       -as, -automatic-scan                   automatic web scan using wappalyzer technology detection to tags mapping
       -t, -templates string[]                list of template to run (comma-separated)
       -turl, -template-url string[]          template url to run (comma-separated)
       -w, -workflows string[]                list of workflow to run (comma-separated)
       -wurl, -workflow-url string[]          workflow url to run (comma-separated)
       -td, -template-display                 displays the templates content
       -tl                                    list all available templates
       -code                                  enable loading code protocol-based templates
      
    FILTERING:
       -a, -author string[]               templates to run based on authors (comma-separated)
       -tags string[]                     templates to run based on tags (comma-separated) Possible values: cves, osint, tech ...)
       -etags, -exclude-tags string[]     templates to exclude based on tags (comma-separated)
       -itags, -include-tags string[]     tags to be executed even if they are excluded either by default or configuration
       -id, -template-id string[]         templates to run based on template ids (comma-separated, allow-wildcard)
       -eid, -exclude-id string[]         templates to exclude based on template ids (comma-separated)
       -it, -include-templates string[]   templates to be executed even if they are excluded either by default or configuration
       -et, -exclude-templates string[]   template or template directory to exclude (comma-separated)
       -em, -exclude-matchers string[]    template matchers to exclude in result
       -s, -severity value[]              templates to run based on severity. Possible values: info, low, medium, high, critical, unknown
       -es, -exclude-severity value[]     templates to exclude based on severity. Possible values: info, low, medium, high, critical, unknown
       -pt, -type value[]                 templates to run based on protocol type. Possible values: dns, file, http, headless, tcp, workflow, ssl, websocket, whois, code, javascript
       -ept, -exclude-type value[]        templates to exclude based on protocol type. Possible values: dns, file, http, headless, tcp, workflow, ssl, websocket, whois, code, javascript
       -tc, -template-condition string[]  templates to run based on expression condition

    OUTPUT:
       -j, -jsonl  write output in JSONL(ines) format

    CONFIGURATIONS:
       -fr, -follow-redirects          enable following redirects for http templates
       -fhr, -follow-host-redirects    follow redirects on the same host
       -mr, -max-redirects int         max number of redirects to follow for http templates (default 10)
       -dr, -disable-redirects         disable redirects for http templates
       -H, -header string[]            custom header/cookie to include in all http request in header:value format (cli)
       -V, -var value                  custom vars in key=value format
       -sr, -system-resolvers          use system DNS resolving as error fallback
       -dc, -disable-clustering        disable clustering of requests
       -passive                        enable passive HTTP response processing mode
       -fh2, -force-http2              force http2 connection on requests
       -dt, -dialer-timeout value      timeout for network requests.
       -dka, -dialer-keep-alive value  keep-alive duration for network requests.
       -at, -attack-type string        type of payload combinations to perform (batteringram,pitchfork,clusterbomb)

    OPTIMIZATIONS:
       -timeout int               time to wait in seconds before timeout (default 30)
       -mhe, -max-host-error int  max errors for a host before skipping from scan (default 30)
       -nmhe, -no-mhe             disable skipping host from scan based on errors
       -ss, -scan-strategy value  strategy to use while scanning(auto/host-spray/template-spray) (default auto)
       -nh, -no-httpx             disable httpx probing for non-url input`
}

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
  invokedByToolId: boolean,
  fileContent?: string,
  fileName?: string
) {
  if (!enableNucleiFeature) {
    return new Response("The Nuclei is disabled.", {
      status: 200
    })
  }

  const fileContentIncluded = !!fileContent && fileContent.length > 0

  let aiResponse = ""

  if (invokedByToolId) {
    try {
      const { updatedLastMessageContent, aiResponseText } =
        await processAIResponseAndUpdateMessage(
          lastMessage,
          transformUserQueryToNucleiCommand,
          OpenAIStream,
          model,
          messagesToSend,
          answerMessage,
          fileContentIncluded,
          fileName
        )
      lastMessage.content = updatedLastMessageContent
      aiResponse = aiResponseText
    } catch (error) {
      console.error("Error processing AI response and updating message:", error)
      return new Response(`Error processing AI response: ${error}`)
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

  // FILE
  if (fileContentIncluded) {
    requestBody.fileContent = fileContent
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
        const nucleiResponse = await fetch(nucleiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`
          },
          body: JSON.stringify(requestBody)
        })

        const jsonResponse = await nucleiResponse.json()

        const outputString = jsonResponse.output

        if (
          outputString &&
          outputString.includes("Error executing nuclei command") &&
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

        if (!outputString && outputString.length === 0) {
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

        const urls = processurls(outputString)
        const target = params.list ? params.list : params.target
        const formattedResults = formatScanResults({
          pluginName: "Nuclei",
          pluginUrl: pluginUrls.Nuclei,
          target: target,
          results: urls
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
        return new Response(errorMessage, {
          status: 200
        })
      }
    }
  })

  return new Response(stream, { headers })
}

const transformUserQueryToNucleiCommand = (
  lastMessage: Message,
  fileContentIncluded?: boolean,
  fileName?: string
) => {
  const nucleiIntroduction = fileContentIncluded
    ? `Based on this query, generate a command for the 'nuclei' tool, focusing on network and application vulnerability scanning. The command should use the most relevant flags, with '-list' being essential for specifying hosts filename to use for scaning. If the request involves scaning from a list of hosts, embed the hosts filename directly in the command. The '-jsonl' flag is optional and should be included only if specified in the user's request. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`
    : `Based on this query, generate a command for the 'nuclei' tool, focusing on network and application vulnerability scanning. The command should utilize the most relevant flags, with '-target' being essential to specify the target host(s) to scan. The '-jsonl' flag is optional and should be included only if specified in the user's request. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`

  const domainOrFilenameInclusionText = fileContentIncluded
    ? `**Filename Inclusion**: Use the -list string[] flag followed by the file name (e.g., -list ${fileName}) containing the list of domains in the correct format. Nuclei supports direct file inclusion, making it convenient to use files like '${fileName}' that already contain the necessary domains. (required)`
    : `**Direct Host Inclusion**: Directly embed target hosts in the command instead of using file references.
  - -target (string[]): Specify the target host(s) to scan. (required)`

  const nucleiExampleText = fileContentIncluded
    ? `For probing a list of hosts directly using a file named '${fileName}':
\`\`\`json
{ "command": "nuclei -list ${fileName}" }
\`\`\``
    : `For probing a list of hosts directly:
\`\`\`json
{ "command": "nuclei -target host1.com,host2.com" }
\`\`\``

  const answerMessage = endent`
  Query: "${lastMessage.content}"

  ${nucleiIntroduction}

  ALWAYS USE THIS FORMAT:
  \`\`\`json
  { "command": "nuclei [flags]" }
  \`\`\`
  In this context, replace '[flags]' with '-help' to generate the appropriate help command. The '-help' flag is crucial as it instructs the 'nuclei' tool to display its help guide, offering an overview of all available flags and their purposes. This format ensures the command is both valid JSON and specifically tailored to users' inquiries about help or flag functionalities. 

  Example Command for Requesting Help:
  \`\`\`json
  { "command": "nuclei -help" }
  \`\`\`

  This command will instruct the 'nuclei' tool to provide its help documentation, making it easier for users to understand how to use the tool and which flags are at their disposal for specific tasks. It's important to ensure that the command remains simple and directly addresses the user's request for help.

  Command Construction Guidelines:
  1. ${domainOrFilenameInclusionText}
  2. **Selective Flag Use**: Carefully choose flags that are pertinent to the task. The available flags for the 'nuclei' tool include:
    - **TARGET**:
      - -exclude-hosts (string[]): Hosts to exclude from the input list (ip, cidr, hostname).
      - -scan-all-ips: Scan all the IP's associated with a DNS record.
      - -ip-version (string[]): IP version to scan of hostname (4,6) - (default 4).
    - **TEMPLATES**:
      - -new-templates: Run only new templates added in the latest nuclei-templates release.
      - -new-templates-version (string[]): Run new templates added in a specific version.
      - -automatic-scan: Automatic web scan using Wappalyzer technology detection to tags mapping.
      - -templates (string[]): List of templates to run (comma-separated).
      - -template-url (string[]): Template URL to run (comma-separated).
      - -workflows (string[]): List of workflows to run (comma-separated).
      - -workflow-url (string[]): Workflow URL to run (comma-separated).
      - -template-display: Displays the template's content.
      - -list-templates: List all available templates.
      - -code: Enable loading code protocol-based templates.
    - **FILTERING**:
      - -author (string[]): Templates to run based on authors (comma-separated).
      - -tags (string[]): Templates to run based on tags (comma-separated).
      - -exclude-tags (string[]): Templates to exclude based on tags (comma-separated).
      - -include-tags (string[]): Tags to be executed even if they are excluded either by default or configuration.
      - -template-id (string[]): Templates to run based on template ids (comma-separated, allow-wildcard).
      - -exclude-id (string[]): Templates to exclude based on template ids (comma-separated).
      - -include-templates (string[]): Templates to be executed even if they are excluded either by default or configuration.
      - -exclude-templates (string[]): Template or template directory to exclude (comma-separated).
      - -exclude-matchers (string[]): Template matchers to exclude in result.
      - -severity (value[]): Templates to run based on severity. Possible values: info, low, medium, high, critical, unknown.
      - -exclude-severity (value[]): Templates to exclude based on severity.
      - -type (value[]): Templates to run based on protocol type.
      - -exclude-type (value[]): Templates to exclude based on protocol type.
      - -template-condition (string[]): Templates to run based on expression condition.
    - **OUTPUT**:
      - -jsonl: Write output in JSONL(ines) format. 
    - **CONFIGURATIONS**:
      - -follow-redirects: Enable following redirects for HTTP templates.
      - -follow-host-redirects: Follow redirects on the same host.
      - -max-redirects (int): Max number of redirects to follow for HTTP templates (default 10).
      - -disable-redirects: Disable redirects for HTTP templates.
      - -header (string[]): Custom header/cookie to include in all HTTP requests in header:value format (cli).
      - -var (value): Custom vars in key=value format.
      - -system-resolvers: Use system DNS resolving as error fallback.
      - -disable-clustering: Disable clustering of requests.
      - -passive: Enable passive HTTP response processing mode.
      - -force-http2: Force HTTP2 connection on requests.
      - -dialer-timeout (value): Timeout for network requests.
      - -dialer-keep-alive (value): Keep-alive duration for network requests.
      - -attack-type (string): Type of payload combinations to perform.
    - **OPTIMIZATIONS**:
      - -timeout (int): Time to wait in seconds before timeout (default 30).
      - -max-host-error (int): Max errors for a host before skipping from scan (default 30).
      - -no-max-host-error: Disable skipping host from scan based on errors.
      - -scan-strategy (value): Strategy to use while scanning.
      - -no-httpx: Disable HTTPX probing for non-URL input.
    Do not include any flags not listed here, this are only flags you can use. Use these flags to align with the request's specific requirements or when '-help' is requested for help. Only provide output flag '-jsonl' if the user asks for it.
  3. **Relevance and Efficiency**: Ensure that the selected flags are relevant and contribute to an effective and efficient scanning process.

  Example Commands:
  ${nucleiExampleText}

  For a request for help or all flags or if the user asked about how the plugin works:
  \`\`\`json
  { "command": "nuclei -help" }
  \`\`\`

  Response:`

  return answerMessage
}

function processurls(outputString: string) {
  return outputString.split("\n").filter(target => target.trim().length > 0)
}
