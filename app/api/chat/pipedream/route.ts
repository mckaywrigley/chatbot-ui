import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"
import {
  MCPSessionManager,
  generateSessionId,
  isPipedreamConfigured
} from "@/lib/pipedream/mcp-session"
import {
  requiresConfirmation,
  getConfirmationMessage
} from "@/lib/pipedream/action-rules"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export const runtime = "nodejs"
export const maxDuration = 120

// Convert MCP tools to OpenAI function format
function convertMCPToolsToOpenAI(
  mcpTools: any[]
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return mcpTools
    .filter(tool => {
      // Filter out configuration tools - we'll handle config in the conversation
      const name = tool.name.toLowerCase()
      return !name.includes("select_apps") && !name.startsWith("configure_")
    })
    .map(tool => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description || `Execute ${tool.name}`,
        parameters: tool.inputSchema || { type: "object", properties: {} }
      }
    }))
}

// Parse MCP tool result into string
function parseToolResult(result: any): string {
  if (!result) return "No result"

  // Handle MCP content array format
  if (result.content && Array.isArray(result.content)) {
    return result.content
      .map((item: any) => {
        if (item.type === "text") return item.text
        return JSON.stringify(item)
      })
      .join("\n")
  }

  if (typeof result === "string") return result
  return JSON.stringify(result, null, 2)
}

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, enabledApps, chatId } = json as {
    chatSettings: ChatSettings
    messages: any[]
    enabledApps: string[]
    chatId?: string
  }

  // Create MCP session for this request
  let mcpSession: MCPSessionManager | null = null

  try {
    const profile = await getServerProfile()
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Get user from auth
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ message: "Not authenticated" }), {
        status: 401
      })
    }

    // Check if Pipedream is configured
    if (!isPipedreamConfigured()) {
      return new Response(
        JSON.stringify({ message: "Pipedream is not configured" }),
        { status: 400 }
      )
    }

    // Check if user has connected apps
    const { data: dataSources } = await supabase
      .from("pipedream_data_sources")
      .select("app_slug, app_name, enabled")
      .eq("user_id", user.id)

    if (!dataSources || dataSources.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No apps connected. Please connect an app first."
        }),
        { status: 400 }
      )
    }

    // Filter to enabled apps (or use provided list)
    const appsToUse =
      enabledApps?.length > 0
        ? enabledApps
        : dataSources.filter(ds => ds.enabled).map(ds => ds.app_slug)

    if (appsToUse.length === 0) {
      return new Response(
        JSON.stringify({ message: "No apps enabled for this chat" }),
        { status: 400 }
      )
    }

    // Create MCP session
    const sessionId = chatId || generateSessionId()
    mcpSession = new MCPSessionManager(user.id, sessionId)

    // Select the apps we want to use
    await mcpSession.selectApps(appsToUse)

    // Get available tools
    const mcpTools = await mcpSession.listTools()

    // Filter out configuration tools and convert to OpenAI format
    const openaiTools = convertMCPToolsToOpenAI(mcpTools)

    if (openaiTools.length === 0) {
      // No executable tools - might need configuration
      // Return a helpful message
      mcpSession.close()
      return new Response(
        JSON.stringify({
          message:
            "The connected apps require configuration. Try asking a specific question about your data."
        }),
        { status: 400 }
      )
    }

    // Build tool descriptions for better AI understanding
    const toolDescriptions = openaiTools
      .slice(0, 15) // Limit to prevent token overflow
      .map(
        t =>
          `- ${t.function.name}: ${t.function.description?.slice(0, 100) || "Execute this action"}`
      )
      .join("\n")

    // Add comprehensive system context about available tools
    const toolContext = `You have access to the following connected apps: ${appsToUse.join(", ")}.

## Available Tools
${toolDescriptions}
${openaiTools.length > 15 ? `\n...and ${openaiTools.length - 15} more tools` : ""}

## Instructions
1. When the user asks about their data (emails, files, calendar, etc.), USE the appropriate tool to fetch real information
2. DO NOT say you can't access their data - you CAN through these tools
3. For Gmail: search for emails, list recent messages, read specific emails
4. For Google Calendar: list events, create events
5. For Google Sheets: read or write spreadsheet data
6. For Google Docs: read document content
7. If a tool returns an error about configuration, explain what additional info is needed

IMPORTANT: Always try to use the tools when the user asks about their connected app data. Never claim you can't access something without first attempting to use the available tools.`

    const messagesWithContext = [
      { role: "system", content: toolContext },
      ...messages
    ]

    const openai = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id
    })

    // First completion to determine tool calls
    const firstResponse = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: messagesWithContext,
      tools: openaiTools,
      tool_choice: "auto"
    })

    const message = firstResponse.choices[0].message
    const toolCalls = message.tool_calls || []

    // If no tool calls, return the message directly as stream
    if (toolCalls.length === 0) {
      mcpSession.close()

      // Stream the response
      const streamResponse = await openai.chat.completions.create({
        model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
        messages: messagesWithContext,
        stream: true
      })

      const stream = OpenAIStream(streamResponse as any)
      return new StreamingTextResponse(stream)
    }

    // Process tool calls
    const toolMessages: any[] = [message]
    const pendingConfirmations: Array<{
      id: string
      toolName: string
      appName?: string
      message: string
      arguments: Record<string, any>
    }> = []

    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name
      let args: Record<string, any> = {}

      try {
        args = JSON.parse(toolCall.function.arguments || "{}")
      } catch (e) {
        console.error(
          `[Pipedream Chat] Failed to parse args for ${functionName}`
        )
      }

      // Check if this action requires confirmation
      if (requiresConfirmation(functionName)) {
        const appName = appsToUse.find(app =>
          functionName
            .toLowerCase()
            .includes(app.toLowerCase().replace("_", ""))
        )

        pendingConfirmations.push({
          id: toolCall.id,
          toolName: functionName,
          appName,
          message: getConfirmationMessage(functionName, appName),
          arguments: args
        })

        // Add a placeholder response
        toolMessages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify({
            status: "pending_confirmation",
            message: "This action requires your confirmation before execution.",
            action: functionName,
            details: args
          })
        })
      } else {
        // Execute the tool directly
        try {
          const result = await mcpSession.callTool(functionName, args)

          const parsedResult = parseToolResult(result)

          // Check if the result indicates configuration is needed
          if (
            parsedResult.includes("configuration mode") ||
            parsedResult.includes("configure_props")
          ) {
            toolMessages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              content: JSON.stringify({
                status: "needs_configuration",
                message:
                  "This tool requires additional configuration. Please specify which resource you want to access.",
                hint: "Ask the user to specify the exact document, spreadsheet, or resource name."
              })
            })
          } else {
            toolMessages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              content: parsedResult
            })
          }
        } catch (error) {
          console.error(`[Pipedream Chat] Tool execution error:`, error)
          toolMessages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to execute tool",
              suggestion:
                "Try rephrasing your request or specifying more details."
            })
          })
        }
      }
    }

    // Build final messages array
    const finalMessages = [...messagesWithContext, ...toolMessages]

    // If there are pending confirmations, include them in response headers
    const responseHeaders: Record<string, string> = {}
    if (pendingConfirmations.length > 0) {
      responseHeaders["X-Pipedream-Confirmations"] =
        JSON.stringify(pendingConfirmations)
    }

    // Final response after tool execution
    const secondResponse = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: finalMessages,
      stream: true
    })

    // Close MCP session after streaming completes
    const stream = OpenAIStream(secondResponse as any, {
      onFinal: () => {
        if (mcpSession) {
          mcpSession.close()
        }
      }
    })

    return new StreamingTextResponse(stream, { headers: responseHeaders })
  } catch (error: any) {
    console.error("[Pipedream Chat] Error:", error)

    // Clean up MCP session on error
    if (mcpSession) {
      mcpSession.close()
    }

    const errorMessage = error.message || "An unexpected error occurred"
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: 500
    })
  }
}
