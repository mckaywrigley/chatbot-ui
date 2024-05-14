import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { buildFinalMessages } from "@/lib/build-prompt"
import llmConfig from "@/lib/models/llm/llm-config"
import { updateOrAddSystemMessage } from "@/lib/ai-helper"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"

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
    description: `
      CVEMAP helps explore and filter CVEs based on criteria like vendor, product, and severity.

      **Priority Level:** High

      **Usage Scenarios:**
      - Identifying vulnerabilities in specific software.
      - Filtering CVEs by severity for risk assessment.
    `
  },
  {
    name: "subfinder",
    description: `
      Subfinder discovers valid subdomains for websites using passive sources. It's fast and efficient.

      **Priority Level:** High

      **Usage Scenarios:**
      - Enumerating subdomains for security testing.
      - Gathering subdomains for attack surface analysis.
    `
  },
  {
    name: "golinkfinder",
    description: `
      GoLinkFinder extracts endpoints from HTML and JavaScript files, helping identify URLs within a target domain.

      **Priority Level:** Medium

      **Usage Scenarios:**
      - Finding hidden API endpoints.
      - Extracting URLs from web applications.
    `
  },
  {
    name: "nuclei",
    description: `
      Nuclei scans for vulnerabilities in apps, infrastructure, and networks to identify and mitigate risks.

      **Priority Level:** High

      **Usage Scenarios:**
      - Scanning web applications for known vulnerabilities.
      - Automating vulnerability assessments.
    `
  },
  {
    name: "katana",
    description: `
      Katana is a fast web crawler designed to efficiently discover endpoints in both headless and non-headless modes.

      **Priority Level:** Medium

      **Usage Scenarios:**
      - Crawling websites to map all endpoints.
      - Discovering hidden resources on a website.
    `
  },
  {
    name: "httpx",
    description: `
      HTTPX probes web servers, gathering information like status codes, headers, and technologies.

      **Priority Level:** High

      **Usage Scenarios:**
      - Analyzing server responses.
      - Detecting technologies and services used on a server.
    `
  },
  {
    name: "naabu",
    description: `
      Naabu is a port scanning tool that quickly enumerates open ports on target hosts, supporting SYN, CONNECT, and UDP scans.

      **Priority Level:** High

      **Usage Scenarios:**
      - Scanning for open ports on a network.
      - Identifying accessible services on a host.
    `
  },
  {
    name: "dnsx",
    description: `
      DNSX runs multiple DNS queries to discover records and perform DNS brute-forcing with user-supplied resolvers.

      **Priority Level:** Low

      **Usage Scenarios:**
      - Querying DNS records for a domain.
      - Brute-forcing subdomains.
    `
  },
  {
    name: "alterx",
    description: `
      AlterX generates custom subdomain wordlists using DSL patterns, enriching enumeration pipelines.

      **Priority Level:** Low

      **Usage Scenarios:**
      - Creating wordlists for subdomain enumeration.
      - Generating custom permutations for subdomains.
    `
  }
]

