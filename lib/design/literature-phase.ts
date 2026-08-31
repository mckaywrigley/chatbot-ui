/**
 * Literature-scout phase, extracted from the inline `case "literature"` of
 * app/api/design/[designid]/generate/route.ts so it can run in the Inngest
 * worker (processDesignPhase) instead of a 300s-capped serverless request. The
 * multi-round search + relevance + summarization can run minutes on large pools.
 *
 * Pure: inputs in, content patch out. Progress is surfaced via the onProgress
 * callback (the worker writes each event into the design doc's designJob).
 */
import {
  callLiteratureScoutAgent,
  planLiteratureSearch,
  runLiteratureRound,
  type LiteraturePlan,
  type LiteraturePrecomputed,
  type LiteratureRoundResult,
  type LiteratureScoutProgressEvent,
  type LiteratureScoutSearchOptions
} from "@/app/api/design/draft/agents"
import type { ExperimentDesignState } from "@/app/api/design/draft/types"
import {
  resolveEffortConfig,
  type DesignContentV2,
  type Paper,
  type ProblemContext,
  type StoredLiteratureContext
} from "@/lib/design-agent"
import { cleanPaperTitle, dedupePapers } from "./paper-title"

function toAgentState(ctx: ProblemContext): ExperimentDesignState {
  // Fold the researcher's operating parameters into the search context so the
  // scout targets papers matching their specific system (concentrations,
  // buffers, temperatures) rather than generic background.
  const considerations = [
    ...((ctx as { constraints?: string[] }).constraints ?? [])
  ]
  if (ctx.additionalDetails?.trim()) {
    // The researcher's Refine answers — SECONDARY steering only. The search is
    // anchored on the problem statement + objective (below); these answers just
    // nudge the KIND of paper (system, mechanism family, readout). They are NOT
    // hard filters and must NOT become the subject of the search — that dilutes
    // it. Numeric values (concentrations, ranges) are directional only.
    considerations.push(
      `Secondary steering from the researcher (nudge the KIND of paper — system, mechanism family, readouts — but keep the search anchored on the problem + objective, and do not exclude strong methodologically-relevant adjacent work): ${ctx.additionalDetails.trim()}`
    )
  }
  return {
    problem:
      [ctx.title, ctx.problemStatement].filter(Boolean).join(" - ") ||
      "Untitled",
    objectives: ctx.goal ? [ctx.goal] : [],
    variables: {
      known: (ctx as { variables?: string[] }).variables ?? [],
      unknown: []
    },
    constraints: { material: "", time: "", equipment: "" },
    specialConsiderations: considerations
  }
}

export interface LiteraturePhaseArgs {
  ctx: ProblemContext
  existing: DesignContentV2
  mode?: "append" | "replace"
}

/**
 * The agent state + searchOptions for a phase run. Extracted so the Inngest
 * worker's plan step and the synthesis step derive them IDENTICALLY (both from
 * the same ctx) — the fan-out/fan-in split only works if the plan the rounds
 * ran against is the plan synthesis uses.
 */
export function buildLiteratureInputs(args: LiteraturePhaseArgs): {
  agentState: ReturnType<typeof toAgentState>
  searchOptions: LiteratureScoutSearchOptions
} {
  const appendMode = args.mode === "append"
  const existingPapers = args.existing.papers ?? []
  // Effort scales the literature pool: how many unique papers to target and how
  // many query-rounds to run (0 = no cap). Falls back to medium.
  const eff = resolveEffortConfig(args.ctx.effort)
  return {
    agentState: toAgentState(args.ctx),
    // Initial run targets the effort-scaled pool; "generate more" (append)
    // targets NEW papers on top of what's already there and excludes current
    // urls/titles so rounds aren't blocked re-finding the same ones.
    searchOptions: appendMode
      ? {
          bypassCache: true,
          shuffleQueries: true,
          minPapers: Math.max(8, Math.round(eff.minPapers * 0.6)),
          maxRounds: eff.litRounds,
          excludeUrls: existingPapers
            .map(p => p.sourceUrl || "")
            .filter(Boolean),
          excludeTitles: existingPapers.map(p => p.title)
        }
      : { minPapers: eff.minPapers, maxRounds: eff.litRounds }
  }
}

