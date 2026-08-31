import { inngest } from "./client"
import { runTasksWithConcurrency } from "@/app/api/design/draft/worker"
import {
  getResearchPlan,
  saveResearchPlan,
  saveHypothesis,
  getHypothesesByPlanId,
  updateHypothesis,
  saveTournamentMatch,
  saveLog
} from "@/app/api/design/draft/utils/persistence-firestore"
import {
  ResearchPlan,
  Hypothesis,
  AgentTask
} from "@/app/api/design/draft/types/interfaces"
import { checkPlan, checkHypothesis } from "@/app/api/design/draft/safety/gate"
import { v4 as uuidv4 } from "uuid"
import { callLiteratureScoutAgent } from "@/app/api/design/draft/agents"
import { ExperimentDesignState } from "@/app/api/design/draft/types"
import { meterRun } from "@/lib/billing/with-meter"
import { incrementDesignsGenerated } from "@/lib/billing/account"
import { evaluateAccess, getPermissionForUser } from "@/lib/design/sharing"
import { adminDb } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"
import {
  assembleDesign,
  buildDesignBlocks,
  genAnalysis,
  genMaterials,
  genProtocol,
  genSetup,
  type AnalysisSection,
  type MaterialsSection,
  type ProtocolSection,
  type SetupSection
} from "@/lib/design/design-sections"
import type {
  DesignContentV2,
  GeneratedDesign,
  Hypothesis as DesignHypothesis,
  Paper as DesignPaper,
  ProblemContext
} from "@/lib/design-agent"
import {
  buildLiteratureInputs,
  runLiteraturePhase
} from "@/lib/design/literature-phase"
import {
  planLiteratureSearch,
  runLiteratureRound,
  type LiteraturePlan,
  type LiteratureRoundResult
} from "@/app/api/design/draft/agents"
import { runHypothesesPhase } from "@/lib/design/hypotheses-phase"

const DEFAULT_CONCURRENCY = 4
const INITIAL_ELO = 1500
const DEFAULT_AGENT_COUNT = 5
const HYPOTHESES_PER_AGENT = 4

function updateElo(
  eloA: number,
  eloB: number,
  winner: "A" | "B",
  k: number = 32
): [number, number] {
  const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
  const expectedB = 1 / (1 + Math.pow(10, (eloA - eloB) / 400))
  const scoreA = winner === "A" ? 1 : 0
  const scoreB = winner === "B" ? 1 : 0
  const newEloA = eloA + k * (scoreA - expectedA)
  const newEloB = eloB + k * (scoreB - expectedB)
  return [newEloA, newEloB]
}