export async function POST(request: Request) {
  const json = await request.json()
  const { payload, chatImages, selectedPlugin } = json

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
      console.log(rateLimitCheckResult)
      return new Response(JSON.stringify({ plugin: "None" }), { status: 200 })
    }

    let providerUrl, providerHeaders, selectedStandaloneQuestionModel

    const useOpenRouter = process.env.USE_OPENROUTER?.toLowerCase() === "true"
    if (useOpenRouter) {
      providerUrl = llmConfig.openrouter.url
      selectedStandaloneQuestionModel =
        llmConfig.models.hackerGPT_standalone_question_openrouter
      providerHeaders = {
        Authorization: `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json"
      }
    } else {
      providerUrl = llmConfig.together.url
      selectedStandaloneQuestionModel =
        llmConfig.models.hackerGPT_standalone_question_together
      providerHeaders = {
        Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
        "Content-Type": "application/json"
      }
    }

    const messages = await buildFinalMessages(
      payload,
      profile,
      chatImages,
      selectedPlugin
    )
    const cleanedMessages = messages as any[]

    const systemMessageContent = `${llmConfig.systemPrompts.hackerGPT}`
    updateOrAddSystemMessage(cleanedMessages, systemMessageContent)

    const lastUserMessage = cleanedMessages[cleanedMessages.length - 2].content

    if (lastUserMessage.length > llmConfig.pinecone.messageLength.max) {
      return new Response(JSON.stringify({ plugin: "None" }), { status: 200 })
    }

    const detectedPlugin = await detectPlugin(
      messages,
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
  messages: any[],
  lastUserMessage: string,
  openRouterUrl: string | URL | Request,
  openRouterHeaders: any,
  selectedStandaloneQuestionModel: string | undefined
) {
  const modelStandaloneQuestion = "openai/gpt-4o"

  const chatHistory = messages
    .filter(msg => !(msg.role === "assistant" && msg.content === ""))
    .slice(1, -1)
    .slice(-3)
    .map(msg => `${msg.role}: ${msg.content}`)

  const pluginsInfo = availablePlugins
    .map(plugin => `## ${plugin.name}\n${plugin.description}\n`)
    .join("\n")

  const template = `You are HackerGPT, an expert in web application hacking with the ability to run specific plugins for hacking tasks. You are having a conversation with a user and need to determine if the user wants to use a specific plugin inside the chat environment for their task.
    
    Objective: Based on the given follow-up question and chat history, determine if the user wants to use a plugin inside the chat environment for their task. The available plugins are:
    
    # Plugins
    ${pluginsInfo}
  
    Input:
    - Query: """${lastUserMessage}"""
  
    IMPORTANT INSTRUCTION:
    Use the following guidelines to analyze the user's request:
    1. Treat the conversation as a normal interaction where the user might seek information or want to perform an action using a plugin.
    2. Respond with the name of the plugin only if the user wants to perform a specific action inside the chat environment that any of the plugins can accomplish. If you are not sure, respond with None.
    3. DO NOT respond with the plugin name if the user is asking for information about the plugin itself or about general topics. Always respond with <Plugin>None</Plugin> for such queries.
    4. Identify if the request involves an actionable task that can be directly executed by a plugin within the chat environment (e.g., scanning a website, finding subdomains). Only in these cases should you respond with the plugin name.
    5. If the user's request is for general information, conceptual explanations, or installation instructions, respond with <Plugin>None</Plugin>.
    6. If the request clearly involves an action that matches a plugin's capabilities (like performing a scan or discovery), respond with the name of the plugin, wrapped in <Plugin> tags, in lowercase.
    7. Consider whether the user is asking for a recommendation, tool explanation, or performing an action. Recommendations and explanations should result in <Plugin>None</Plugin>.
    8. Always confirm that the request is an actionable task rather than an informational query before deciding on the plugin response.
    
    ALWAYS RESPOND WITH <Plugin>{None or plugin name}</Plugin>
  
    Decision Criteria:
    - For action requests like 'scan a site for vulnerabilities' or 'find all subdomains of a domain', use the respective plugin capable of these actions.
    - For information requests like 'how to install a plugin', 'tell me about subfinder', 'what plugin would you recommend for subdomain discovery', or 'how can I use this wordlist for attack', respond with <Plugin>None</Plugin>, as these do not require direct plugin intervention.
    - Consider the overall conversation context to determine whether the user is seeking information or asking for an action to be performed. Ensure that only requests explicitly asking for an actionable task are responded to with a plugin name.
  
    Examples:
    - Query: "tell me about subfinder"
      - Response: <Plugin>None</Plugin>
    - Query: "find all subdomains of example.com"
      - Response: <Plugin>subfinder</Plugin>
    - Query: "how can I use this wordlist for attack"
      - Response: <Plugin>None</Plugin>
    - Query: "what can you tell me about those domains"
      - Response: <Plugin>None</Plugin>
    - Query: "scan example.com for vulnerabilities"
      - Response: <Plugin>nuclei</Plugin>
    - Query: "extract URLs from this domain"
      - Response: <Plugin>golinkfinder</Plugin>
    - Query: "probe example.com for HTTP details"
      - Response: <Plugin>httpx</Plugin>
    - Query: "what plugin would you recommend for subdomain discovery"
      - Response: <Plugin>None</Plugin>
    - Query: "list all subdomains for test.com"
      - Response: <Plugin>subfinder</Plugin>
    - Query: "what tools can I use to scan domains?"
      - Response: <Plugin>None</Plugin>
    - Query: "explain how to use nuclei"
      - Response: <Plugin>None</Plugin>`

  const firstMessage = messages[0]
    ? messages[0]
    : { role: "system", content: `${llmConfig.systemPrompts.hackerGPT}` }

  try {
    const requestBody = {
      model: modelStandaloneQuestion,
      route: "fallback",
      messages: [
        { role: firstMessage.role, content: firstMessage.content },
        ...chatHistory,
        { role: "user", content: template }
      ],
      temperature: 0.1,
      max_tokens: 64
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
    const aiResponse = data.choices?.[0]?.message?.content?.trim()
    const pluginMatch = aiResponse.match(/<plugin>(.*?)<\/plugin>/i)
    const detectedPlugin = pluginMatch ? pluginMatch[1].toLowerCase() : "None"

    if (!availablePlugins.map(plugin => plugin.name).includes(detectedPlugin)) {
      return "None"
    } else {
      return detectedPlugin
    }
  } catch (error) {
    return "None"
  }
}
