import { AgentTask, AgentResult } from "../types/interfaces"
import { callModelJson } from "../utils/model"
import { getEvolutionPrompt } from "./prompts/evolution"
import { v4 as uuidv4 } from "uuid"

export async function evolutionAdapter(task: AgentTask): Promise<AgentResult> {
  const startTime = Date.now()
  console.debug(`[EVOLUTION] Starting task ${task.taskId}`)

  try {
    const hypothesis = task.metadata?.hypothesis as {
      content: string
      explanation?: string
    }
    if (!hypothesis) {
      throw new Error("Hypothesis metadata required for evolution")
    }

    const promptConfig = getEvolutionPrompt(hypothesis)

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

    // Generate IDs for new variant hypotheses
    const variants = result.json.variants || []
    const variantIds = variants.map(() => uuidv4())

    return {
      taskId: task.taskId,
      status: "success",
      hypothesisId: task.hypothesisId || null,
      output: {
        ...result.json,
        variantIds
      },
      provenance: result.json.provenance || [],
      metrics: {
        executionTimeMs: Date.now() - startTime,
        variantsGenerated: variants.length
      }
    }
  } catch (error: any) {
    console.error(`[EVOLUTION] Error in task ${task.taskId}:`, error)
    return {
      taskId: task.taskId,
      status: "failure",
      error: error.message || "Unknown error"
    }
  }
}
