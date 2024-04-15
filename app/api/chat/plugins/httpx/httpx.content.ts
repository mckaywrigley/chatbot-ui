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

import { displayHelpGuideForHttpx } from "../plugin-helper/help-guides"
import { transformUserQueryToHttpxCommand } from "../plugin-helper/transform-query-to-command"
import { handlePluginStreamError } from "../plugin-helper/plugin-stream"

interface HttpxParams {
  target: string[]
  list: string
  // PROBES
  status_code: boolean
  content_length: boolean
  content_type: boolean
  location: boolean
  favicon: boolean
  hash?: string
  jarm: boolean
  response_time: boolean
  line_count: boolean
  word_count: boolean
  title: boolean
  body_preview?: number
  web_server: boolean
  tech_detect: boolean
  method: boolean
  websocket: boolean
  ip: boolean
  cname: boolean
  asn: boolean
  cdn: boolean
  probe: boolean
  // MATCHERS
  match_code: string
  match_length: string
  match_line_count: string
  match_word_count: string
  match_favicon: string[]
  match_string: string
  match_regex: string
  match_cdn: string[]
  match_response_time: string
  match_condition: string
  // EXTRACTOR
  extract_regex: string[]
  extract_preset: string[]
  // FILTERS
  filter_code: string
  filter_error_page: boolean
  filter_length: string
  filter_line_count: string
  filter_word_count: string
  filter_favicon: string[]
  filter_string: string
  filter_regex: string
  filter_cdn: string[]
  filter_response_time: string
  filter_condition: string
  strip: string
  // OUTPUT
  json: boolean
  include_response_header: boolean
  include_response: boolean
  include_response_base64: boolean
  include_chain: boolean
  // OPTIMIZATIONS
  timeout: number
  error: string | null
}