// Inngest function broken into multiple checkpointed steps
export const processDesignDraft = inngest.createFunction(
  {
    id: "process-design-draft",
    name: "Process Design Draft",
    retries: 2
  },
  { event: "design/draft.requested" },
  async ({ event, step }) => {
    const { planId } = event.data

    // Step 1: Fetch and validate plan
    const plan = await step.run("fetch-and-validate-plan", async () => {
      const fetchedPlan = await getResearchPlan(planId)
      if (!fetchedPlan) {
        throw new Error(`Research plan ${planId} not found`)
      }

      // Safety check
      const safetyCheck = checkPlan(fetchedPlan)
      if (safetyCheck.decision === "block") {
        await saveLog({
          timestamp: new Date().toISOString(),
          actor: "supervisor",
          message: `Plan ${planId} blocked by safety gate`,
          level: "error",
          context: { planId, reasons: safetyCheck.reasons }
        })
        throw new Error(
          `Plan blocked by safety gate: ${safetyCheck.reasons.join("; ")}`
        )
      }

      // Update status
      fetchedPlan.status = "seed_in_progress"
      await saveResearchPlan(fetchedPlan)
      await saveLog({
        timestamp: new Date().toISOString(),
        actor: "supervisor",
        message: `Starting research plan ${planId}`,
        level: "info",
        context: { planId }
      })

      return fetchedPlan
    })

    // Owner of this plan - used to attribute background AI token usage.
    const billingUserId = (plan as { userId?: string }).userId || ""

    // Helper to ensure array
    const ensureArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0
        )
      }
      if (typeof value === "string" && value.trim().length > 0) {
        return [value.trim()]
      }
      return []
    }

    // Step 1.5: Literature Scout
    const literatureContext = await step.run("literature-scout", async () => {
      await saveLog({
        timestamp: new Date().toISOString(),
        actor: "supervisor",
        message: `Starting literature scout for plan ${plan.planId}`,
        level: "info",
        context: { planId: plan.planId }
      })

      const planConstraints = plan.constraints || {}
      const ensureStr = (value: unknown): string =>
        typeof value === "string" ? value.trim() : ""
      const state: ExperimentDesignState = {
        problem: plan.title || plan.description || "Untitled research problem",
        domain: (planConstraints as any).domain,
        phase: (planConstraints as any).phase,
        objectives: ensureArray(planConstraints.objectives),
        variables: {
          known:
            ensureArray((planConstraints as any).knownVariables).length > 0
              ? ensureArray((planConstraints as any).knownVariables)
              : ensureArray(planConstraints.variables),
          unknown: ensureArray((planConstraints as any).unknownVariables)
        },
        constraints: {
          material: ensureStr((planConstraints as any).material),
          time: ensureStr((planConstraints as any).time),
          equipment: ensureStr((planConstraints as any).equipment)
        },
        specialConsiderations: ensureArray(
          planConstraints.specialConsiderations
        )
      }

      const result = await meterRun(
        { userId: billingUserId, feature: "lit_search" },
        () => callLiteratureScoutAgent(state)
      )

      // Store literature context in the plan
      plan.literatureContext = result.output
      await saveResearchPlan(plan)

      await saveLog({
        timestamp: new Date().toISOString(),
        actor: "supervisor",
        message: `Literature scout completed for plan ${plan.planId}`,
        level: "info",
        context: {
          planId: plan.planId,
          citations: result.output.citations.length
        }
      })

      return result.output
    })

    // Step 2: Generate seed hypotheses
    const hypotheses = await step.run("generate-seed-hypotheses", async () => {
      const agentCount = DEFAULT_AGENT_COUNT
      const generationTasks: AgentTask[] = []

      for (let i = 0; i < agentCount; i++) {
        generationTasks.push({
          taskId: uuidv4(),
          planId: plan.planId,
          agentType: "GENERATION",
          n_candidates: HYPOTHESES_PER_AGENT,
          priority: 1,
          metadata: {
            plan: {
              title: plan.title,
              description: plan.description,
              constraints: plan.constraints
            },
            literatureContext
          }
        })
      }

      await saveLog({
        timestamp: new Date().toISOString(),
        actor: "supervisor",
        message: `Created ${agentCount} generation tasks (${HYPOTHESES_PER_AGENT} hypotheses each, ${agentCount * HYPOTHESES_PER_AGENT} total)`,
        level: "info",
        context: {
          planId: plan.planId,
          taskCount: agentCount,
          hypothesesPerAgent: HYPOTHESES_PER_AGENT
        }
      })

      const generationResults = await meterRun(
        { userId: billingUserId, feature: "design" },
        () => runTasksWithConcurrency(generationTasks, DEFAULT_CONCURRENCY)
      )

      // Each result now contains an array of hypotheses
      const hypos: Hypothesis[] = []
      const failureSummaries: Array<{
        taskId: string
        error?: string
        raw?: string
      }> = []
      for (const result of generationResults) {
        if (result.status === "success" && Array.isArray(result.output)) {
          for (const item of result.output) {
            const hypothesisId = uuidv4()
            const hypothesis: Hypothesis = {
              hypothesisId,
              planId: plan.planId,
              content: item.hypothesis || "",
              explanation: item.explanation,
              elo: INITIAL_ELO,
              createdAt: new Date().toISOString(),
              provenance: item.provenance || [],
              metadata: {
                feasibility_score: item.feasibility_score,
                novelty_score: item.novelty_score
              }
            }

            // Safety check
            const hypoSafety = checkHypothesis(hypothesis)
            if (hypoSafety.decision === "block") {
              await saveLog({
                timestamp: new Date().toISOString(),
                actor: "supervisor",
                message: `Hypothesis ${hypothesisId} blocked`,
                level: "warn",
                context: {
                  planId: plan.planId,
                  hypothesisId
                }
              })
              continue
            }

            await saveHypothesis(hypothesis)
            hypos.push(hypothesis)
          }
        } else {
          // Capture failure details so the status endpoint can explain why
          // "No hypotheses generated" occurred (timeouts, Azure 400, parsing, etc.)
          const raw =
            typeof (result as any)?.output?.raw === "string"
              ? ((result as any).output.raw as string)
              : undefined
          failureSummaries.push({
            taskId: result.taskId,
            error: result.error,
            raw: raw ? raw.slice(0, 800) : undefined
          })
        }
      }

      if (failureSummaries.length > 0) {
        await saveLog({
          timestamp: new Date().toISOString(),
          actor: "supervisor",
          message: `Generation failures: ${failureSummaries.length}/${generationResults.length}`,
          level: "warn",
          context: {
            planId: plan.planId,
            failureCount: failureSummaries.length,
            totalTasks: generationResults.length,
            failures: failureSummaries.slice(0, 3)
          }
        })
      }

      await saveLog({
        timestamp: new Date().toISOString(),
        actor: "supervisor",
        message: `Generated ${hypos.length} hypotheses`,
        level: "info",
        context: { planId: plan.planId, hypothesisCount: hypos.length }
      })

      if (hypos.length === 0) {
        throw new Error("No hypotheses generated")
      }

      return hypos
    })

    // Step 3: Run tournament (pairwise ranking)
    await step.run("run-tournament", async () => {
      const topN = Math.min(5, hypotheses.length)
      const topHypotheses = hypotheses.slice(0, topN)

      await saveLog({
        timestamp: new Date().toISOString(),
        actor: "supervisor",
        message: `Starting tournament with top ${topN} hypotheses`,
        level: "info",
        context: { planId: plan.planId, topN }
      })

      // Create ranking tasks
      const rankingTasks: AgentTask[] = []
      for (let i = 0; i < topHypotheses.length; i++) {
        for (let j = i + 1; j < topHypotheses.length; j++) {
          rankingTasks.push({
            taskId: uuidv4(),
            planId: plan.planId,
            agentType: "RANKING",
            priority: 2,
            metadata: {
              hypothesisA: topHypotheses[i].content,
              hypothesisB: topHypotheses[j].content
            }
          })
        }
      }

      const rankingResults = await meterRun(
        { userId: billingUserId, feature: "design" },
        () => runTasksWithConcurrency(rankingTasks, DEFAULT_CONCURRENCY)
      )

      // Update Elo scores - skip failed pairs instead of aborting the whole pipeline
      let matchIndex = 0
      let skippedMatches = 0
      for (let i = 0; i < topHypotheses.length; i++) {
        for (let j = i + 1; j < topHypotheses.length; j++) {
          const result = rankingResults[matchIndex]

          if (!result) {
            console.warn(
              `[TOURNAMENT] Ranking task ${matchIndex} returned no result, skipping`
            )
            matchIndex++
            skippedMatches++
            continue
          }

          if (result.status !== "success" || !result.output) {
            const errorDetails =
              result.error ||
              (result.output
                ? JSON.stringify(result.output)
                : "no-ranking-output")

            console.warn(
              `[TOURNAMENT] Ranking task ${rankingTasks[matchIndex]?.taskId} failed (pair ${i}-${j}), skipping: ${errorDetails}`
            )
            matchIndex++
            skippedMatches++
            continue
          }

          const winner = result.output.winner as "A" | "B"
          if (winner !== "A" && winner !== "B") {
            console.warn(
              `[TOURNAMENT] Invalid winner (${winner}) for pair ${i}-${j}, skipping`
            )
            matchIndex++
            skippedMatches++
            continue
          }

          const hypoA = topHypotheses[i]
          const hypoB = topHypotheses[j]

          const [newEloA, newEloB] = updateElo(
            hypoA.elo || INITIAL_ELO,
            hypoB.elo || INITIAL_ELO,
            winner
          )

          await updateHypothesis(hypoA.hypothesisId, { elo: newEloA })
          await updateHypothesis(hypoB.hypothesisId, { elo: newEloB })

          await saveTournamentMatch({
            matchId: uuidv4(),
            planId: plan.planId,
            hypothesisA: hypoA.hypothesisId,
            hypothesisB: hypoB.hypothesisId,
            winner: winner === "A" ? hypoA.hypothesisId : hypoB.hypothesisId,
            createdAt: new Date().toISOString(),
            rankingOutput: result.output
          })
          matchIndex++
        }
      }

      if (skippedMatches > 0) {
        await saveLog({
          timestamp: new Date().toISOString(),
          actor: "supervisor",
          message: `Tournament completed with ${skippedMatches}/${rankingResults.length} ranking failures (skipped)`,
          level: "warn",
          context: {
            planId: plan.planId,
            skippedMatches,
            totalMatches: rankingResults.length
          }
        })
      }

      return { success: true }
    })

    // Step 4: Complete plan
    await step.run("complete-plan", async () => {
      plan.status = "completed"
      await saveResearchPlan(plan)

      await saveLog({
        timestamp: new Date().toISOString(),
        actor: "supervisor",
        message: `Research plan ${plan.planId} completed`,
        level: "info",
        context: { planId: plan.planId }
      })

      return { success: true }
    })

    const finalHypotheses = await getHypothesesByPlanId(planId)

    return {
      success: true,
      planId: plan.planId,
      hypothesesGenerated: finalHypotheses.length,
      status: "completed"
    }
  }
)

