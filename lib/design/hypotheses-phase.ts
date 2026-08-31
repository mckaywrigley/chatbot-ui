/**
 * Hypothesis-generation phase, extracted from the inline `case "hypotheses"` of
 * app/api/design/[designid]/generate/route.ts so it can run in the Inngest
 * worker (processDesignPhase). It's a 5-stage pipeline - generate → rank →
 * reflect → evolve → meta-review (~32 gpt-5.5 calls) - that can approach the
 * 300s serverless cap.
 *
 * Pure: inputs in, content patch out. Progress via the onProgress callback.
 */
import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"
import { v4 as uuidv4 } from "uuid"
import {
  getAzureOpenAIForDesign,
  getDesignDeployment
} from "@/lib/azure-openai"
import { runTasksWithConcurrency } from "@/app/api/design/draft/worker"
import type { AgentTask } from "@/app/api/design/draft/types/interfaces"
import {
  resolveEffortConfig,
  type DesignContentV2,
  type Hypothesis,
  type Paper,
  type ProblemContext
} from "@/lib/design-agent"

const GENERATION_AGENT_COUNT = 5
const GENERATION_CONCURRENCY = 4

interface RankedHypothesis {
  id: string
  title: string
  text: string
  explanation: string
  /**
   * The generation agent's citations - "[2] Paper title - how it informed
   * this". These were being thrown away the moment they arrived, so the
   * literature the researcher selected had no visible influence on the
   * hypotheses and no bearing on which one ranked top. In auto mode, where
   * exactly one hypothesis is carried forward automatically, that meant the
   * single hypothesis could be the least grounded of the batch.
   */
  provenance: string[]
  /** Indices (1-based) of the selected papers this hypothesis cites. */
  paperIndices: number[]
  rank: number
  feasibility: number
  novelty: number
}

/** Pull the `[N]` paper references out of an agent's provenance strings. */
function paperIndicesFrom(provenance: string[], paperCount: number): number[] {
  const found = new Set<number>()
  for (const line of provenance) {
    for (const m of String(line).matchAll(/\[(\d{1,2})\]/g)) {
      const n = Number(m[1])
      if (n >= 1 && n <= paperCount) found.add(n)
    }
  }
  return [...found].sort((a, b) => a - b)
}

/**
 * Content words of a hypothesis, for cross-agent near-duplicate detection.
 * The parallel agents can still land on the same idea; ranking alone would then
 * surface it repeatedly ("the same hypothesis in different language").
 */
const STOP = new Set([
  "the",
  "a",
  "an",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "and",
  "or",
  "by",
  "with",
  "from",
  "is",
  "are",
  "be",
  "will",
  "would",
  "that",
  "this",
  "these",
  "those",
  "as",
  "than",
  "increase",
  "increases",
  "increasing",
  "increased",
  "decrease",
  "decreases",
  "decreasing",
  "decreased",
  "higher",
  "lower",
  "reduce",
  "reduces",
  "reducing",
  "reduced",
  "improve",
  "improves",
  "improving",
  "improved",
  "effect",
  "effects"
])

function contentWords(text: string): Set<string> {
  return new Set(
    (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s.-]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP.has(w))
  )
}

/** Jaccard overlap of content words; >= 0.5 reads as the same claim reworded. */
function similarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let shared = 0
  for (const w of a) if (b.has(w)) shared++
  return shared / (a.size + b.size - shared)
}

/**
 * Greedy diversity-aware pick: walk the ranked pool and keep a hypothesis only
 * if it isn't a near-duplicate of one already kept. Falls back to filling the
 * remaining slots from the skipped set so we always return `n` when possible.
 */
function pickDiverse(
  pool: RankedHypothesis[],
  n: number,
  threshold = 0.5
): RankedHypothesis[] {
  const kept: RankedHypothesis[] = []
  const keptWords: Set<string>[] = []
  const skipped: RankedHypothesis[] = []
  for (const h of pool) {
    if (kept.length >= n) break
    const words = contentWords(h.text)
    if (keptWords.some(k => similarity(words, k) >= threshold)) {
      skipped.push(h)
      continue
    }
    kept.push(h)
    keptWords.push(words)
  }
  for (const h of skipped) {
    if (kept.length >= n) break
    kept.push(h)
  }
  return kept
}

