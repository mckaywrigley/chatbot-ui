/**
 * Streaming chat endpoint for the dashboard Jarvis-style assistant.
 *
 * Flow per request:
 *   1. Auth + load profile.
 *   2. Pull memory (top-3 recent + top-3 semantic match) + live
 *      cross-workspace snapshot (Supabase + Firestore counts).
 *      Both layers are best-effort - vault / snapshot errors degrade
 *      to "less context" rather than 500ing.
 *   3. Run the model in a tool-calling loop. The model can invoke
 *      literature.search / data.analyse / vault.recall /
 *      vault.list_recent. Design + report creation are intentionally
 *      NOT chat-driven - those happen in the /designs and /reports
 *      UI surfaces (see persona block below). Tool envelopes are
 *      streamed back to the client as out-of-band JSON lines
 *      (prefixed by a magic header) so the chat UI can render action
 *      chips inline.
 *   4. Stream final assistant text token-by-token.
 *
 * The wire protocol is a plain text stream with two kinds of frames:
 *  - text chunks: raw assistant tokens.
 *  - JSON envelopes: `\x1fJ{"type":"tool_action", ...}\n` - the client
 *    splits on \x1fJ to peel actions out from the streamed prose. The
 *    \x1f (Unit Separator) byte is invisible + can't legitimately
 *    appear in LLM output, so this is a safe demux marker.
 */

import { cookies } from "next/headers"
import { NextRequest } from "next/server"
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall
} from "openai/resources/chat/completions"

import {
  getAzureOpenAIForDesign,
  getDesignDeployment
} from "@/lib/azure-openai"
import { jarvisVault } from "@/lib/jarvis/vault"
import {
  loadCrossWorkspaceSnapshot,
  renderSnapshotForPrompt,
  type CrossWorkspaceSnapshot
} from "@/lib/jarvis/snapshot"
import {
  JARVIS_TOOLS,
  executeJarvisTool,
  type JarvisToolName
} from "@/lib/jarvis/tools"
import type { Episode } from "@/lib/jarvis/types"
import { createClient } from "@/lib/supabase/server"
import { assertBudget, recordUsage } from "@/lib/billing/account"
import {
  budgetErrorResponse,
  isBudgetExceededError
} from "@/lib/billing/errors"

export const runtime = "nodejs"

interface ChatRequestBody {
  message: string
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>
  workspaceId?: string | null
  workspaceName?: string | null
  projectId?: string | null
  locale?: string
}

const ACTION_DEMUX_MARKER = "J" // Unit Separator + "J" for "JSON".

