/**
 * @jest-environment node
 *
 * Free-experiment paywall error mapping. The DB-bound gate (assertExperimentQuota
 * / counter) is integration-level; here we lock the pure error contract the
 * client keys off (code EXPERIMENT_LIMIT, 402).
 */
import {
  ExperimentLimitError,
  isExperimentLimitError,
  experimentErrorResponse
} from "@/lib/billing/errors"
import { FREE_EXPERIMENT_LIMIT } from "@/lib/billing/plans"

describe("ExperimentLimitError", () => {
  it("carries code + used/limit", () => {
    const e = new ExperimentLimitError(3, 3)
    expect(e.code).toBe("EXPERIMENT_LIMIT")
    expect(e.used).toBe(3)
    expect(e.limit).toBe(3)
    expect(isExperimentLimitError(e)).toBe(true)
  })

  it("isExperimentLimitError matches a plain object with the code", () => {
    expect(isExperimentLimitError({ code: "EXPERIMENT_LIMIT" })).toBe(true)
    expect(isExperimentLimitError({ code: "TOKEN_LIMIT" })).toBe(false)
    expect(isExperimentLimitError(new Error("x"))).toBe(false)
  })

  it("experimentErrorResponse is a 402 with the code + limit", async () => {
    const res = experimentErrorResponse(3, 3)
    expect(res.status).toBe(402)
    const body = await res.json()
    expect(body.code).toBe("EXPERIMENT_LIMIT")
    expect(body.limit).toBe(3)
  })

  it("free limit is the documented default", () => {
    expect(FREE_EXPERIMENT_LIMIT).toBe(3)
  })
})