type Progress = (ev: Record<string, unknown>) => void

export async function runHypothesesPhase(
  args: {
    ctx: ProblemContext
    existing: DesignContentV2
    body: { papers?: Paper[] }
    designId: string
  },
  onProgress: Progress
): Promise<Partial<DesignContentV2>> {
  const { ctx, existing, body, designId } = args
  // Effort scales how many hypotheses survive the tournament to the user.
  const FINAL_TOP_N = resolveEffortConfig(ctx.effort).finalHypotheses
  const litCtx = existing.literatureContext
  // The objective, success criteria and condition budget were being collected
  // from the researcher and then never handed to the generation agents, so
  // hypotheses drifted off the stated goal and proposed arm counts the lab
  // could not run. Known/unknown variables are passed too, but explicitly
  // labelled low-weight so they inform without steering.
  const cs = ctx.constraintsStructured
  const vs = ctx.variablesStructured
  const planMeta = {
    title: ctx.title || "Untitled",
    description: [
      ctx.problemStatement || ctx.goal || "",
      ctx.objective
        ? `Objective (what success looks like): ${ctx.objective}`
        : "",
      ctx.successCriteria
        ? `Success criteria - the hypothesis must be capable of being judged against these: ${ctx.successCriteria}`
        : "",
      ctx.additionalDetails
        ? `Operating parameters (be specific to these - use concrete concentrations, buffers, temperatures, and ranges, not generic language): ${ctx.additionalDetails}`
        : ""
    ]
      .filter(Boolean)
      .join("\n\n"),
    constraints: {
      conditionBudget: ctx.designSpec?.conditions || undefined,
      materialAvailable: cs?.material || undefined,
      timeAvailable: cs?.time || undefined,
      equipmentAvailable: cs?.equipment || undefined,
      knownVariablesLowWeight: vs?.known || undefined,
      unknownVariablesLowWeight: vs?.unknown || undefined,
      variables: (ctx as { variables?: string[] }).variables,
      constraints: (ctx as { constraints?: string[] }).constraints
    }
  }

  const selectedPapers = (body.papers ?? existing.papers ?? []).filter(
    p => p.selected
  )

  // ── Step 1: Generation (5 agents × 4 candidates) with one empty-pool retry ──
  onProgress({
    step: "generating",
    message: `Generating candidate hypotheses across ${GENERATION_AGENT_COUNT} agents...`
  })
  const genTasks: AgentTask[] = []
  for (let i = 0; i < GENERATION_AGENT_COUNT; i++) {
    genTasks.push({
      taskId: uuidv4(),
      planId: designId,
      agentType: "GENERATION",
      n_candidates: 4,
      priority: 1,
      metadata: {
        plan: planMeta,
        // Each parallel agent gets a distinct diversity lens + paper anchor
        // (see GENERATION_LENSES) so the pool isn't N takes on one idea.
        agentIndex: i,
        ...(litCtx ? { literatureContext: litCtx } : {}),
        selectedPapers: selectedPapers.map((p, idx) => ({
          index: idx + 1,
          title: p.title,
          summary: p.summary,
          sourceUrl: p.sourceUrl
        }))
      }
    })
  }

  const pool: RankedHypothesis[] = []
  for (let attempt = 1; attempt <= 2 && pool.length === 0; attempt++) {
    if (attempt > 1) {
      onProgress({
        step: "generating",
        message: "Retrying hypothesis generation after a transient error..."
      })
    }
    const tasks =
      attempt === 1 ? genTasks : genTasks.map(t => ({ ...t, taskId: uuidv4() }))
    const genResults = await runTasksWithConcurrency(
      tasks,
      GENERATION_CONCURRENCY
    )
    for (const r of genResults) {
      if (r.status === "success" && Array.isArray(r.output)) {
        for (const item of r.output as any[]) {
          const provenance: string[] = Array.isArray(item.provenance)
            ? item.provenance.map((x: unknown) => String(x))
            : []
          pool.push({
            id: `h-${uuidv4()}`,
            title: (item.title || "").trim(),
            text: item.hypothesis || "",
            explanation: item.explanation || "",
            provenance,
            paperIndices: paperIndicesFrom(provenance, selectedPapers.length),
            rank: 0,
            feasibility: item.feasibility_score ?? 0,
            novelty: item.novelty_score ?? 0
          })
        }
      }
    }
  }

  if (pool.length === 0) {
    throw Object.assign(
      new Error(
        "No hypotheses generated after a retry. Check that Azure OpenAI is configured and try again."
      ),
      { status: 502 }
    )
  }
  onProgress({
    step: "generated",
    message: `Generated ${pool.length} candidate hypotheses`,
    count: pool.length
  })

  // ── Step 2: Batch ranking (single LLM call) ─────────────────────────────────
  const batchRankingSchema = z.object({
    ranked: z.array(
      z.object({
        index: z.number(),
        score: z.number().min(0).max(100),
        reasoning: z.string()
      })
    )
  })
  // Ranking sees the CITATIONS too. Scoring on the hypothesis sentence alone
  // rewarded whichever one sounded boldest, regardless of whether the selected
  // literature supported it - which is how auto mode ended up carrying forward
  // a hypothesis that read as unrelated to the papers.
  const numberedList = pool
    .map((h, i) => {
      const cites = h.provenance.length
        ? `\n    Grounded in: ${h.provenance.join(" | ").slice(0, 600)}`
        : "\n    Grounded in: (no papers cited)"
      return `[${i + 1}] ${h.text}${cites}`
    })
    .join("\n")
  onProgress({
    step: "ranking",
    message: `Ranking ${pool.length} hypotheses by rigor, feasibility, novelty...`
  })
  try {
    const openai = getAzureOpenAIForDesign()
    const model = getDesignDeployment()
    const completion = await openai.beta.chat.completions.parse({
      model,
      messages: [
        {
          role: "system",
          content: `You are a scientific hypothesis ranking agent. You will receive a numbered list of hypotheses, each with the papers it cites, and must score each one from 0-100 based on:
- GROUNDING IN THE SELECTED LITERATURE (30%) - the researcher chose these papers, and a hypothesis exists to build on them. Score highly when the cited work genuinely supports the claim and the hypothesis reads as a next step from it, ideally synthesising ACROSS more than one paper. A hypothesis citing NO papers, or whose citations do not actually bear on what it claims, must be scored LOW however clever it sounds - it is speculation, and the researcher will read it as random.
- Quantitative specificity (25%) - a strong hypothesis names the SPECIFIC variable, direction, magnitude, and conditions (e.g. concentrations with units, temperatures, pH, timepoints). HEAVILY penalise vague, hand-wavy, or purely qualitative statements ("X may improve stability") that lack concrete, testable quantities.
- Scientific rigor and testability (20%)
- Feasibility and practicality (15%)
- Novelty and potential impact (10%)

The top-ranked hypothesis may be carried forward on its own without the researcher choosing it, so it must be the one best supported by their literature - not merely the most striking. Return every hypothesis with its original index number, a score, and a one-sentence reasoning.`
        },
        {
          role: "user",
          content: `Rank these ${pool.length} hypotheses:\n\n${numberedList}`
        }
      ],
      temperature: 0.3,
      response_format: zodResponseFormat(batchRankingSchema, "batchRanking")
    })
    const parsed = completion.choices[0]?.message?.parsed
    if (parsed?.ranked) {
      for (const entry of parsed.ranked) {
        const idx = entry.index - 1
        if (idx >= 0 && idx < pool.length) pool[idx].rank = entry.score
      }
    }
  } catch (rankErr: any) {
    console.warn(
      `[hypotheses] batch ranking failed, falling back to feasibility+novelty: ${rankErr?.message}`
    )
    for (const h of pool) h.rank = Math.round((h.feasibility + h.novelty) * 50)
  }

  pool.sort((a, b) => b.rank - a.rank)
  // Diversity-aware pick, NOT a plain slice: the parallel agents can still
  // converge, and slicing the top N then returned the same claim reworded N
  // times. Near-duplicates are pushed down in favour of the next distinct idea.
  const topHypotheses = pickDiverse(pool, FINAL_TOP_N)
  onProgress({
    step: "ranked",
    message: `Top ${topHypotheses.length} selected`,
    scores: topHypotheses.map(h => h.rank)
  })

  // ── Step 3: Reflection (critique top 5) ─────────────────────────────────────
  onProgress({
    step: "reflecting",
    message: `Critiquing top ${FINAL_TOP_N} - strengths, weaknesses, improvements...`
  })
  const reflectionTasks: AgentTask[] = topHypotheses.map(h => ({
    taskId: uuidv4(),
    planId: designId,
    agentType: "REFLECTION" as const,
    priority: 3,
    metadata: {
      hypothesis: { content: h.text, explanation: h.explanation }
    }
  }))
  const reflectionResults = await runTasksWithConcurrency(
    reflectionTasks,
    GENERATION_CONCURRENCY
  )
  for (let i = 0; i < topHypotheses.length; i++) {
    const ref = reflectionResults[i]
    if (ref?.status === "success" && ref.output) {
      const o = ref.output as any
      const parts: string[] = [topHypotheses[i].explanation]
      if (o.strengths?.length)
        parts.push(
          `\nStrengths:\n${o.strengths.map((s: string) => `- ${s}`).join("\n")}`
        )
      if (o.weaknesses?.length)
        parts.push(
          `\nWeaknesses:\n${o.weaknesses.map((s: string) => `- ${s}`).join("\n")}`
        )
      if (o.improvements?.length)
        parts.push(
          `\nSuggested improvements:\n${o.improvements.map((s: string) => `- ${s}`).join("\n")}`
        )
      topHypotheses[i].explanation = parts.join("\n")
    }
  }

  // ── Step 4: Evolution (improved variants) ───────────────────────────────────
  onProgress({
    step: "evolving",
    message: `Evolving hypotheses - generating improved variants...`
  })
  const evolutionTasks: AgentTask[] = topHypotheses.map(h => ({
    taskId: uuidv4(),
    planId: designId,
    agentType: "EVOLUTION" as const,
    hypothesisId: h.id,
    priority: 4,
    metadata: {
      hypothesis: { content: h.text, explanation: h.explanation }
    }
  }))
  const evoResults = await runTasksWithConcurrency(
    evolutionTasks,
    GENERATION_CONCURRENCY
  )
  for (let i = 0; i < topHypotheses.length; i++) {
    const evo = evoResults[i]
    if (evo?.status === "success" && (evo.output as any)?.variants?.length) {
      const best = (evo.output as any).variants[0]
      if (best?.hypothesis && best?.improvement_type) {
        topHypotheses[i].text = best.hypothesis
        topHypotheses[i].explanation +=
          `\n\nEvolved (${best.improvement_type}): ${best.explanation || ""}`
      }
    }
  }

  // ── Step 5: Meta-review (best-effort) ───────────────────────────────────────
  onProgress({
    step: "meta_review",
    message: "Meta-review and final polish..."
  })
  const metaTask: AgentTask = {
    taskId: uuidv4(),
    planId: designId,
    agentType: "META_REVIEW",
    priority: 5,
    metadata: {
      plan: planMeta,
      topHypotheses: topHypotheses.map(h => ({ content: h.text }))
    }
  }
  await runTasksWithConcurrency([metaTask], 1)

  // ── Assemble Hypothesis[] for the frontend ──────────────────────────────────
  // Attach the literature the hypothesis was built on: the ids so the UI can
  // link the actual paper cards, and the agent's own one-line justifications
  // appended to the reasoning so the researcher can see WHY each paper matters
  // here. Both were previously dropped, leaving every hypothesis looking
  // untethered from the papers that produced it.
  const hypotheses: Hypothesis[] = topHypotheses.map(h => {
    const citedIds = h.paperIndices
      .map(n => selectedPapers[n - 1]?.id)
      .filter((id): id is string => !!id)
    const reasoning = h.provenance.length
      ? `${h.explanation}\n\nBuilt on:\n${h.provenance.map(p => `- ${p}`).join("\n")}`
      : h.explanation
    return {
      id: h.id,
      ...(h.title ? { title: h.title } : {}),
      text: h.text,
      reasoning,
      basedOnPaperIds: citedIds,
      selected: false
    }
  })

  const papers = body.papers ?? existing.papers ?? []
  // Downstream clear (wipe stale designs) is applied by the worker's finalize
  // step - `undefined` doesn't survive Inngest step serialization.
  return { problem: ctx, papers, hypotheses }
}
