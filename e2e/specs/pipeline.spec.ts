/**
 * The science pipeline, end to end, against the live deployment.
 *
 * Serial and stateful on purpose: each phase feeds the next, exactly as it
 * does for a real researcher. Running them independently would mean paying for
 * literature four times over, and a hypotheses failure tells you nothing if
 * the papers it was built from were a fresh set.
 *
 * Every assertion is deliberately about SUBSTANCE rather than shape. A phase
 * that returns `{ papers: [] }` has technically succeeded and is completely
 * broken - that exact failure (zero papers, empty titles, hypotheses with no
 * citations) is what this suite exists to catch.
 */
import { test, expect } from "@playwright/test"
import { qaContext } from "../utils/context"
import { env, canAdminister } from "../utils/env"
import { findUserIdByEmail, stageCsvFile, type StagedFile } from "../utils/supabase-admin"
import {
  createDesign,
  deleteDesign,
  runPhase,
  QA_PROBLEM,
  type DesignContent
} from "../utils/app-api"

test.describe.configure({ mode: "serial" })

let designId = ""
let content: DesignContent = {}
let staged: StagedFile | null = null
const timings: Record<string, number> = {}

test.afterAll(async ({ request }) => {
  if (designId) await deleteDesign(request, designId)
  if (staged) await staged.cleanup()
  const summary = Object.entries(timings)
    .map(([k, v]) => `${k}=${(v / 1000).toFixed(0)}s`)
    .join("  ")
  if (summary) console.log(`[pipeline] timings: ${summary}`)
})

test("1. a design can be created", async ({ request }) => {
  const { workspaceId } = qaContext()
  designId = await createDesign(
    request,
    workspaceId,
    `QA nightly ${new Date().toISOString()}`
  )
  expect(designId, "design was not created").toBeTruthy()
})

