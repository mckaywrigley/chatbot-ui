import { Message } from "@/types/chat"

import {
  createGKEHeaders,
  getCommandFromAIResponse,
  processAIResponseAndUpdateMessage,
  truncateData
} from "../chatpluginhandlers"

import { displayHelpGuideForCvemap } from "../plugin-helper/help-guides"
import { transformUserQueryToCvemapCommand } from "../plugin-helper/transform-query-to-command"
import { handlePluginStreamError } from "../plugin-helper/plugin-stream"
import {
  CvemapParams,
  cvemapBooleanFlagDefinitions,
  cvemapFlagDefinitions,
  cvemapRepeatableFlags,
  FlagDefinitions
} from "../plugin-helper/plugin-flags"

const parseCommandLine = (
  input: string,
  flagDefinitions: FlagDefinitions<CvemapParams>,
  repeatableFlags: Set<string> = new Set()
): CvemapParams => {
  const MAX_INPUT_LENGTH = 500

  const params: CvemapParams = {
    ids: [],
    cwes: [],
    vendors: "",
    products: "",
    excludeProducts: "",
    severity: "",
    cvssScores: "",
    cpe: "",
    epssScores: "",
    epssPercentiles: "",
    age: "",
    assignees: "",
    vulnerabilityStatus: "",
    search: "",
    kev: false,
    template: false,
    poc: false,
    hackerone: false,
    remote: false,
    fieldsToDisplay: "",
    excludeFields: "",
    listIdsOnly: false,
    limit: 25,
    offset: 0,
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
    let arg = args[i]
    let nextValue = args[i + 1]

    // Check if the argument is a flag with an equals sign
    let [flag, value] = arg.split("=")
    if (!value && nextValue && !nextValue.startsWith("-")) {
      // If no equals sign, use the next argument as the value
      value = nextValue
      i++ // Skip the next value as it's already used
    }

    if (flagDefinitions[flag]) {
      if (encounteredFlags.has(flag) && !repeatableFlags.has(flag)) {
        params.error = `🚨 Duplicate flag: ${flag}`
        return params
      }
      encounteredFlags.add(flag)

      const key = flagDefinitions[flag]
      if (value && !value.startsWith("-")) {
        if (Array.isArray(params[key])) {
          ;(params[key] as string[]).push(...value.split(","))
        } else if (key === "limit" || key === "offset") {
          const numericValue = parseInt(value, 10)
          if (!isNaN(numericValue)) params[key] = numericValue
        } else if (typeof params[key] === "boolean") {
          ;(params[key] as any) = value.toLowerCase() === "true"
        } else {
          ;(params[key] as any) = value
        }
      } else if (typeof params[key] === "boolean") {
        ;(params[key] as any) = true
      } else {
        params.error = `🚨 Value not provided for flag: ${flag}`
        return params
      }
    } else {
      params.error = `🚨 Unrecognized flag: ${flag}`
      return params
    }
  }

  return params
}

