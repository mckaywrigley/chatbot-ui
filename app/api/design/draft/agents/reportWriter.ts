import { AgentTask, AgentResult } from "../types/interfaces"
import { callModelJson } from "../utils/model"
import { getReportWriterPrompt } from "./prompts/reportWriter"

export async function reportWriterAdapter(
  task: AgentTask
): Promise<AgentResult> {
  const startTime = Date.now()
  console.debug(`[REPORT] Starting task ${task.taskId}`)

  try {
    const plan = task.metadata?.plan as { title: string; description: string }
    const topHypotheses = (task.metadata?.topHypotheses || []) as Array<{
      content: string
      explanation?: string
      elo?: number
    }>

    if (!plan) {
      throw new Error("Plan metadata required for report writer")
    }

    const promptConfig = getReportWriterPrompt(plan, topHypotheses)

    const result = await callModelJson(promptConfig.user, promptConfig.system, {
      temperature: promptConfig.temperature,
      maxTokens: promptConfig.maxTokens,
      timeoutMs: task.timeoutMs || 120000 // Longer timeout for report generation
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
        hypotheses_count: result.json.top_hypotheses?.length || 0
      }
    }
  } catch (error: any) {
    console.error(`[REPORT] Error in task ${task.taskId}:`, error)
    return {
      taskId: task.taskId,
      status: "failure",
      error: error.message || "Unknown error"
    }
  }
}
