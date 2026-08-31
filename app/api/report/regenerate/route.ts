import { NextResponse } from "next/server"
import {
  getAzureOpenAIForDesign,
  getDesignDeployment
} from "@/lib/azure-openai"
import { requireUser } from "@/lib/server/require-user"
import { assertBudget, recordCompletionUsage } from "@/lib/billing/account"
import {
  budgetErrorResponse,
  isBudgetExceededError
} from "@/lib/billing/errors"

const openai = () => getAzureOpenAIForDesign()
const MODEL_NAME = () => getDesignDeployment()

export async function POST(req: Request) {
  try {
    // Auth - the previous version had no gate, so unauthenticated noise
    // was hitting the model directly. Cheap fix and unblocks the more
    // useful error case below.
    const auth = await requireUser()
    if (auth.response) return auth.response

    try {
      await assertBudget(auth.user.id)
    } catch (e) {
      if (isBudgetExceededError(e)) return budgetErrorResponse(e.plan)
    }

    const body = await req.json().catch(() => null)
    const sectionName = body?.sectionName
    const userFeedback = body?.userFeedback
    const currentContent =
      typeof body?.currentContent === "string" ? body.currentContent : ""

    // Empty sections are valid - user might use "Edit with AI" to seed a
    // section that's not generated yet. Only sectionName + userFeedback are
    // truly required.
    if (!sectionName || !userFeedback) {
      return NextResponse.json(
        { error: "Missing required fields: sectionName and userFeedback" },
        { status: 400 }
      )
    }

    const systemPrompt = `You are a meticulous scientific report editor. Improve the given section by applying the user's feedback. IMPORTANT: Format ALL content as bullet points, numbered lists, and short declarative statements. Do NOT write in paragraph form. Use markdown bullet points (- or *) and numbered lists (1., 2., etc.). Group related points under subheadings (### or ####). Use markdown tables for numerical data. Keep the factual, scientific tone. Do not invent data.`

    const currentBlock = currentContent.trim()
      ? `Current Content:\n\n${currentContent}`
      : "Current Content:\n\n(empty - please draft this section based on the feedback)"

    const userPrompt = `Section: ${sectionName}\n\n${currentBlock}\n\nUser Feedback:\n${userFeedback}\n\nRewrite the section to incorporate the feedback while preserving accuracy.`

    // Switched from `getAzureOpenAI()` (the generic chat deployment) to
    // `getAzureOpenAIForDesign()` (the design deployment) - the generic
    // path can hit a model that lacks chat.completions in some Azure
    // resource configs, surfacing as opaque 500s ("commands not taken").
    // The design deployment is the same one used by stats-review /
    // make-plan, which works.
    const completion = await openai().chat.completions.create({
      model: MODEL_NAME(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4096
    })

    await recordCompletionUsage(
      { userId: auth.user.id, feature: "report", model: MODEL_NAME() },
      completion
    )

    const newContent = completion.choices[0]?.message?.content?.trim()

    // If the model returned nothing, signal an explicit failure instead
    // of silently echoing the old content - the previous behavior made
    // "Edit with AI" appear to do nothing.
    if (!newContent) {
      console.warn(
        "[REPORT_REGENERATE] Model returned empty content for section:",
        sectionName
      )
      return NextResponse.json(
        {
          error:
            "AI returned empty content - try a more specific instruction or retry."
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      regeneratedContent: newContent
    })
  } catch (error: any) {
    console.error("[REPORT_REGENERATE_ERROR]", error)
    // Surface OpenAI / Azure error details so the client can show them.
    const detail =
      error?.error?.message ??
      error?.response?.data?.error?.message ??
      error?.message ??
      "Internal error"
    return NextResponse.json(
      { error: detail, code: error?.code ?? error?.status ?? "unknown" },
      { status: error?.status ?? 500 }
    )
  }
}