test("2. literature search returns real papers", async ({ request }) => {
  const res = await runPhase(
    request,
    designId,
    {
      phase: "literature",
      problem: QA_PROBLEM,
      approvedPhases: ["problem"]
    },
    { label: "literature", timeoutMs: 12 * 60_000 }
  )
  timings.literature = res.durationMs
  content = res.content

  const papers = content.papers ?? []
  expect(papers.length, "literature returned no papers at all").toBeGreaterThan(0)
  // Low effort targets 15; anything in low single digits means an upstream arm
  // is down even though the phase "succeeded".
  expect(papers.length, `only ${papers.length} papers came back`).toBeGreaterThanOrEqual(5)

  // Titles were silently null for most non-OpenAlex sources once before; a
  // paper list full of blanks passes a length check and is useless.
  const titled = papers.filter(p => (p.title ?? "").trim().length >= 12)
  expect(
    titled.length,
    `${papers.length - titled.length} of ${papers.length} papers have no usable title`
  ).toBeGreaterThanOrEqual(Math.ceil(papers.length * 0.8))

  // Duplicates across sources were a real regression - the same study from
  // PubMed and the web appearing twice.
  const keys = papers.map(p => (p.title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
  const unique = new Set(keys.filter(Boolean))
  expect(
    unique.size,
    `papers contain duplicates: ${keys.length} rows, ${unique.size} distinct titles`
  ).toBe(keys.filter(Boolean).length)
})

test("3. hypotheses are generated and grounded in the papers", async ({ request }) => {
  const papers = (content.papers ?? []).map(p => ({ ...p, selected: true }))
  expect(papers.length, "no papers to build hypotheses from").toBeGreaterThan(0)

  const res = await runPhase(
    request,
    designId,
    {
      phase: "hypotheses",
      problem: QA_PROBLEM,
      papers,
      approvedPhases: ["problem", "literature"]
    },
    { label: "hypotheses", timeoutMs: 15 * 60_000 }
  )
  timings.hypotheses = res.durationMs
  content = { ...content, ...res.content }

  const hyps = content.hypotheses ?? []
  expect(hyps.length, "no hypotheses generated").toBeGreaterThan(0)
  for (const h of hyps) {
    expect((h.text ?? "").trim().length, "hypothesis has empty text").toBeGreaterThan(20)
  }

  // Grounding: provenance was being dropped, leaving every hypothesis with an
  // empty basedOnPaperIds and no visible link to the literature.
  const grounded = hyps.filter(
    h => Array.isArray((h as any).basedOnPaperIds) && (h as any).basedOnPaperIds.length > 0
  )
  expect(
    grounded.length,
    "no hypothesis cites any of the selected papers - provenance is being dropped"
  ).toBeGreaterThan(0)
})

test("4. a full experiment design is generated", async ({ request }) => {
  const hyps = (content.hypotheses ?? []).map((h, i) => ({ ...h, selected: i === 0 }))
  expect(hyps.length, "no hypotheses to design from").toBeGreaterThan(0)

  const res = await runPhase(
    request,
    designId,
    {
      phase: "design",
      problem: QA_PROBLEM,
      hypotheses: hyps,
      approvedPhases: ["problem", "literature", "hypotheses"]
    },
    { label: "design", timeoutMs: 20 * 60_000 }
  )
  timings.design = res.durationMs
  content = { ...content, ...res.content }

  const designs = content.designs ?? []
  expect(designs.length, "no design generated").toBeGreaterThan(0)

  const sections = designs[0].sections ?? []
  expect(sections.length, "design has no sections").toBeGreaterThan(5)

  // The sections a protocol is useless without. Named explicitly so a silently
  // dropped section is a failure rather than a shrug.
  const headings = sections.map(s => s.heading.toLowerCase())
  for (const required of [
    "conditions table",
    "materials list",
    "step-by-step procedure",
    "data collection plan"
  ]) {
    expect(
      headings.some(h => h.includes(required)),
      `design is missing the "${required}" section. Got: ${headings.join(", ")}`
    ).toBeTruthy()
  }

  // Every section must have real content - an empty body renders as a blank
  // heading and reads as a broken design.
  const empty = sections.filter(s => (s.body ?? "").trim().length < 40)
  expect(
    empty.length,
    `sections with no meaningful body: ${empty.map(s => s.heading).join(", ")}`
  ).toBe(0)

  // The conditions table must actually be a table.
  const conditions = sections.find(s => s.heading.toLowerCase().includes("conditions table"))
  expect(
    (conditions?.body ?? "").includes("|"),
    "the conditions table came back as prose rather than a markdown table"
  ).toBeTruthy()
})

test("5. a report is generated from the design", async ({ request }) => {
  test.skip(!canAdminister(), "needs SUPABASE_SERVICE_ROLE_KEY to stage a data file")

  const { workspaceId } = qaContext()
  const userId = await findUserIdByEmail(env.email)
  expect(userId, `could not resolve a user id for ${env.email}`).toBeTruthy()

  staged = await stageCsvFile({
    userId: userId!,
    workspaceId,
    name: `qa-nightly-${Date.now()}.csv`,
    csv: [
      "condition,arginine_mM,viscosity_cP,monomer_pct",
      "C0 control,0,42.1,98.4",
      "F1,25,31.7,98.1",
      "F2,50,22.4,97.8",
      "F3,75,18.9,97.2",
      "F4,100,17.5,96.1"
    ].join("\n")
  })

  const startedAt = Date.now()
  const res = await request.post("/api/report/outline", {
    data: {
      dataFiles: [staged.id],
      experimentObjective: QA_PROBLEM.objective,
      designContext: `Design: ${content.designs?.[0]?.title ?? "QA design"}`
    },
    timeout: 15 * 60_000
  })
  timings.report = Date.now() - startedAt

  expect(
    res.ok(),
    `report generation failed: HTTP ${res.status()} ${(await res.text().catch(() => "")).slice(0, 300)}`
  ).toBeTruthy()

  const json = await res.json()
  const draft = json?.draft ?? json?.report ?? json
  const text = JSON.stringify(draft ?? {})
  expect(text.length, "report generation returned an empty draft").toBeGreaterThan(400)

  // The sections that make a report a report.
  for (const key of ["aim", "results", "conclusion"]) {
    expect(
      Object.prototype.hasOwnProperty.call(draft ?? {}, key) || text.includes(key),
      `report draft has no "${key}" section. Keys: ${Object.keys(draft ?? {}).join(", ")}`
    ).toBeTruthy()
  }
})
