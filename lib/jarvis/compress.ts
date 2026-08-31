/**
 * LLM-driven chat-arc compression. Turns the last N turns of a
 * Jarvis conversation into a structured episode the vault can store.
 *
 * Reuses the design Azure OpenAI client + structured-output parse path
 * the rest of the app uses, so we get the same retry behaviour and the
 * zodResponseFormat schema validation for free.
 */

import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"

import {
  getAzureOpenAIForDesign,
  getDesignDeployment
} from "@/lib/azure-openai"

import type { CompressedEpisode } from "./types"
import { clampInt } from "./util"

const ReferenceSchema = z.object({
  kind: z.enum([
    "design",
    "report",
    "paper",
    "project",
    "file",
    "data_collection",
    "chat"
  ]),
  id: z.string(),
  title: z.string()
})

const CompressedEpisodeSchema = z.object({
  title: z.string(),
  summary: z.string(),
  topics: z.array(z.string()),
  intent: z.string(),
  priority: z.number().min(1).max(5),
  tools_used: z.array(z.string()),
  references: z.array(ReferenceSchema),
  breakthrough_quote: z.string()
})

const SYSTEM_PROMPT = `You compress chat arcs between a scientist and Shadow AI's home assistant into structured memories. Each memory will be re-read on a future session so the assistant can pick up where the user left off. Return a JSON object with EXACTLY these fields:

- title: ≤ 8 words, noun phrase. e.g. "Lyo-cycle confirmation for mAb-227".
- summary: 2-4 short paragraphs of plain markdown, past tense. Capture (a) what the user brought, (b) what the assistant did or surfaced, (c) anything they said they'd return to. No bullet lists. No headings beyond H2.
- topics: 2-5 lowercase tags - science topics + project codes ("formulation", "viscosity", "prj-407", "lyophilisation").
- intent: ONE short snake_case label describing the arc's intent ("review_data", "plan_experiment", "draft_report", "answer_question", "vent_blocker", "schedule_task").
- priority: 1-5 integer. 5 = mentioned multiple times / acted on / blocker. 3 = ordinary working chat. 1 = small-talk / ambient.
- tools_used: array of agent tools invoked in the arc (zero or more of: "literature.search", "data.analyse", "vault.recall", "vault.list_recent"). Empty array if nothing ran. Note: the assistant no longer creates designs/reports from chat - those happen in the UI - so "design.start" / "report.start" should never appear here even if older episodes mention them.
- references: array of {kind, id, title} pointing at concrete entities the conversation touched. kind ∈ {design, report, paper, project, file, data_collection, chat}. ONLY include ids you actually saw in the transcript (typically embedded in agent context blocks). Empty array if nothing was referenced.
- breakthrough_quote: ONE short user quote worth remembering (insight, decision, frustration). Empty string when nothing stands out.

Output JSON ONLY. No prose around it. No markdown fences.`

export interface CompressInput {
  /** Linear list of user + assistant turns from the in-memory chat. */
  messages: Array<{ role: "user" | "assistant"; content: string }>
  /** Display name to use for the user in the transcript - falls back to "User". */
  userName?: string
  /** Workspace context so the compressor knows the scope of the arc. */
  workspaceName?: string
}

export async function compressChatArc(
  input: CompressInput
): Promise<CompressedEpisode | null> {
  const turns = input.messages.filter(
    m => m && typeof m.content === "string" && m.content.trim()
  )
  if (turns.length === 0) return null

  const transcript = turns
    .map(
      m =>
        `${m.role === "user" ? (input.userName ?? "User") : "ShadowAI"}: ${m.content.trim()}`
    )
    .join("\n\n")

  const userPrompt = [
    input.workspaceName ? `Workspace: ${input.workspaceName}` : null,
    "Transcript:",
    "",
    transcript
  ]
    .filter(Boolean)
    .join("\n")

  try {
    const openai = getAzureOpenAIForDesign()
    const completion = await openai.beta.chat.completions.parse({
      model: getDesignDeployment(),
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      response_format: zodResponseFormat(
        CompressedEpisodeSchema,
        "compressedEpisode"
      )
    })
    const parsed = completion.choices[0]?.message?.parsed
    if (!parsed) return null
    return {
      title: parsed.title.trim() || "Untitled arc",
      summary: parsed.summary.trim(),
      topics: parsed.topics
        .map(t => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 5),
      intent: parsed.intent.trim() || "chat",
      priority: clampInt(parsed.priority, 1, 5, 3),
      tools_used: parsed.tools_used.map(t => t.trim()).filter(Boolean),
      references: parsed.references.filter(r => r.id && r.title),
      breakthrough_quote: parsed.breakthrough_quote.trim()
    }
  } catch (err: any) {
    console.warn("[jarvis-compress] failed:", err?.message ?? err)
    return null
  }
}