// ───────────────────────────────────────────────────────────────────────────
// Design-creation pipeline (moved off the request path).
//
// literature / hypotheses / design all run too long for a 300s serverless
// request (gpt-5.5 is slow; design alone is 6-12 min). Each runs here as Inngest
// steps - on Vercel every step.run is its own <300s invocation and Inngest
// persists state between them, so the whole pipeline has no single invocation
// over the cap. The client polls the design doc's `designJob` field
// (state/phase/progress) and reads the resulting content. simulation stays
// inline in the route (sync, no LLM).
// ───────────────────────────────────────────────────────────────────────────
type DesignPhaseName = "literature" | "hypotheses" | "design"

interface DesignPhasePayload {
  designId: string
  userId: string
  /** Actor's email - lets the worker resolve an editor invite addressed by
   *  email when the permission row hasn't been linked to a user_id yet. */
  userEmail?: string | null
  phase: DesignPhaseName
  problem?: ProblemContext
  hypotheses?: DesignHypothesis[]
  papers?: DesignPaper[]
  mode?: "append" | "replace"
  approvedPhases?: string[]
}

export const processDesignPhase = inngest.createFunction(
  {
    id: "process-design-phase",
    name: "Run design-pipeline phase",
    retries: 1,
    // One ultimate-failure hook: flip the job to failed so the client stops polling.
    onFailure: async ({ event, error }) => {
      const original = (event as any)?.data?.event?.data ?? (event as any)?.data
      const designId = original?.designId
      if (!designId) return
      try {
        await adminDb
          .collection("designs")
          .doc(designId)
          .update({
            "designJob.state": "failed",
            "designJob.error": String((error as any)?.message ?? error),
            "designJob.updatedAt": new Date().toISOString()
          })
      } catch (e) {
        console.error("[design.phase] onFailure write failed", e)
      }
    }
  },
  { event: "design/generate.requested" },
  async ({ event, step }) => {
    const data = event.data as DesignPhasePayload
    const { designId, userId, phase } = data
    if (!designId || !userId || !phase) {
      throw new Error("[design.phase] missing designId, userId, or phase")
    }

    const docRef = adminDb.collection("designs").doc(designId)

    const pushProgress = async (entry: Record<string, unknown>) => {
      try {
        await docRef.update({
          "designJob.progress": FieldValue.arrayUnion(entry),
          "designJob.updatedAt": new Date().toISOString()
        })
      } catch (e) {
        console.warn("[design.phase] progress write failed", e)
      }
    }

    // Step 1: load + ownership check + mark running.
    const loaded = await step.run("load", async () => {
      const snap = await docRef.get()
      if (!snap.exists) throw new Error(`Design ${designId} not found`)
      const docData = snap.data() as any
      // Owner OR an invited editor (collaborator) may run a phase. The route
      // already gated this, but the worker re-checks because it can be invoked
      // directly via the event stream.
      const permission = await getPermissionForUser(
        designId,
        userId,
        data.userEmail ?? null
      )
      if (
        docData.user_id &&
        !evaluateAccess(docData, userId, permission).canEdit
      ) {
        throw new Error("Forbidden: design belongs to another user")
      }
      const existing: DesignContentV2 =
        (typeof docData.content === "string"
          ? JSON.parse(docData.content || "{}")
          : docData.content) ?? ({ schemaVersion: 2 } as DesignContentV2)
      const ctx: ProblemContext = data.problem ?? existing.problem ?? {}
      await docRef.update({
        designJob: {
          state: "running",
          phase,
          progress: [],
          startedAt: new Date().toISOString()
        }
      })
      return { existing, ctx }
    })

    const { existing, ctx } = loaded as {
      existing: DesignContentV2
      ctx: ProblemContext
    }

    let patch: Partial<DesignContentV2> = {}

    if (phase === "literature") {
      // ── Fan-out / fan-in ──────────────────────────────────────────────
      // The scout is split into checkpointed Inngest steps so it can run for
      // as long as it needs without any single Vercel invocation hitting the
      // function ceiling: one "plan" step (query-gen + keyless pre-warm), then
      // EACH PaperFinder round as its own parallel step, then one "synth" step
      // that dedups/ranks/synthesizes. Inngest memoizes every completed step,
      // so a slow round can't take the whole phase down and total wall-clock is
      // effectively unbounded.
      const litArgs = { ctx, existing, mode: data.mode }
      const { agentState, searchOptions } = buildLiteratureInputs(litArgs)

      const plan = (await step.run("lit-plan", () =>
        meterRun({ userId, feature: "lit_search" }, () =>
          planLiteratureSearch(
            agentState,
            searchOptions,
            ev => void pushProgress(ev as Record<string, unknown>)
          )
        )
      )) as LiteraturePlan

      const roundResults = (await Promise.all(
        plan.fullRoundQueries.map((fullQuery, idx) =>
          step.run(`lit-round-${idx}`, () =>
            runLiteratureRound(
              {
                rawQuery: plan.roundQueries[idx],
                fullQuery,
                index: idx,
                totalRounds: plan.fullRoundQueries.length,
                intent: plan.queryIntents[idx] ?? "primary",
                bypassCache: searchOptions.bypassCache
              },
              ev => void pushProgress(ev as Record<string, unknown>)
            )
          )
        )
      )) as LiteratureRoundResult[]

      patch = (await step.run("lit-synth", () =>
        meterRun({ userId, feature: "lit_search" }, () =>
          runLiteraturePhase(
            litArgs,
            ev => void pushProgress(ev as Record<string, unknown>),
            { plan, roundResults }
          )
        )
      )) as Partial<DesignContentV2>
    } else if (phase === "hypotheses") {
      patch = (await step.run("hypotheses", () =>
        meterRun({ userId, feature: "design" }, () =>
          runHypothesesPhase(
            { ctx, existing, body: { papers: data.papers }, designId },
            ev => void pushProgress(ev)
          )
        )
      )) as Partial<DesignContentV2>
    } else {
      // design: one step per SOP section, per selected hypothesis.
      const hypotheses: DesignHypothesis[] =
        data.hypotheses ?? existing.hypotheses ?? []
      const selected = hypotheses.filter(h => h.selected)
      if (selected.length === 0) throw new Error("No hypotheses selected")

      const designs: GeneratedDesign[] = []
      for (let i = 0; i < selected.length; i++) {
        const hyp = selected[i]
        const blocks = buildDesignBlocks(ctx, existing, hyp) // pure, cheap
        const label = `[${i + 1}/${selected.length}]`
        const meter = <T>(fn: () => Promise<T>) =>
          meterRun({ userId, feature: "design" }, fn)

        const setup = (await step.run(`setup-${i}`, async () => {
          const r = await meter(() => genSetup(blocks))
          await pushProgress({
            step: "hyp_setup",
            message: `${label} Experimental setup`,
            detail:
              "Deciding what gets tested and measured, the control and experimental arms, sample types, and the replicate scheme.",
            hypothesisIndex: i + 1,
            totalHypotheses: selected.length
          })
          return r
        })) as SetupSection

        const materials = (await step.run(`materials-${i}`, async () => {
          const r = await meter(() => genMaterials(blocks, setup))
          await pushProgress({
            step: "hyp_materials",
            message: `${label} Materials & setup`,
            detail:
              "Costing out reagents and equipment, working the dilution and volume calculations, and writing the prep, storage and disposal steps.",
            hypothesisIndex: i + 1,
            totalHypotheses: selected.length
          })
          return r
        })) as MaterialsSection

        const protocol = (await step.run(`protocol-${i}`, async () => {
          const r = await meter(() => genProtocol(blocks, setup, materials))
          await pushProgress({
            step: "hyp_protocol",
            message: `${label} Protocol & timeline`,
            detail:
              "Laying out the bench steps in order, building the full conditions table arm by arm, and timing the run.",
            hypothesisIndex: i + 1,
            totalHypotheses: selected.length
          })
          return r
        })) as ProtocolSection

        const analysis = (await step.run(`analysis-${i}`, async () => {
          const r = await meter(() =>
            genAnalysis(blocks, setup, materials, protocol)
          )
          await pushProgress({
            step: "hyp_complete",
            message: `${label} Design complete`,
            detail:
              "Set the data-collection plan and statistics, added safety notes, and wrote up the rationale.",
            hypothesisIndex: i + 1,
            totalHypotheses: selected.length
          })
          return r
        })) as AnalysisSection

        designs.push(assembleDesign(hyp, setup, materials, protocol, analysis))
      }
      patch = { problem: ctx, hypotheses, designs }
    }

    // Finalize: merge the phase patch into content, apply downstream clears,
    // and mark the job complete. (Clears live here because `undefined` doesn't
    // survive Inngest step-result serialization.)
    await step.run("finalize", async () => {
      const next: any = { ...existing, ...patch, schemaVersion: 2 }
      if (phase === "literature" && data.mode !== "append") {
        delete next.hypotheses
        delete next.designs
      }
      if (phase === "hypotheses") {
        delete next.designs
      }
      const cleaned = JSON.parse(JSON.stringify(next))
      await docRef.update({
        content: JSON.stringify(cleaned),
        updated_at: new Date().toISOString(),
        "designJob.state": "complete",
        "designJob.completedAt": new Date().toISOString()
      })
    })

    // Free-experiment paywall counter: +1 once a DESIGN actually generated.
    if (
      phase === "design" &&
      userId &&
      Array.isArray((patch as any).designs) &&
      (patch as any).designs.length > 0
    ) {
      await step.run("count-experiment", async () => {
        await incrementDesignsGenerated(userId)
      })
    }

    return { designId, phase }
  }
)
