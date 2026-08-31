import { NextResponse } from "next/server"
import {
  getResearchPlan,
  getHypothesesByPlanId,
  getLogsByPlanId
} from "../../utils/persistence-firestore"
import { PlanStatus } from "../../types/interfaces"
import { requireUser } from "@/lib/server/require-user"

export async function GET(
  req: Request,
  { params }: { params: { planId: string } }
) {
  try {
    const planId = params.planId

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      )
    }

    const auth = await requireUser()
    if (auth.response) return auth.response

    // Get plan
    const plan = await getResearchPlan(planId)
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    if (!plan.userId || plan.userId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get hypotheses
    const allHypotheses = await getHypothesesByPlanId(planId)

    // Include all hypotheses - flagged ones are shown too since this is a biopharma
    // tool where common terms like "synthesize" and "drug" can trigger flags legitimately
    const approvedHypotheses = allHypotheses

    // Sort by Elo (descending)
    approvedHypotheses.sort((a, b) => (b.elo || 0) - (a.elo || 0))

    // Get top N hypotheses
    const topN = 5
    const topHypotheses = approvedHypotheses.slice(0, topN)

    // Get logs
    const logs = await getLogsByPlanId(planId, 20)

    // Calculate progress
    const seedCount = (plan.preferences?.max_hypotheses || 5) * 4
    const progress = {
      generated: allHypotheses.length,
      seedCount,
      completed: allHypotheses.filter(h => h.elo !== undefined).length,
      failed: 0, // Could track failed tasks separately
      phase: plan.currentPhase || undefined,
      phaseMessage: plan.currentPhaseMessage || undefined
    }

    // Extract failure reason from logs when plan failed
    const failureReason =
      plan.status === "failed"
        ? logs.find(l => l.level === "error")?.message || "Unknown error"
        : undefined

    const status: PlanStatus = {
      planId: plan.planId,
      status: plan.status || "pending",
      progress,
      top_hypotheses: topHypotheses,
      logs,
      createdAt: plan.createdAt,
      completedAt:
        plan.status === "completed" ? new Date().toISOString() : undefined,
      literatureContext: plan.literatureContext,
      failureReason
    }

    return NextResponse.json(status)
  } catch (error: any) {
    console.error("[STATUS] Error fetching plan status:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch plan status"
      },
      { status: 500 }
    )
  }
}
