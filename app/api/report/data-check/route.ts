import { NextResponse } from "next/server"
import {
  getAzureOpenAIForDesign,
  getDesignDeployment
} from "@/lib/azure-openai"
import { resolveSupabaseFilesToText } from "@/lib/report/file-content"
import { requireUser } from "@/lib/server/require-user"
import { assertBudget, recordCompletionUsage } from "@/lib/billing/account"
import {
  budgetErrorResponse,
  isBudgetExceededError
} from "@/lib/billing/errors"

const openai = () => getAzureOpenAIForDesign()
const MODEL_NAME = () => getDesignDeployment()

/**
 * Data-completeness gate for design → report generation.
 *
 * Given the parent design's intended measurements (measuredOutcomes /
 * summary) and the data files the user uploaded, decide whether the data
 * covers what the experiment set out to produce. The Generate-report modal
 * calls this before generation and blocks with the user-facing warning
 * ("I do not have the complete data set to generate a report") when the
 * model reports the dataset is incomplete.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response

    try {
      await assertBudget(auth.user.id)
    } catch (e) {
      if (isBudgetExceededError(e)) return budgetErrorResponse(e.plan)
    }

    const body = (await req.json().catch(() => null)) as {
      objective?: string
      measuredOutcomes?: string
      designSummary?: string
      dataFiles?: string[]
    } | null

    const dataFileIds = Array.isArray(body?.dataFiles) ? body!.dataFiles : []
    if (dataFileIds.length === 0) {
      return NextResponse.json({
        complete: false,
        missing: ["No data files were uploaded."],
        reason: "At least one data file is required to generate a report."
      })
    }

    // Resolve the uploaded data files to text so the model can judge what
    // measurements they actually contain (same resolver the generator uses).
    const resolved = await resolveSupabaseFilesToText(dataFileIds, {
      maxCharsPerFile: 20_000
    })
    const dataText = resolved
      .map(r => r.content || "")
      .filter(Boolean)
      .join("\n\n---\n\n")

    if (!dataText.trim()) {
      return NextResponse.json({
        complete: false,
        missing: ["Uploaded data files could not be read or are empty."],
        reason:
          "The uploaded files contained no readable data for the report agents to analyse."
      })
    }

    const systemPrompt = `You are a scientific data-completeness checker. Given an experiment's intended measurements and the data the scientist uploaded, decide whether the data is sufficient to write up the experiment's results.

Be pragmatic, not pedantic: the data is "complete" if it plausibly contains the key measured outcomes/readouts the experiment set out to produce. Only mark it incomplete when a clearly-required measurement is entirely absent from the uploaded data.

Respond with STRICT JSON only, no prose, in this shape:
{"complete": boolean, "missing": string[], "reason": string}
- "missing": short names of required measurements/data not found in the uploads (empty array when complete).
- "reason": one sentence explaining the decision.`

    const userPrompt = `## Experiment objective / intended measurements\n${
      body?.measuredOutcomes?.trim() ||
      body?.objective?.trim() ||
      "(not specified)"
    }\n\n## Design summary\n${(body?.designSummary || "").slice(0, 8000) || "(not provided)"}\n\n## Uploaded data files (extracted text)\n${dataText.slice(0, 24_000)}`

    const completion = await openai().chat.completions.create({
      model: MODEL_NAME(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0,
      max_tokens: 600,
      response_format: { type: "json_object" }
    })

    await recordCompletionUsage(
      { userId: auth.user.id, feature: "report", model: MODEL_NAME() },
      completion
    )

    const raw = completion.choices[0]?.message?.content?.trim() || "{}"
    let parsed: { complete?: boolean; missing?: unknown; reason?: unknown }
    try {
      parsed = JSON.parse(raw)
    } catch {
      // If the model didn't return valid JSON, fail open so a parsing hiccup
      // never blocks a legitimate report.
      console.warn("[REPORT_DATA_CHECK] Non-JSON model response:", raw)
      return NextResponse.json({ complete: true, missing: [], reason: "" })
    }

    const missing = Array.isArray(parsed.missing)
      ? parsed.missing.filter((m): m is string => typeof m === "string")
      : []

    return NextResponse.json({
      complete: parsed.complete !== false && missing.length === 0,
      missing,
      reason: typeof parsed.reason === "string" ? parsed.reason : ""
    })
  } catch (error: any) {
    console.error("[REPORT_DATA_CHECK_ERROR]", error)
    // Fail open: a checker outage should not stop the user generating.
    return NextResponse.json({ complete: true, missing: [], reason: "" })
  }
}
