/**
 * Thin client over the app's own HTTP API, used by the pipeline spec.
 *
 * The AI phases take minutes each and are driven by polling, not by anything
 * visible in the DOM. Clicking through them in a browser would mean 20 minutes
 * of waiting on spinners and asserting against selectors that change whenever
 * the UI is restyled - so the pipeline test drives the same endpoints the app
 * itself calls, and asserts on the CONTENT that comes back. A UI regression is
 * caught by the smoke project; this project is about whether the science
 * pipeline still produces papers, hypotheses, designs and reports.
 *
 * The request context carries the signed-in session cookie, so these calls are
 * authorised exactly as the app's own would be.
 */
import type { APIRequestContext } from "@playwright/test"

export interface PhaseProgressEvent {
  step?: string
  message?: string
  [k: string]: unknown
}

export interface DesignDoc {
  id: string
  name?: string
  content?: unknown
  designJob?: {
    state?: "running" | "complete" | "failed"
    progress?: PhaseProgressEvent[]
    error?: string
  }
}

export interface DesignContent {
  papers?: Array<{ id: string; title: string; selected?: boolean }>
  hypotheses?: Array<{ id: string; text: string; selected?: boolean }>
  designs?: Array<{
    id: string
    title: string
    sections?: Array<{ heading: string; body: string }>
  }>
  [k: string]: unknown
}

function parseContent(raw: unknown): DesignContent {
  if (!raw) return {}
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return raw as DesignContent
}

async function readError(res: {
  status(): number
  text(): Promise<string>
}): Promise<string> {
  const body = await res.text().catch(() => "")
  return `HTTP ${res.status()}${body ? ` - ${body.slice(0, 400)}` : ""}`
}

export async function createDesign(
  request: APIRequestContext,
  workspaceId: string,
  name: string
): Promise<string> {
  const res = await request.post("/api/designs", {
    data: { workspaceId, design: { name, description: "Nightly QA run" } }
  })
  if (!res.ok()) throw new Error(`createDesign failed: ${await readError(res)}`)
  const doc = await res.json()
  if (!doc?.id) throw new Error("createDesign returned no id")
  return doc.id as string
}

export async function getDesign(
  request: APIRequestContext,
  designId: string
): Promise<DesignDoc> {
  const res = await request.get(`/api/design/${designId}`)
  if (!res.ok()) throw new Error(`getDesign failed: ${await readError(res)}`)
  return (await res.json()) as DesignDoc
}

export async function deleteDesign(
  request: APIRequestContext,
  designId: string
): Promise<void> {
  // Cleanup is best-effort: a leaked test design is untidy, but failing the
  // run over it would turn a healthy night red.
  try {
    await request.delete(`/api/design/${designId}`)
  } catch {
    /* ignore */
  }
}

export interface RunPhaseResult {
  content: DesignContent
  /** Wall-clock milliseconds the phase took. */
  durationMs: number
  progress: PhaseProgressEvent[]
}

/**
 * Start one pipeline phase and poll until it completes.
 *
 * Mirrors the app's own runPhaseBackground + pollDesignJob: POST to start,
 * then poll the design document until `designJob.state` is terminal. The
 * timeout is generous because a design phase is four serial gpt-5.5 calls.
 */
export async function runPhase(
  request: APIRequestContext,
  designId: string,
  body: Record<string, unknown>,
  opts: { timeoutMs?: number; pollMs?: number; label?: string } = {}
): Promise<RunPhaseResult> {
  const timeoutMs = opts.timeoutMs ?? 15 * 60_000
  const pollMs = opts.pollMs ?? 5_000
  const label = opts.label ?? String(body.phase ?? "phase")
  const startedAt = Date.now()

  const start = await request.post(`/api/design/${designId}/generate`, {
    data: body,
    timeout: 120_000
  })
  if (!start.ok()) {
    throw new Error(`[${label}] failed to start: ${await readError(start)}`)
  }

  let seen = 0
  const progress: PhaseProgressEvent[] = []

  for (;;) {
    if (Date.now() - startedAt > timeoutMs) {
      const last = progress[progress.length - 1]
      throw new Error(
        `[${label}] timed out after ${Math.round((Date.now() - startedAt) / 1000)}s. ` +
          `Last progress: ${last ? JSON.stringify(last) : "(none)"}`
      )
    }
    await new Promise(r => setTimeout(r, pollMs))

    let doc: DesignDoc
    try {
      doc = await getDesign(request, designId)
    } catch {
      continue // transient - keep polling, the timeout is the real guard
    }

    const job = doc.designJob
    const events = Array.isArray(job?.progress) ? job!.progress! : []
    for (let i = seen; i < events.length; i++) {
      progress.push(events[i])
      // Streamed to the CI log so a stalled phase is diagnosable from the run.
      console.log(`  [${label}] ${events[i]?.message ?? events[i]?.step ?? ""}`)
    }
    seen = events.length

    if (job?.state === "failed") {
      throw new Error(`[${label}] reported failure: ${job.error || "no reason given"}`)
    }
    if (job?.state === "complete") {
      return {
        content: parseContent(doc.content),
        durationMs: Date.now() - startedAt,
        progress
      }
    }
  }
}

/** A realistic formulation problem - concrete enough to exercise real search. */
export const QA_PROBLEM = {
  title: "Nightly QA - viscosity reduction at high mAb concentration",
  problemStatement:
    "A monoclonal antibody formulated at 150 mg/mL is too viscous to deliver " +
    "through a 27G needle. We want to identify excipients that reduce " +
    "viscosity without compromising monomer content.",
  objective:
    "Reduce solution viscosity to below 20 cP at 150 mg/mL while keeping " +
    "SEC monomer at or above 95%.",
  successCriteria:
    "Viscosity below 20 cP at 150 mg/mL and 25 C, with SEC monomer >= 95%.",
  domain: "Formulation development",
  phase: "Optimization",
  effort: "low" as const,
  includeReplicates: "no" as const,
  constraintsStructured: {
    material: "500 mg of mAb",
    time: "2 weeks",
    equipment: "Rheometer, SEC-HPLC, pH meter, analytical balance"
  },
  designSpec: { conditions: "at most 6 conditions" }
}
