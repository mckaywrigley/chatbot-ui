import { getAzureOpenAI, getAzureOpenAIModel } from "@/lib/azure-openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { AggregatedSearchResults, SearchResult } from "../types"
import { optimizeSearchQuery, performMultiSourceSearch } from "./search-utils"

const openai = () => getAzureOpenAI()
const MODEL_NAME = () => getAzureOpenAIModel()

export async function generateQueries(
  problem: string,
  objectives: string[],
  variables: string[],
  rounds: number = 2,
  queriesPerRound: number = 2
): Promise<string[]> {
  const t0 = Date.now()
  const base = optimizeSearchQuery(problem, objectives, variables, "biomedical")
  const seeds = [base.primaryQuery, ...base.alternativeQueries]
  const queries: string[] = []
  for (let r = 0; r < rounds; r++) {
    const start = r * queriesPerRound
    queries.push(...seeds.slice(start, start + queriesPerRound).filter(Boolean))
  }
  const out = Array.from(new Set(queries))
  console.log("🧩 [DEEPSCHOLAR][QUERIES] Generated queries:")
  out.forEach((q, i) => console.log(`  ${i + 1}. ${q}`))
  console.log(
    `⏱️  [DEEPSCHOLAR][QUERIES] Time: ${Date.now() - t0}ms, Count: ${out.length}`
  )
  return out
}

/**
 * How much we trust a source to be the canonical record of a paper. When the
 * same work comes back from several arms we keep the highest-ranked copy: a
 * PubMed or OpenAlex record carries a DOI, a journal and a real abstract, where
 * the Tavily copy is usually a publisher landing page scraped off the web.
 */
const SOURCE_RANK: Record<SearchResult["source"], number> = {
  pubmed: 0,
  openalex: 1,
  semantic_scholar: 2,
  arxiv: 3,
  scholar: 4,
  tavily: 5
}

/** DOIs arrive as bare ids, doi.org URLs, and with assorted casing. */
function normalizeDoi(doi?: string): string {
  if (!doi) return ""
  return doi
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
    .replace(/^doi:\s*/, "")
    .replace(/[.\s]+$/, "")
}

/**
 * A title reduced to comparable form: no case, no punctuation, no publisher
 * furniture, no whitespace runs. Two records of one paper routinely differ by
 * a trailing period, smart quotes, or a "| Journal | Publisher" suffix.
 */