export async function POST(req: NextRequest) {
  const supabase = createClient(cookies())
  const {
    data: { session }
  } = await supabase.auth.getSession()
  if (!session) {
    return new Response("unauthorized", { status: 401 })
  }

  try {
    await assertBudget(session.user.id)
  } catch (e) {
    if (isBudgetExceededError(e)) return budgetErrorResponse(e.plan)
  }

  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
  } catch {
    return new Response("invalid json", { status: 400 })
  }

  const userMessage = (body.message ?? "").trim()
  if (!userMessage) {
    return new Response("empty message", { status: 400 })
  }
  const chatHistory = (body.chatHistory ?? []).filter(
    m => m && typeof m.content === "string" && m.content.trim()
  )

  // ── Memory + snapshot in parallel ──────────────────────────────────
  let memoryEpisodes: Episode[] = []
  let snapshot: CrossWorkspaceSnapshot = {
    workspaces: [],
    totals: { workspaces: 0, designs: 0, reports: 0, chats: 0, papers: 0 },
    recentDesigns: [],
    recentReports: [],
    activeWorkspaceId: null,
    activeWorkspaceName: null
  }
  try {
    const [recent, relevant, snap] = await Promise.all([
      jarvisVault.listRecentEpisodes(session.user.id, 3),
      jarvisVault.searchEpisodes(session.user.id, userMessage, 3),
      loadCrossWorkspaceSnapshot(supabase, session.user.id, body.workspaceId)
    ])
    snapshot = snap
    const seen = new Set<string>()
    for (const ep of [...recent, ...relevant]) {
      if (seen.has(ep.slug)) continue
      seen.add(ep.slug)
      memoryEpisodes.push(ep)
      if (memoryEpisodes.length >= 5) break
    }
  } catch (e: any) {
    console.warn("[jarvis-chat] memory/snapshot fetch failed:", e?.message ?? e)
  }

  const turnNum = Math.floor(chatHistory.length / 2) + 1
  const systemPrompt = buildSystemPrompt({
    memoryEpisodes,
    snapshot,
    turnNum,
    workspaceName: body.workspaceName ?? snapshot.activeWorkspaceName ?? null
  })

  console.log(
    `[jarvis-chat] uid=${session.user.id} memory_episodes=${memoryEpisodes.length} workspaces=${snapshot.totals.workspaces} turn=${turnNum}`
  )

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...(chatHistory.map(m => ({
      role: m.role,
      content: m.content
    })) as ChatCompletionMessageParam[]),
    { role: "user", content: userMessage }
  ]

  const openai = getAzureOpenAIForDesign()
  const deployment = getDesignDeployment()
  const locale = body.locale ?? "en"

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Token usage accumulates across all tool-loop rounds (stream_options
      // emits a final usage chunk per round); flushed once at the end.
      let usagePrompt = 0
      let usageCompletion = 0
      let usageTotal = 0
      try {
        // Tool-calling loop. Cap at 3 rounds so a runaway model can't
        // pin the connection - 3 is enough for ("plan → run tool →
        // read tool → final answer") arcs and well past the typical
        // "just answer" path which exits on the first round.
        const MAX_TOOL_ROUNDS = 3
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const completion = await openai.chat.completions.create({
            model: deployment,
            temperature: 0.6,
            stream: true,
            stream_options: { include_usage: true },
            messages,
            tools: JARVIS_TOOLS,
            tool_choice: "auto"
          })

          // We stream prose tokens through immediately. Tool calls are
          // accumulated into a buffer and only executed once the
          // assistant message finishes (signalled by `finish_reason`).
          let accumulatedText = ""
          const toolCalls = new Map<
            number,
            {
              id?: string
              name?: string
              argsText: string
            }
          >()
          let finishReason: string | null = null

          for await (const chunk of completion) {
            // include_usage emits a final choices-less chunk carrying usage.
            const u = (
              chunk as {
                usage?: {
                  prompt_tokens?: number
                  completion_tokens?: number
                  total_tokens?: number
                } | null
              }
            ).usage
            if (u) {
              usagePrompt += u.prompt_tokens || 0
              usageCompletion += u.completion_tokens || 0
              usageTotal += u.total_tokens || 0
            }

            const choice = chunk.choices[0]
            if (!choice) continue

            const delta = choice.delta
            if (delta?.content) {
              accumulatedText += delta.content
              controller.enqueue(encoder.encode(delta.content))
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0
                const acc = toolCalls.get(idx) ?? { argsText: "" }
                if (tc.id) acc.id = tc.id
                if (tc.function?.name) acc.name = tc.function.name
                if (tc.function?.arguments)
                  acc.argsText += tc.function.arguments
                toolCalls.set(idx, acc)
              }
            }
            if (choice.finish_reason) {
              finishReason = choice.finish_reason
            }
          }

          // No tool calls (or finish was "stop") → we're done.
          if (finishReason !== "tool_calls" || toolCalls.size === 0) {
            break
          }

          // Replay the assistant turn (with tool_calls) so the next
          // round has the right history, then execute each call.
          const assistantToolCalls: ChatCompletionMessageToolCall[] =
            Array.from(toolCalls.values())
              .filter(t => t.id && t.name)
              .map(t => ({
                id: t.id!,
                type: "function" as const,
                function: { name: t.name!, arguments: t.argsText || "{}" }
              }))

          messages.push({
            role: "assistant",
            content: accumulatedText || null,
            tool_calls: assistantToolCalls
          })

          for (const call of assistantToolCalls) {
            let parsedArgs: Record<string, unknown> = {}
            try {
              parsedArgs = JSON.parse(
                call.function.arguments || "{}"
              ) as Record<string, unknown>
            } catch {
              parsedArgs = {}
            }
            const result = await executeJarvisTool(
              call.function.name as JarvisToolName,
              parsedArgs,
              {
                userId: session.user.id,
                locale,
                workspaceId: snapshot.activeWorkspaceId,
                workspaceName: snapshot.activeWorkspaceName,
                snapshot
              }
            )

            // Surface the action chip to the client out-of-band so the
            // UI can render it inline above the rest of the answer.
            if (result.action) {
              const { type: actionType, ...restAction } = result.action
              const envelope = JSON.stringify({
                kind: "tool_action",
                tool: call.function.name,
                type: actionType,
                ...restAction
              })
              controller.enqueue(
                encoder.encode(`${ACTION_DEMUX_MARKER}${envelope}\n`)
              )
            }

            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: result.message
            })
          }
          // Loop again - the model now has the tool result and can
          // either call more tools or produce the final answer.
        }
      } catch (e: any) {
        console.warn("[jarvis-chat] stream aborted:", e?.message ?? e)
        const errorEnvelope = JSON.stringify({
          type: "error",
          message:
            "Sorry, something went wrong on my side. Please try again in a moment."
        })
        controller.enqueue(
          encoder.encode(`${ACTION_DEMUX_MARKER}${errorEnvelope}\n`)
        )
      } finally {
        if (usageTotal > 0) {
          await recordUsage({
            userId: session.user.id,
            feature: "jarvis",
            promptTokens: usagePrompt,
            completionTokens: usageCompletion,
            totalTokens: usageTotal,
            model: deployment
          })
        }
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  })
}

