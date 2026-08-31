import { NextResponse } from "next/server"

import {
  callExperimentDesignerAgent,
  callLiteratureScoutAgent,
  callPlannerAgent,
  callProcedureAgent,
  callReportWriterAgent,
  callStatCheckAgent
} from "../../../agents"
import {
  DESIGN_DOMAINS,
  DESIGN_PHASES,
  Domain,
  ExperimentDesignState,
  Phase
} from "../../../types"
import {
  getHypothesisById,
  getResearchPlan,
  saveLog,
  saveHypothesisDesign
} from "../../../utils/persistence-firestore"
import { AgentPromptOverrides, AgentPromptUsage } from "@/types/design-prompts"
import { designAgentPromptOrder } from "@/lib/design/prompt-schemas"
import { requireUser } from "@/lib/server/require-user"
import { assertBudget } from "@/lib/billing/account"
import { meterRun } from "@/lib/billing/with-meter"
import {
  budgetErrorResponse,
  isBudgetExceededError
} from "@/lib/billing/errors"
import { checkRateLimit } from "@/lib/server/rate-limit"

const agentKeys = designAgentPromptOrder

const sanitizePromptOverrides = (
  rawOverrides: unknown
): AgentPromptOverrides | undefined => {
  if (!rawOverrides || typeof rawOverrides !== "object") {
    return undefined
  }

  const cleanOverrides: AgentPromptOverrides = {}
  let hasAnyOverrides = false

  for (const key of agentKeys) {
    const agentOverride = (rawOverrides as Record<string, unknown>)[key]
    if (!agentOverride || typeof agentOverride !== "object") {
      continue
    }

    const sectionsInput = (agentOverride as Record<string, unknown>).sections
    const userPromptInput = (agentOverride as Record<string, unknown>)
      .userPrompt

    const cleanSections =
      sectionsInput && typeof sectionsInput === "object"
        ? Object.entries(sectionsInput as Record<string, unknown>).reduce<
            Record<string, string>
          >((acc, [sectionId, value]) => {
            if (typeof value === "string") {
              acc[sectionId] = value
            }
            return acc
          }, {})
        : undefined

    const cleanUserPrompt =
      typeof userPromptInput === "string" ? userPromptInput : undefined

    if (
      (cleanSections && Object.keys(cleanSections).length > 0) ||
      cleanUserPrompt
    ) {
      cleanOverrides[key] = {
        ...(cleanSections ? { sections: cleanSections } : {}),
        ...(cleanUserPrompt ? { userPrompt: cleanUserPrompt } : {})
      }
      hasAnyOverrides = true
    }
  }

  return hasAnyOverrides ? cleanOverrides : undefined
}

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

const coerceDomain = (value: unknown): Domain | undefined => {
  if (typeof value !== "string") return undefined
  return (DESIGN_DOMAINS as readonly string[]).includes(value)
    ? (value as Domain)
    : undefined
}

const coercePhase = (value: unknown): Phase | undefined => {
  if (typeof value !== "string") return undefined
  return (DESIGN_PHASES as readonly string[]).includes(value)
    ? (value as Phase)
    : undefined
}

const coerceString = (value: unknown): string => {
  if (typeof value === "string") return value.trim()
  return ""
}