function titleKey(title?: string): string {
  if (!title) return ""
  return title
    .toLowerCase()
    .split(/\s[|·–—-]\s/)[0]
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

/**
 * Collapse the same paper retrieved by different arms down to one record.
 *
 * The old key was `doi || url || title`, which only ever caught exact repeats
 * from a single source: a PubMed hit and a Tavily hit for one paper have
 * different URLs and often only one of them carries a DOI, so both survived and
 * the researcher saw the same study listed twice. Matching now runs on the DOI
 * and on a normalized title independently, the higher-ranked source wins, and
 * fields the winner is missing are filled in from the copy being dropped.
 */
export function dedupeNormalize(papers: SearchResult[]): SearchResult[] {
  const byKey = new Map<string, number>()
  const out: SearchResult[] = []

  for (const p of papers) {
    const doi = normalizeDoi(p.doi)
    const tkey = titleKey(p.title)
    // A title under ~15 normalized chars is too weak to match on (stubs like
    // "Supplementary data" would swallow unrelated records), so those fall back
    // to DOI/URL only.
    const keys = [
      doi ? `doi:${doi}` : "",
      tkey.length >= 15 ? `title:${tkey}` : "",
      !doi && tkey.length < 15 && p.url ? `url:${p.url.toLowerCase()}` : ""
    ].filter(Boolean)

    if (keys.length === 0) continue

    const existingIdx = keys
      .map(k => byKey.get(k))
      .find(i => typeof i === "number")

    if (existingIdx === undefined) {
      out.push(p)
      for (const k of keys) byKey.set(k, out.length - 1)
      continue
    }

    // Already have this paper. Keep whichever copy comes from the more
    // authoritative source, then backfill anything it lacks from the other.
    const kept = out[existingIdx]
    const winner = SOURCE_RANK[p.source] < SOURCE_RANK[kept.source] ? p : kept
    const loser = winner === p ? kept : p
    out[existingIdx] = {
      ...winner,
      doi: winner.doi || loser.doi,
      abstract:
        (winner.abstract?.length ?? 0) >= (loser.abstract?.length ?? 0)
          ? winner.abstract
          : loser.abstract,
      journal: winner.journal || loser.journal,
      publishedDate: winner.publishedDate || loser.publishedDate,
      citationCount: Math.max(
        winner.citationCount ?? 0,
        loser.citationCount ?? 0
      ),
      publicationTypes: winner.publicationTypes?.length
        ? winner.publicationTypes
        : loser.publicationTypes
    }
    // Point every key at the surviving record, including keys only the loser
    // had (e.g. the DOI the Tavily copy carried and PubMed's record didn't).
    for (const k of keys) byKey.set(k, existingIdx)
    const survivorDoi = normalizeDoi(out[existingIdx].doi)
    if (survivorDoi) byKey.set(`doi:${survivorDoi}`, existingIdx)
  }

  return out
}

const RelevanceSchema = z.object({
  relevance: z.enum(["0", "1", "2"]),
  rationale: z.string().optional()
})

export async function semFilter(
  papers: SearchResult[],
  userProblem: string,
  objectives: string[],
  variables: string[]
): Promise<SearchResult[]> {
  const t0 = Date.now()
  console.log(
    `🧪 [DEEPSCHOLAR][FILTER] Starting filter on ${papers.length} candidates`
  )
  // Capture the FIRST error to surface as a representative cause - when
  // every paper fails for the same reason (e.g. bad api-version → 404 on
  // every call), this gives operators something concrete to grep for in
  // Vercel logs instead of a silent empty result.
  let firstError: {
    status?: number
    code?: string
    message?: string
    param?: string
  } | null = null
  let errorCount = 0

  const judgeOne = async (p: SearchResult): Promise<SearchResult | null> => {
    const sys =
      "Return JSON with fields: relevance (0/1/2) and rationale. Consider strict topical relevance to problem/objectives/variables."
    const user = `Problem: ${userProblem}\nObjectives: ${objectives.join(", ")}\nVariables: ${variables.join(", ")}\n\nTitle: ${p.title}\nAbstract: ${p.abstract}`
    try {
      const res = await openai().beta.chat.completions.parse({
        model: MODEL_NAME(),
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user }
        ],
        // Reasoning model - temperature is forced to 1 by the SDK shim.
        temperature: 1,
        response_format: zodResponseFormat(RelevanceSchema, "rel")
      })
      const parsed = res.choices[0].message.parsed as z.infer<
        typeof RelevanceSchema
      >
      const rel = Number(parsed.relevance)
      return rel > 0 ? { ...p, relevanceScore: rel } : null
    } catch (e: any) {
      errorCount++
      if (!firstError) {
        firstError = {
          status: e?.status,
          code: e?.error?.code ?? e?.code,
          param: e?.error?.param,
          message: String(e?.message ?? e).slice(0, 240)
        }
      }
      return null
    }
  }

  // PARALLELISE with a concurrency cap - gpt-5.5 reasoning calls take 1-2s
  // each; running 75+ papers serially blew through Vercel's 300s function
  // limit and the route timed out mid-stream (user-visible "no papers
  // found"). 8 concurrent calls keeps total < 30s on a 75-paper pool and
  // stays well under Azure's per-deployment rate limit. If Azure 429s
  // appear in logs, lower the cap.
  const CONCURRENCY = 8
  const filtered: SearchResult[] = []
  for (let i = 0; i < papers.length; i += CONCURRENCY) {
    const batch = papers.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(judgeOne))
    for (const r of results) if (r) filtered.push(r)
  }
  if (errorCount > 0) {
    // Loud, single summary line - easier to spot in Vercel logs than per-
    // paper errors, and surfaces the smoking-gun status / code / message.
    console.error(
      `❌ [DEEPSCHOLAR][FILTER] Azure relevance call failed on ${errorCount}/${papers.length} papers. First error:`,
      firstError
    )
  }
  const bySource: Record<string, number> = {}
  filtered.forEach(f => {
    bySource[f.source] = (bySource[f.source] || 0) + 1
  })
  console.log(
    `✅ [DEEPSCHOLAR][FILTER] Kept ${filtered.length}/${papers.length} candidates (${errorCount} LLM errors)`
  )
  Object.entries(bySource).forEach(([src, n]) =>
    console.log(`  📦 ${src}: ${n}`)
  )
  console.log(`⏱️  [DEEPSCHOLAR][FILTER] Time: ${Date.now() - t0}ms`)
  return filtered
}

