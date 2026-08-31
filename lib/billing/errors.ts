import { NextResponse } from "next/server"
import type { PlanId } from "./plans"

/**
 * Thrown by the pre-flight budget check when a user has no credits left for
 * the period. Routes map this to a 402 via `budgetErrorResponse`.
 */
export class BudgetExceededError extends Error {
  readonly code = "TOKEN_LIMIT"
  readonly plan: PlanId
  constructor(
    plan: PlanId,
    message = "Token limit reached for this billing period"
  ) {
    super(message)
    this.name = "BudgetExceededError"
    this.plan = plan
  }
}

export function isBudgetExceededError(e: unknown): e is BudgetExceededError {
  return (
    e instanceof BudgetExceededError ||
    (typeof e === "object" &&
      e !== null &&
      (e as { code?: string }).code === "TOKEN_LIMIT")
  )
}

/** Standard 402 payload. The client (handle-budget-error.ts) keys off `code`. */
export function budgetErrorResponse(plan: PlanId = "free") {
  return NextResponse.json(
    {
      error:
        "You've used all your credits for this billing period. Upgrade your plan or add credits to continue.",
      code: "TOKEN_LIMIT",
      plan
    },
    { status: 402 }
  )
}

/**
 * Thrown when a FREE user has used up their free experiments (generated
 * designs) and the experiment paywall is enforced. Routes map this to a 402.
 */
export class ExperimentLimitError extends Error {
  readonly code = "EXPERIMENT_LIMIT"
  readonly used: number
  readonly limit: number
  constructor(used: number, limit: number) {
    super("Free experiment limit reached")
    this.name = "ExperimentLimitError"
    this.used = used
    this.limit = limit
  }
}

export function isExperimentLimitError(e: unknown): e is ExperimentLimitError {
  return (
    e instanceof ExperimentLimitError ||
    (typeof e === "object" &&
      e !== null &&
      (e as { code?: string }).code === "EXPERIMENT_LIMIT")
  )
}

/** Standard 402 payload for the free-experiment paywall. */
export function experimentErrorResponse(used: number, limit: number) {
  return NextResponse.json(
    {
      error: `You've used your ${limit} free experiments. Upgrade to keep designing.`,
      code: "EXPERIMENT_LIMIT",
      used,
      limit
    },
    { status: 402 }
  )
}
