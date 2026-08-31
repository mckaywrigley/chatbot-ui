import { AgentTask, AgentResult } from "./types/interfaces"
import { generationAdapter } from "./agents/generation"
import { reflectionAdapter } from "./agents/reflection"
import { rankingAdapter } from "./agents/ranking"
import { evolutionAdapter } from "./agents/evolution"
import { proximityAdapter } from "./agents/proximity"
import { metaReviewAdapter } from "./agents/metaReview"
import { statCheckAdapter } from "./agents/statCheck"
import { reportWriterAdapter } from "./agents/reportWriter"

const DEFAULT_TIMEOUT_MS = 60000

/**
 * Worker runner that dispatches tasks to appropriate agent adapters
 */
export async function workerRunner(task: AgentTask): Promise<AgentResult> {
  const startTime = Date.now()
  const timeoutMs = task.timeoutMs || DEFAULT_TIMEOUT_MS

  console.log(`[WORKER] Processing task ${task.taskId} (${task.agentType})`)

  // Create a timeout promise that returns a failure result
  const timeoutPromise = new Promise<AgentResult>(resolve => {
    setTimeout(() => {
      resolve({
        taskId: task.taskId,
        status: "failure" as const,
        error: `Task ${task.taskId} timed out after ${timeoutMs}ms`
      })
    }, timeoutMs)
  })

  // Create the adapter promise
  const adapterPromise: Promise<AgentResult> = (async () => {
    try {
      let result: AgentResult

      switch (task.agentType) {
        case "GENERATION":
          result = await generationAdapter(task)
          break
        case "REFLECTION":
          result = await reflectionAdapter(task)
          break
        case "RANKING":
          result = await rankingAdapter(task)
          break
        case "EVOLUTION":
          result = await evolutionAdapter(task)
          break
        case "PROXIMITY":
          result = await proximityAdapter(task)
          break
        case "META_REVIEW":
          result = await metaReviewAdapter(task)
          break
        case "STATCHECK":
          result = await statCheckAdapter(task)
          break
        case "REPORT":
          result = await reportWriterAdapter(task)
          break
        default:
          throw new Error(`Unknown agent type: ${task.agentType}`)
      }

      return result
    } catch (error: any) {
      console.error(`[WORKER] Error in adapter for ${task.agentType}:`, error)
      const failureResult: AgentResult = {
        taskId: task.taskId,
        status: "failure" as const,
        error: error.message || "Unknown error"
      }
      return failureResult
    }
  })()

  // Race between adapter and timeout
  const result = (await Promise.race([
    adapterPromise,
    timeoutPromise
  ])) as AgentResult
  const executionTime = Date.now() - startTime
  console.log(
    `[WORKER] Task ${task.taskId} completed in ${executionTime}ms (status: ${result.status})`
  )
  return result
}

/**
 * Run multiple tasks with concurrency limit
 */
export async function runTasksWithConcurrency(
  tasks: AgentTask[],
  concurrency: number = 4
): Promise<AgentResult[]> {
  if (tasks.length === 0) {
    return []
  }

  const results: AgentResult[] = new Array(tasks.length)
  let nextIndex = 0

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex
      nextIndex += 1

      if (currentIndex >= tasks.length) {
        break
      }

      const task = tasks[currentIndex]
      const result = await workerRunner(task)
      results[currentIndex] = result
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker()
  )

  await Promise.all(workers)
  return results
}
