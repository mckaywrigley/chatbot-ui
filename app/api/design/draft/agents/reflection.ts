import { AgentTask, AgentResult } from "../types/interfaces"
import { callModelJson } from "../utils/model"
import { getReflectionPrompt } from "./prompts/reflection"

export async function reflectionAdapter(task: AgentTask): Promise<AgentResult> {
  const startTime = Date.now()
  console.debug(`[REFLECTION] Starting task ${task.taskId}`)

  try {
    const hypothesis = task.metadata?.hypothesis as {
      content: string
      explanation?: string
    }
    if (!hypothesis) {
      throw new Error("Hypothesis metadata required for reflection")
    }

    const promptConfig = getReflectionPrompt(hypothesis)

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
      hypothesisId: task.hypothesisId || null,
      output: result.json,
      metrics: {
        executionTimeMs: Date.now() - startTime
      }
    }
  } catch (error: any) {
    console.error(`[REFLECTION] Error in task ${task.taskId}:`, error)
    return {
      taskId: task.taskId,
      status: "failure",
      error: error.message || "Unknown error"
    }
  }
}
