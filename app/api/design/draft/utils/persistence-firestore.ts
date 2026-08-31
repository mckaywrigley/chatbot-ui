import { adminDb } from "@/lib/firebase/admin"
import type { QueryDocumentSnapshot } from "firebase-admin/firestore"
import {
  ResearchPlan,
  Hypothesis,
  TournamentMatch,
  LogEntry
} from "../types/interfaces"

/**
 * Save or update a research plan in Firestore
 */
export async function saveResearchPlan(plan: ResearchPlan): Promise<void> {
  const planData = {
    plan_id: plan.planId,
    user_id: plan.userId,
    title: plan.title,
    description: plan.description,
    status: plan.status || "pending",
    constraints: plan.constraints ?? {},
    preferences: plan.preferences ?? {},
    literature_context: plan.literatureContext ?? null,
    created_at: plan.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: plan
  }

  await adminDb
    .collection("research_plans")
    .doc(plan.planId)
    .set(planData, { merge: true })
}

/**
 * Get a research plan by ID
 */
export async function getResearchPlan(
  planId: string
): Promise<ResearchPlan | null> {
  const doc = await adminDb.collection("research_plans").doc(planId).get()

  if (!doc.exists) {
    return null
  }

  const data = doc.data()!
  const metadata = (data.metadata ?? {}) as Partial<ResearchPlan>

  return {
    ...metadata,
    planId: data.plan_id,
    userId: data.user_id ?? metadata.userId ?? "",
    title: data.title,
    description: data.description,
    status: metadata.status || data.status,
    constraints: data.constraints ?? metadata.constraints ?? {},
    preferences: data.preferences ?? metadata.preferences ?? {},
    literatureContext: data.literature_context ?? metadata.literatureContext,
    createdAt: metadata.createdAt || data.created_at
  }
}

/**
 * Save or update a hypothesis
 */
export async function saveHypothesis(hypothesis: Hypothesis): Promise<void> {
  const hypothesisData = {
    hypothesis_id: hypothesis.hypothesisId,
    plan_id: hypothesis.planId,
    content: hypothesis.content,
    explanation: hypothesis.explanation ?? null,
    elo: typeof hypothesis.elo === "number" ? hypothesis.elo : null,
    provenance: hypothesis.provenance ?? [],
    created_at: hypothesis.createdAt || new Date().toISOString(),
    metadata: hypothesis
  }

  await adminDb
    .collection("hypotheses")
    .doc(hypothesis.hypothesisId)
    .set(hypothesisData, { merge: true })
}

/**
 * Get all hypotheses for a plan
 */
export async function getHypothesesByPlanId(
  planId: string
): Promise<Hypothesis[]> {
  const snapshot = await adminDb
    .collection("hypotheses")
    .where("plan_id", "==", planId)
    .get()

  return snapshot.docs.map((doc: QueryDocumentSnapshot) => {
    const data = doc.data()
    const metadata = (data.metadata ?? {}) as Partial<Hypothesis>

    return {
      hypothesisId: data.hypothesis_id,
      planId: data.plan_id,
      content: data.content,
      explanation: data.explanation ?? metadata.explanation,
      elo: data.elo ?? metadata.elo,
      provenance: data.provenance ?? metadata.provenance,
      createdAt: metadata.createdAt || data.created_at,
      ...metadata
    }
  })
}

/**
 * Get a hypothesis by ID
 */
export async function getHypothesisById(
  hypothesisId: string
): Promise<Hypothesis | null> {
  const doc = await adminDb.collection("hypotheses").doc(hypothesisId).get()

  if (!doc.exists) {
    return null
  }

  const data = doc.data()!
  const metadata = (data.metadata ?? {}) as Partial<Hypothesis>

  return {
    hypothesisId: data.hypothesis_id,
    planId: data.plan_id,
    content: data.content,
    explanation: data.explanation ?? metadata.explanation,
    elo: data.elo ?? metadata.elo,
    provenance: data.provenance ?? metadata.provenance,
    createdAt: metadata.createdAt || data.created_at,
    ...metadata
  }
}

/**
 * Update a hypothesis
 */
export async function updateHypothesis(
  hypothesisId: string,
  updates: Partial<Hypothesis>
): Promise<boolean> {
  const current = await getHypothesisById(hypothesisId)
  if (!current) {
    return false
  }

  const nextHypothesis = { ...current, ...updates }
  await saveHypothesis(nextHypothesis)
  return true
}

/**
 * Save a tournament match
 */
export async function saveTournamentMatch(
  match: TournamentMatch
): Promise<void> {
  const matchData = {
    match_id: match.matchId,
    plan_id: match.planId,
    challenger_hypothesis_id: match.hypothesisA ?? null,
    defender_hypothesis_id: match.hypothesisB ?? null,
    winner_hypothesis_id: match.winner ?? null,
    created_at: match.createdAt || new Date().toISOString(),
    metadata: match
  }

  await adminDb
    .collection("tournament_matches")
    .doc(match.matchId)
    .set(matchData)
}

/**
 * Get all tournament matches for a plan
 */
