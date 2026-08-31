/**
 * @jest-environment node
 *
 * Core design-creation pipeline - structural/wiring guard.
 *
 * This is the deterministic "automated e2e" gate for the main flow:
 *   literature → hypotheses → design → (chat context) → reports.
 * The LLM calls (Azure) + the agent worker are mocked, so it runs in
 * milliseconds and asserts the WIRING + output shapes - the class of
 * regressions that have actually broken this flow (missing fields, dropped
 * sections, bad merges, context that omits the design). Model-behaviour issues
 * (truncation, timeouts) are a separate live/prod concern.
 */

// ── Mock the Azure client. zodResponseFormat is real, so each parse call
//    carries response_format.json_schema.name - we switch canned output on it.
const CANNED: Record<string, any> = {
  experimentSetup: {
    whatWillBeTested: "Test the buffer effect",
    whatWillBeMeasured: "Aggregation by SEC-HPLC",
    controlGroups: "Untreated control",
    experimentalGroups: "pH 5.5, pH 7.0",
    sampleTypes: "IgG1 in vials",
    replicatesAndConditions: "n = 1 per condition",
    specificRequirements: "Cold chain"
  },
  materials: {
    toolsNeeded: "SEC-HPLC, DLS",
    materialsList: "| Material | ... |",
    materialPreparation: "### Histidine buffer ...",
    setupInstructions: "1. Calibrate balance",
    storageDisposal: "Store 2-8C"
  },
  protocol: {
    stepByStepProcedure: "1. **Weigh** ...",
    timeline: "| Day | Activity |",
    conditionsTable: "| Group | Condition |"
  },
  analysis: {
    dataCollectionPlan: "Record monomer % weekly",
    statisticalAnalysis: "Two-way ANOVA",
    safetyNotes: "PPE: gloves",
    rationale: "Controls confounders"
  },
  batchRanking: {
    ranked: Array.from({ length: 20 }, (_, i) => ({
      index: i + 1,
      score: 100 - i,
      reasoning: "ok"
    }))
  }
}

const mockParse = jest.fn(async (args: any) => {
  const name = args?.response_format?.json_schema?.name
  return { choices: [{ message: { parsed: CANNED[name] ?? {} } }] }
})

jest.mock("@/lib/azure-openai", () => ({
  __esModule: true,
  getAzureOpenAIForDesign: () => ({
    beta: { chat: { completions: { parse: (a: any) => mockParse(a) } } }
  }),
  getDesignDeployment: () => "gpt-test"
}))

// ── Mock the agent worker (generation/reflection/evolution/meta). Canned
//    output per agentType so the hypotheses pipeline produces a real top-N.
const mockRunTasks = jest.fn(
  async (tasks: any[]): Promise<any[]> =>
    tasks.map(t => {
      switch (t.agentType) {
        case "GENERATION":
          return {
            status: "success",
            output: Array.from({ length: 4 }, (_, i) => ({
              hypothesis: `Hypothesis ${t.taskId.slice(0, 4)}-${i}`,
              explanation: "Because of mechanism Z",
              feasibility_score: 0.8,
              novelty_score: 0.6
            }))
          }
        case "REFLECTION":
          return {
            status: "success",
            output: {
              strengths: ["clear"],
              weaknesses: ["narrow"],
              improvements: ["broaden"]
            }
          }
        case "EVOLUTION":
          return {
            status: "success",
            output: {
              variants: [
                {
                  hypothesis: "Evolved hypothesis",
                  improvement_type: "specificity",
                  explanation: "sharper"
                }
              ]
            }
          }
        case "META_REVIEW":
          return { status: "success", output: { prompt_patches: [] } }
        default:
          return { status: "success", output: [] }
      }
    })
)

jest.mock("@/app/api/design/draft/worker", () => ({
  __esModule: true,
  runTasksWithConcurrency: (tasks: any) => mockRunTasks(tasks)
}))

// ── Mock the literature scout agent.
const mockLitScout = jest.fn(async () => ({
  output: {
    citationsDetailed: [
      {
        title: "Buffer effects on mAb aggregation",
        abstract: "We studied pH effects ...",
        authors: ["Smith", "Lee"],
        year: 2023,
        journal: "J Pharm Sci",
        url: "https://doi.org/10.1/abc",
        relevanceScore: 0.92,
        source: "openalex"
      },
      {
        title: "Histidine formulation review",
        abstract: "Histidine buffers reduce ...",
        authors: ["Gupta"],
        year: 2021,
        journal: "MAbs",
        relevanceScore: 0.81,
        source: "pubmed"
      }
    ],
    citations: ["Smith 2023", "Gupta 2021"],
    whatOthersHaveDone: "Screened buffers",
    goodMethodsAndTools: "SEC-HPLC + DLS",
    potentialPitfalls: "Concentration confounds"
  }
}))

