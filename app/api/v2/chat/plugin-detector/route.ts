import { getServerProfile } from "@/lib/server/server-chat-helpers"
import {
  buildFinalMessages,
  filterEmptyAssistantMessages
} from "@/lib/build-prompt"
import llmConfig from "@/lib/models/llm/llm-config"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import endent from "endent"
import { BuiltChatMessage } from "@/types"

class APIError extends Error {
  code: any
  constructor(message: string | undefined, code: any) {
    super(message)
    this.name = "APIError"
    this.code = code
  }
}

const availablePlugins = [
  {
    name: "cvemap",
    priority: "High",
    description:
      "CVEMAP helps explore and filter CVEs database based on criteria like vendor, product/library, nuclei templates and severity.",
    usageScenarios: [
      "Get updated CVE information for a specific vendor, product, or nuclei template.",
      "Identifying vulnerabilities in specific software or libraries.",
      "Filtering CVEs by severity for risk assessment.",
      "List CVEs in specific software or libraries.",
      "Provide me with the latest CVEs with the severity of critical.",
      "Provide me with the CVEs for Microsoft that have nuclei templates."
    ]
  },
  {
    name: "subfinder",
    priority: "High",
    description:
      "Subfinder discovers valid subdomains for websites using passive sources. It's fast and efficient.",
    usageScenarios: [
      "Enumerating subdomains for security testing.",
      "Gathering subdomains for attack surface analysis."
    ]
  },
  {
    name: "golinkfinder",
    priority: "Medium",
    description:
      "GoLinkFinder extracts endpoints from HTML and JavaScript files, helping identify URLs within a target domain.",
    usageScenarios: [
      "Finding hidden API endpoints.",
      "Extracting URLs from web applications."
    ]
  },
  {
    name: "nuclei",
    priority: "High",
    description:
      "Nuclei scans for vulnerabilities in apps, infrastructure, and networks to identify and mitigate risks.",
    usageScenarios: [
      "Scanning web applications for known vulnerabilities.",
      "Automating vulnerability assessments."
    ]
  },
  {
    name: "katana",
    priority: "Medium",
    description:
      "Katana is a fast web crawler designed to efficiently discover endpoints in both headless and non-headless modes.",
    usageScenarios: [
      "Crawling websites to map all endpoints.",
      "Discovering hidden resources on a website."
    ]
  },
  {
    name: "httpx",
    priority: "High",
    description:
      "HTTPX probes web servers, gathering information like status codes, headers, and technologies.",
    usageScenarios: [
      "Analyzing server responses.",
      "Detecting technologies and services used on a server."
    ]
  },
  {
    name: "naabu",
    priority: "High",
    description:
      "Naabu is a port scanning tool that quickly enumerates open ports on target hosts, supporting SYN, CONNECT, and UDP scans.",
    usageScenarios: [
      "Scanning for open ports on a network.",
      "Identifying accessible services on a host."
    ]
  },
  {
    name: "dnsx",
    priority: "Low",
    description:
      "DNSX runs multiple DNS queries to discover records and perform DNS brute-forcing with user-supplied resolvers.",
    usageScenarios: [
      "Querying DNS records for a domain.",
      "Brute-forcing subdomains."
    ]
  },
  {
    name: "alterx",
    priority: "Low",
    description:
      "AlterX generates custom subdomain wordlists using DSL patterns, enriching enumeration pipelines.",
    usageScenarios: [
      "Creating wordlists for subdomain enumeration.",
      "Generating custom permutations for subdomains.",
      "Generate subdomain wordlist for a domain."
    ]
  },
  {
    name: "none",
    priority: "Highest",
    description: "No specific plugin is suitable for the user's request.",
    usageScenarios: ["If the user requests a plugin that is not available"]
  }
]