export async function getTournamentMatchesByPlanId(
  planId: string
): Promise<TournamentMatch[]> {
  // where + orderBy on a different field requires a composite Firestore
  // index. Sort in-memory after fetching all matches for this plan
  // (per-plan match counts are bounded and fit easily in memory).
  const snapshot = await adminDb
    .collection("tournament_matches")
    .where("plan_id", "==", planId)
    .get()

  const rows = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
    const data = doc.data()
    const metadata = (data.metadata ?? {}) as Partial<TournamentMatch>

    return {
      matchId: data.match_id,
      planId: data.plan_id,
      hypothesisA: data.challenger_hypothesis_id ?? metadata.hypothesisA ?? "",
      hypothesisB: data.defender_hypothesis_id ?? metadata.hypothesisB ?? "",
      winner: data.winner_hypothesis_id ?? metadata.winner,
      createdAt: metadata.createdAt || data.created_at,
      ...metadata
    }
  })

  return rows.sort(
    (a: any, b: any) =>
      new Date(a.createdAt ?? 0).getTime() -
      new Date(b.createdAt ?? 0).getTime()
  )
}

/**
 * Save a log entry
 */
export async function saveLog(entry: LogEntry): Promise<void> {
  const logData = {
    plan_id: entry.context?.planId || "",
    timestamp: entry.timestamp,
    actor: entry.actor,
    level: entry.level,
    message: entry.message,
    context: entry.context ?? {}
  }

  // Auto-generate ID for logs
  await adminDb.collection("logs").add(logData)
}

/**
 * Get logs for a plan (most recent first)
 */
export async function getLogsByPlanId(
  planId: string,
  limit: number = 20
): Promise<LogEntry[]> {
  // where + orderBy on a different field requires a composite Firestore
  // index. Fetch all logs for this plan, sort + slice in-memory. Logs
  // are bounded per plan (worst case a few hundred for a long-running
  // plan); switch to cursor pagination if size becomes a concern.
  const snapshot = await adminDb
    .collection("logs")
    .where("plan_id", "==", planId)
    .get()

  const all = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
    const data = doc.data()
    const level = ["info", "warn", "error", "debug"].includes(data.level)
      ? data.level
      : "info"

    return {
      timestamp: data.timestamp,
      actor: data.actor,
      level: level as "info" | "warn" | "error" | "debug",
      message: data.message,
      context: data.context ?? { planId: data.plan_id }
    }
  })

  return all
    .sort(
      (a: any, b: any) =>
        new Date(b.timestamp ?? 0).getTime() -
        new Date(a.timestamp ?? 0).getTime()
    )
    .slice(0, limit)
}

/**
 * Save a generated design for a specific hypothesis
 */
export async function saveHypothesisDesign(
  hypothesisId: string,
  designData: {
    generatedDesign: any
    generatedLiteratureSummary?: any
    generatedStatReview?: any
    generatedPlannerOutput?: any
    generatedProcedureOutput?: any
    promptsUsed?: any[]
  }
): Promise<boolean> {
  try {
    console.log(
      `[PERSISTENCE] Saving design for hypothesis ${hypothesisId.slice(0, 8)}...`
    )

    const hypothesis = await getHypothesisById(hypothesisId)
    if (!hypothesis) {
      console.error(
        `[PERSISTENCE] Hypothesis ${hypothesisId.slice(0, 8)}... not found`
      )
      return false
    }

    const savedAt = new Date().toISOString()
    const updatedMetadata = {
      ...hypothesis.metadata,
      saved_design: {
        ...designData,
        savedAt
      }
    }

    await adminDb.collection("hypotheses").doc(hypothesisId).update({
      metadata: updatedMetadata
    })

    console.log(
      `[PERSISTENCE] ✅ Successfully saved design for hypothesis ${hypothesisId.slice(0, 8)}... at ${savedAt}`
    )
    return true
  } catch (error) {
    console.error(
      `[PERSISTENCE] ❌ Error saving hypothesis design for ${hypothesisId.slice(0, 8)}...:`,
      error
    )
    return false
  }
}

/**
 * Get saved design for a hypothesis (if exists)
 */
export async function getHypothesisSavedDesign(hypothesisId: string): Promise<{
  generatedDesign: any
  generatedLiteratureSummary?: any
  generatedStatReview?: any
  generatedPlannerOutput?: any
  generatedProcedureOutput?: any
  promptsUsed?: any[]
  savedAt?: string
} | null> {
  try {
    console.log(
      `[PERSISTENCE] Getting saved design for hypothesis ${hypothesisId.slice(0, 8)}...`
    )

    const hypothesis = await getHypothesisById(hypothesisId)
    if (!hypothesis) {
      console.log(
        `[PERSISTENCE] Hypothesis ${hypothesisId.slice(0, 8)}... not found`
      )
      return null
    }

    if (!hypothesis.metadata?.saved_design) {
      console.log(
        `[PERSISTENCE] No saved_design in metadata for hypothesis ${hypothesisId.slice(0, 8)}...`
      )
      return null
    }

    console.log(
      `[PERSISTENCE] ✅ Found saved design for hypothesis ${hypothesisId.slice(0, 8)}... (saved at: ${hypothesis.metadata.saved_design.savedAt})`
    )
    return hypothesis.metadata.saved_design
  } catch (error) {
    console.error(
      `[PERSISTENCE] ❌ Error getting hypothesis saved design for ${hypothesisId.slice(0, 8)}...:`,
      error
    )
    return null
  }
}

/**
 * Check if a hypothesis has a saved design
 */
export async function hasHypothesisSavedDesign(
  hypothesisId: string
): Promise<boolean> {
  try {
    const savedDesign = await getHypothesisSavedDesign(hypothesisId)
    return savedDesign !== null
  } catch (error) {
    console.error(
      "[PERSISTENCE] Error checking hypothesis saved design:",
      error
    )
    return false
  }
}
