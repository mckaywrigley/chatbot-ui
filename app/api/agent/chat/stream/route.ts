// app/api/agent/chat/stream/route.ts
// Streaming chat endpoint for the AI Agent
// Provides real-time token streaming for better UX

import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { checkAgentAccess } from "@/lib/entitlements"
import OpenAI from "openai"
import {
  getAgentSystemPrompt,
  getDynamicSystemPrompt
} from "@/lib/agent/agent-system-prompt"
import {
  BUILTIN_AGENT_TOOLS,
  convertToOpenAITools,
  toolRequiresConfirmation
} from "@/lib/agent/agent-tools"
import { GLOBAL_API_KEYS } from "@/lib/api-keys"
import {
  MCPSessionManager,
  isPipedreamConfigured
} from "@/lib/pipedream/mcp-session"
import { requiresConfirmation as mcpRequiresConfirmation } from "@/lib/pipedream/action-rules"

export const runtime = "nodejs"
export const maxDuration = 120

// Cache for MCP sessions per user
const mcpSessionCache = new Map<string, MCPSessionManager>()

interface StreamRequest {
  session_id: string
  message: string
  config?: {
    model?: string
    temperature?: number
    max_tokens?: number
  }
}

// Generate an intelligent session name from the first message
function generateSessionName(message: string): string {
  // Clean and truncate the message
  const cleaned = message.trim().replace(/\s+/g, " ")

  // Common patterns to extract meaningful titles
  const patterns = [
    // Property/address related
    {
      regex: /(?:property|report|roof|analysis)\s+(?:for|at|on)\s+(.{10,50})/i,
      prefix: ""
    },
    {
      regex:
        /(\d+\s+[A-Za-z]+(?:\s+[A-Za-z]+)?(?:\s+(?:st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|way|ct|court))?)/i,
      prefix: "Property: "
    },

    // Weather related
    { regex: /weather\s+(?:for|in|at)\s+([A-Za-z\s,]+)/i, prefix: "Weather: " },
    {
      regex: /forecast\s+(?:for|in|at)\s+([A-Za-z\s,]+)/i,
      prefix: "Forecast: "
    },

    // Email related
    {
      regex:
        /(?:draft|write|send)\s+(?:an?\s+)?email\s+(?:to|about|for)\s+(.{5,40})/i,
      prefix: "Email: "
    },

    // Search related
    {
      regex: /(?:search|find|look\s+up|research)\s+(?:for\s+)?(.{5,40})/i,
      prefix: "Search: "
    },

    // Material/pricing related
    {
      regex: /(?:price|cost|pricing)\s+(?:for|of)\s+(.{5,40})/i,
      prefix: "Pricing: "
    },
    { regex: /(.{5,30})\s+(?:price|cost|pricing)/i, prefix: "Pricing: " },

    // Customer related
    { regex: /(?:customer|client)\s+(.{5,40})/i, prefix: "Customer: " },

    // Job/project related
    { regex: /(?:job|project)\s+(?:for|at|on)\s+(.{5,40})/i, prefix: "Job: " },

    // Schedule related
    {
      regex: /(?:schedule|appointment|meeting)\s+(?:for|with)\s+(.{5,40})/i,
      prefix: "Schedule: "
    },

    // Estimate related
    {
      regex: /(?:estimate|quote)\s+(?:for|on)\s+(.{5,40})/i,
      prefix: "Estimate: "
    }
  ]

  // Try to match patterns
  for (const { regex, prefix } of patterns) {
    const match = cleaned.match(regex)
    if (match && match[1]) {
      const extracted = match[1].trim()
      // Capitalize first letter and clean up
      const title = extracted.charAt(0).toUpperCase() + extracted.slice(1)
      // Truncate if too long
      const truncated =
        title.length > 40 ? title.substring(0, 37) + "..." : title
      return prefix + truncated
    }
  }

  // Fallback: Use first part of message as title
  // Remove common starting words
  let title = cleaned
    .replace(
      /^(hey|hi|hello|please|can you|could you|i need|i want|help me)\s+/i,
      ""
    )
    .replace(/^(to|with|for|about)\s+/i, "")

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1)

  // Truncate to reasonable length
  if (title.length > 50) {
    // Try to cut at word boundary
    const truncated = title.substring(0, 47)
    const lastSpace = truncated.lastIndexOf(" ")
    if (lastSpace > 30) {
      title = truncated.substring(0, lastSpace) + "..."
    } else {
      title = truncated + "..."
    }
  }

  return title || "New Conversation"
}

