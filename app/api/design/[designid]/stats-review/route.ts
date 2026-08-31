import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"

import {
  getAzureOpenAIForDesign,
  getDesignDeployment
} from "@/lib/azure-openai"
import { adminDb } from "@/lib/firebase/admin"
import { createClient } from "@/lib/supabase/server"
import { evaluateAccess, getPermissionForUser } from "@/lib/design/sharing"
import { assertBudget, recordCompletionUsage } from "@/lib/billing/account"
import {
  budgetErrorResponse,
  isBudgetExceededError
} from "@/lib/billing/errors"

/**
 * Re-runs just the statistical-analysis portion of the phase-4 agent for
 * a single generated design in this design document. Used by the "Check
 * design statistically" action in the design detail page.
 *
 * Contract:
 *   POST /api/design/:designid/stats-review
 *   Body: { generatedDesignId: string }
 *   Response: { statisticalAnalysis: string }
 *
 * The client is responsible for updating the Statistical Analysis section
 * via the existing section-edit path so the persisted content and UI state
 * stay in sync.
 */

const statsSchema = z.object({
  statisticalAnalysis: z.string()
})

export async function POST(
  request: Request,
  { params }: { params: { designid: string } }
) {
  try {
    const designId = params.designid
    if (!designId || designId === "undefined" || designId === "null") {
      return NextResponse.json({ error: "Invalid design ID" }, { status: 400 })
    }

    // Auth - design belongs to the requesting user.
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await assertBudget(user.id)
    } catch (e) {
      if (isBudgetExceededError(e)) return budgetErrorResponse(e.plan)
    }

    const body = (await request.json().catch(() => ({}))) as {
      generatedDesignId?: string
    }
    const generatedDesignId = body.generatedDesignId
    if (!generatedDesignId) {
      return NextResponse.json(
        { error: "Missing generatedDesignId" },
        { status: 400 }
      )
    }

    const doc = await adminDb.collection("designs").doc(designId).get()
    if (!doc.exists) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 })
    }
    const designData = doc.data() as any
    // Owner OR an invited editor (collaborator) may re-run the stats review.
    const permission = await getPermissionForUser(
      designId,
      user.id,
      user.email ?? null
    )
    if (
      designData.user_id &&
      !evaluateAccess(designData, user.id, permission).canEdit
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const content =
      typeof designData.content === "string"
        ? JSON.parse(designData.content || "{}")
        : (designData.content ?? {})

    const designs = Array.isArray(content.designs) ? content.designs : []
    const target = designs.find((d: any) => d?.id === generatedDesignId)
    if (!target) {
      return NextResponse.json(
        { error: "Generated design not found inside this design document" },
        { status: 404 }
      )
    }

    // Rebuild the context blocks the phase-4 prompt expects.
    const problem = content.problem ?? {}
    const problemBlock = `Research problem: ${[
      problem.title,
      problem.problemStatement
    ]
      .filter(Boolean)
      .join(
        " - "
      )}\nGoal: ${problem.goal || problem.objective || "Not specified"}`

    const hypothesis = (content.hypotheses ?? []).find(
      (h: any) => h?.id === target.hypothesisId
    )
    const hypBlock = hypothesis
      ? `Hypothesis: ${hypothesis.text}\nExplanation: ${hypothesis.reasoning ?? ""}`
      : `Hypothesis: ${target.title ?? ""}`

    // Concatenate the existing design sections so the stats agent has the
    // full procedural context it needs to size the plan correctly.
    const sectionsBlob = (target.sections ?? [])
      .map((s: any) => `### ${s.heading}\n${s.body}`)
      .join("\n\n")

    const openai = getAzureOpenAIForDesign()
    const model = getDesignDeployment()

    const completion = await openai.beta.chat.completions.parse({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `You are a statistical reviewer. Given an experimental design that's already written out, produce ONLY a dedicated Statistical Analysis plan. Do not rewrite the rest of the protocol.

Return JSON with a single field \`statisticalAnalysis\` (Markdown). Use bolded lead-in labels and bullets. Cover:
- **Primary endpoint & test** - specific named test (e.g. two-way ANOVA + Tukey HSD, mixed-effects model, Mann–Whitney), justified vs the data type and replicate structure from the conditions table.
- **Sample size / power** - assumed effect size, variance, target power (0.8), alpha (0.05), computed n per group. Show a short power calculation.
- **Secondary endpoints** - list and their tests.
- **Multiple comparisons** - correction method (Bonferroni / BH-FDR / Tukey).
- **Outlier / missing-data handling** - named rule (e.g. Grubbs, ROUT, pre-registered exclusion).
- **Software** - concrete tools / packages (GraphPad Prism, R + lme4, Python + scipy.stats / statsmodels).
- **Pass/fail decision criteria** - what numeric result supports vs rejects the hypothesis.

Be concrete; refer back to specific groups and replicate counts visible in the provided sections.`
        },
        {
          role: "user",
          content: `${problemBlock}\n\n${hypBlock}\n\nCurrent experiment design sections:\n\n${sectionsBlob}\n\nProduce the Statistical Analysis plan.`
        }
      ],
      response_format: zodResponseFormat(statsSchema, "statsReview")
    })

    await recordCompletionUsage(
      { userId: user.id, feature: "design", model },
      completion
    )

    const parsed = completion.choices[0]?.message?.parsed
    if (!parsed?.statisticalAnalysis) {
      return NextResponse.json(
        { error: "Agent returned empty statistical analysis" },
        { status: 502 }
      )
    }

    return NextResponse.json({
      statisticalAnalysis: parsed.statisticalAnalysis
    })
  } catch (error: any) {
    console.error("[STATS_REVIEW] Error:", error)
    return NextResponse.json(
      { error: error?.message ?? "Internal error" },
      { status: 500 }
    )
  }
}