export async function POST(request: Request) {
  const json = await request.json()
  const { payload, selectedPlugin } = json

  const USE_PLUGIN_DETECTOR =
    process.env.USE_PLUGIN_DETECTOR?.toLowerCase() === "true"

  if (!USE_PLUGIN_DETECTOR) {
    return new Response(JSON.stringify({ plugin: "None" }), { status: 200 })
  }

  try {
    const profile = await getServerProfile()
    const openrouterApiKey = profile.openrouter_api_key || ""

    const rateLimitCheckResult = await checkRatelimitOnApi(
      profile.user_id,
      "pluginDetector"
    )

    if (rateLimitCheckResult !== null) {
      return new Response(JSON.stringify({ plugin: "None" }), { status: 200 })
    }

    const useOpenRouter = process.env.USE_OPENROUTER?.toLowerCase() === "true"
    const providerUrl = useOpenRouter
      ? llmConfig.openrouter.url
      : llmConfig.together.url
    const selectedStandaloneQuestionModel = useOpenRouter
      ? llmConfig.models.hackerGPT_standalone_question_openrouter
      : llmConfig.models.hackerGPT_standalone_question_together
    const providerHeaders = {
      Authorization: `Bearer ${useOpenRouter ? openrouterApiKey : process.env.TOGETHER_API_KEY}`,
      "Content-Type": "application/json"
    }

    const cleanedMessages = (await buildFinalMessages(
      payload,
      profile,
      [],
      selectedPlugin
    )) as any[]

    filterEmptyAssistantMessages(cleanedMessages)
    const lastUserMessage = cleanedMessages[cleanedMessages.length - 1].content

    if (
      lastUserMessage.length < llmConfig.pinecone.messageLength.min ||
      lastUserMessage.length > llmConfig.pinecone.messageLength.max
    ) {
      return new Response(JSON.stringify({ plugin: "None" }), { status: 200 })
    }

    const detectedPlugin = await detectPlugin(
      cleanedMessages,
      lastUserMessage,
      providerUrl,
      providerHeaders,
      selectedStandaloneQuestionModel
    )

    if (
      detectedPlugin === "None" ||
      !availablePlugins.map(plugin => plugin.name).includes(detectedPlugin)
    ) {
      return new Response(JSON.stringify({ plugin: "None" }), { status: 200 })
    } else {
      return new Response(JSON.stringify({ plugin: detectedPlugin }), {
        status: 200
      })
    }
  } catch (error: any) {
    if (error instanceof APIError) {
      console.error(
        `API Error - Code: ${error.code}, Message: ${error.message}`
      )
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.code
      })
    } else {
      console.error(`Unexpected Error: ${error.message}`)
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500
      })
    }
  }
}