jest.mock("@/app/api/design/draft/agents", () => ({
  __esModule: true,
  callLiteratureScoutAgent: () => mockLitScout()
}))

import { runLiteraturePhase } from "@/lib/design/literature-phase"
import { runHypothesesPhase } from "@/lib/design/hypotheses-phase"
import {
  buildDesignBlocks,
  genSetup,
  genMaterials,
  genProtocol,
  genAnalysis,
  assembleDesign
} from "@/lib/design/design-sections"
import {
  buildDesignChatContext,
  TIER3_MAX_CHARS
} from "@/lib/design/chat-context"
import { resolveEffortConfig } from "@/lib/design-agent"

const CTX: any = {
  title: "Reduce mAb aggregation",
  problemStatement: "Aggregation during storage",
  goal: "Minimize HMW species",
  variables: ["pH", "excipient"],
  constraints: ["12 week timeline"],
  includeReplicates: "no"
}

beforeEach(() => {
  mockParse.mockClear()
  mockRunTasks.mockClear()
  mockLitScout.mockClear()
})

describe("literature phase", () => {
  it("returns papers + literatureContext from the scout output", async () => {
    const patch = await runLiteraturePhase(
      { ctx: CTX, existing: { schemaVersion: 2 } as any, mode: "replace" },
      () => {}
    )
    expect(mockLitScout).toHaveBeenCalledTimes(1)
    expect(patch.papers).toHaveLength(2)
    expect(patch.papers?.[0]).toMatchObject({
      title: "Buffer effects on mAb aggregation"
    })
    expect(patch.papers?.[0].summary).toBeTruthy()
    expect(patch.literatureContext?.whatOthersHaveDone).toBe("Screened buffers")
    expect(patch.literatureContext?.citations).toHaveLength(2)
  })

  it("append mode merges + dedupes against existing papers", async () => {
    const existing: any = {
      schemaVersion: 2,
      papers: [
        { id: "p0", title: "Buffer effects on mAb aggregation", selected: true }
      ]
    }
    const patch = await runLiteraturePhase(
      { ctx: CTX, existing, mode: "append" },
      () => {}
    )
    // existing 1 + 1 new unique (the dup title is dropped)
    expect(patch.papers?.length).toBe(2)
    expect(
      patch.papers?.some(p => p.title === "Histidine formulation review")
    ).toBe(true)
  })
})

describe("hypotheses phase", () => {
  it("produces a ranked top-5 with the frontend Hypothesis shape", async () => {
    const patch = await runHypothesesPhase(
      {
        ctx: CTX,
        existing: {
          schemaVersion: 2,
          literatureContext: { citations: [] }
        } as any,
        body: { papers: [] },
        designId: "design-1"
      },
      () => {}
    )
    // Derived, not hardcoded: how many hypotheses survive the tournament is a
    // function of the effort level, and pinning a literal here made the test
    // fail the moment the effort tiers were retuned - a config change, not a
    // regression. CTX sets no effort, so this resolves to the medium default.
    expect(patch.hypotheses).toHaveLength(
      resolveEffortConfig(CTX.effort).finalHypotheses
    )
    for (const h of patch.hypotheses ?? []) {
      expect(h).toMatchObject({
        id: expect.any(String),
        text: expect.any(String),
        reasoning: expect.any(String),
        selected: false
      })
      expect(Array.isArray(h.basedOnPaperIds)).toBe(true)
    }
    // ranking call + reflection/evolution/meta task batches ran
    expect(mockParse).toHaveBeenCalled() // batch ranking
    expect(mockRunTasks).toHaveBeenCalled()
  })

  it("throws a 502-tagged error when the generation pool comes back empty", async () => {
    mockRunTasks.mockImplementationOnce(async (tasks: any[]) =>
      tasks.map(() => ({ status: "failure", error: "boom" }))
    )
    mockRunTasks.mockImplementationOnce(async (tasks: any[]) =>
      tasks.map(() => ({ status: "failure", error: "boom" }))
    )
    await expect(
      runHypothesesPhase(
        {
          ctx: CTX,
          existing: { schemaVersion: 2 } as any,
          body: {},
          designId: "d"
        },
        () => {}
      )
    ).rejects.toThrow(/No hypotheses generated/)
  })
})

