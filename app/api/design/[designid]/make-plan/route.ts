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
 * Generates a timed, role-assigned execution plan for a single generated
 * design inside this design document. Used by the "Make a plan" action in
 * the design detail page.
 *
 * Contract:
 *   POST /api/design/:designid/make-plan
 *   Body: { generatedDesignId: string }
 *   Response: { executionPlan: string }
 *
 * The client injects the result as an "Execution Plan" section via the
 * existing section-edit path (handleEditSection), so persistence + rollback
 * flow through a single well-tested write path.
 */

const planSchema = z.object({
  executionPlan: z.string()
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
    // Owner OR an invited editor (collaborator) may generate an execution plan.
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

    const problem = content.problem ?? {}
    const hypothesis = (content.hypotheses ?? []).find(
      (h: any) => h?.id === target.hypothesisId
    )

    const problemBlock = `Research problem: ${[
      problem.title,
      problem.problemStatement
    ]
      .filter(Boolean)
      .join(
        " - "
      )}\nGoal: ${problem.goal || problem.objective || "Not specified"}`
    const hypBlock = hypothesis
      ? `Hypothesis: ${hypothesis.text}\nExplanation: ${hypothesis.reasoning ?? ""}`
      : `Hypothesis: ${target.title ?? ""}`

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
          content: `You are an experiment program manager. Given a fully-written experimental design, produce a concrete execution plan a lab team can follow on a calendar.

Return JSON with a single field \`executionPlan\` (Markdown). The plan MUST include:

1. **Kick-off checklist** - bulleted pre-flight items (materials procurement lead time, instrument booking, training confirmations, ethics / biosafety approvals). Each item: \`**Item** - owner - lead time - status gate\`.

2. **Daily schedule table** - Markdown table:
   \`| Day | Phase | Activity | Owner role | Est. hours | Dependencies | Checkpoint |\`
   One row per working day (or half-day when useful). Days are numbered from Day 0 = kick-off. Owner role is a role title ("Formulation scientist", "QC analyst", "Biosafety officer") - do NOT invent people names. The Checkpoint column states the verifiable pass/fail signal the operator must record before continuing.

3. **Critical path** - a short numbered list naming the 3–5 bottleneck items that, if slipped by a day, slip the whole study. For each: why it's critical, a mitigation, and the fallback.

4. **Risk register** - Markdown table:
   \`| Risk | Likelihood (L/M/H) | Impact (L/M/H) | Trigger signal | Mitigation / contingency |\`
   Cover technical (instrument downtime, contamination, reagent lot drift), operational (staff absence, scheduling), regulatory (approval delays). 5–8 rows.

5. **Deliverables checklist** - end-of-study artifacts the owner will ship (raw data dump, notebook entries, processed datasets, the stats-ready CSV, the report draft). Bullet list with \`**Deliverable** - format - recipient - due day\`.

Be concrete: quote specific activity names, checkpoints, and read-outs from the provided sections (e.g. SEC-HPLC, DLS, pH readings). Pull dates from the existing Timeline section when present; otherwise build a plausible schedule consistent with the Step-by-Step Procedure.`
        },
        {
          role: "user",
          content: `${problemBlock}\n\n${hypBlock}\n\nCurrent experiment design sections:\n\n${sectionsBlob}\n\nProduce the execution plan per the format above.`
        }
      ],
      response_format: zodResponseFormat(planSchema, "executionPlan")
    })

    await recordCompletionUsage(
      { userId: user.id, feature: "design", model },
      completion
    )

    const parsed = completion.choices[0]?.message?.parsed
    if (!parsed?.executionPlan) {
      return NextResponse.json(
        { error: "Agent returned empty execution plan" },
        { status: 502 }
      )
    }

    return NextResponse.json({ executionPlan: parsed.executionPlan })
  } catch (error: any) {
    console.error("[MAKE_PLAN] Error:", error)
    return NextResponse.json(
      { error: error?.message ?? "Internal error" },
      { status: 500 }
    )
  }
}