// Helper to get or create MCP session for a user
async function getMCPSession(
  userId: string,
  sessionId: string
): Promise<MCPSessionManager | null> {
  if (!isPipedreamConfigured()) {
    return null
  }

  const cacheKey = `${userId}-${sessionId}`

  if (mcpSessionCache.has(cacheKey)) {
    return mcpSessionCache.get(cacheKey)!
  }

  try {
    const mcpSession = new MCPSessionManager(userId, sessionId)
    await mcpSession.connect()
    mcpSessionCache.set(cacheKey, mcpSession)
    return mcpSession
  } catch (error) {
    console.error("[Agent Stream] Failed to connect to Pipedream MCP:", error)
    return null
  }
}

// Convert MCP tools to OpenAI format
function convertMCPToolsToOpenAI(
  mcpTools: any[]
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return mcpTools.map(tool => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description || `Execute ${tool.name}`,
      parameters: tool.inputSchema || { type: "object", properties: {} }
    }
  }))
}

// Check if a tool is a Pipedream MCP tool
function isMCPTool(toolName: string, mcpToolNames: Set<string>): boolean {
  return mcpToolNames.has(toolName)
}

// Check if any tool requires confirmation (built-in or MCP)
function checkToolRequiresConfirmation(
  toolName: string,
  isMCP: boolean
): boolean {
  if (isMCP) {
    return mcpRequiresConfirmation(toolName)
  }
  return toolRequiresConfirmation(toolName)
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Helper to send SSE events
  const sendEvent = async (event: string, data: any) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    await writer.write(encoder.encode(payload))
  }

  // Start processing in the background
  ;(async () => {
    try {
      const cookieStore = cookies()
      const supabase = createClient(cookieStore)

      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser()

      if (authError || !user) {
        await sendEvent("error", { message: "Not authenticated" })
        await writer.close()
        return
      }

      // Check agent access
      const hasAccess = await checkAgentAccess(user.id)
      if (!hasAccess) {
        await sendEvent("error", {
          message: "Agent feature requires Premium or Business subscription"
        })
        await writer.close()
        return
      }

      const body: StreamRequest = await request.json()
      const { session_id, message, config } = body

      if (!session_id || !message) {
        await sendEvent("error", {
          message: "session_id and message are required"
        })
        await writer.close()
        return
      }

      // Get the session
      const { data: session, error: sessionError } = await supabase
        .from("agent_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user.id)
        .single()

      if (sessionError || !session) {
        await sendEvent("error", { message: "Session not found" })
        await writer.close()
        return
      }

      // Notify start
      await sendEvent("start", { session_id })

      // Get existing messages for context
      const { data: existingMessages } = await supabase
        .from("agent_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", { ascending: true })
        .limit(50)

      // Check if this is the first message - if so, generate intelligent session name
      const isFirstMessage = !existingMessages || existingMessages.length === 0
      if (isFirstMessage && session.name.includes("New")) {
        const intelligentName = generateSessionName(message)
        await supabase
          .from("agent_sessions")
          .update({ name: intelligentName })
          .eq("id", session_id)
        console.log(
          `[Agent Stream] Generated session name: "${intelligentName}" for session ${session_id}`
        )
        // Notify client of name change
        await sendEvent("session_renamed", { name: intelligentName })
      }

      // Build conversation history - system prompt will be added after MCP tools are loaded
      const conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        []

      // Add existing messages - track which tool_call_ids have been seen
      // to ensure tool messages only appear after their corresponding assistant message
      if (existingMessages) {
        const seenToolCallIds = new Set<string>()

        for (const msg of existingMessages) {
          if (msg.role === "assistant" && msg.tool_calls) {
            // This is an assistant message with tool calls
            const toolCallsArray = Array.isArray(msg.tool_calls)
              ? msg.tool_calls
              : []

            // Only include if we have valid tool calls
            if (toolCallsArray.length > 0) {
              const formattedToolCalls = toolCallsArray
                .map((tc: any) => {
                  const tcId = tc.id || tc.tool_call_id
                  if (tcId) seenToolCallIds.add(tcId)
                  return {
                    id: tcId,
                    type: "function" as const,
                    function: {
                      name: tc.name || tc.function?.name,
                      arguments:
                        typeof tc.arguments === "string"
                          ? tc.arguments
                          : JSON.stringify(
                              tc.arguments || tc.function?.arguments || {}
                            )
                    }
                  }
                })
                .filter((tc: any) => tc.id && tc.function.name)

              if (formattedToolCalls.length > 0) {
                conversationHistory.push({
                  role: "assistant",
                  content: msg.content || null,
                  tool_calls: formattedToolCalls
                })
              }
            }
          } else if (msg.role === "tool" && msg.tool_call_id) {
            // Only add tool messages if we've seen their corresponding tool_call
            if (seenToolCallIds.has(msg.tool_call_id)) {
              conversationHistory.push({
                role: "tool",
                content: msg.content || "Tool execution completed",
                tool_call_id: msg.tool_call_id
              })
            } else {
              console.log(
                `[Agent Stream] Skipping orphan tool message with tool_call_id: ${msg.tool_call_id}`
              )
            }
          } else if (msg.role === "user") {
            conversationHistory.push({
              role: "user",
              content: msg.content
            })
          } else if (msg.role === "assistant" && !msg.tool_calls) {
            // Regular assistant message without tool calls
            conversationHistory.push({
              role: "assistant",
              content: msg.content
            })
          }
        }
      }

      // Add the new user message
      conversationHistory.push({
        role: "user",
        content: message
      })

      // Save user message to database
      await supabase.from("agent_messages").insert([
        {
          session_id,
          user_id: user.id,
          role: "user",
          content: message
        }
      ])

      // Log activity
      await supabase.from("agent_activity_log").insert([
        {
          user_id: user.id,
          session_id,
          action_type: "message_sent",
          title: "Message Sent",
          description: message.substring(0, 100)
        }
      ])

      // Initialize OpenAI
      const openai = new OpenAI({
        apiKey: GLOBAL_API_KEYS.openai
      })

      const model = config?.model || session.model || "gpt-4o"

      // Get built-in tools
      const builtinTools = convertToOpenAITools(BUILTIN_AGENT_TOOLS)

      // Initialize MCP session and get Pipedream tools
      let mcpSession: MCPSessionManager | null = null
      let mcpTools: any[] = []
      const mcpToolNames = new Set<string>()
      let connectedAppNames: string[] = []

      try {
        mcpSession = await getMCPSession(user.id, session_id)
        if (mcpSession) {
          const { data: dataSources } = await supabase
            .from("pipedream_data_sources")
            .select("app_slug, app_name")
            .eq("user_id", user.id)
            .eq("enabled", true)

          if (dataSources && dataSources.length > 0) {
            const enabledApps = dataSources.map(ds => ds.app_slug)
            connectedAppNames = dataSources.map(
              ds => ds.app_name || ds.app_slug
            )
            console.log("[Agent Stream] Enabled apps:", enabledApps)

            try {
              await mcpSession.selectApps(enabledApps)
              const allMcpTools = await mcpSession.listTools()

              // Filter out configuration tools - only include executable tools
              // Tools starting with "begin_configuration_" require OAuth setup and aren't ready to use
              mcpTools = allMcpTools.filter((tool: any) => {
                const isConfigTool =
                  tool.name.startsWith("begin_configuration_") ||
                  tool.name.includes("_configure_") ||
                  tool.name === "select_apps"
                if (isConfigTool) {
                  console.log(
                    `[Agent Stream] Skipping config tool: ${tool.name}`
                  )
                }
                return !isConfigTool
              })

              mcpTools.forEach(tool => mcpToolNames.add(tool.name))
              console.log(
                "[Agent Stream] Available MCP tools:",
                Array.from(mcpToolNames)
              )

              // If we have no usable tools after filtering, log a warning
              if (mcpTools.length === 0 && allMcpTools.length > 0) {
                console.log(
                  "[Agent Stream] Warning: All MCP tools require configuration. User needs to complete OAuth setup in Pipedream."
                )
              }
            } catch (mcpError: any) {
              console.error(
                "[Agent Stream] Error loading MCP tools:",
                mcpError?.message || mcpError
              )
            }
          }
        }
      } catch (error: any) {
        console.error(
          "[Agent Stream] MCP initialization error:",
          error?.message || error
        )
      }

      // Combine built-in tools with MCP tools
      const mcpToolsOpenAI = convertMCPToolsToOpenAI(mcpTools)
      const allTools = [...builtinTools, ...mcpToolsOpenAI]

      // Now add the system prompt with knowledge of available tools
      const mcpToolDescriptions = mcpTools
        .map((t: any) => `- ${t.name}: ${t.description || "No description"}`)
        .join("\n")
      const systemPrompt = getDynamicSystemPrompt({
        customInstructions: session.system_prompt,
        connectedApps: connectedAppNames,
        mcpToolDescriptions: mcpToolDescriptions || undefined
      })

      conversationHistory.unshift({
        role: "system",
        content: systemPrompt
      })

      let totalInputTokens = 0
      let totalOutputTokens = 0
      const toolCalls: any[] = []
      const pendingConfirmations: any[] = []

      // Process with streaming
      let continueLoop = true
      let fullResponse = ""
      let iterationCount = 0
      const maxIterations = 5

      while (continueLoop && iterationCount < maxIterations) {
        iterationCount++

        const streamResponse = await openai.chat.completions.create({
          model,
          messages: conversationHistory,
          tools: allTools.length > 0 ? allTools : undefined,
          tool_choice: allTools.length > 0 ? "auto" : undefined,
          temperature: config?.temperature || 0.7,
          max_tokens: config?.max_tokens || 4096,
          stream: true
        })

        let currentContent = ""
        let currentToolCalls: any[] = []
        let finishReason = ""

        for await (const chunk of streamResponse) {
          const delta = chunk.choices[0]?.delta

          // Handle content streaming
          if (delta?.content) {
            currentContent += delta.content
            fullResponse += delta.content
            await sendEvent("token", { content: delta.content })
          }

          // Handle tool call deltas
          if (delta?.tool_calls) {
            for (const tcDelta of delta.tool_calls) {
              const index = tcDelta.index
              if (!currentToolCalls[index]) {
                currentToolCalls[index] = {
                  id: tcDelta.id || "",
                  type: "function",
                  function: { name: "", arguments: "" }
                }
              }
              if (tcDelta.id) currentToolCalls[index].id = tcDelta.id
              if (tcDelta.function?.name) {
                currentToolCalls[index].function.name += tcDelta.function.name
              }
              if (tcDelta.function?.arguments) {
                currentToolCalls[index].function.arguments +=
                  tcDelta.function.arguments
              }
            }
          }

          // Track finish reason
          if (chunk.choices[0]?.finish_reason) {
            finishReason = chunk.choices[0].finish_reason
          }

          // Track usage
          if (chunk.usage) {
            totalInputTokens += chunk.usage.prompt_tokens || 0
            totalOutputTokens += chunk.usage.completion_tokens || 0
          }
        }

        // Handle tool calls
        if (currentToolCalls.length > 0 && finishReason === "tool_calls") {
          // Add assistant message with tool calls to history
          conversationHistory.push({
            role: "assistant",
            content: currentContent || null,
            tool_calls: currentToolCalls
          })

          // Send tool call events
          for (const tc of currentToolCalls) {
            const toolName = tc.function.name
            const toolArgs = JSON.parse(tc.function.arguments || "{}")
            const isToolMCP = isMCPTool(toolName, mcpToolNames)
            const needsConfirmation = checkToolRequiresConfirmation(
              toolName,
              isToolMCP
            )

            await sendEvent("tool_start", {
              id: tc.id,
              name: toolName,
              arguments: toolArgs,
              requiresConfirmation: needsConfirmation
            })

            const toolCallRecord = {
              id: tc.id,
              name: toolName,
              arguments: toolArgs,
              status: "pending",
              requiresConfirmation: needsConfirmation,
              isMCP: isToolMCP
            }

            if (needsConfirmation) {
              pendingConfirmations.push(toolCallRecord)

              const pendingContent = JSON.stringify({
                status: "pending_confirmation",
                message: `Action "${toolName}" requires user confirmation.`,
                isMCP: isToolMCP
              })

              conversationHistory.push({
                role: "tool",
                tool_call_id: tc.id,
                content: pendingContent
              })

              // Save tool message for pending confirmation
              await supabase.from("agent_messages").insert([
                {
                  session_id,
                  user_id: user.id,
                  role: "tool",
                  content: pendingContent,
                  tool_call_id: tc.id
                }
              ])

              // Save pending tool execution to database so confirm endpoint can find it
              const { error: execInsertError } = await supabase
                .from("agent_tool_executions")
                .insert([
                  {
                    session_id,
                    user_id: user.id,
                    tool_name: toolName,
                    tool_input: { ...toolArgs, _isMCP: isToolMCP },
                    status: "pending",
                    requires_confirmation: true
                  }
                ])

              if (execInsertError) {
                console.error(
                  "[Agent Stream] Failed to insert pending tool execution:",
                  execInsertError
                )
              } else {
                console.log(
                  "[Agent Stream] Saved pending tool execution for:",
                  toolName,
                  "session:",
                  session_id
                )
              }

              await sendEvent("tool_pending", {
                id: tc.id,
                name: toolName
              })
            } else {
              // Execute the tool
              let result: Record<string, unknown>

              if (isToolMCP && mcpSession) {
                try {
                  console.log(
                    `[Agent Stream] Executing MCP tool: ${toolName}`,
                    toolArgs
                  )
                  const mcpResult = await mcpSession.callTool(
                    toolName,
                    toolArgs
                  )

                  // Parse the MCP result content
                  let resultData = mcpResult.content || mcpResult
                  if (Array.isArray(resultData)) {
                    // Extract text from content array
                    resultData = resultData
                      .map((item: any) => {
                        if (item.type === "text") return item.text
                        return JSON.stringify(item)
                      })
                      .join("\n")
                  }

                  result = {
                    status: "success",
                    source: "pipedream",
                    data: resultData
                  }
                  console.log(
                    `[Agent Stream] MCP tool ${toolName} completed successfully`
                  )
                } catch (mcpError: any) {
                  console.error(
                    `[Agent Stream] MCP tool ${toolName} failed:`,
                    mcpError?.message || mcpError
                  )

                  // Provide helpful error messages
                  let errorMessage =
                    mcpError?.message ||
                    "Failed to execute connected app action"
                  let suggestion = ""

                  // Check for common error patterns
                  if (
                    errorMessage.includes("not found") ||
                    errorMessage.includes("-32602")
                  ) {
                    suggestion =
                      "This tool may require additional setup. Please check your Connected Apps settings to ensure the app is properly authorized."
                  } else if (
                    errorMessage.includes("unauthorized") ||
                    errorMessage.includes("401")
                  ) {
                    suggestion =
                      "The app connection may have expired. Please reconnect the app in your Connected Apps settings."
                  } else if (
                    errorMessage.includes("rate limit") ||
                    errorMessage.includes("429")
                  ) {
                    suggestion =
                      "The service is rate limited. Please try again in a moment."
                  }

                  result = {
                    status: "error",
                    source: "pipedream",
                    message: errorMessage,
                    suggestion:
                      suggestion ||
                      "If the issue persists, try disconnecting and reconnecting the app in Connected Apps settings.",
                    toolName: toolName
                  }
                }
              } else if (isToolMCP && !mcpSession) {
                // Tool was supposed to be MCP but session isn't available
                result = {
                  status: "error",
                  source: "pipedream",
                  message: `The tool "${toolName}" requires a connected app that isn't currently available.`,
                  suggestion:
                    "Please connect the required app in your Connected Apps settings to use this feature."
                }
              } else {
                // Dynamic import to avoid circular deps
                const { executeBuiltinTool } = await import("../route")
                result = await executeBuiltinTool(toolName, toolArgs, {
                  workspaceId: session.workspace_id,
                  userId: user.id
                })
              }

              toolCallRecord.status = "completed"
              ;(toolCallRecord as any).result = result

              const toolResultContent = JSON.stringify(result)

              conversationHistory.push({
                role: "tool",
                tool_call_id: tc.id,
                content: toolResultContent
              })

              // Save tool response message to database
              await supabase.from("agent_messages").insert([
                {
                  session_id,
                  user_id: user.id,
                  role: "tool",
                  content: toolResultContent,
                  tool_call_id: tc.id
                }
              ])

              // Log completed tool execution
              await supabase.from("agent_tool_executions").insert([
                {
                  session_id,
                  user_id: user.id,
                  tool_name: toolName,
                  tool_input: toolArgs,
                  tool_output: result,
                  status: "completed"
                }
              ])

              await sendEvent("tool_complete", {
                id: tc.id,
                name: toolName,
                result
              })
            }

            toolCalls.push(toolCallRecord)
          }

          // If we have pending confirmations, stop
          if (pendingConfirmations.length > 0) {
            continueLoop = false
          }
        } else {
          // No tool calls, we have the final response
          continueLoop = false

          conversationHistory.push({
            role: "assistant",
            content: fullResponse
          })

          // Save to database
          await supabase.from("agent_messages").insert([
            {
              session_id,
              user_id: user.id,
              role: "assistant",
              content: fullResponse,
              tokens_used: totalInputTokens + totalOutputTokens
            }
          ])
        }
      }

      // Update session stats
      await supabase
        .from("agent_sessions")
        .update({
          total_tokens_used:
            session.total_tokens_used + totalInputTokens + totalOutputTokens
        })
        .eq("id", session_id)

      // Track usage
      const currentMonth = new Date().toISOString().slice(0, 7)
      const { data: usage } = await supabase
        .from("agent_usage")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", currentMonth)
        .single()

      if (usage) {
        await supabase
          .from("agent_usage")
          .update({
            total_tokens_input: usage.total_tokens_input + totalInputTokens,
            total_tokens_output: usage.total_tokens_output + totalOutputTokens,
            total_tool_calls: usage.total_tool_calls + toolCalls.length
          })
          .eq("id", usage.id)
      } else {
        await supabase.from("agent_usage").insert([
          {
            user_id: user.id,
            month: currentMonth,
            total_tokens_input: totalInputTokens,
            total_tokens_output: totalOutputTokens,
            total_tool_calls: toolCalls.length,
            total_sessions: 1
          }
        ])
      }

      // Send completion event
      await sendEvent("done", {
        response: fullResponse,
        tool_calls: toolCalls,
        pending_confirmations: pendingConfirmations,
        tokens_used: {
          input: totalInputTokens,
          output: totalOutputTokens,
          total: totalInputTokens + totalOutputTokens
        }
      })

      await writer.close()
    } catch (error: any) {
      console.error("[Agent Stream] Error:", error)
      await sendEvent("error", { message: error.message || "Stream error" })
      await writer.close()
    }
  })()

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  })
}
