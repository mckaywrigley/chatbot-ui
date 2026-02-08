import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { ChatSettings, LLMID } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"
import { createClient } from "@supabase/supabase-js"
import { ROOFING_EXPERT_SYSTEM_PROMPT } from "@/lib/system-prompts"
import { GLOBAL_API_KEYS } from "@/lib/api-keys"
import { checkChatLimit, checkWebSearchLimit } from "@/lib/entitlements"
import { incrementChatUsage, incrementWebSearchUsage } from "@/db/user-usage"

export const runtime: ServerRuntime = "edge"

// Add GET handler to verify routing works
export async function GET(request: Request) {
  return new Response(
    JSON.stringify({ error: "Method GET not allowed. Use POST." }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  )
}

export async function POST(request: Request) {
  let json: any
  let chatSettings: ChatSettings
  let messages: any[]
  let workspaceId: string | undefined

  try {
    json = await request.json()
    chatSettings = json.chatSettings
    messages = json.messages
    workspaceId = json.workspaceId
  } catch (parseError: any) {
    console.error("[OpenAI Route] Failed to parse request", parseError)
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
        details: parseError.message
      }),
      { status: 400 }
    )
  }

  try {
    const profile = await getServerProfile()

    // Check chat limits and determine which model to use
    const limitCheck = await checkChatLimit(profile.user_id)
    if (!limitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "CHAT_LIMIT_REACHED",
          message:
            "You've reached your chat limit for this period. Upgrade for more messages!",
          remaining: limitCheck.remaining,
          limit: limitCheck.limit,
          upgradeRequired: true
        }),
        { status: 403 } // 403 Forbidden
      )
    }

    // Use the model recommended by the entitlement check
    // This handles automatic switching from GPT-4.5-mini to GPT-4o when premium messages are exhausted
    const recommendedModel = limitCheck.model
    // Override the model if it was switched to free tier model
    if (limitCheck.switchedToFreeModel) {
      chatSettings.model = recommendedModel
    }

    // Use global API keys instead of user-provided keys
    if (!GLOBAL_API_KEYS.openai) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: GLOBAL_API_KEYS.openai,
      organization: GLOBAL_API_KEYS.openai_org
    })

    // RAG: Search documents for relevant context
    let documentContext = ""
    let sourceDocs: any[] = []

    try {
      // Get the user's latest message
      const userMessages = messages.filter((m: any) => m.role === "user")
      const latestUserMessage = userMessages[userMessages.length - 1]
      const userQuery =
        typeof latestUserMessage?.content === "string"
          ? latestUserMessage.content
          : latestUserMessage?.content?.[0]?.text || ""

      // Check if user has web search access based on their tier
      const webSearchCheck = await checkWebSearchLimit(profile.user_id)
      const hasWebSearchAccess = webSearchCheck.allowed

      // Check if user has web search enabled (default: true) AND has tier access
      const shouldUseWebSearch =
        profile.web_search_enabled !== false && hasWebSearchAccess

      if (userQuery && workspaceId && shouldUseWebSearch) {
        // Skip document RAG search and go straight to web search
        let sourceCounter = 0

        // Search the web with Brave directly (no internal API call)
        try {
          const braveApiKey =
            process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_AI_API_KEY

          if (braveApiKey) {
            // Reformulate query based on conversation context
            let searchQuery = userQuery

            // Get last 4 messages (2 exchanges) for context
            const recentMessages = messages.slice(-4)

            if (recentMessages.length > 1) {
              try {
                const reformulationResponse = await fetch(
                  "https://api.openai.com/v1/chat/completions",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${
                        profile?.openai_api_key || process.env.OPENAI_API_KEY
                      }`
                    },
                    body: JSON.stringify({
                      model: "gpt-4o-mini",
                      messages: [
                        {
                          role: "system",
                          content:
                            "You are a search query optimizer. Given a conversation, create a concise, focused web search query (5-10 words max) that captures the user's intent with all relevant context. Only return the search query, nothing else."
                        },
                        ...recentMessages.map((msg: any) => ({
                          role: msg.role,
                          content:
                            typeof msg.content === "string"
                              ? msg.content
                              : msg.content?.[0]?.text || ""
                        }))
                      ],
                      temperature: 0.3,
                      max_tokens: 50
                    })
                  }
                )

                if (reformulationResponse.ok) {
                  const reformulationData = await reformulationResponse.json()
                  const reformulatedQuery =
                    reformulationData.choices?.[0]?.message?.content?.trim()

                  if (reformulatedQuery && reformulatedQuery.length > 0) {
                    searchQuery = reformulatedQuery
                  }
                }
              } catch (error: any) {
                console.error(
                  `OpenAI RAG - Query reformulation failed: ${error.message}`
                )
              }
            }

            const braveResponse = await fetch(
              `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=10`,
              {
                headers: {
                  Accept: "application/json",
                  "X-Subscription-Token": braveApiKey
                }
              }
            )

            if (braveResponse.ok) {
              const braveData = await braveResponse.json()
              const webResults = braveData.web?.results || []

              if (webResults.length > 0) {
                // Track web search usage
                incrementWebSearchUsage(profile.user_id).catch(err =>
                  console.error("Failed to track web search usage:", err)
                )

                if (!documentContext) {
                  documentContext = "\n\n--- RELEVANT INFORMATION ---\n"
                }

                documentContext += "\n--- WEB SEARCH RESULTS ---\n"

                webResults.forEach((result: any) => {
                  sourceCounter++
                  const snippet = result.description || ""
                  documentContext += `[Source ${sourceCounter}] (Web Search: ${result.title})\nURL: ${result.url}\n${snippet}\n\n`

                  sourceDocs.push({
                    id: `web-${sourceCounter}`,
                    sourceNumber: sourceCounter,
                    title: result.title,
                    fileName: result.url,
                    isGlobal: false,
                    documentType: "Web Search",
                    chunkContent: `${result.title}\n\n${snippet}\n\nSource: ${result.url}`,
                    preview: snippet.substring(0, 50).trim()
                  })
                })
              }
            } else {
              console.error(
                `OpenAI RAG - Brave API error: ${braveResponse.status}`
              )
            }
          }
        } catch (braveError: any) {
          console.error(
            `OpenAI RAG - Brave search error: ${braveError.message}`
          )
          // Continue without Brave results - don't let this block the response
        }

        if (documentContext) {
          documentContext += "--- END INFORMATION ---\n"
          documentContext +=
            "When answering, cite specific sources using the format [Source X] where applicable.\n\n"
        }
      }
    } catch (ragError) {
      console.error("RAG search error:", ragError)
      // Continue without RAG if it fails
    }

    // Check if model has temperature constraints
    const modelLimits = CHAT_SETTING_LIMITS[chatSettings.model as LLMID]
    let temperature = chatSettings.temperature

    // If model only supports a single temperature value (MIN === MAX), use that value
    if (
      modelLimits &&
      modelLimits.MIN_TEMPERATURE === modelLimits.MAX_TEMPERATURE
    ) {
      temperature = modelLimits.MIN_TEMPERATURE
    }

    // Prepend document context and roofing expert prompt to system message
    // BUT skip this for vision requests (messages with images)
    const modifiedMessages = [...messages]

    // Check if this is a vision request (has image_url content)
    const hasImages = modifiedMessages.some((msg: any) => {
      if (Array.isArray(msg.content)) {
        return msg.content.some((item: any) => item.type === "image_url")
      }
      return false
    })

    if (modifiedMessages.length > 0 && !hasImages) {
      // Only add roofing expert prompt for non-vision requests
      // Combine roofing expert prompt, document context, and original system message
      const systemContent =
        ROOFING_EXPERT_SYSTEM_PROMPT +
        "\n\n" +
        (documentContext || "") +
        modifiedMessages[0].content
      modifiedMessages[0] = {
        ...modifiedMessages[0],
        content: systemContent
      }
    } else if (hasImages && documentContext) {
      // For vision requests, only add document context if available (no roofing prompt)
      const firstSystemMsg = modifiedMessages.find(
        (m: any) => m.role === "system"
      )
      if (firstSystemMsg) {
        firstSystemMsg.content =
          documentContext + "\n\n" + firstSystemMsg.content
      }
    }

    // Build request params, only including max_tokens for specific models
    const requestParams: any = {
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: modifiedMessages as ChatCompletionCreateParamsBase["messages"],
      temperature: temperature,
      stream: true
    }

    // Only set max_tokens for models that need it (vision models)
    if (
      chatSettings.model === "gpt-4-vision-preview" ||
      chatSettings.model === "gpt-4o"
    ) {
      requestParams.max_tokens = 4096
    }

    const response = await openai.chat.completions.create(requestParams)

    const stream = OpenAIStream(response as any)

    // Track usage after successful API call
    // Use the recommended model to track correct usage type
    incrementChatUsage(profile.user_id, recommendedModel as any).catch(err =>
      console.error("Failed to track chat usage:", err)
    )

    // If we have document sources, prepend metadata to the stream
    if (sourceDocs.length > 0) {
      const encoder = new TextEncoder()
      const metadataLine = `__DOCUMENTS__:${JSON.stringify(sourceDocs)}\n`

      const transformedStream = new ReadableStream({
        async start(controller) {
          // First, send the metadata
          controller.enqueue(encoder.encode(metadataLine))

          // Then pipe through the original stream
          const reader = stream.getReader()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              controller.enqueue(value)
            }
          } finally {
            reader.releaseLock()
            controller.close()
          }
        }
      })

      return new StreamingTextResponse(transformedStream)
    }

    return new StreamingTextResponse(stream)
  } catch (error: any) {
    console.error(
      `[OpenAI Route] Error: ${error.message || "Unknown error"}, status: ${error.status || 500}`
    )

    let errorMessage = error.message || "An unexpected error occurred"
    let errorCode = error.status || 500
    let errorCodeName = "CHAT_ERROR"

    // Categorize and improve error messages
    const msg = errorMessage.toLowerCase()

    if (msg.includes("user not found") || msg.includes("profile not found")) {
      errorMessage = "Authentication error. Please log in again."
      errorCode = 401
      errorCodeName = "AUTH_ERROR"
    } else if (
      msg.includes("api key not found") ||
      msg.includes("api key is not configured")
    ) {
      errorMessage = "AI service is not configured. Please contact support."
      errorCode = 500
      errorCodeName = "API_KEY_MISSING"
    } else if (
      msg.includes("incorrect api key") ||
      msg.includes("invalid api key")
    ) {
      errorMessage = "AI service configuration error. Please contact support."
      errorCode = 500
      errorCodeName = "API_KEY_INVALID"
    } else if (msg.includes("rate limit") || msg.includes("quota exceeded")) {
      errorMessage =
        "AI service is temporarily unavailable due to high demand. Please try again in a moment."
      errorCode = 429
      errorCodeName = "RATE_LIMIT"
    } else if (msg.includes("timeout") || msg.includes("timed out")) {
      errorMessage = "Request timed out. Please try a shorter question."
      errorCode = 504
      errorCodeName = "TIMEOUT"
    } else if (msg.includes("content filter") || msg.includes("safety")) {
      errorMessage =
        "Your message was filtered for safety reasons. Please rephrase and try again."
      errorCode = 400
      errorCodeName = "CONTENT_FILTERED"
    } else if (errorCode === 500 && error.code === "ECONNREFUSED") {
      errorMessage = "Unable to connect to AI service. Please try again later."
      errorCodeName = "CONNECTION_ERROR"
    }

    console.error(
      `[OpenAI Route] Error response: ${errorCodeName} ${errorCode}`
    )

    return new Response(
      JSON.stringify({
        error: errorMessage,
        message: errorMessage, // Include both for compatibility
        code: errorCodeName,
        status: errorCode
      }),
      {
        status: errorCode,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}
