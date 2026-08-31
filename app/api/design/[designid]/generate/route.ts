import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { adminDb } from "@/lib/firebase/admin"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"
import {
  getAzureOpenAIForDesign,
  getDesignDeployment
} from "@/lib/azure-openai"
import {
  PHASE_ORDER,
  runSimulation,
  type DesignContentV2,
  type GeneratedDesign,
  type Hypothesis,
  type Paper,
  type PhaseKey,
  type ProblemContext,
  type StoredLiteratureContext
} from "@/lib/design-agent"
import {
  callLiteratureScoutAgent,
  type LiteratureScoutProgressEvent
} from "@/app/api/design/draft/agents"
import { runTasksWithConcurrency } from "@/app/api/design/draft/worker"
import type { ExperimentDesignState } from "@/app/api/design/draft/types"
import type { AgentTask } from "@/app/api/design/draft/types/interfaces"
import { assertBudget, assertExperimentQuota } from "@/lib/billing/account"
import { meterRun } from "@/lib/billing/with-meter"
import {
  budgetErrorResponse,
  experimentErrorResponse,
  isBudgetExceededError,
  isExperimentLimitError,
  type ExperimentLimitError
} from "@/lib/billing/errors"
import { inngest } from "@/lib/inngest/client"
import { evaluateAccess, getPermissionForUser } from "@/lib/design/sharing"

const FINAL_TOP_N = 5

/** Internal hypothesis representation with scores for the pipeline. */
interface RankedHypothesis {
  id: string
  text: string
  explanation: string
  rank: number
  feasibility: number
  novelty: number
}

type Phase = "literature" | "hypotheses" | "design" | "simulation"

const GENERATION_AGENT_COUNT = 5
const GENERATION_CONCURRENCY = 4

interface Body {
  phase: Phase
  problem?: ProblemContext
  papers?: Paper[]
  hypotheses?: Hypothesis[]
  designId?: string
  approvedPhases?: PhaseKey[]
  /** For `literature` phase: "append" adds new unique papers to the existing
   *  list instead of replacing it (used by the "Generate more" button). */
  mode?: "append" | "replace"
}

/**
 * Agentic generation endpoint. Each phase calls the real AI agents and
 * clears all downstream data to keep the pipeline consistent.
 */
