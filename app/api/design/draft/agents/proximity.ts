import { AgentTask, AgentResult } from "../types/interfaces"
import { callModelJson } from "../utils/model"
import { getProximityPrompt } from "./prompts/proximity"

export async function proximityAdapter(task: AgentTask): Promise<AgentResult> {
  const startTime = Date.now()
  console.debug(`[PROXIMITY] Starting task ${task.taskId}`)

  try {
    const { hypothesisA, hypothesisB } = task.metadata as {
      hypothesisA: string
      hypothesisB: string
    }
    if (!hypothesisA || !hypothesisB) {
      throw new Error("Both hypotheses required for proximity")
    }

    const promptConfig = getProximityPrompt(hypothesisA, hypothesisB)

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
        similarity_score: result.json.similarity_score || 0
      }
    }
  } catch (error: any) {
    console.error(`[PROXIMITY] Error in task ${task.taskId}:`, error)
    return {
      taskId: task.taskId,
      status: "failure",
      error: error.message || "Unknown error"
    }
  }
}
