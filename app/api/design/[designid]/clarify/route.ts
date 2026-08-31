import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

// The clarify call is a gpt-5.5 reasoning request (~12s). Without this the route
// inherits the short default function timeout and gets killed mid-call, so the
// Refine step silently falls through to literature. Mirrors the other LLM
// routes in vercel.json.
export const maxDuration = 120
import { adminDb } from "@/lib/firebase/admin"
import { evaluateAccess, getPermissionForUser } from "@/lib/design/sharing"
import {
  generateClarifyingQuestions,
  type ClarifyCheckpoint
} from "@/lib/design/clarify"
import type {
  ClarifyAnswer,
  DesignContentV2,
  ProblemContext
} from "@/lib/design-agent"
import { assertBudget, recordUsage } from "@/lib/billing/account"
import {
  budgetErrorResponse,
  isBudgetExceededError,
  BudgetExceededError
} from "@/lib/billing/errors"

/**
 * POST /api/design/[designid]/clarify
 *
 * Generates the next batch of "Refine" clarifying questions for a checkpoint.
 * Body: { checkpoint: "problem" | "hypothesis" | "design",
 *         priorAnswers?: ClarifyAnswer[],
 *         round?: number }. The client enforces the round/total caps; here we
 *         just produce questions (or done:true) from the stored design context.
 */
export async function POST(
  request: Request,
  { params }: { params: { designid: string } }
) {
  try {
    const designId = params.designid
    if (!designId || designId === "undefined" || designId === "null") {
      return NextResponse.json({ error: "Invalid design ID" }, { status: 400 })
    }

    const supabase = createClient(cookies())
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const designDoc = await adminDb.collection("designs").doc(designId).get()
    if (!designDoc.exists) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 })
    }
    const design = { id: designDoc.id, ...designDoc.data() } as any
    const permission = await getPermissionForUser(
      designId,
      user.id,
      user.email ?? null
    )
    const access = evaluateAccess(design, user.id, permission)
    if (!access.canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
      await assertBudget(user.id)
    } catch (e) {
      if (isBudgetExceededError(e)) {
        return budgetErrorResponse(
          e instanceof BudgetExceededError ? e.plan : "free"
        )
      }
      throw e
    }

    const body = (await request.json().catch(() => null)) as {
      checkpoint?: ClarifyCheckpoint
      priorAnswers?: ClarifyAnswer[]
      round?: number
    } | null
    const checkpoint = body?.checkpoint
    if (
      checkpoint !== "problem" &&
      checkpoint !== "hypothesis" &&
      checkpoint !== "design"
    ) {
      return NextResponse.json(
        { error: "checkpoint must be 'problem', 'hypothesis', or 'design'" },
        { status: 400 }
      )
    }

    let content: DesignContentV2 | null = null
    try {
      content =
        typeof design.content === "string"
          ? (JSON.parse(design.content) as DesignContentV2)
          : (design.content as DesignContentV2)
    } catch {
      content = null
    }
    const ctx: ProblemContext = content?.problem ?? {
      title: design.name,
      problemStatement: design.description
    }

    const hypothesis =
      checkpoint === "design"
        ? (content?.hypotheses ?? [])
            .filter(h => h.selected)
            .map(h => h.text)
            .join("; ") || undefined
        : undefined
    // Literature context:
    //  • design checkpoint   → the synthesised "what others have done" summary
    //  • hypothesis checkpoint → the papers the user actually SELECTED, so the
    //    questions probe how the hypothesis should build on / challenge them
    const literature =
      checkpoint === "design"
        ? content?.literatureContext?.whatOthersHaveDone?.slice(0, 1200) ||
          undefined
        : checkpoint === "hypothesis"
          ? (content?.papers ?? [])
              .filter(p => p.selected)
              .slice(0, 8)
              .map(
                p =>
                  `- ${p.title}${p.year ? ` (${p.year})` : ""}: ${(p.summary || "").slice(0, 220)}`
              )
              .join("\n")
              .slice(0, 1600) || undefined
          : undefined

    const result = await generateClarifyingQuestions({
      checkpoint,
      ctx,
      hypothesis,
      literature,
      priorAnswers: body?.priorAnswers,
      round: body?.round ?? 1
    })

    // Best-effort metering - small structured call.
    void recordUsage({
      userId: user.id,
      feature: "design",
      totalTokens: 2000,
      model: "design"
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("❌ [DESIGN_API] clarify failed:", error)
    return NextResponse.json(
      { error: "Failed to generate questions." },
      { status: 500 }
    )
  }
}
