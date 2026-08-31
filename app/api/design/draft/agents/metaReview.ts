import { AgentTask, AgentResult } from "../types/interfaces"
import { callModelJson } from "../utils/model"
import { getMetaReviewPrompt } from "./prompts/metaReview"

export async function metaReviewAdapter(task: AgentTask): Promise<AgentResult> {
  const startTime = Date.now()
  console.debug(`[META_REVIEW] Starting task ${task.taskId}`)

  try {
    const plan = task.metadata?.plan as { title: string; description: string }
    const topHypotheses = (task.metadata?.topHypotheses || []) as Array<{
      content: string
    }>

    if (!plan) {
      throw new Error("Plan metadata required for meta review")
    }

    const promptConfig = getMetaReviewPrompt(plan, topHypotheses)

    const result = await callModelJson(promptConfig.user, promptConfig.system, {
      temperature: promptConfig.temperature,
      maxTokens: promptConfig.maxTokens,
      timeoutMs: task.timeoutMs || 60000
    })

    if (!result.ok || !result.json) {
      return {
        taskId: task.taskId,
        status: "failure",
        error: result.error || "non-json-output",
        output: { raw: result.raw }
      }
    }

    return {
      taskId: task.taskId,
      status: "success",
      output: result.json,
      metrics: {
        executionTimeMs: Date.now() - startTime,
        prompt_patches_count: result.json.prompt_patches?.length || 0
      }
    }
  } catch (error: any) {
    console.error(`[META_REVIEW] Error in task ${task.taskId}:`, error)
    return {
      taskId: task.taskId,
      status: "failure",
      error: error.message || "Unknown error"
    }
  }
}