// ────────────────────────────────────────────────────────────────────

function buildSystemPrompt(opts: {
  memoryEpisodes: Episode[]
  snapshot: CrossWorkspaceSnapshot
  turnNum: number
  workspaceName: string | null
}): string {
  const { memoryEpisodes, snapshot, turnNum, workspaceName } = opts

  const persona = [
    "You are ShadowAI's home assistant - the user's research co-pilot on the workspace dashboard.",
    "Tone: warm, direct, scientist-to-scientist. Match the user's domain vocabulary. No marketing language, no emoji.",
    "Tools you CAN call: literature.search (semantic paper search), data.analyse (open a dataset), vault.recall + vault.list_recent (read your compressed memory of this user).",
    "Tools you do NOT have: starting a new experiment design or drafting a new report. Those flows live in the dedicated UI surfaces, not chat. If the user asks to 'design an experiment', 'start a DOE', 'draft a report', or anything that creates a new design or report, DO NOT try to do it in chat. Instead, point them to the right page: for a new design tell them to open the Designs page and click + New design (link: /designs); for a new report tell them to open the Reports page and click + New report (link: /reports). One short sentence is enough. After that you can keep helping them think through the problem in chat - hypotheses, prior art, statistics, blockers - but the creation step itself happens in the UI.",
    "Your answers are short by default - one or two paragraphs. Expand when the user asks. Use bullet lists only when listing 3+ items.",
    "If you don't know something or it isn't in your memory or the live snapshot, say so. Never fabricate a paper, design, or finding."
  ].join("\n\n")

  const liveBlock = `\n\n${renderSnapshotForPrompt(snapshot)}`

  const memoryBlock =
    memoryEpisodes.length === 0
      ? ""
      : `\n\nMEMORY - what you remember about this user from past sessions:\n${memoryEpisodes
          .map(ep => {
            const fm = ep.frontmatter
            const when = ep.createdAt.toISOString().slice(0, 10)
            const topics = fm.topics.join(", ") || "-"
            const excerpt = ep.body.slice(0, 500).replace(/\n+/g, " ").trim()
            let block =
              `\n- ${when} · ${fm.title} ` +
              `(intent: ${fm.intent} · topics: ${topics} · priority: ${fm.priority})\n` +
              `  ${excerpt}`
            if (fm.breakthrough_quote) {
              block += `\n  They said: "${fm.breakthrough_quote}"`
            }
            if (fm.references.length) {
              block += `\n  Referenced: ${fm.references
                .map(r => `${r.kind}:${r.title}`)
                .slice(0, 5)
                .join("; ")}`
            }
            return block
          })
          .join(
            ""
          )}\n\nUse this memory naturally - never quote it back at them or list facts. Let it shape what you notice and what you skip. Call vault.recall when the user references something not in this block.`

  const turnBlock =
    turnNum === 1
      ? `\n\nThis is the FIRST turn of the session${workspaceName ? ` in workspace "${workspaceName}"` : ""}. A short greeting is fine; lead with what they asked about, not pleasantries.`
      : `\n\nConversation position: turn ${turnNum} of this session. Do NOT open with a greeting - you already greeted them.`

  return persona + liveBlock + memoryBlock + turnBlock
}
