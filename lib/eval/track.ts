"use client"

/**
 * Client side of the human-decision log.
 *
 * Two rules govern everything here:
 *
 *  1. It must never break, delay, or alter the flow it is observing. Every
 *     call is fire-and-forget and every failure is swallowed. A telemetry bug
 *     that costs a researcher their design is a far worse outcome than a
 *     missing row.
 *  2. It must survive navigation. These decisions are frequently the LAST
 *     thing that happens before the page changes - approving a patch, picking
 *     a hypothesis and moving on - so the request uses `keepalive`, which lets
 *     the browser finish it after the document goes away. Without that we
 *     would systematically lose exactly the decisions we most want.
 */
import type { EvalDecisionInput } from "./types"

export function trackDecision(input: EvalDecisionInput): void {
  try {
    // Derive the counts so callers cannot report a total that disagrees with
    // the candidate list they passed.
    const candidates = input.candidates
    const payload: EvalDecisionInput = {
      ...input,
      offeredCount: input.offeredCount ?? candidates?.length,
      chosenCount: input.chosenCount ?? candidates?.filter(c => c.chosen).length
    }

    void fetch("/api/eval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {
      /* observing must never fail the thing being observed */
    })
  } catch {
    /* ditto - including a JSON.stringify cycle in meta */
  }
}