export async function POST(
  request: Request,
  { params }: { params: { designid: string } }
) {
  try {
    const supabase = createClient(cookies())
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const designId = params.designid
    if (!designId || designId === "undefined" || designId === "null") {
      return NextResponse.json({ error: "Invalid design ID" }, { status: 400 })
    }

    const body = (await request.json()) as Body
    if (!body?.phase) {
      return NextResponse.json({ error: "Missing phase" }, { status: 400 })
    }

    const docRef = adminDb.collection("designs").doc(designId)
    const doc = await docRef.get()
    if (!doc.exists) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 })
    }

    const design = doc.data() as any
    // Owner OR an invited editor (collaborator) may run the pipeline. Token
    // usage is metered against the actor below (user.id), not the owner, so an
    // editor can never drain the owner's credits.
    const permission = await getPermissionForUser(
      designId,
      user.id,
      user.email ?? null
    )
    if (!evaluateAccess(design, user.id, permission).canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const existing = parseContent(design.content) ?? { schemaVersion: 2 }
    const ctx: ProblemContext = body.problem ?? existing.problem ?? {}

    const clearDownstream = (
      currentPhase: PhaseKey
    ): Partial<DesignContentV2> => {
      const idx = PHASE_ORDER.indexOf(currentPhase)
      const downstream = PHASE_ORDER.slice(idx + 1)
      const clear: Partial<DesignContentV2> = {}
      for (const phase of downstream) {
        if (phase === "literature") {
          clear.papers = undefined
          clear.literatureContext = undefined
        }
        if (phase === "hypotheses") clear.hypotheses = undefined
        if (phase === "design") clear.designs = undefined
      }
      return clear
    }

    // Build ExperimentDesignState from ProblemContext for the real agents
    const toAgentState = (
      litCtx?: StoredLiteratureContext
    ): ExperimentDesignState => ({
      problem:
        [ctx.title, ctx.problemStatement].filter(Boolean).join(" - ") ||
        "Untitled",
      objectives: ctx.goal ? [ctx.goal] : [],
      variables: {
        known: ctx.variables ?? [],
        unknown: []
      },
      constraints: {
        material: "",
        time: "",
        equipment: ""
      },
      specialConsiderations: ctx.constraints ?? [],
      ...(litCtx
        ? {
            literatureScoutOutput: {
              ...litCtx,
              citationsDetailed: []
            }
          }
        : {})
    })

    // ── SSE streaming support (all phases) ────────────────────────────
    const wantsStream = (request.headers.get("accept") || "").includes(
      "text/event-stream"
    )

    type ProgressEvent = {
      step: string
      message: string
      [k: string]: unknown
    }
    let sendProgress: (ev: ProgressEvent) => void = () => {}

    const runPhase = async (): Promise<DesignContentV2> => {
      let patch: Partial<DesignContentV2> = {}

      switch (body.phase) {
        // ── Literature: real Literature Scout agent ─────────────────────
        case "literature": {
          const appendMode = body.mode === "append"
          const existingPapers = existing.papers ?? []
          console.log(
            `[GENERATE] Running Literature Scout agent (mode=${appendMode ? "append" : "replace"}, existing=${existingPapers.length})...`
          )
          const agentState = toAgentState()
          // Initial run: target 10 unique papers (issue #13).
          // "Generate more" (append mode): target 5 new papers on top of
          // whatever the user already has (issue #19) so the additional
          // rounds aren't blocked waiting to hit the full 10 again.
          const result = await callLiteratureScoutAgent(
            agentState,
            undefined,
            (ev: LiteratureScoutProgressEvent) => sendProgress(ev),
            appendMode
              ? {
                  bypassCache: true,
                  shuffleQueries: true,
                  minPapers: 5,
                  excludeUrls: existingPapers
                    .map(p => p.sourceUrl || "")
                    .filter(Boolean),
                  excludeTitles: existingPapers.map(p => p.title)
                }
              : { minPapers: 10 }
          )
          const litOutput = result.output

          // Convert detailed citations to Paper[] for the frontend.
          // Carry over source + relevanceScore so the UI can badge and rank.
          const timestamp = Date.now()
          const rawDetailed = (litOutput.citationsDetailed ?? []) as any[]
          // Collect raw relevance scores so we can normalize to [0, 1].
          const rawScores = rawDetailed
            .map(c => Number(c.relevanceScore ?? c.score ?? 0))
            .filter(n => Number.isFinite(n) && n > 0)
          const maxScore = rawScores.length ? Math.max(...rawScores) : 0
          const newPapers: Paper[] = rawDetailed.map((c, i) => {
            // Try every plausible field upstream sources might use for
            // the abstract. Fall back to a citation-style blurb so the
            // user at least sees authors/journal/year if the backend
            // didn't return abstract text (#1 complaint: "no summary").
            const rawSummary =
              (typeof c.abstract === "string" && c.abstract.trim()) ||
              (typeof c.summary === "string" && c.summary.trim()) ||
              (typeof c.tldr === "string" && c.tldr.trim()) ||
              (typeof c.snippet === "string" && c.snippet.trim()) ||
              (typeof c.description === "string" && c.description.trim()) ||
              ""
            const summaryIsRealAbstract =
              rawSummary &&
              rawSummary !== "Abstract not available." &&
              rawSummary !== "No abstract"
            const citationBlurb = [
              Array.isArray(c.authors) && c.authors.length
                ? `${c.authors.slice(0, 3).join(", ")}${c.authors.length > 3 ? " et al." : ""}`
                : null,
              c.journal,
              c.year ? String(c.year) : null
            ]
              .filter(Boolean)
              .join(" · ")
            const summary = summaryIsRealAbstract
              ? rawSummary
              : citationBlurb || rawSummary || "Abstract not available."
            // Resolve a clickable URL - prefer explicit url, else build
            // a DOI link, else fall back to a Google Scholar search.
            let sourceUrl: string | undefined =
              (typeof c.url === "string" && c.url.trim()) || undefined
            if (!sourceUrl && typeof c.doi === "string" && c.doi.trim()) {
              sourceUrl = `https://doi.org/${c.doi.trim().replace(/^doi:/i, "")}`
            }
            if (!sourceUrl && typeof c.title === "string" && c.title.trim()) {
              sourceUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(c.title.trim())}`
            }
            let title = (c.title || "").trim()
            if (!title && rawSummary) {
              const firstSentence = rawSummary
                .split(/(?<=[.!?])\s+/)[0]
                ?.slice(0, 160)
              title = firstSentence || `Paper ${i + 1}`
            }
            if (!title) title = `Paper ${i + 1}`

            const raw = Number(c.relevanceScore ?? c.score ?? 0)
            const normalized =
              maxScore > 0 && Number.isFinite(raw) && raw > 0
                ? Math.max(0, Math.min(1, raw / maxScore))
                : undefined

            return {
              id: `lit-${i}-${timestamp}`,
              title,
              summary,
              sourceUrl,
              userAdded: false,
              selected: false,
              authors: c.authors?.length ? c.authors : undefined,
              year: c.year ? String(c.year) : undefined,
              journal: c.journal || undefined,
              source: c.source || undefined,
              relevanceScore: normalized
            }
          })

          // If no detailed citations, create papers from the string citations
          if (newPapers.length === 0 && litOutput.citations.length > 0) {
            litOutput.citations.forEach((cite, i) => {
              newPapers.push({
                id: `lit-${i}-${timestamp}`,
                title: cite,
                summary: "Citation from literature search",
                userAdded: false,
                selected: false
              })
            })
          }

          let papers: Paper[]
          if (appendMode) {
            // Dedupe new papers against existing by url/title so the merged
            // list contains unique entries only.
            const seenUrls = new Set(
              existingPapers
                .map(p => (p.sourceUrl || "").toLowerCase())
                .filter(Boolean)
            )
            const seenTitles = new Set(
              existingPapers.map(p => p.title.toLowerCase())
            )
            const appended = newPapers.filter(p => {
              const url = (p.sourceUrl || "").toLowerCase()
              const title = p.title.toLowerCase()
              if (url && seenUrls.has(url)) return false
              if (seenTitles.has(title)) return false
              seenUrls.add(url)
              seenTitles.add(title)
              return true
            })
            papers = [...existingPapers, ...appended]
            console.log(
              `[GENERATE] Literature Scout append - ${appended.length} new papers added (total ${papers.length})`
            )
          } else {
            papers = newPapers
            console.log(
              `[GENERATE] Literature Scout done - ${papers.length} papers found`
            )
          }

          const literatureContext: StoredLiteratureContext = {
            whatOthersHaveDone: litOutput.whatOthersHaveDone,
            goodMethodsAndTools: litOutput.goodMethodsAndTools,
            potentialPitfalls: litOutput.potentialPitfalls,
            citations: litOutput.citations
          }

          // In append mode, don't wipe downstream work - we're only adding
          // more sources to an existing list.
          const downstreamClear = appendMode
            ? {}
            : clearDownstream("literature")
          patch = {
            problem: ctx,
            papers,
            literatureContext,
            ...downstreamClear
          }
          break
        }

        // ── Hypotheses: full pipeline (generate → rank → reflect → evolve → top 5) ──
        case "hypotheses": {
          const litCtx = existing.literatureContext
          const planMeta = {
            title: ctx.title || "Untitled",
            description: ctx.problemStatement || ctx.goal || "",
            constraints: {
              variables: ctx.variables,
              constraints: ctx.constraints
            }
          }

          // ── Step 1: Generate 20 hypotheses (5 agents x 4 each) ──────
          // Include the user's selected papers so hypotheses are grounded in them
          const selectedPapers = (body.papers ?? existing.papers ?? []).filter(
            p => p.selected
          )
          console.log(
            `[GENERATE] Step 1/5: Running ${GENERATION_AGENT_COUNT} generation agents (${selectedPapers.length} selected papers as context)...`
          )
          sendProgress({
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

          // Run the generation agents; if they ALL transiently fail (the pool
          // comes back empty - typically an Azure OpenAI 429/5xx burst that
          // takes down the whole batch), retry the batch ONCE with fresh task
          // ids before giving up. This is the root cause of the reported
          // "hypotheses failed the first time, worked on the third try" bug:
          // the single attempt was at the mercy of one transient hiccup.
          const pool: RankedHypothesis[] = []
          for (let attempt = 1; attempt <= 2 && pool.length === 0; attempt++) {
            if (attempt > 1) {
              console.warn(
                `[GENERATE] Hypothesis pool empty after attempt ${attempt - 1}; retrying the generation batch...`
              )
              sendProgress({
                step: "generating",
                message:
                  "Retrying hypothesis generation after a transient error..."
              })
            }
            // Fresh task ids on retry so worker-side dedup/caching can't
            // short-circuit the second attempt.
            const tasks =
              attempt === 1
                ? genTasks
                : genTasks.map(t => ({ ...t, taskId: uuidv4() }))
            const genResults = await runTasksWithConcurrency(
              tasks,
              GENERATION_CONCURRENCY
            )
            for (const r of genResults) {
              if (r.status === "success" && Array.isArray(r.output)) {
                for (const item of r.output) {
                  pool.push({
                    id: `h-${uuidv4()}`,
                    text: item.hypothesis || "",
                    explanation: item.explanation || "",
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
          console.log(`[GENERATE] Generated ${pool.length} hypotheses`)
          sendProgress({
            step: "generated",
            message: `Generated ${pool.length} candidate hypotheses`,
            count: pool.length
          })

          // ── Step 2: Batch ranking (single LLM call) ─────────────────
          console.log(
            `[GENERATE] Step 2/5: Batch ranking ${pool.length} hypotheses (1 LLM call)...`
          )
          sendProgress({
            step: "ranking",
            message: `Ranking ${pool.length} hypotheses by rigor, feasibility, novelty...`
          })

          const batchRankingSchema = z.object({
            ranked: z.array(
              z.object({
                index: z.number(),
                score: z.number().min(0).max(100),
                reasoning: z.string()
              })
            )
          })

          const numberedList = pool
            .map((h, i) => `[${i + 1}] ${h.text}`)
            .join("\n")

          try {
            const openai = getAzureOpenAIForDesign()
            const model = getDesignDeployment()
            const completion = await openai.beta.chat.completions.parse({
              model,
              messages: [
                {
                  role: "system",
                  content: `You are a scientific hypothesis ranking agent. You will receive a numbered list of hypotheses and must score each one from 0-100 based on:
- Scientific rigor and testability (30%)
- Feasibility and practicality (25%)
- Novelty and potential impact (25%)
- Clarity and specificity (20%)

Return every hypothesis with its original index number, a score, and a one-sentence reasoning.`
                },
                {
                  role: "user",
                  content: `Rank these ${pool.length} hypotheses:\n\n${numberedList}`
                }
              ],
              temperature: 0.3,
              response_format: zodResponseFormat(
                batchRankingSchema,
                "batchRanking"
              )
            })

            const parsed = completion.choices[0]?.message?.parsed
            if (parsed?.ranked) {
              for (const entry of parsed.ranked) {
                const idx = entry.index - 1
                if (idx >= 0 && idx < pool.length) {
                  pool[idx].rank = entry.score
                }
              }
            }
          } catch (rankErr: any) {
            console.warn(
              `[GENERATE] Batch ranking failed, falling back to feasibility+novelty scores: ${rankErr?.message}`
            )
            // Fallback: use generation scores
            for (const h of pool) {
              h.rank = Math.round((h.feasibility + h.novelty) * 50)
            }
          }

          pool.sort((a, b) => b.rank - a.rank)
          const topHypotheses = pool.slice(0, FINAL_TOP_N)
          console.log(
            `[GENERATE] Ranking done - top ${FINAL_TOP_N} selected (scores: ${topHypotheses.map(h => h.rank).join(", ")})`
          )
          sendProgress({
            step: "ranked",
            message: `Top ${FINAL_TOP_N} selected`,
            scores: topHypotheses.map(h => h.rank)
          })

          // ── Step 3: Reflection (critique top 5) ─────────────────────
          console.log(
            `[GENERATE] Step 3/5: Reflecting on top ${FINAL_TOP_N}...`
          )
          sendProgress({
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

          // Enrich reasoning with reflection
          for (let i = 0; i < topHypotheses.length; i++) {
            const ref = reflectionResults[i]
            if (ref?.status === "success" && ref.output) {
              const o = ref.output
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
          console.log(`[GENERATE] Reflection done`)

          // ── Step 4: Evolution (generate improved variants) ───────────
          console.log(
            `[GENERATE] Step 4/5: Evolving top ${FINAL_TOP_N} hypotheses...`
          )
          sendProgress({
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

          // Collect evolved variants and fold the best improvements back into the top 5
          let evolvedCount = 0
          for (let i = 0; i < topHypotheses.length; i++) {
            const evo = evoResults[i]
            if (evo?.status === "success" && evo.output?.variants?.length) {
              // Pick the best variant (first one) and upgrade the hypothesis if it's clearer
              const best = evo.output.variants[0]
              if (best?.hypothesis && best?.improvement_type) {
                topHypotheses[i].text = best.hypothesis
                topHypotheses[i].explanation +=
                  `\n\nEvolved (${best.improvement_type}): ${best.explanation || ""}`
              }
              evolvedCount += evo.output.variants.length
            }
          }
          console.log(
            `[GENERATE] Evolution done - ${evolvedCount} variants produced`
          )

          // ── Step 5: Meta-review ──────────────────────────────────────
          console.log(`[GENERATE] Step 5/5: Meta-review...`)
          sendProgress({
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

          // Fire-and-forget style: run but don't block the response on failure
          const [metaResult] = await runTasksWithConcurrency([metaTask], 1)
          if (metaResult?.status === "success" && metaResult.output) {
            console.log(
              `[GENERATE] Meta-review done - ${metaResult.output.prompt_patches?.length ?? 0} patches suggested`
            )
          }

          // ── Build final Hypothesis[] for the frontend ────────────────
          const hypotheses: Hypothesis[] = topHypotheses.map(h => ({
            id: h.id,
            text: h.text,
            // Reasoning is just the scientific explanation - the internal
            // rank / feasibility / novelty scores are NOT surfaced to the
            // user (they're ranking signals only, and reading like grades on
            // a hypothesis confused scientists).
            reasoning: h.explanation,
            basedOnPaperIds: [],
            selected: false
          }))

          const papers = body.papers ?? existing.papers ?? []
          const downstreamClear = clearDownstream("hypotheses")
          patch = {
            problem: ctx,
            papers,
            hypotheses,
            ...downstreamClear
          }
          console.log(
            `[GENERATE] Full hypothesis pipeline done - returning top ${hypotheses.length}`
          )
          sendProgress({
            step: "done",
            message: `Hypothesis generation complete - ${hypotheses.length} top hypotheses`,
            count: hypotheses.length
          })
          break
        }

        // ── Design: 4-phase generation per hypothesis ─────────────────
        case "design": {
          const allHypotheses = body.hypotheses ?? existing.hypotheses ?? []
          const selected = allHypotheses.filter(h => h.selected)
          if (selected.length === 0) {
            throw Object.assign(new Error("No hypotheses selected"), {
              status: 400
            })
          }

          console.log(
            `[GENERATE] Running 4-phase design for ${selected.length} hypotheses (${selected.length * 4} LLM calls)...`
          )
          sendProgress({
            step: "starting",
            message: `Designing experiments for ${selected.length} hypothes${selected.length === 1 ? "is" : "es"}...`,
            totalHypotheses: selected.length
          })

          const litCtx = existing.literatureContext
          const openai = getAzureOpenAIForDesign()
          const model = getDesignDeployment()
          const designs: GeneratedDesign[] = []

          // Shared context blocks for all prompts
          const litBlock = litCtx
            ? `\nLiterature context:\n- What others have done: ${litCtx.whatOthersHaveDone}\n- Good methods: ${litCtx.goodMethodsAndTools}\n- Pitfalls: ${litCtx.potentialPitfalls}`
            : ""

          const selectedPapersForDesign = (existing.papers ?? []).filter(
            p => p.selected
          )
          const papersBlock =
            selectedPapersForDesign.length > 0
              ? `\nSelected papers (chosen by the researcher as most relevant):\n${selectedPapersForDesign.map((p, i) => `[${i + 1}] ${p.title}${p.summary ? ` - ${p.summary}` : ""}`).join("\n")}`
              : ""

          // ── Schemas for each sub-phase ──────────────────────────────

          const experimentSetupSchema = z.object({
            whatWillBeTested: z.string(),
            whatWillBeMeasured: z.string(),
            controlGroups: z.string(),
            experimentalGroups: z.string(),
            sampleTypes: z.string(),
            replicatesAndConditions: z.string(),
            specificRequirements: z.string()
          })

          const materialsSchema = z.object({
            toolsNeeded: z.string(),
            materialsList: z.string(),
            materialPreparation: z.string(),
            setupInstructions: z.string(),
            storageDisposal: z.string()
          })

          const protocolSchema = z.object({
            stepByStepProcedure: z.string(),
            timeline: z.string(),
            conditionsTable: z.string()
          })

          const analysisSchema = z.object({
            dataCollectionPlan: z.string(),
            statisticalAnalysis: z.string(),
            safetyNotes: z.string(),
            rationale: z.string()
          })

          // If the design was created via "Structure an existing plan", the
          // user's draft procedure lives on problem.userProvidedPlan. We add
          // it as an explicit priming block so every sub-phase's prompt
          // treats it as scaffolding to adopt, not just reference.
          const userPlan = (ctx.userProvidedPlan || "").trim()
          const userPlanBlock = userPlan
            ? `\n\nUser-supplied draft procedure (treat this as the SCAFFOLDING to adopt; preserve structure/wording where reasonable, fill gaps, correct scientific errors, and complete missing sections such as material quantities, stats, safety):\n<user-plan>\n${userPlan}\n</user-plan>`
            : ""

          // Replicates are OPT-IN. Previously the design phase baked a
          // replicate scheme into every design regardless of the user's
          // choice, so picking "No" still produced n=3 designs. Now we only
          // include replicates when the researcher explicitly chose "yes";
          // otherwise the design is a single run per condition (n=1). This
          // directive is appended to the shared problemBlock so all four
          // sub-phases (setup, materials, protocol, analysis) honour it.
          const wantsReplicates = ctx.includeReplicates === "yes"
          const replicateDirective = wantsReplicates
            ? `\n\nREPLICATES: The researcher WANTS replicates. Include a sensible biological/technical replicate scheme (state n per group) and factor it into every vial-count, the conditions-table "n" column, all material totals, and the statistical power calculation.`
            : `\n\nREPLICATES: The researcher does NOT want replicates - design a SINGLE run per condition (n = 1). Do NOT multiply any count by a replicate factor. State plainly in the replicates/conditions field: "No replicates - single run per condition (n = 1)". Every conditions-table "n" column = 1, and all material totals = conditions × 1 × volume-per-sample (dead-volume buffer only, no replicate multiplier). The statistics section must reflect n = 1 (no replicate-based power calc; note the single-run limitation).`

          for (let hypIdx = 0; hypIdx < selected.length; hypIdx++) {
            const hyp = selected[hypIdx]
            const hypPrefix = `[${hypIdx + 1}/${selected.length}]`
            const hypShort = hyp.text.slice(0, 60)
            try {
              // If the user typed this hypothesis directly (via "Design from
              // a hypothesis"), pin it so the agent doesn't rewrite or
              // re-critique it.
              const userSuppliedNote = hyp.userSupplied
                ? `\nNOTE: This hypothesis was provided directly by the researcher. Treat it as a fixed input - do NOT rewrite, soften, or re-scope it. Design the experiment around it exactly as written.`
                : ""
              const hypBlock =
                `Hypothesis: ${hyp.text}\nExplanation: ${hyp.reasoning}` +
                userSuppliedNote
              const problemBlock =
                `Research problem: ${[ctx.title, ctx.problemStatement].filter(Boolean).join(" - ")}\nGoal: ${ctx.goal || "Not specified"}\nVariables: ${(ctx.variables ?? []).join(", ") || "Not specified"}\nConstraints: ${(ctx.constraints ?? []).join(", ") || "Not specified"}` +
                userPlanBlock +
                replicateDirective

              // ── Phase 1: Experimental Setup ────────────────────────
              console.log(
                `[DESIGN 1/4] Experimental setup for: ${hyp.text.slice(0, 50)}...`
              )
              sendProgress({
                step: "hyp_setup",
                message: `${hypPrefix} Designing experimental setup`,
                detail: hypShort,
                hypothesisIndex: hypIdx + 1,
                totalHypotheses: selected.length
              })
              const phase1 = await openai.beta.chat.completions.parse({
                model,
                temperature: 0.7,
                messages: [
                  {
                    role: "system",
                    content: `You are an expert experiment design scientist writing SOP-grade output. Every field is Markdown. Each section must use bolded lead-in labels and bullet / numbered lists - never walls of prose. Be specific: concentrations with units, temperatures in °C, volumes in mL/µL, durations in h/min, replicate counts, equipment grades.

Fields to produce:

- **whatWillBeTested** - one short paragraph stating the concrete test objective, then a bulleted list of the 2–4 specific variables / factors being manipulated.
- **whatWillBeMeasured** - bullet list. Each bullet: \`**Readout** - method - unit - expected range\`.
- **controlGroups** - bullet list. Each bullet: \`**Control name** - composition / condition - what it isolates\`.
- **experimentalGroups** - bullet list. Each bullet: \`**Group name** - condition - expected effect\`.
- **sampleTypes** - bulleted. Describe sample matrix, concentration, container (material, volume, cap type), aliquot strategy.
- **replicatesAndConditions** - bullet list. Give n per group (biological / technical), total vial count math, and any blocking / randomization scheme. Example line: \`n = 3 biological × 5 formulation × 2 temperatures = 30 vials\`.
- **specificRequirements** - anything out-of-ordinary: BSL level, cold-chain, light-sensitive handling, certified reference standards, specific instrument calibration. Bullet list with bold hazard / requirement class.

Do not output plain paragraphs. Every field uses bullets and/or bolded labels.`
                  },
                  {
                    role: "user",
                    content: `${problemBlock}\n\n${hypBlock}${litBlock}${papersBlock}\n\nDesign the experimental setup per the SOP format. Reference specific methods or findings from the selected papers where relevant, citing as [Author, Year].`
                  }
                ],
                response_format: zodResponseFormat(
                  experimentSetupSchema,
                  "experimentSetup"
                )
              })
              const setup = phase1.choices[0]?.message?.parsed
              if (!setup) throw new Error("Empty response from Phase 1")

              // ── Phase 2: Materials & Setup ─────────────────────────
              console.log(
                `[DESIGN 2/4] Materials & setup for: ${hyp.text.slice(0, 50)}...`
              )
              sendProgress({
                step: "hyp_materials",
                message: `${hypPrefix} Planning materials & setup`,
                detail: hypShort,
                hypothesisIndex: hypIdx + 1,
                totalHypotheses: selected.length
              })
              const setupSummary = `Experimental design:\n- Testing: ${setup.whatWillBeTested}\n- Measuring: ${setup.whatWillBeMeasured}\n- Controls: ${setup.controlGroups}\n- Experimental groups: ${setup.experimentalGroups}\n- Samples: ${setup.sampleTypes}\n- Replicates: ${setup.replicatesAndConditions}`

              const phase2 = await openai.beta.chat.completions.parse({
                model,
                temperature: 0.7,
                messages: [
                  {
                    role: "system",
                    content: `You are a lab materials planner writing SOP-grade output. All five fields are Markdown. Be concrete: numbers, units, vendors, catalog numbers, grades - not prose.

1. **toolsNeeded** - Markdown bullet list. Each bullet: **Tool** - model / spec - example vendor (e.g. *Thermo Fisher*) - quantity needed.

2. **materialsList** - Return a Markdown TABLE with columns:
   \`| Material | Grade / Spec | Example Vendor | Cat. # (example) | Amount per condition | Total needed | Calculation |\`
   Rules:
   - Compute **Total needed** for every row from the experimental plan's conditions × replicates × volume-per-replicate (plus a 10–15% dead-volume buffer). Show the math in the **Calculation** column (e.g. *30 vials × 1.0 mL × 1.15 = 34.5 mL*).
   - Include every buffer, excipient, consumable, and sample-handling item needed end-to-end.
   - After the table, add a bullet list **"Raw-material totals"** consolidating bulk-ordered items (e.g. *L-arginine·HCl powder: ~12 g covering all formulation prep + 2× overage*).

3. **materialPreparation** - For EACH buffer, stock solution, or reagent that must be prepared, write a Markdown sub-section like:
   \`### Buffer name (e.g. 20 mM Histidine, pH 6.0)\`
   - **Volume needed:** 250 mL (covers X mL × Y conditions × 1.2 dead-volume)
   - **Target concentration / pH:** 20 mM, pH 6.0 at 25 °C
   - **Stock used:** histidine base (MW 155.16), 1 N HCl for pH, WFI
   - **Calculation:** show the math step by step using \`C1V1 = C2V2\` where applicable, e.g.
     - moles needed = 0.020 M × 0.250 L = 5.0 × 10⁻³ mol
     - mass = 5.0 × 10⁻³ × 155.16 = 0.776 g histidine base
   - **Step-by-step prep:**
     1. Weigh 0.776 g L-histidine base on analytical balance.
     2. Dissolve in 200 mL WFI in a 250 mL volumetric flask.
     3. Titrate to pH 6.0 at 25 °C with 1 N HCl (expect ~3–4 mL).
     4. QS to 250 mL with WFI. Invert 10× to mix.
     5. Filter through 0.22 µm PES. Label with date + initials + lot. Store 2–8 °C, use within 14 days.
   Do one subsection per buffer/reagent. Be quantitative.

4. **setupInstructions** - Numbered Markdown list describing workstation / equipment setup (balance calibration, pH-meter cal, biosafety cabinet setup, vial labeling scheme, temperature blocks). Each step has a bolded lead-in verb.

5. **storageDisposal** - Markdown bullets. For each material class: storage condition, container type, disposal stream (e.g. *Aqueous biowaste - 10% bleach, 30-min soak, rinse down sink; log in biohazard register*). Use bold labels.

Never use placeholder text like "TBD" - if a spec is reasonable to infer, infer it and mark the assumption.`
                  },
                  {
                    role: "user",
                    content: `${problemBlock}\n\n${hypBlock}\n\n${setupSummary}${papersBlock}\n\nProduce the five fields in the SOP format above. Base material quantities on the conditions × replicates you see in the experimental setup summary.`
                  }
                ],
                response_format: zodResponseFormat(materialsSchema, "materials")
              })
              const materials = phase2.choices[0]?.message?.parsed
              if (!materials) throw new Error("Empty response from Phase 2")

              // ── Phase 3: Protocol & Timeline ──────────────────────
              console.log(
                `[DESIGN 3/4] Protocol & timeline for: ${hyp.text.slice(0, 50)}...`
              )
              sendProgress({
                step: "hyp_protocol",
                message: `${hypPrefix} Writing protocol & timeline`,
                detail: hypShort,
                hypothesisIndex: hypIdx + 1,
                totalHypotheses: selected.length
              })
              const materialsSummary = `Materials: ${materials.toolsNeeded}\nPreparation: ${materials.materialPreparation}`

              const phase3 = await openai.beta.chat.completions.parse({
                model,
                temperature: 0.7,
                messages: [
                  {
                    role: "system",
                    content: `You are an experimental protocol writer producing SOP-grade Markdown. All three fields must be scannable and copy-exec ready.

- **stepByStepProcedure** - A single numbered Markdown list. Each step begins with a **bold imperative verb** ("**Weigh**", "**Dissolve**", "**Filter**", "**Incubate**", "**Aliquot**") followed by concrete quantities + times + temperatures + equipment. Group steps under Markdown sub-headings like \`### Day 1 - Buffer prep\`, \`### Day 2 - Formulation\`, \`### Day 3–28 - Stress incubation\`, \`### Day 28 - Readouts\`. Use sub-steps (3a, 3b) for branching. Include a short **"Checkpoint"** bold callout after each major phase listing what the operator should verify before continuing (e.g. *Checkpoint: pH reads 6.00 ± 0.05 on calibrated meter; monomer content by SEC ≥ 99% pre-stress*).

- **timeline** - Markdown table:
  \`| Day | Activity | Duration | Notes |\`
  One row per scheduled day / phase. Notes column carries dependencies, decision points, and who performs the step.

- **conditionsTable** - Markdown table describing every experimental arm. At minimum:
  \`| Group | Condition / composition | Variable 1 | Variable 2 | T (°C) | Time | n | Read-outs |\`
  Include baseline and stressed controls explicitly as their own rows. All numbers must have units. Add a short paragraph above the table summarizing the factorial structure (e.g. "5 arginine levels × 2 temperatures × 3 biological replicates = 30 vials"). Do not return prose in place of a table.`
                  },
                  {
                    role: "user",
                    content: `${problemBlock}\n\n${hypBlock}\n\n${setupSummary}\n\n${materialsSummary}\n\nWrite the step-by-step protocol (by day, with Checkpoints), timeline table, and conditions table per the SOP format.`
                  }
                ],
                response_format: zodResponseFormat(protocolSchema, "protocol")
              })
              const protocol = phase3.choices[0]?.message?.parsed
              if (!protocol) throw new Error("Empty response from Phase 3")

              // ── Phase 4: Analysis & Safety ─────────────────────────
              console.log(
                `[DESIGN 4/4] Analysis & safety for: ${hyp.text.slice(0, 50)}...`
              )
              sendProgress({
                step: "hyp_analysis",
                message: `${hypPrefix} Adding analysis & safety plan`,
                detail: hypShort,
                hypothesisIndex: hypIdx + 1,
                totalHypotheses: selected.length
              })
              const protocolSummary = `Procedure summary: ${protocol.stepByStepProcedure.slice(0, 500)}...\nTimeline: ${protocol.timeline}`

              const phase4 = await openai.beta.chat.completions.parse({
                model,
                temperature: 0.7,
                messages: [
                  {
                    role: "system",
                    content: `You are a data analysis and safety review specialist. Given a complete experimental plan, produce four SEPARATE sections as Markdown. Each section must start with a bolded lead-in sentence and use clear bullet lists - do not return walls of prose.

1. **dataCollectionPlan** - capture mechanics ONLY. What measurements are recorded, when (timepoints), how (instrument / method / file format), by whom, and how they're stored. Do NOT talk about statistics here.

2. **statisticalAnalysis** - the dedicated stats plan. Structure it with these labeled sub-bullets:
   - **Primary endpoint & test** - name the specific test (e.g. two-way ANOVA with Tukey HSD; mixed-effects model; Mann–Whitney). Justify the choice vs the data type and replicate structure.
   - **Sample size / power** - state assumed effect size and variance, target power (e.g. 0.8), alpha (usually 0.05), and the computed n per group. Show a short power calculation.
   - **Secondary endpoints** - list and their tests.
   - **Multiple comparisons** - correction method (Bonferroni / BH-FDR / Tukey).
   - **Outlier / missing-data handling** - rule (e.g. Grubbs, ROUT, or pre-registered exclusion).
   - **Software** - concrete tools / packages (GraphPad Prism, R + lme4, Python + scipy.stats / statsmodels).

3. **safetyNotes** - bulleted. Cover PPE, chemical hazards, biosafety level, waste stream, spill response. Start each bullet with a **bold hazard class** then the mitigation.

4. **rationale** - 3–5 short paragraphs explaining why this design answers the hypothesis, what confounders it controls, and what the pass/fail decision criteria are.`
                  },
                  {
                    role: "user",
                    content: `${problemBlock}\n\n${hypBlock}\n\n${setupSummary}\n\n${materialsSummary}\n\n${protocolSummary}\n\nReturn the four sections (dataCollectionPlan, statisticalAnalysis, safetyNotes, rationale) per the system-prompt format.`
                  }
                ],
                response_format: zodResponseFormat(analysisSchema, "analysis")
              })
              const analysis = phase4.choices[0]?.message?.parsed
              if (!analysis) throw new Error("Empty response from Phase 4")

              // ── Assemble all 4 phases into sections ───────────────
              // Canonical SOP-style order:
              //   Design intent (what/measure/controls/experimental/samples)
              //   → Replicates & Conditions → Conditions Table → Special Reqs
              //   → Tools → Materials List → Prep → Setup → Storage
              //   → Protocol → Timeline → Data Collection → Statistics
              //   → Safety → Rationale
              designs.push({
                id: `d-${uuidv4()}`,
                hypothesisId: hyp.id,
                title: hyp.text.slice(0, 80),
                sections: [
                  {
                    heading: "What Will Be Tested",
                    body: setup.whatWillBeTested
                  },
                  {
                    heading: "What Will Be Measured",
                    body: setup.whatWillBeMeasured
                  },
                  { heading: "Control Groups", body: setup.controlGroups },
                  {
                    heading: "Experimental Groups",
                    body: setup.experimentalGroups
                  },
                  { heading: "Sample Types", body: setup.sampleTypes },
                  {
                    heading: "Replicates & Conditions",
                    body: setup.replicatesAndConditions
                  },
                  // Conditions Table moved up - it's the concrete factorial
                  // the rest of the SOP references.
                  {
                    heading: "Conditions Table",
                    body: protocol.conditionsTable
                  },
                  {
                    heading: "Special Requirements",
                    body: setup.specificRequirements
                  },
                  {
                    heading: "Tools & Equipment",
                    body: materials.toolsNeeded
                  },
                  { heading: "Materials List", body: materials.materialsList },
                  {
                    heading: "Material Preparation",
                    body: materials.materialPreparation
                  },
                  {
                    heading: "Setup Instructions",
                    body: materials.setupInstructions
                  },
                  {
                    heading: "Storage & Disposal",
                    body: materials.storageDisposal
                  },
                  {
                    heading: "Step-by-Step Procedure",
                    body: protocol.stepByStepProcedure
                  },
                  { heading: "Timeline", body: protocol.timeline },
                  {
                    heading: "Data Collection Plan",
                    body: analysis.dataCollectionPlan
                  },
                  {
                    heading: "Statistical Analysis",
                    body: analysis.statisticalAnalysis
                  },
                  { heading: "Safety Notes", body: analysis.safetyNotes },
                  { heading: "Rationale", body: analysis.rationale }
                ],
                saved: false
              })
              console.log(
                `[GENERATE] Design complete for: ${hyp.text.slice(0, 50)}...`
              )
              sendProgress({
                step: "hyp_complete",
                message: `${hypPrefix} Design complete`,
                detail: hypShort,
                hypothesisIndex: hypIdx + 1,
                totalHypotheses: selected.length
              })
            } catch (err: any) {
              console.error(
                `[GENERATE] Failed to generate design for hypothesis ${hyp.id}:`,
                err?.message
              )
            }
          }

          if (designs.length === 0) {
            throw Object.assign(
              new Error(
                "Design generation failed for all hypotheses. Check agent configuration."
              ),
              { status: 502 }
            )
          }

          const downstreamClear = clearDownstream("design")
          patch = {
            problem: ctx,
            hypotheses: allHypotheses,
            designs,
            ...downstreamClear
          }
          console.log(
            `[GENERATE] Experiment Design done - ${designs.length} designs (${designs.length * 4} LLM calls)`
          )
          sendProgress({
            step: "done",
            message: `Design generation complete - ${designs.length} design${designs.length === 1 ? "" : "s"}`,
            count: designs.length
          })
          break
        }

        // ── Simulation: stub (no real simulation engine yet) ───────────
        case "simulation": {
          if (!body.designId) {
            throw Object.assign(
              new Error("simulation phase requires designId"),
              { status: 400 }
            )
          }
          // TODO: replace with real simulation agent when available
          const designs = (existing.designs ?? []).map(d =>
            d.id === body.designId
              ? { ...d, simulation: runSimulation(ctx, d) }
              : d
          )
          patch = { designs }
          break
        }

        default:
          throw Object.assign(new Error("Unknown phase"), { status: 400 })
      }

      if (body.approvedPhases) {
        patch.approvedPhases = body.approvedPhases
      }

      const next: DesignContentV2 = {
        ...existing,
        ...patch,
        schemaVersion: 2
      }

      const cleaned = JSON.parse(JSON.stringify(next))

      await docRef.update({
        content: JSON.stringify(cleaned),
        updated_at: new Date().toISOString()
      })

      return cleaned
    }

    // Pre-flight token gate. Block before opening the stream so the client gets
    // a clean 402 (not a half-open SSE). In-flight work always finishes.
    try {
      await assertBudget(user.id)
    } catch (e) {
      if (isBudgetExceededError(e)) return budgetErrorResponse(e.plan)
      // any other error: fail open, assertBudget already logged it
    }

    // Free-experiment paywall - only the DESIGN payoff is gated (cheap problem/
    // literature/hypotheses stay open). 402 when a free user is out of free
    // experiments and EXPERIMENT_PAYWALL is on.
    if (body.phase === "design") {
      try {
        await assertExperimentQuota(user.id)
      } catch (e) {
        if (isExperimentLimitError(e)) {
          const err = e as ExperimentLimitError
          return experimentErrorResponse(err.used, err.limit)
        }
        // any other error: fail open
      }
    }

    // ── literature / hypotheses / design run in the background ────────────
    // All three are slow gpt-5.5 pipelines that can exceed Vercel's 300s
    // function cap (literature = multi-round search; hypotheses = 5-stage
    // ~32-call pipeline; design = 4 SOP sections/hypothesis). Hand off to the
    // Inngest worker (processDesignPhase), which runs each as <300s steps, and
    // return 202. The client polls GET /api/design/[id] for `designJob`
    // progress + completion. Only `simulation` (sync, no LLM) stays inline.
    // The matching runPhase cases below are therefore unreachable for these
    // phases - the real logic lives in lib/design/{literature,hypotheses}-phase
    // + design-sections.ts.
    if (
      body.phase === "literature" ||
      body.phase === "hypotheses" ||
      body.phase === "design"
    ) {
      try {
        await docRef.update({
          designJob: {
            state: "queued",
            phase: body.phase,
            progress: [],
            queuedAt: new Date().toISOString()
          }
        })
      } catch (e) {
        console.warn("[DESIGN_GENERATE] could not set queued state", e)
      }

      try {
        await inngest.send({
          name: "design/generate.requested",
          data: {
            designId,
            userId: user.id,
            userEmail: user.email ?? null,
            phase: body.phase,
            mode: body.mode,
            problem: body.problem ?? ctx,
            hypotheses: body.hypotheses ?? existing.hypotheses ?? [],
            papers: body.papers ?? existing.papers ?? [],
            approvedPhases: body.approvedPhases
          }
        })
      } catch (err: any) {
        console.error("❌ [DESIGN_GENERATE] Inngest send failed:", err)
        await docRef
          .update({
            "designJob.state": "failed",
            "designJob.error": "Background processor unavailable",
            "designJob.updatedAt": new Date().toISOString()
          })
          .catch(() => {})
        const devHint =
          process.env.NODE_ENV !== "production"
            ? " Start the Inngest dev server (INNGEST_USE_DEV_SERVER=true, npx inngest-cli@latest dev)."
            : ""
        return NextResponse.json(
          {
            queued: false,
            error: `Failed to start design generation.${devHint}`
          },
          { status: 503 }
        )
      }

      return NextResponse.json({ queued: true, designId }, { status: 202 })
    }

    if (wantsStream) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(
              encoder.encode(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
              )
            )
          }
          sendProgress = ev => send("progress", ev)
          try {
            const cleaned = await meterRun(
              { userId: user.id, feature: "design" },
              runPhase
            )
            send("result", { content: cleaned, phase: body.phase })
          } catch (err: any) {
            console.error("❌ [DESIGN_GENERATE_STREAM] Error:", err)
            send("error", {
              message: err?.message || "Failed to run generation",
              status: err?.status ?? 500
            })
          } finally {
            controller.close()
          }
        }
      })
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no"
        }
      })
    }

    try {
      const cleaned = await meterRun(
        { userId: user.id, feature: "design" },
        runPhase
      )
      return NextResponse.json({ content: cleaned, phase: body.phase })
    } catch (err: any) {
      console.error("❌ [DESIGN_GENERATE] Error:", err)
      return NextResponse.json(
        { error: err?.message || "Failed to run generation" },
        { status: err?.status ?? 500 }
      )
    }
  } catch (error: any) {
    console.error("❌ [DESIGN_GENERATE] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to run generation" },
      { status: 500 }
    )
  }
}

function parseContent(raw: unknown): DesignContentV2 | null {
  if (!raw) return null
  try {
    if (typeof raw === "string") return JSON.parse(raw)
    if (typeof raw === "object") return raw as DesignContentV2
  } catch {
    return null
  }
  return null
}