const parseCommandLine = (input: string) => {
  const MAX_INPUT_LENGTH = 4000
  const MAX_DOMAIN_LENGTH = 2000
  const MAX_REGEX_LENGTH = 500
  const MAX_HASH_LENGTH = 128

  const MAX_BODY_PREVIEW = 1000

  const params: HttpxParams = {
    target: [],
    list: "",
    // PROBES
    status_code: false,
    content_length: false,
    content_type: false,
    location: false,
    favicon: false,
    hash: undefined,
    jarm: false,
    response_time: false,
    line_count: false,
    word_count: false,
    title: false,
    body_preview: undefined,
    web_server: false,
    tech_detect: false,
    method: false,
    websocket: false,
    ip: false,
    cname: false,
    asn: false,
    cdn: false,
    probe: false,
    // MATCHERS
    match_code: "",
    match_length: "",
    match_line_count: "",
    match_word_count: "",
    match_favicon: [],
    match_string: "",
    match_regex: "",
    match_cdn: [],
    match_response_time: "",
    match_condition: "",
    // EXTRACTOR
    extract_regex: [],
    extract_preset: [],
    // FILTERS
    filter_code: "",
    filter_error_page: false,
    filter_length: "",
    filter_line_count: "",
    filter_word_count: "",
    filter_favicon: [],
    filter_string: "",
    filter_regex: "",
    filter_cdn: [],
    filter_response_time: "",
    filter_condition: "",
    strip: "",
    // OUTPUT
    json: false,
    include_response_header: false,
    include_response: false,
    include_response_base64: false,
    include_chain: false,
    // OPTIMIZATIONS
    timeout: 15,
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
  const isValidIntegerList = (value: string) =>
    value.split(",").every(item => isInteger(item.trim()))
  const isValidList = (list: string, validator: (item: string) => boolean) =>
    list.split(",").every(validator)
  const isValidString = (value: string) => /^[a-zA-Z0-9,._-]+$/.test(value)
  const isWithinLength = (value: string, maxLength: number) =>
    value.length <= maxLength
  const validHashTypes = ["md5", "mmh3", "simhash", "sha1", "sha256", "sha512"]
  const isValidHashType = (hashType: string) =>
    validHashTypes.includes(hashType)
  const isValidHash = (hash: string) =>
    /^[a-fA-F0-9]+$/.test(hash) && isWithinLength(hash, MAX_HASH_LENGTH)
  const isValidRegexPattern = (pattern: string) => {
    try {
      const unescapedPattern = pattern.replace(/\\\\/g, "\\").replace(/"/g, "'")
      new RegExp(unescapedPattern)
      return isWithinLength(unescapedPattern, MAX_REGEX_LENGTH)
    } catch (e) {
      return false
    }
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    const flagsWithoutValue = [
      "-sc",
      "-status-code",
      "-cl",
      "-content-length",
      "-ct",
      "-content-type",
      "-location",
      "-favicon",
      "-jarm",
      "-rt",
      "-response-time",
      "-lc",
      "-line-count",
      "-wc",
      "-word-count",
      "-title",
      "-server",
      "-web-server",
      "-td",
      "-tech-detect",
      "-method",
      "-websocket",
      "-ip",
      "-cname",
      "-asn",
      "-cdn",
      "-probe",
      "-fep",
      "-filter-error-page",
      "-json",
      "-irh",
      "-include-response-header",
      "-irr",
      "-include-response",
      "-irrb",
      "-include-response-base64",
      "-include-chain"
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
          const target = args[++i]
          if (isWithinLength(target, MAX_DOMAIN_LENGTH)) {
            params.target.push(target)
          } else {
            params.error = `Target domain too long: ${target}`
            return params
          }
        }
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
      case "-sc":
      case "-status-code":
        params.status_code = true
        break
      case "-cl":
      case "-content-length":
        params.content_length = true
        break
      case "-ct":
      case "-content-type":
        params.content_type = true
        break
      case "-location":
        params.location = true
        break
      case "-favicon":
        params.favicon = true
        break
      case "-hash":
        if (isValidHashType(nextArg)) {
          params.hash = nextArg
          i++
        } else {
          params.error = `Invalid hash type for '-hash' flag. Supported types: ${validHashTypes.join(
            ", "
          )}`
          return params
        }
        break
      case "-jarm":
        params.jarm = true
        break
      case "-rt":
      case "-response-time":
        params.response_time = true
        break
      case "-lc":
      case "-line-count":
        params.line_count = true
        break
      case "-wc":
      case "-word-count":
        params.word_count = true
        break
      case "-title":
        params.title = true
        break
      case "-bp":
      case "-body-preview":
        if (isInteger(nextArg) && parseInt(nextArg) <= MAX_BODY_PREVIEW) {
          params.body_preview = parseInt(nextArg)
          i++
        } else {
          params.error = `Invalid body preview value for '${arg}' flag`
          return params
        }
        break
      case "-server":
      case "-web-server":
        params.web_server = true
        break
      case "-td":
      case "-tech-detect":
        params.tech_detect = true
        break
      case "-method":
        params.method = true
        break
      case "-websocket":
        params.websocket = true
        break
      case "-ip":
        params.ip = true
        break
      case "-cname":
        params.cname = true
        break
      case "-asn":
        params.asn = true
        break
      case "-cdn":
        params.cdn = true
        break
      case "-probe":
        params.probe = true
        break
      case "-mc":
      case "-match-code":
        if (isValidIntegerList(nextArg)) {
          params.match_code = nextArg
        } else {
          params.error = "Invalid match code format"
          return params
        }
        i++
        break
      case "-ml":
      case "-match-length":
        if (isValidIntegerList(nextArg)) {
          params.match_length = nextArg
        } else {
          params.error = "Invalid match length format"
          return params
        }
        i++
        break
      case "-mlc":
      case "-match-line-count":
        if (isValidIntegerList(nextArg)) {
          params.match_line_count = nextArg
        } else {
          params.error = "Invalid match line count format"
          return params
        }
        i++
        break
      case "-mwc":
      case "-match-word-count":
        if (isValidIntegerList(nextArg)) {
          params.match_word_count = nextArg
        } else {
          params.error = "Invalid match word count format"
          return params
        }
        i++
        break
      case "-mfc":
      case "-match-favicon":
        if (isValidString(nextArg)) {
          params.match_favicon = nextArg.split(",")
        } else {
          params.error = "Invalid match favicon format"
          return params
        }
        i++
        break
      case "-ms":
      case "-match-string":
        if (isValidString(nextArg)) {
          params.match_string = nextArg
        } else {
          params.error = "Invalid match string format"
          return params
        }
        i++
        break
      case "-mr":
      case "-match-regex":
        if (isValidRegexPattern(nextArg)) {
          params.match_regex = nextArg
        } else {
          params.error = "Invalid match regex format"
          return params
        }
        i++
        break
      case "-mcdn":
      case "-match-cdn":
        if (isValidString(nextArg)) {
          params.match_cdn = nextArg.split(",")
        } else {
          params.error = "Invalid match CDN format"
          return params
        }
        i++
        break
      case "-mrt":
      case "-match-response-time":
        if (isValidString(nextArg)) {
          params.match_response_time = nextArg
        } else {
          params.error = "Invalid match response time format"
          return params
        }
        i++
        break
      case "-mdc":
      case "-match-condition":
        if (isValidString(nextArg)) {
          params.match_condition = nextArg
        } else {
          params.error = "Invalid match condition format"
          return params
        }
        i++
        break
      case "-er":
      case "-extract-regex":
        if (isValidRegexPattern(nextArg)) {
          const unescapedPattern = nextArg
            .replace(/\\\\/g, "\\")
            .replace(/"/g, "'")
          params.extract_regex.push(unescapedPattern)
          i++
        } else {
          params.error = `Invalid regex pattern for '-extract-regex' flag: ${nextArg}`
          return params
        }
        break
      case "-ep":
      case "-extract-preset":
        params.extract_preset = nextArg.split(",").map(s => s.trim())
        i++
        break
      case "-fc":
      case "-filter-code":
        if (isValidIntegerList(nextArg)) {
          params.filter_code = nextArg
        } else {
          params.error = "Invalid filter code format"
          return params
        }
        i++
        break
      case "-fep":
      case "-filter-error-page":
        params.filter_error_page = true
        break
      case "-fl":
      case "-filter-length":
        if (isValidIntegerList(nextArg)) {
          params.filter_length = nextArg
        } else {
          params.error = "Invalid filter length format"
          return params
        }
        i++
        break
      case "-flc":
      case "-filter-line-count":
        if (isValidIntegerList(nextArg)) {
          params.filter_line_count = nextArg
        } else {
          params.error = "Invalid filter line count format"
          return params
        }
        i++
        break
      case "-fwc":
      case "-filter-word-count":
        if (isValidIntegerList(nextArg)) {
          params.filter_word_count = nextArg
        } else {
          params.error = "Invalid filter word count format"
          return params
        }
        i++
        break
      case "-ffc":
      case "-filter-favicon":
        if (isValidList(nextArg, isValidHash)) {
          params.filter_favicon = nextArg.split(",")
        } else {
          params.error = "Invalid filter favicon format"
          return params
        }
        i++
        break
      case "-fs":
      case "-filter-string":
        if (isValidString(nextArg)) {
          params.filter_string = nextArg
        } else {
          params.error = "Invalid filter string format"
          return params
        }
        i++
        break
      case "-fe":
      case "-filter-regex":
        if (isValidRegexPattern(nextArg)) {
          params.filter_regex = nextArg
        } else {
          params.error = "Invalid filter regex format"
          return params
        }
        i++
        break
      case "-fcdn":
      case "-filter-cdn":
        if (isValidList(nextArg, isValidString)) {
          params.filter_cdn = nextArg.split(",")
        } else {
          params.error = "Invalid filter CDN format"
          return params
        }
        i++
        break
      case "-frt":
      case "-filter-response-time":
        if (isValidString(nextArg)) {
          params.filter_response_time = nextArg
        } else {
          params.error = "Invalid filter response time format"
          return params
        }
        i++
        break
      case "-fdc":
      case "-filter-condition":
        if (isValidString(nextArg)) {
          params.filter_condition = nextArg
        } else {
          params.error = "Invalid filter condition format"
          return params
        }
        i++
        break
      case "-strip":
        if (isValidString(nextArg)) {
          params.strip = nextArg
        } else {
          params.error = "Invalid strip format"
          return params
        }
        i++
        break
      case "-j":
      case "-json":
        params.json = true
        break
      case "-irh":
      case "-include-response-header":
        params.include_response_header = true
        break
      case "-irr":
      case "-include-response":
        params.include_response = true
        break
      case "-irrb":
      case "-include-response-base64":
        params.include_response_base64 = true
        break
      case "-include-chain":
        params.include_chain = true
        break
      case "-timeout":
        if (isInteger(nextArg)) {
          params.timeout = parseInt(nextArg)
        } else {
          params.error = "Invalid timeout value"
          return params
        }
        i++
        break
      default:
        if (!params.error) {
          params.error = `Invalid or unrecognized flag: ${arg}`
        }
        return params
    }
  }

  if ((!params.target.length || params.target.length === 0) && !params.list) {
    params.error = "🚨 Error: -u/-target or -l/-list parameter is required."
  }

  return params
}

export async function handleHttpxRequest(
  lastMessage: Message,
  enableHttpxFeature: boolean,
  OpenAIStream: any,
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  invokedByToolId: boolean,
  fileContent?: string,
  fileName?: string
) {
  if (!enableHttpxFeature) {
    return new Response("The Httpx is disabled.")
  }

  const fileContentIncluded = !!fileContent && fileContent.length > 0
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
          fileName: fileName
        }

        try {
          for await (const chunk of processAIResponseAndUpdateMessage(
            lastMessage,
            transformUserQueryToHttpxCommand,
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
        sendMessage(displayHelpGuideForHttpx(), true)
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

      let httpxUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/httpx`

      interface HttpxRequestBody {
        target?: string[]
        status_code?: boolean
        content_length?: boolean
        content_type?: boolean
        location?: boolean
        favicon?: boolean
        hash?: string
        jarm?: boolean
        response_time?: boolean
        line_count?: boolean
        word_count?: boolean
        title?: boolean
        body_preview?: string
        web_server?: boolean
        tech_detect?: boolean
        method?: boolean
        websocket?: boolean
        ip?: boolean
        cname?: boolean
        asn?: boolean
        cdn?: boolean
        probe?: boolean
        match_code?: string
        match_length?: string
        match_line_count?: string
        match_word_count?: string
        match_favicon?: string[]
        match_string?: string
        match_regex?: string
        match_cdn?: string[]
        match_response_time?: string
        match_condition?: string
        extract_regex?: string
        extract_preset?: string
        filter_code?: string
        filter_error_page?: boolean
        filter_length?: string
        filter_line_count?: string
        filter_word_count?: string
        filter_favicon?: string
        filter_string?: string
        filter_regex?: string
        filter_cdn?: string
        filter_response_time?: string
        filter_condition?: string
        strip?: string
        json?: boolean
        include_response_header?: boolean
        include_response?: boolean
        include_response_base64?: boolean
        include_chain?: boolean
        timeout?: number
        fileContent?: string
      }

      let requestBody: HttpxRequestBody = {}

      // INPUT
      if (params.target && params.target.length > 0) {
        requestBody.target = params.target
      }

      // PROBES
      if (params.status_code) {
        requestBody.status_code = params.status_code
      }
      if (params.content_length) {
        requestBody.content_length = params.content_length
      }
      if (params.content_type) {
        requestBody.content_type = params.content_type
      }
      if (params.location) {
        requestBody.location = params.location
      }
      if (params.favicon) {
        requestBody.favicon = params.favicon
      }
      if (params.hash) {
        requestBody.hash = params.hash
      }
      if (params.jarm) {
        requestBody.jarm = params.jarm
      }
      if (params.response_time) {
        requestBody.response_time = params.response_time
      }
      if (params.line_count) {
        requestBody.line_count = params.line_count
      }
      if (params.word_count) {
        requestBody.word_count = params.word_count
      }
      if (params.title) {
        requestBody.title = params.title
      }
      if (params.body_preview !== undefined) {
        requestBody.body_preview = params.body_preview.toString()
      }
      if (params.web_server) {
        requestBody.web_server = params.web_server
      }
      if (params.tech_detect) {
        requestBody.tech_detect = params.tech_detect
      }
      if (params.method) {
        requestBody.method = params.method
      }
      if (params.websocket) {
        requestBody.websocket = params.websocket
      }
      if (params.ip) {
        requestBody.ip = params.ip
      }
      if (params.cname) {
        requestBody.cname = params.cname
      }
      if (params.asn) {
        requestBody.asn = params.asn
      }
      if (params.cdn) {
        requestBody.cdn = params.cdn
      }
      if (params.probe) {
        requestBody.probe = params.probe
      }

      // MATCHERS
      if (params.match_code) {
        requestBody.match_code = params.match_code
      }
      if (params.match_length) {
        requestBody.match_length = params.match_length
      }
      if (params.match_line_count) {
        requestBody.match_line_count = params.match_line_count
      }
      if (params.match_word_count) {
        requestBody.match_word_count = params.match_word_count
      }
      if (params.match_favicon && params.match_favicon.length > 0) {
        requestBody.match_favicon = params.match_favicon
      }
      if (params.match_string) {
        requestBody.match_string = params.match_string
      }
      if (params.match_regex) {
        requestBody.match_regex = params.match_regex
      }
      if (params.match_cdn && params.match_cdn.length > 0) {
        requestBody.match_cdn = params.match_cdn
      }
      if (params.match_response_time) {
        requestBody.match_response_time = params.match_response_time
      }
      if (params.match_condition) {
        requestBody.match_condition = params.match_condition
      }

      // EXTRACTORS
      if (params.extract_regex && params.extract_regex.length > 0) {
        requestBody.extract_regex = params.extract_regex.join(",")
      }
      if (params.extract_preset && params.extract_preset.length > 0) {
        requestBody.extract_preset = params.extract_preset.join(",")
      }

      // FILTERS
      if (params.filter_code) {
        requestBody.filter_code = params.filter_code
      }
      if (params.filter_error_page) {
        requestBody.filter_error_page = params.filter_error_page
      }
      if (params.filter_length) {
        requestBody.filter_length = params.filter_length
      }
      if (params.filter_line_count) {
        requestBody.filter_line_count = params.filter_line_count
      }
      if (params.filter_word_count) {
        requestBody.filter_word_count = params.filter_word_count
      }
      if (params.filter_favicon && params.filter_favicon.length > 0) {
        requestBody.filter_favicon = params.filter_favicon.join(",")
      }
      if (params.filter_string) {
        requestBody.filter_string = params.filter_string
      }
      if (params.filter_regex) {
        requestBody.filter_regex = params.filter_regex
      }
      if (params.filter_cdn && params.filter_cdn.length > 0) {
        requestBody.filter_cdn = params.filter_cdn.join(",")
      }
      if (params.filter_response_time) {
        requestBody.filter_response_time = params.filter_response_time
      }
      if (params.filter_condition) {
        requestBody.filter_condition = params.filter_condition
      }

      // ADDITIONAL SETTINGS
      if (params.strip) {
        requestBody.strip = params.strip
      }
      if (params.json) {
        requestBody.json = params.json
      }
      if (params.include_response_header) {
        requestBody.include_response_header = params.include_response_header
      }
      if (params.include_response) {
        requestBody.include_response = params.include_response
      }
      if (params.include_response_base64) {
        requestBody.include_response_base64 = params.include_response_base64
      }
      if (params.include_chain) {
        requestBody.include_chain = params.include_chain
      }
      if (params.timeout && params.timeout !== 15) {
        requestBody.timeout = params.timeout
      }

      // FILE
      if (fileContentIncluded) {
        requestBody.fileContent = fileContent
      }

      sendMessage("🚀 Starting the scan. It might take a minute.", true)

      const intervalId = setInterval(() => {
        sendMessage("⏳ Still working on it, please hold on...", true)
      }, 15000)

      try {
        const httpxResponse = await fetch(httpxUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`
          },
          body: JSON.stringify(requestBody)
        })

        const jsonResponse = await httpxResponse.json()
        const outputString = jsonResponse.output

        let urlsFormatted = processurls(outputString)
        urlsFormatted = truncateData(urlsFormatted, 300000)

        if (
          outputString &&
          outputString.includes("Error executing httpx command") &&
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
          pluginName: "HTTPX",
          pluginUrl: pluginUrls.Httpx,
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
  return outputString
    .split("\n")
    .filter(subdomain => subdomain.trim().length > 0)
}