export async function handleCvemapRequest(
  lastMessage: Message,
  enableCvemapFeature: boolean,
  OpenAIStream: any,
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  invokedByToolId: boolean
) {
  if (!enableCvemapFeature) {
    return new Response("The CVEMap is disabled.")
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
            transformUserQueryToCvemapCommand,
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
        sendMessage(displayHelpGuideForCvemap(), true)
        controller.close()
        return
      }

      const params = parseCommandLine(
        lastMessage.content,
        { ...cvemapFlagDefinitions, ...cvemapBooleanFlagDefinitions },
        cvemapRepeatableFlags
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

      let cvemapUrl = `${process.env.SECRET_GKE_PLUGINS_BASE_URL}/api/chat/plugins/cvemap`

      let requestBody: Partial<CvemapParams> = {}

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

      const intervalId = setInterval(() => {
        sendMessage(
          "⏳ Searching in progress. We appreciate your patience.",
          true
        )
      }, 15000)

      try {
        const cvemapResponse = await fetch(cvemapUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${process.env.SECRET_AUTH_PLUGINS}`
          },
          body: JSON.stringify(requestBody)
        })

        let cvemapData = await cvemapResponse.text()
        cvemapData = processCvemapData(cvemapData)
        cvemapData = truncateData(cvemapData, 300000)

        if (!cvemapData || cvemapData.length <= 300) {
          sendMessage(
            "🔍 The search is complete. No CVE entries were found based on your parameters.",
            true
          )
          clearInterval(intervalId)
          controller.close()
          return new Response("No CVE entries found.")
        }

        clearInterval(intervalId)

        if (params.json && !cvemapData.includes("╭──────")) {
          const responseString = createResponseString(cvemapData)
          sendMessage(responseString, true)
          controller.close()
          return new Response(cvemapData)
        }

        const responseString = formatCvemapOutput(cvemapData)
        sendMessage(responseString, true)

        controller.close()
      } catch (error) {
        clearInterval(intervalId)
        let errorMessage =
          "🚨 An unexpected error occurred during the CVE scan. Please try again later."
        if (error instanceof Error) {
          errorMessage = `🚨 Error: ${error.message}. Please check your request or try again later.`
        }
        sendMessage(errorMessage, true)
        controller.close()
        return new Response(errorMessage)
      }
    }
  })

  return new Response(stream, { headers })
}

const processCvemapData = (data: string) => {
  return data
    .split("\n")
    .filter(line => line && !line.startsWith("data:") && line.trim() !== "")
    .join("")
}

function formatCvemapOutput(output: string): string {
  const asciiArt = `
    ______   _____  ____ ___  ____  ____
   / ___/ | / / _ \\/ __ \\__ \\/ __ \\/ __ \\
  / /__ | |/ /  __/ / / / / / /_/ / /_/ /
  \\___/ |___/\\___/_/ /_/ /_/\\__,_/ .___/ 
                                /_/            
    projectdiscovery.io
  `

  const parsedOutput = JSON.parse(output).output

  return (
    `## CVE Details Report\n\n` +
    "```\n" +
    asciiArt +
    "\n" +
    parsedOutput +
    "\n```"
  )
}

const createResponseString = (cvemapData: string) => {
  const outerData = JSON.parse(cvemapData)
  const data = JSON.parse(outerData.output)
  let markdownOutput = `# CVE Discovery\n\n`

  const formatTime = (timeValue: string | Date) => {
    return new Date(timeValue).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const addTimeField = (label: string, timeValue: string | Date) => {
    markdownOutput += `- **${label}**: ${formatTime(timeValue)}\n`
  }

  const addOptionalField = (label: string, value: string) => {
    if (value) markdownOutput += `- **${label}**: ${value}\n`
  }

  data.forEach(
    (cve: {
      nuclei_templates?: {
        created_at: string
        template_issue: string
        template_issue_type: string
        template_path: string
        template_pr: string
        template_url: string
        updated_at: string
      }
      cve_id: any
      cve_description: any
      severity: any
      cvss_score: any
      cvss_metrics: any
      epss_percentile: any
      published_at: any
      updated_at: any
      weaknesses: any
      cpe: any
      reference: any
      poc: any
      age_in_days: any
      vuln_status: any
      is_poc: any
      is_remote: any
      is_oss: any
      vulnerable_cpe: any
      vendor_advisory: any
      patch_url: any
      is_template: any
      is_exploited: any
      hackerone: any
      shodan: any
      oss: any
    }) => {
      const {
        nuclei_templates,
        cve_id,
        cve_description,
        severity,
        cvss_score,
        cvss_metrics,
        published_at,
        epss_percentile,
        updated_at,
        weaknesses,
        cpe,
        reference,
        poc,
        age_in_days,
        vuln_status,
        is_poc,
        is_remote,
        is_oss,
        vulnerable_cpe,
        vendor_advisory,
        patch_url,
        is_template,
        is_exploited,
        hackerone,
        shodan,
        oss
      } = cve

      markdownOutput += `## ${cve_id}\n`
      markdownOutput += `### Overview\n`
      markdownOutput += `- **Severity**: ${severity[0].toUpperCase() + severity.slice(1)} | **CVSS Score**: ${cvss_score}\n`
      markdownOutput += `- **CVSS Vector**: (${cvss_metrics?.cvss31?.vector})\n`
      if (weaknesses?.length) {
        markdownOutput += `- **Weaknesses**:\n`
        weaknesses.forEach(
          (w: { cwe_name: any; cwe_id: any }) =>
            (markdownOutput += `  - ${w.cwe_name || w.cwe_id}\n`)
        )
      }
      if (epss_percentile?.length) {
        markdownOutput += `- **EPSS**: ${epss_percentile} %\n`
      }
      let timeInfo = ""
      addOptionalField("**Days Since Publish**:", age_in_days)
      if (cve.published_at?.length)
        timeInfo += `**Published At:** ${formatTime(cve.published_at)}`
      if (cve.updated_at?.length)
        timeInfo += ` | **Updated At**: ${formatTime(cve.updated_at)}`
      if (timeInfo) markdownOutput += `- ${timeInfo}\n`
      if (cpe?.vendor || cpe?.product) {
        markdownOutput += `- **CPE**: ${cpe.vendor || "Unknown vendor"}:${cpe.product || "Unknown product"}\n`
      }

      markdownOutput += `### Description\n${cve_description}\n`

      if (reference?.length) {
        markdownOutput += `### References:\n`
        reference.forEach(
          (ref: any) => (markdownOutput += `  - [${ref}](${ref})\n`)
        )
      }

      if (poc?.length) {
        markdownOutput += `### Proof of Concept:\n\n`
        poc.forEach((p: { added_at: string | Date; url: any; source: any }) => {
          markdownOutput += `- [${p.url}](${p.url}) (Source: ${p.source}, Added: ${formatTime(p.added_at)})\n`
        })
      } else {
        markdownOutput += `\n### Proof of Concept Available: ${is_poc ? "Yes" : "No"}\n`
      }

      if (nuclei_templates) {
        const {
          created_at,
          template_issue,
          template_issue_type,
          template_path,
          template_pr,
          template_url,
          updated_at
        } = nuclei_templates
        markdownOutput += `### Nuclei Template Data\n`
        markdownOutput += `- **Created At**: ${created_at}\n`
        markdownOutput += `- **Template Issue**: [${template_issue}](${template_issue})\n`
        markdownOutput += `- **Template Issue Type**: ${template_issue_type}\n`
        markdownOutput += `- **Template Path**: ${template_path}\n`
        markdownOutput += `- **Template PR**: [${template_pr}](${template_pr})\n`
        markdownOutput += `- **Template URL**: [${template_url}](${template_url})\n`
        markdownOutput += `- **Updated At**: ${updated_at}\n\n`
      } else {
        markdownOutput += `\n### Nuclei Template Available: ${is_template ? "Yes" : "No"}\n`
      }

      // if (hackerone?.rank || hackerone?.count !== undefined) {
      //   markdownOutput += `- **HackerOne**: Rank ${hackerone.rank}, Reports ${hackerone.count}\n`;
      // }

      if (shodan?.count) {
        markdownOutput += `### Shodan Data\n`
        markdownOutput += `- **Number of Results**: ${shodan.count}\n`
        if (shodan.query?.length) {
          markdownOutput += `- **Queries**:\n`
          shodan.query.forEach(
            (query: any) => (markdownOutput += `  - \`${query}\`\n`)
          )
        }
      }

      markdownOutput += `### Other\n`

      addOptionalField("Vulnerability Status", vuln_status)
      addOptionalField("Remotely Exploitable", is_remote ? "Yes" : "No")
      addOptionalField("Open Source Software", is_oss ? "Yes" : "No")
      if (vendor_advisory)
        markdownOutput += `- **Vendor Advisory**: ${vendor_advisory}\n`
      addOptionalField("Exploited in the Wild", is_exploited ? "Yes" : "No")

      if (oss?.url) {
        markdownOutput += `- **OSS**: [${oss.url}](${oss.url})\n`
      }

      if (patch_url?.length) {
        markdownOutput += `- **Patch URL**:\n`
        patch_url.forEach((url: any) => (markdownOutput += `  - ${url}\n`))
      }

      markdownOutput += "\n"
    }
  )

  return markdownOutput
}