describe("design sections", () => {
  it("assembles a GeneratedDesign with all SOP sections", async () => {
    const hyp: any = {
      id: "h1",
      text: "pH 5.5 reduces aggregation",
      reasoning: "charge state",
      selected: true,
      basedOnPaperIds: []
    }
    const blocks = buildDesignBlocks(CTX, { schemaVersion: 2 } as any, hyp)
    const setup = await genSetup(blocks)
    const materials = await genMaterials(blocks, setup)
    const protocol = await genProtocol(blocks, setup, materials)
    const analysis = await genAnalysis(blocks, setup, materials, protocol)
    const design = assembleDesign(hyp, setup, materials, protocol, analysis)

    expect(design.hypothesisId).toBe("h1")
    // Streamlined section set (merged groups/replicates, folded-in setup).
    expect(design.sections.length).toBeGreaterThanOrEqual(15)
    const headings = design.sections.map(s => s.heading)
    for (const h of [
      "What Will Be Tested",
      "Materials List",
      "Step-by-Step Procedure",
      "Statistical Analysis",
      "Rationale"
    ]) {
      expect(headings).toContain(h)
    }
    // every section has a non-empty body
    expect(design.sections.every(s => s.body && s.body.length > 0)).toBe(true)
    // 4 section-generating LLM calls were made
    expect(mockParse).toHaveBeenCalledTimes(4)
  })
})

describe("design chat context", () => {
  it("includes problem, hypotheses, papers, and the active design body", () => {
    const activeDesign: any = {
      id: "d1",
      hypothesisId: "h1",
      title: "pH study",
      saved: true,
      sections: [
        { heading: "Step-by-Step Procedure", body: "Weigh 0.776 g histidine" }
      ]
    }
    const ctx = buildDesignChatContext({
      title: "Reduce mAb aggregation",
      problemStatement: "Aggregation during storage",
      objective: "Minimize HMW",
      domain: "formulation_development",
      phase: "screening",
      selectedHypotheses: [
        {
          id: "h1",
          text: "pH 5.5 helps",
          reasoning: "charge",
          selected: true,
          basedOnPaperIds: []
        } as any
      ],
      hypotheses: [
        {
          id: "h2",
          text: "excipient X helps",
          reasoning: "steric",
          selected: false,
          basedOnPaperIds: []
        } as any
      ],
      papers: [
        {
          id: "p1",
          title: "Buffer effects",
          summary: "pH matters",
          selected: true
        } as any
      ],
      generatedDesigns: [activeDesign],
      activeDesign
    })

    expect(ctx).toContain("Reduce mAb aggregation") // problem title
    expect(ctx).toContain("pH 5.5 helps") // selected hypothesis
    expect(ctx).toContain("[selected]")
    expect(ctx).toContain("[not selected]") // rejected hypothesis is included
    expect(ctx).toContain("Buffer effects") // cited paper
    expect(ctx).toContain("Weigh 0.776 g histidine") // active design body
    expect(ctx).toContain("Active design: pH study")
  })

  // Regression: the context is persisted into chats.prompt, whose column has
  // CHECK (char_length(prompt) <= 100000). A larger dump made the chat-row
  // INSERT fail with `chats_prompt_check` ("can't open the design chat").
  it("caps the context below the chats.prompt DB limit (chats_prompt_check)", () => {
    // The cap itself must stay under the 100k column limit (with base-prompt headroom).
    expect(TIER3_MAX_CHARS).toBeLessThanOrEqual(100_000)

    // A pathologically large design (many long sections) must still be truncated
    // to within the cap, never produce a prompt the DB would reject.
    const huge: any = {
      id: "big",
      hypothesisId: "h1",
      title: "Huge design",
      saved: true,
      sections: Array.from({ length: 60 }, (_, i) => ({
        heading: `Section ${i}`,
        body: "x".repeat(5000)
      }))
    }
    const ctx = buildDesignChatContext({
      title: "T",
      problemStatement: "P",
      objective: "O",
      domain: "d",
      phase: "p",
      selectedHypotheses: [],
      hypotheses: [],
      papers: [],
      generatedDesigns: [huge],
      activeDesign: huge
    })
    expect(ctx.length).toBeLessThanOrEqual(TIER3_MAX_CHARS + 32) // +marker slack
  })
})