export function semTopK(
  papers: SearchResult[],
  k: number = 30
): SearchResult[] {
  const t0 = Date.now()
  const weights = { llm: 0.6, src: 0.2, recency: 0.1, cites: 0.1 }
  const srcW: Record<string, number> = {
    pubmed: 0.9,
    arxiv: 0.8,
    semantic_scholar: 0.85,
    scholar: 0.75,
    tavily: 0.7
  }
  const now = Date.now()
  const scored = papers.map(p => {
    const llm = p.relevanceScore ?? 0
    const src = srcW[p.source] ?? 0.5
    const recency = (() => {
      const d = Date.parse(p.publishedDate || "")
      if (Number.isNaN(d)) return 0.3
      const years = (now - d) / (1000 * 60 * 60 * 24 * 365)
      return Math.max(0, 1 - years / 5) // full credit if <=1y, decays to 0 by 5y
    })()
    const cites = p.citationCount
      ? Math.min(1, Math.log1p(p.citationCount) / 10)
      : 0.2
    const finalRank =
      weights.llm * llm +
      weights.src * src +
      weights.recency * recency +
      weights.cites * cites
    return { ...p, relevanceScore: finalRank }
  })
  const ranked = scored
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, k)
  console.log(
    `🏆 [DEEPSCHOLAR][TOPK] Selected top ${ranked.length} of ${papers.length}`
  )
  ranked
    .slice(0, 5)
    .forEach((p, i) =>
      console.log(
        `  ${i + 1}. ${(p.title || "").slice(0, 120)}  [src=${p.source}] [score=${
          p.relevanceScore?.toFixed(3) || "0.000"
        }]`
      )
    )
  console.log(`⏱️  [DEEPSCHOLAR][TOPK] Time: ${Date.now() - t0}ms`)
  return ranked
}

export function buildCuratedAggregatedResults(
  topPapers: SearchResult[]
): AggregatedSearchResults {
  const toAgg = (src: SearchResult["source"]) =>
    topPapers.filter(p => p.source === src)
  const agg: AggregatedSearchResults = {
    totalResults: topPapers.length,
    sources: {
      pubmed: toAgg("pubmed"),
      arxiv: toAgg("arxiv"),
      semanticScholar: toAgg("semantic_scholar"),
      scholar: toAgg("scholar"),
      tavily: toAgg("tavily"),
      openalex: toAgg("openalex")
    },
    synthesizedFindings: {
      keyMethodologies: [],
      commonPitfalls: [],
      recommendedApproaches: [],
      novelInsights: []
    },
    searchMetrics: {
      queryOptimization: [],
      relevanceScores: [],
      sourceWeights: {
        pubmed: 0.9,
        arxiv: 0.8,
        semanticScholar: 0.85,
        scholar: 0.75,
        tavily: 0.7,
        openalex: 0.85
      }
    }
  }
  console.log(
    `📊 [DEEPSCHOLAR][AGG] Distribution - PubMed: ${agg.sources.pubmed.length}, ArXiv: ${agg.sources.arxiv.length}, Semantic Scholar: ${agg.sources.semanticScholar.length}, Scholar: ${agg.sources.scholar.length}, Tavily: ${agg.sources.tavily.length}, OpenAlex: ${agg.sources.openalex.length}`
  )
  return agg
}

export async function deepScholarRetrieveAndCurate(
  problem: string,
  objectives: string[],
  variables: string[],
  rounds: number = 2,
  queriesPerRound: number = 2,
  maxPerSource: number = 10,
  topK: number = 30
): Promise<AggregatedSearchResults> {
  const T0 = Date.now()
  console.log(
    `🚀 [DEEPSCHOLAR] Starting retrieval pipeline (rounds=${rounds}, q/round=${queriesPerRound}, perSource=${maxPerSource}, topK=${topK})`
  )
  const queries = await generateQueries(
    problem,
    objectives,
    variables,
    rounds,
    queriesPerRound
  )

  let candidates: SearchResult[] = []
  for (const q of queries) {
    const tq = Date.now()
    const r = await performMultiSourceSearch(q, maxPerSource)
    const merged: SearchResult[] = [
      ...r.sources.pubmed,
      ...r.sources.arxiv,
      ...r.sources.semanticScholar,
      ...r.sources.scholar,
      ...r.sources.tavily
    ]
    candidates.push(...merged)
    console.log(
      `🔎 [DEEPSCHOLAR][QUERY] "${q}" -> PubMed:${r.sources.pubmed.length} ArXiv:${r.sources.arxiv.length} SemSch:${r.sources.semanticScholar.length} Scholar:${r.sources.scholar.length} Tavily:${r.sources.tavily.length} (Time ${Date.now() - tq}ms)`
    )
  }
  console.log(
    `📥 [DEEPSCHOLAR][MERGE] Collected candidates: ${candidates.length}`
  )
  candidates = dedupeNormalize(candidates)
  console.log(
    `🧹 [DEEPSCHOLAR][DEDUPE] After dedupe: ${candidates.length} unique`
  )
  let filtered = await semFilter(candidates, problem, objectives, variables)
  if (filtered.length === 0 && candidates.length > 0) {
    console.warn(
      "⚠️  [DEEPSCHOLAR][FILTER] Zero kept after filter; falling back to unfiltered candidates"
    )
    filtered = candidates
  }
  const top = semTopK(filtered, topK)
  const result = buildCuratedAggregatedResults(top)
  console.log(
    `🏁 [DEEPSCHOLAR] Completed in ${Date.now() - T0}ms. Top papers: ${
      result.totalResults
    }`
  )
  return result
}