async function detectPlugin(
  messages: BuiltChatMessage[],
  lastUserMessage: string,
  openRouterUrl: string | URL | Request,
  openRouterHeaders: any,
  selectedStandaloneQuestionModel: string | undefined
) {
  const modelStandaloneQuestion = selectedStandaloneQuestionModel

  // Move to string type msg.content, if it's an array, concat the text and replace type image with [IMAGE]
  const cleanedMessages = messages.map(msg => {
    if (Array.isArray(msg.content)) {
      return {
        ...msg,
        content: msg.content
          .map(content => {
            if (content.type === "image_url") {
              return "[IMAGE]"
            }
            return (
              content.text.substring(0, 1000) +
              (content.text.length > 1000 ? "..." : "")
            )
          })
          .join("\n\n")
      }
    }
    return msg
  })

  // Filter out empty assistant messages, exclude the first and last message, and pick the last 3 messages
  const chatHistory = cleanedMessages
    .filter(msg => !(msg.role === "assistant" && msg.content === ""))
    .slice(1, -1)
    .slice(-4)

  const pluginsInfo = availablePlugins
    .map(
      plugin =>
        `${plugin.name}|${plugin.priority}|${plugin.description}|${plugin.usageScenarios.join("; ")}`
    )
    .join("\n")

  const template = endent`
    Based on the provided follow-up question and chat history, determine if the user intends to utilize a plugin within the chat environment for their task.
  
    # User Input:
    - Query: """${lastUserMessage}"""
  
    # Available Plugins
    ID|Priority|Description|Usage Scenarios
    ${pluginsInfo}
  
    # Important Rules:
    - If the user inquires about CVEs specifically from the 2024 year respond with ID = cvemap. This ensures that the response leverages the most updated CVE information available via the plugin, as the AI does not have direct access to the latest CVE data.
    - If the user inquires about CVEs that are not from the 2024 year and doesn't say or ask to use the plugin, respond with ID = None. 
    - If the user requests the plugin to run outside our cloud platform, respond with ID = None.    
    - Opt for ID = None if unsure which plugin to choose.
  
    # Type of Request
    Simplify the user query and categorize it:
    - Question: Starts with interrogatives like What, Which, How, Why, When, Where, Who, or phrases like Could you, Can you, etc.
    - Action: Begins with a verb, indicating a command.
    - Other: Anything that doesn't fit the categories above.
  
    # ALWAYS USE EXACT OUTPUT STRUCTURE:
    \`\`\`
    <SimplestUserQuery>{The user's query in its simplest form}</SimplestUserQuery>
    <ScratchPad>{Your concise, step-by-step reasoning}</ScratchPad>
    <TypeOfRequest>{Type of request}</TypeOfRequest>
    <IsUserAskingAboutCVEs>{True or false, based only on whether the user specifically asks about CVEs, not the cvemap plugin.}</IsUserAskingAboutCVEs>
    <Plugin>{The single most relevant plugin ID for the user's needs}</Plugin>
    \`\`\`
  `

  try {
    const messages = [
      {
        role: "system",
        content: `${llmConfig.systemPrompts.hackerGPTCurrentDateOnly}`
      },
      ...chatHistory,
      {
        role: "user",
        content: template
      }
    ]

    const data = await callModel(
      modelStandaloneQuestion || "",
      messages,
      openRouterUrl as string,
      openRouterHeaders
    )

    const aiResponse = data.choices?.[0]?.message?.content?.trim()

    const detectedPlugin = extractXML(aiResponse, "Plugin", "None")
    const typeOfRequest = extractXML(aiResponse, "TypeOfRequest", "other")
    const isUserAskingAboutCVEs = extractXML(
      aiResponse,
      "IsUserAskingAboutCVEs",
      "false"
    )

    // console.log({
    //   aiResponse,
    //   detectedPlugin,
    //   typeOfRequest,
    //   isUserAskingAboutCVEs
    // })

    if (!availablePlugins.map(plugin => plugin.name).includes(detectedPlugin)) {
      return "None"
    } else {
      if (isUserAskingAboutCVEs === "true" && detectedPlugin === "cvemap") {
        return "cvemap"
      }

      if (detectedPlugin === "none" || typeOfRequest !== "action") {
        return "None"
      }
      return detectedPlugin
    }
  } catch (error) {
    return "None"
  }
}

function extractXML(aiResponse: string, xmlTag: string, defaultValue: string) {
  const regex = new RegExp(
    `<${xmlTag.toLowerCase()}>(.*?)</${xmlTag.toLowerCase()}>`,
    "i"
  )
  const match = aiResponse.toLowerCase().match(regex)
  return match ? match[1].toLowerCase() : defaultValue
}

async function callModel(
  modelStandaloneQuestion: string,
  messages: any,
  openRouterUrl: string,
  openRouterHeaders: any
): Promise<any> {
  const requestBody = {
    model: modelStandaloneQuestion,
    route: "fallback",
    messages,
    temperature: 0.1,
    max_tokens: 256
  }

  const res = await fetch(openRouterUrl, {
    method: "POST",
    headers: openRouterHeaders,
    body: JSON.stringify(requestBody)
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(
      `HTTP error! status: ${res.status}. Error Body: ${errorBody}`
    )
  }

  const data = await res.json()
  return data
}