/**
 * Lineage + provenance in the design chat context.
 *
 * These are the two multi-hop questions the chat could not answer, and neither
 * needed new retrieval - both edges were already in the object being passed in
 * and were being discarded on the way into the prompt. The version history was
 * collapsed to a count ("N prior version(s) saved") and basedOnPaperIds was
 * never rendered at all.
 */
describe("design chat context — lineage and provenance", () => {
  const paper = (id: string, title: string): any => ({
    id,
    title,
    summary: "",
    selected: true
  })
  const hyp = (id: string, text: string, papers: string[]): any => ({
    id,
    text,
    reasoning: "because",
    selected: true,
    basedOnPaperIds: papers
  })

  const version = (n: number, over: any = {}): any => ({
    id: `v${n}`,
    versionNumber: n,
    designs: [],
    createdAt: "2026-01-0" + n + "T00:00:00.000Z",
    origin: "simulation",
    ...over
  })

  const build = (over: any = {}) =>
    buildDesignChatContext({
      title: "Viscosity at 150 mg/mL",
      problemStatement: "Too viscous to inject",
      objective: "Below 20 cP",
      domain: "formulation_development",
      phase: "optimization",
      selectedHypotheses: [hyp("h1", "Arginine lowers viscosity", ["p2"])],
      hypotheses: [],
      papers: [paper("p1", "Unrelated paper"), paper("p2", "Arginine screen")],
      generatedDesigns: [],
      activeDesign: {
        id: "d1",
        hypothesisId: "h1",
        title: "Excipient screen",
        saved: true,
        sections: [{ heading: "Conditions Table", body: "| Group | n |" }]
      } as any,
      ...over
    })

  it("names the papers a hypothesis was built on, by citation number", () => {
    const ctx = build()
    // p2 is the second paper, so it must be cited as [2] - the same numbering
    // the "Cited literature" section uses, so the model can cross-reference.
    expect(ctx).toContain("Built on: [2] Arginine screen")
    // ...and must NOT claim the uncited paper backs it.
    expect(ctx).not.toContain("Built on: [1] Unrelated paper")
  })

  it("states which hypothesis a design came from", () => {
    const ctx = build()
    expect(ctx).toContain("Built from hypothesis 1: Arginine lowers viscosity")
  })

  it("renders each version's verdict and the changes carried forward", () => {
    const ctx = build({
      designVersions: [
        version(2, {
          outcome: {
            verdict: "Falls short on viscosity",
            meetRate: 0.42,
            metTarget: false,
            appliedChanges: ["Drop to 6 conditions", "Raise arginine to 100 mM"]
          }
        }),
        version(1, {
          origin: "original",
          outcome: {
            verdict: "Underpowered",
            meetRate: 0.1,
            metTarget: false,
            appliedChanges: ["Add a vehicle control"]
          }
        })
      ]
    })

    expect(ctx).toContain("## Design lineage")
    // This is the answer to "why does v3 run 6 conditions and not 8?".
    expect(ctx).toContain("Changes carried into v3: Drop to 6 conditions")
    expect(ctx).toContain("Falls short on viscosity")
    expect(ctx).toContain("Met the target in 42% of simulated runs")

    // Oldest first: a lineage only reads as a narrative forwards, and the
    // versions are stored newest-first.
    expect(ctx.indexOf("### v1")).toBeLessThan(ctx.indexOf("### v2"))
  })

  it("renders lineage even when there is no validation record", () => {
    // Versions exist without validation - a manual edit or a promoted older
    // version both create one. Gating the lineage on `validation` dropped the
    // whole history in exactly those cases.
    const ctx = build({
      validation: undefined,
      designVersions: [
        version(1, {
          origin: "manual",
          outcome: { appliedChanges: ["Swapped the buffer"] }
        })
      ]
    })
    expect(ctx).toContain("## Design lineage")
    expect(ctx).toContain("Changes carried into v2: Swapped the buffer")
    // And no empty iteration-history heading left behind.
    expect(ctx).not.toContain("## Iteration history")
  })

  it("says so explicitly when a version has no recorded outcome", () => {
    const ctx = build({ designVersions: [version(1, { outcome: undefined })] })
    expect(ctx).toContain("No recorded outcome for this version.")
  })
})