export async function POST(
  req: Request,
  { params }: { params: { hypothesisId: string } }
) {
  try {
    const hypothesisId = params.hypothesisId
    if (!hypothesisId) {
      return NextResponse.json(
        { success: false, error: "Hypothesis ID is required" },
        { status: 400 }
      )
    }

    const auth = await requireUser()
    if (auth.response) return auth.response

    try {
      await assertBudget(auth.user.id)
    } catch (e) {
      if (isBudgetExceededError(e)) return budgetErrorResponse(e.plan)
    }

    const limited = await checkRateLimit({
      name: "hypothesis-design",
      identifier: auth.user.id,
      requests: 20,
      window: "1 h"
    })
    if (limited) return limited

    let requestBody: any = {}
    try {
      requestBody = await req.json()
    } catch (error) {
      requestBody = {}
    }
    const instructions =
      typeof requestBody.instructions === "string"
        ? requestBody.instructions.trim()
        : undefined
    const promptOverrides = sanitizePromptOverrides(requestBody.promptOverrides)

    const hypothesis = await getHypothesisById(hypothesisId)
    if (!hypothesis) {
      return NextResponse.json(
        { success: false, error: "Hypothesis not found" },
        { status: 404 }
      )
    }

    const plan = await getResearchPlan(hypothesis.planId)
    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Research plan not found" },
        { status: 404 }
      )
    }

    if (!plan.userId || plan.userId !== auth.user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      )
    }

    const stepTimings: { step: string; durationMs: number }[] = []
    // Every step here runs an AI agent - wrap each in a metering scope so the
    // azure-openai Proxy attributes its token usage to this user (feature
    // "design"). meterRun is a no-op flush when a step makes no AI calls.
    const trackStep = async <T>(step: string, fn: () => Promise<T>) => {
      const start = Date.now()
      const result = await meterRun(
        { userId: auth.user.id, feature: "design" },
        fn
      )
      stepTimings.push({ step, durationMs: Date.now() - start })
      return result
    }

    const planConstraints = plan.constraints || {}

    const pipelineStart = Date.now()
    const promptsUsed: AgentPromptUsage[] = []

    await saveLog({
      timestamp: new Date().toISOString(),
      actor: "supervisor",
      level: "info",
      message: `Starting sequential experiment design pipeline for hypothesis ${hypothesis.hypothesisId}`,
      context: {
        planId: plan.planId,
        hypothesisId: hypothesis.hypothesisId
      }
    })

    const domain = coerceDomain(planConstraints.domain)
    const phase = coercePhase(planConstraints.phase)

    const objectives =
      ensureArray(planConstraints.objectives).length > 0
        ? ensureArray(planConstraints.objectives)
        : planConstraints.objective
          ? [coerceString(planConstraints.objective)].filter(Boolean)
          : []

    const knownVariables =
      ensureArray(planConstraints.knownVariables).length > 0
        ? ensureArray(planConstraints.knownVariables)
        : ensureArray(planConstraints.variables)

    const unknownVariables = ensureArray(planConstraints.unknownVariables)

    const state: ExperimentDesignState = {
      problem: plan.title || plan.description || "Untitled research problem",
      domain,
      phase,
      objectives,
      variables: {
        known: knownVariables,
        unknown: unknownVariables
      },
      constraints: {
        material: coerceString(planConstraints.material),
        time: coerceString(planConstraints.time),
        equipment: coerceString(planConstraints.equipment)
      },
      specialConsiderations: ensureArray(planConstraints.specialConsiderations)
    }

    if (instructions && instructions.length > 0) {
      state.specialConsiderations = [
        ...state.specialConsiderations,
        `User instructions: ${instructions}`
      ]
      await saveLog({
        timestamp: new Date().toISOString(),
        actor: "supervisor",
        level: "info",
        message: `Applying user instructions for hypothesis ${hypothesis.hypothesisId}`,
        context: {
          planId: plan.planId,
          hypothesisId: hypothesis.hypothesisId,
          instructions
        }
      })
    }

    const literatureResult = await trackStep("literature_scout", async () =>
      callLiteratureScoutAgent(state, promptOverrides?.literatureScout)
    )
    state.literatureScoutOutput = literatureResult.output
    promptsUsed.push(literatureResult.prompt)

    state.hypothesisBuilderOutput = {
      hypothesis: hypothesis.content,
      explanation:
        hypothesis.explanation ||
        "User-selected hypothesis from tournament stage."
    }

    const experimentResult = await trackStep("experiment_designer", async () =>
      callExperimentDesignerAgent(state, promptOverrides?.experimentDesigner)
    )
    state.experimentDesignerOutput = experimentResult.output
    promptsUsed.push(experimentResult.prompt)

    const statResult = await trackStep("stat_check", async () =>
      callStatCheckAgent(state, promptOverrides?.statCheck)
    )
    state.statCheckOutput = statResult.output
    promptsUsed.push(statResult.prompt)

    const plannerResult = await trackStep("planner", async () =>
      callPlannerAgent(state, promptOverrides?.planner)
    )
    state.plannerOutput = plannerResult.output
    promptsUsed.push(plannerResult.prompt)

    const procedureResult = await trackStep("procedure", async () =>
      callProcedureAgent(state, promptOverrides?.procedure)
    )
    state.procedureOutput = procedureResult.output
    promptsUsed.push(procedureResult.prompt)

    const reportResult = await trackStep("report_writer", async () =>
      callReportWriterAgent(state, promptOverrides?.reportWriter)
    )
    state.reportWriterOutput = reportResult.output
    promptsUsed.push(reportResult.prompt)

    const totalTimeMs = Date.now() - pipelineStart

    await saveLog({
      timestamp: new Date().toISOString(),
      actor: "supervisor",
      level: "info",
      message: `Experiment design pipeline completed for hypothesis ${hypothesis.hypothesisId}`,
      context: {
        planId: plan.planId,
        hypothesisId: hypothesis.hypothesisId,
        totalTimeMs
      }
    })

    // Auto-save the design for this hypothesis
    console.log(
      `[HYPOTHESIS-DESIGN] Starting auto-save for hypothesis ${hypothesis.hypothesisId.slice(0, 8)}...`
    )
    try {
      const saveSuccess = await saveHypothesisDesign(hypothesis.hypothesisId, {
        generatedDesign: state.reportWriterOutput,
        generatedLiteratureSummary: state.literatureScoutOutput,
        generatedStatReview: state.statCheckOutput,
        generatedPlannerOutput: state.plannerOutput,
        generatedProcedureOutput: state.procedureOutput,
        promptsUsed
      })

      if (saveSuccess) {
        console.log(
          `✅ [HYPOTHESIS-DESIGN] Auto-saved design for hypothesis ${hypothesis.hypothesisId.slice(0, 8)}...`
        )
      } else {
        console.error(
          `⚠️ [HYPOTHESIS-DESIGN] Auto-save returned false for hypothesis ${hypothesis.hypothesisId.slice(0, 8)}...`
        )
      }
    } catch (saveError) {
      console.error(
        `❌ [HYPOTHESIS-DESIGN] Failed to auto-save design for hypothesis ${hypothesis.hypothesisId.slice(0, 8)}...:`,
        saveError
      )
      // Don't fail the request if auto-save fails
    }

    return NextResponse.json({
      success: true,
      planId: plan.planId,
      hypothesisId: hypothesis.hypothesisId,
      report: state.reportWriterOutput,
      literatureSummary: state.literatureScoutOutput,
      experimentDesign: state.experimentDesignerOutput,
      statReview: state.statCheckOutput,
      planner: state.plannerOutput,
      procedure: state.procedureOutput,
      metrics: {
        totalTimeMs,
        steps: stepTimings
      },
      promptsUsed
    })
  } catch (error: any) {
    console.error("[HYPOTHESIS-DESIGN] Error generating design:", error)

    await saveLog({
      timestamp: new Date().toISOString(),
      actor: "supervisor",
      level: "error",
      message: `Experiment design pipeline failed for hypothesis ${params.hypothesisId}`,
      context: {
        hypothesisId: params.hypothesisId,
        error: error?.message || "Unknown error"
      }
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate experiment design"
      },
      { status: 500 }
    )
  }
}