export async function runLiteraturePhase(
  args: LiteraturePhaseArgs,
  onProgress: (ev: LiteratureScoutProgressEvent) => void,
  /** When the worker ran planning + the PaperFinder rounds as separate Inngest
   *  steps, it passes them here and the agent goes straight to synthesis. */
  precomputed?: LiteraturePrecomputed
): Promise<Partial<DesignContentV2>> {
  const { ctx, existing } = args

  const { agentState, searchOptions } = buildLiteratureInputs(args)
  const result = await callLiteratureScoutAgent(
    agentState,
    undefined,
    (ev: LiteratureScoutProgressEvent) => onProgress(ev),
    searchOptions,
    precomputed
  )
  const litOutput = result.output

  const timestamp = Date.now()
  const rawDetailed = (litOutput.citationsDetailed ?? []) as any[]
  const rawScores = rawDetailed
    .map(c => Number(c.relevanceScore ?? c.score ?? 0))
    .filter(n => Number.isFinite(n) && n > 0)
  const maxScore = rawScores.length ? Math.max(...rawScores) : 0

  const newPapers: Paper[] = rawDetailed.map((c, i) => {
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

    let sourceUrl: string | undefined =
      (typeof c.url === "string" && c.url.trim()) || undefined
    if (!sourceUrl && typeof c.doi === "string" && c.doi.trim()) {
      sourceUrl = `https://doi.org/${c.doi.trim().replace(/^doi:/i, "")}`
    }
    if (!sourceUrl && typeof c.title === "string" && c.title.trim()) {
      sourceUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(c.title.trim())}`
    }
    let title = cleanPaperTitle(c.title || "")
    if (!title && rawSummary) {
      const firstSentence = rawSummary.split(/(?<=[.!?])\s+/)[0]?.slice(0, 160)
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
      // Defensive: extract a clean 4-digit year even if an upstream path
      // delivered a full date string, so the "latest" sort has real years.
      year: (() => {
        const m = (c.year ?? "").toString().match(/\b(19|20)\d{2}\b/)
        return m ? m[0] : undefined
      })(),
      journal: c.journal || undefined,
      source: c.source || undefined,
      relevanceScore: normalized,
      citationCount:
        typeof c.citationCount === "number" ? c.citationCount : undefined
    }
  })

  if (newPapers.length === 0 && litOutput.citations.length > 0) {
    litOutput.citations.forEach((cite: string, i: number) => {
      newPapers.push({
        id: `lit-${i}-${timestamp}`,
        title: cite,
        summary: "Citation from literature search",
        userAdded: false,
        selected: false
      })
    })
  }

  // Drop metadata-less junk hits - the "Abstract not available / Authors
  // Unknown / Source Web" rows the scientist flagged. A paper is junk when it
  // has no usable title AND no authors AND no real abstract; we keep anything
  // with at least real authors or a real summary so we don't over-prune.
  const JUNK_TEXT = new Set([
    "abstract not available.",
    "abstract not available",
    "no abstract",
    "unknown",
    "untitled",
    "untitled research result",
    "citation from literature search",
    ""
  ])
  const isJunk = (p: Paper): boolean => {
    const title = (p.title || "").trim().toLowerCase()
    const summary = (p.summary || "").trim().toLowerCase()
    const hasAuthors = (p.authors?.length ?? 0) > 0
    const hasRealSummary = summary.length > 0 && !JUNK_TEXT.has(summary)
    const hasRealTitle =
      title.length > 0 && !JUNK_TEXT.has(title) && !title.startsWith("paper ")
    if (!hasRealTitle && !hasAuthors && !hasRealSummary) return true
    // No title at all, or a placeholder title, with nothing else to show.
    if (!hasRealTitle && !hasRealSummary) return true
    return false
  }
  const qualityPapers = newPapers.filter(p => p.userAdded || !isJunk(p))

  let papers: Paper[]
  const sourceNewPapers = qualityPapers
  const appendMode = args.mode === "append"
  const existingPapers = existing.papers ?? []
  // One shared de-duplication for both modes.
  //
  // The append path used to compare raw lowercase titles and URLs, which only
  // caught byte-identical repeats. The same study retrieved from PubMed and
  // scraped off the web has a different URL and a title differing by a trailing
  // period or a "| Journal | Publisher" tail, so it survived twice and the
  // researcher saw it listed twice. dedupePapers matches on the normalized
  // title, keeps the copy from the more authoritative source, and carries over
  // the `selected` tick so nothing chosen can be dropped.
  papers = appendMode
    ? dedupePapers([...existingPapers, ...sourceNewPapers])
    : dedupePapers(sourceNewPapers)

  const literatureContext: StoredLiteratureContext = {
    whatOthersHaveDone: litOutput.whatOthersHaveDone,
    goodMethodsAndTools: litOutput.goodMethodsAndTools,
    potentialPitfalls: litOutput.potentialPitfalls,
    citations: litOutput.citations
  }

  // Downstream clearing (replace mode wipes hypotheses/designs built on the old
  // paper set) is applied by the worker's finalize step - `undefined` values
  // don't survive Inngest step-result JSON serialization, so we return positive
  // data only and let finalize delete keys by phase+mode.
  return {
    problem: ctx,
    papers,
    literatureContext
  }
}
