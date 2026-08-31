import axios from "axios"
import { SERPGoogleScholarAPITool } from "@langchain/community/tools/google_scholar"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import {
  getAzureOpenAI,
  getAzureOpenAIForDesign,
  getAzureOpenAIModel,
  getDesignDeployment
} from "@/lib/azure-openai"
import { AggregatedSearchResults, Domain, Phase, SearchResult } from "../types"

// Initialize enhanced search tools
let scholarTool: SERPGoogleScholarAPITool | null = null
if (process.env.SERPAPI_API_KEY) {
  scholarTool = new SERPGoogleScholarAPITool({
    apiKey: process.env.SERPAPI_API_KEY
  })
} else {
  console.log(
    "⚠️ [SERPAPI] SERPAPI_API_KEY not configured. Google Scholar searches disabled."
  )
}

// Tavily is called over its REST API directly in `searchTavilyEnhanced` (the
// LangChain tool wrapper was being passed an object where it expects a string,
// which made every call 422). Nothing to construct here - we just read
// TAVILY_API_KEY at call time.

const openai = () => getAzureOpenAI()
const MODEL_NAME = () => getAzureOpenAIModel()

// Enhanced rate limiting with backoff strategy
export class EnhancedRateLimiter {
  private requests: { [key: string]: number[] } = {}
  private backoffDelays: { [key: string]: number } = {}

  async checkAndWait(
    source: string,
    maxRequestsPerMinute: number = 10
  ): Promise<void> {
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    if (!this.requests[source]) {
      this.requests[source] = []
      this.backoffDelays[source] = 1000 // Start with 1 second
    }

    // Clean old requests
    this.requests[source] = this.requests[source].filter(
      time => time > oneMinuteAgo
    )

    if (this.requests[source].length >= maxRequestsPerMinute) {
      const waitTime = this.backoffDelays[source]
      console.log(`⏳ [RATE_LIMIT] Backing off ${waitTime}ms for ${source}`)
      await new Promise(resolve => setTimeout(resolve, waitTime))

      // Exponential backoff with max cap
      this.backoffDelays[source] = Math.min(waitTime * 1.5, 30000)
    } else {
      // Reset backoff on successful request
      this.backoffDelays[source] = 1000
    }

    this.requests[source].push(now)
  }
}

export const rateLimiter = new EnhancedRateLimiter()

/**
 * Build a clean primary query + alternative reformulations for the
 * literature-scout fan-out.
 *
 * History: the old version concatenated `${problem} ${objectives} ${variables}
 * experimental design` for the primary, which double-counted any objective
 * that was a substring of the problem (e.g. "Reduce viscosity of X" +
 * "to reduce the viscosity of X" → the same phrase twice in one query).
 * It also templated alternatives that came out as either fragments
 * (`experimental design Reduce viscosity of`) or leading-whitespace
 * boilerplate (`" clinical trial experimental design biomarker"`) when
 * variables / problem were short or empty. Upstream PaperFinder logs
 * showed its analyzer had to recover the real intent from our blob.
 *
 * New approach: trust the upstream query analyzer to do its own
 * keyword extraction + relevance-criteria building. Send it CLEAN
 * natural-language queries - the problem statement on its own, then
 * 2-4 reformulations that emphasise different angles. Drop any query
 * that's a fragment (< 15 chars or < 3 content words) so a round is
 * never wasted on garbage like `" clinical trial experimental design"`.
 */
export function optimizeSearchQuery(
  problem: string,
  objectives: string[],
  variables: string[],
  _domain: "biomedical" | "technical" | "general" = "biomedical"
): {
  primaryQuery: string
  alternativeQueries: string[]
  keywords: string[]
} {
  const cleanProblem = problem.trim().replace(/\s+/g, " ")
  const lowerProblem = cleanProblem.toLowerCase()

  // Drop objectives + variables that are already substrings of the
  // problem - they add no signal and bloat the query (this is exactly
  // what made the primary read "Reduce viscosity of X to reduce
  // viscosity of X" before).
  const cleanObjectives = objectives
    .map(o => o.trim().replace(/\s+/g, " "))
    .filter(o => o.length > 4 && !lowerProblem.includes(o.toLowerCase()))
  const cleanVariables = variables
    .map(v => v.trim().replace(/\s+/g, " "))
    .filter(v => v.length > 1 && !lowerProblem.includes(v.toLowerCase()))

  const keywords = uniqueContentWords(
    [cleanProblem, ...cleanObjectives, ...cleanVariables].join(" "),
    12
  )
  const problemKeywords = uniqueContentWords(cleanProblem, 6)

  // Primary = the problem statement on its own. Upstream PaperFinder's
  // QueryAnalyzer prefers a tight natural-language query - the boilerplate
  // we used to append ("experimental design clinical trial biomarker")
  // showed up in the analyzer's output as noise it had to discard.
  const primaryQuery = cleanProblem

  // Alternatives: each one is a focused reformulation that stands alone
  // as a sensible literature query. Order = strongest to weakest so
  // the early-exit (10 unique papers) fires on the best alternative
  // before we burn rounds on the long-tail.
  const candidates: string[] = []
  if (cleanObjectives.length) {
    candidates.push(
      `${cleanProblem}. Objectives: ${cleanObjectives.join("; ")}`
    )
  }
  if (problemKeywords.length >= 3) {
    candidates.push(`${problemKeywords.join(" ")} methods strategies`)
    candidates.push(`${problemKeywords.join(" ")} mechanism factors`)
  }
  if (cleanVariables.length) {
    candidates.push(
      `${cleanProblem}. Key factors: ${cleanVariables.join(", ")}`
    )
  }

  // Defensive sweep - every query must be ≥ 15 chars AND ≥ 3 content
  // words. Anything shorter is fragmentary and just wastes a round.
  const seen = new Set<string>([primaryQuery.toLowerCase()])
  const alternativeQueries: string[] = []
  for (const raw of candidates) {
    const q = raw.trim().replace(/\s+/g, " ")
    const key = q.toLowerCase()
    if (q.length >= 15 && countContentWords(q) >= 3 && !seen.has(key)) {
      seen.add(key)
      alternativeQueries.push(q)
    }
  }

  return {
    primaryQuery,
    alternativeQueries,
    keywords
  }
}

// ───────────────────────────────────────────────────────────────────────
// LLM-based query generator
// ───────────────────────────────────────────────────────────────────────
//
// The heuristic `optimizeSearchQuery` above is fine as a baseline but it
// ignores most of the lit-scout's structured context: domain, phase,
// constraints, special considerations. Its alternative queries are also
// just string-template shuffles ("<keywords> methods strategies" /
// "<keywords> mechanism factors") rather than thoughtful complementary
// angles.
//
// This LLM-based generator does what a real research librarian would
// do: read the scientist's structured problem context (problem +
// domain + phase + objectives + variables + constraints), think about
// which complementary angles are worth pulling literature from, and
// emit 3-4 carefully-worded queries each labelled with its intent. The
// labels flow through to the per-round progress events so the user can
// see "round 2/4 · mechanism · q: '…'" instead of guessing why two
// rounds look almost identical.
//
// Falls back to `null` on any failure - caller should then fall back to
// the heuristic `optimizeSearchQuery` so we never block the lit-scout on
// a flaky LLM call.

/** Human-readable labels for each Domain enum value used in the prompt. */
const DOMAIN_LABEL: Record<Domain, string> = {
  formulation_development: "Formulation development",
  discovery_biology: "Discovery biology / target identification",
  molecular_biology: "Molecular biology / genomics",
  protein_expression: "Protein expression and purification",
  cell_culture: "Cell culture / upstream",
  fermentation: "Fermentation / bioprocess",
  analytics_qc: "Analytics / QC"
}

const PHASE_LABEL: Record<Phase, string> = {
  screening: "Screening (broad factor coverage)",
  optimization: "Optimization (refine ranges + interactions)",
  robustness: "Robustness (variability + stress testing)",
  scale_up: "Scale-up (process + manufacturability)",
  validation: "Validation (reproducibility + controls)"
}

export interface QueryGenerationContext {
  problem: string
  domain?: Domain | string
  phase?: Phase | string
  objectives?: string[]
  knownVariables?: string[]
  unknownVariables?: string[]
  constraints?: {
    material?: string
    time?: string
    equipment?: string
  }
  specialConsiderations?: string[]
}

/**
 * Intent labels we ask the LLM to assign to each alternative query. The
 * agent uses these to surface "round 2/4 · mechanism" in the progress
 * feed instead of an opaque truncated query.
 */
export type QueryIntent =
  | "primary" // tight restatement of the problem
  | "mechanism" // why does this happen / molecular basis
  | "methods" // experimental/computational techniques
  | "applications" // where it's been deployed / case studies
  | "recent_advances" // latest work in the area
  | "comparative" // versus alternatives / benchmarks
  | "failure_modes" // pitfalls / what goes wrong

/** The LLM's structured-output shape. */
const SearchQueriesSchema = z.object({
  primaryQuery: z.object({
    query: z
      .string()
      .describe(
        "Tight natural-language restatement of the problem, 6-15 words, " +
          "optimized for relevance ranking on academic search engines. " +
          "Use domain-specific terminology. Avoid filler words."
      ),
    rationale: z
      .string()
      .describe("One sentence explaining why this query phrasing is best.")
  }),
  alternativeQueries: z
    .array(
      z.object({
        intent: z.enum([
          "mechanism",
          "methods",
          "applications",
          "recent_advances",
          "comparative",
          "failure_modes"
        ]),
        query: z
          .string()
          .describe(
            "6-15 word search query targeting this specific intent. " +
              "Should complement (not duplicate) the primary query. " +
              "Use distinct vocabulary."
          ),
        rationale: z
          .string()
          .describe("One sentence explaining what literature this surfaces.")
      })
    )
    .min(2)
    .max(4),
  keywords: z
    .array(z.string())
    .describe(
      "5-10 domain-specific keywords distilled from the context, useful " +
        "for downstream filtering."
    )
})

export interface LLMQueryGeneratorResult {
  primaryQuery: string
  alternativeQueries: string[]
  /** Same length as alternativeQueries; intent label per query. */
  alternativeIntents: QueryIntent[]
  keywords: string[]
  /** Marker so caller can log "LLM was used" vs "heuristic was used". */
  source: "llm"
}

/**
 * Generate search queries via the design-deployment LLM. Returns null on
 * ANY failure (network, parsing, empty response, etc.) so the caller can
 * fall through to the heuristic optimizeSearchQuery without a try/catch
 * dance at every call site.
 */
export async function generateSearchQueriesWithLLM(
  ctx: QueryGenerationContext
): Promise<LLMQueryGeneratorResult | null> {
  const problem = (ctx.problem ?? "").trim()
  if (!problem) return null

  const domainLabel = ctx.domain
    ? (DOMAIN_LABEL[ctx.domain as Domain] ?? String(ctx.domain))
    : null
  const phaseLabel = ctx.phase
    ? (PHASE_LABEL[ctx.phase as Phase] ?? String(ctx.phase))
    : null

  const constraintLines: string[] = []
  if (ctx.constraints?.material)
    constraintLines.push(`Material: ${ctx.constraints.material}`)
  if (ctx.constraints?.time)
    constraintLines.push(`Time: ${ctx.constraints.time}`)
  if (ctx.constraints?.equipment)
    constraintLines.push(`Equipment: ${ctx.constraints.equipment}`)

  const userContext = [
    `Problem: ${problem}`,
    domainLabel ? `Domain: ${domainLabel}` : null,
    phaseLabel ? `Phase: ${phaseLabel}` : null,
    ctx.objectives?.length
      ? `Objectives:\n- ${ctx.objectives.join("\n- ")}`
      : null,
    ctx.knownVariables?.length
      ? `Known variables: ${ctx.knownVariables.join(", ")}`
      : null,
    ctx.unknownVariables?.length
      ? `Unknown variables to explore: ${ctx.unknownVariables.join(", ")}`
      : null,
    constraintLines.length
      ? `Constraints:\n- ${constraintLines.join("\n- ")}`
      : null,
    // SECONDARY steering only. Cap the count so a long list of design-stage
    // considerations can't hijack the queries away from the problem+objective.
    ctx.specialConsiderations?.length
      ? `Special considerations (secondary steering — do NOT make these the subject of queries):\n- ${ctx.specialConsiderations
          .slice(0, 2)
          .join("\n- ")}`
      : null
  ]
    .filter(Boolean)
    .join("\n\n")

  const systemPrompt = [
    "You are an expert biomedical research librarian working for a senior scientist.",
    "Your job: turn the scientist's structured experiment-design context into a small set of literature-search queries that, run in parallel, will surface the most relevant EXPERIMENTAL / METHODOLOGY primary research from PubMed / Semantic Scholar / OpenAlex / arXiv.",
    "",
    "Hard rules:",
    "- ANCHOR every query on the PROBLEM STATEMENT and the OBJECTIVE. They define the search. Keep all queries pointed in that ONE direction — sharpen it, do not widen it.",
    "- Treat 'Special considerations' and answered clarifications as SECONDARY STEERING, not as query subjects. Do NOT spawn a separate query per consideration — that dilutes the search and returns off-target papers. Fold at most the one or two considerations that change WHICH papers exist (system, mechanism family, readout) into the queries; ignore the rest here.",
    "- Target BENCH / wet-lab work. The pool should be a MIX: mostly EXPERIMENTAL / METHODOLOGY papers (studies that generate real data and describe how it was done), plus a few authoritative, well-cited REVIEWS that map the landscape. Prefer methods/experimental vocabulary ('assay', 'protocol', 'measured', 'in vitro', named techniques). Bias strongly away ONLY from purely computational / machine-learning / predictive-modeling / in-silico papers — this is a wet-lab program, so modeling-only work is noise unless the objective is explicitly computational.",
    "- Favor well-established, highly-cited work over obscure one-offs, while staying on-problem.",
    "- Across the query set, deliberately surface DIFFERENT APPROACHES to solving the problem (distinct mechanisms, excipient/reagent classes, assay formats, process levers) that are realistic at ordinary bench scale — not four variations of one approach. The scientist is choosing between options.",
    "- The PRIMARY query is the strongest single-shot version. Make it tight, natural-language, 6-15 words. Use domain-specific terminology (mechanisms named after their authors, standard assays, canonical proteins/factors). Avoid hedge words, filler, or jargon-stacking.",
    "- 2-4 ALTERNATIVE queries, each targeting a DIFFERENT angle within the SAME problem+objective direction, using DIFFERENT vocabulary. Don't just shuffle the primary query's words. Each alternative carries an intent label so the agent knows what kind of paper it expects back.",
    "- Intent labels are: mechanism (molecular/physical basis), methods (assays, techniques, instruments), applications (case studies, prior deployments), recent_advances (latest 3-5 years), comparative (vs alternatives, benchmarks), failure_modes (pitfalls, what goes wrong, common artifacts). Favor mechanism + methods + failure_modes for a bench program.",
    "- Pick intents that fit THIS problem. If the user is in early discovery, mechanism + recent_advances are usually right. If they're in optimization, methods + failure_modes + comparative often beat the rest. Don't force all 6.",
    "- Keywords: 5-10 short tokens distilled from the context. These are used downstream for filtering, not as standalone queries.",
    "",
    "Output STRICT JSON matching the provided schema. No commentary, no markdown."
  ].join("\n")

  try {
    const openai = getAzureOpenAIForDesign()
    const model = getDesignDeployment()
    const completion = await openai.beta.chat.completions.parse({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContext }
      ],
      temperature: 0.3,
      response_format: zodResponseFormat(SearchQueriesSchema, "searchQueries")
    })
    const parsed = completion.choices[0]?.message?.parsed
    if (!parsed) return null

    // Defensive: ensure primary and at least one alternative came back
    // non-empty. If the LLM produced an empty string for either, treat as
    // failure and fall back to the heuristic.
    const primary = parsed.primaryQuery.query?.trim()
    if (!primary) return null
    const alts = parsed.alternativeQueries
      .map(a => ({ query: a.query?.trim() ?? "", intent: a.intent }))
      .filter(a => a.query.length >= 6)
    if (alts.length === 0) return null

    console.log(
      `🤖 [QUERY_GEN_LLM] Generated ${alts.length + 1} queries: primary + ${alts.map(a => a.intent).join(", ")}`
    )

    return {
      primaryQuery: primary,
      alternativeQueries: alts.map(a => a.query),
      alternativeIntents: alts.map(a => a.intent as QueryIntent),
      keywords: parsed.keywords
        .filter(
          (k): k is string => typeof k === "string" && k.trim().length > 0
        )
        .map(k => k.trim()),
      source: "llm"
    }
  } catch (err: any) {
    // Surface the full Azure error shape (status / code / param) so we can
    // pinpoint things like `unsupported_value: temperature` or a 404 from
    // a bad api-version - previously this was a silent `console.warn` with
    // just `.message`, which masked the real cause when the lit-scout
    // returned empty in production.
    console.error(
      "❌ [QUERY_GEN_LLM] Azure call failed (falling back to heuristic queries):",
      {
        status: err?.status,
        code: err?.error?.code ?? err?.code,
        param: err?.error?.param,
        type: err?.error?.type,
        message: err?.message,
        model: getDesignDeployment()
      }
    )
    return null
  }
}

// Lowercased stop-word list for content-word extraction. Kept small + hot
// so we don't pull in `natural`/`compromise` for a 30-line helper.
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "the",
  "in",
  "on",
  "for",
  "by",
  "with",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "at",
  "as",
  "how",
  "what",
  "why",
  "when",
  "where",
  "this",
  "that",
  "these",
  "those",
  "do",
  "does",
  "did",
  "not",
  "no",
  "its",
  "it",
  "into",
  "over",
  "under",
  "via",
  "than",
  "such",
  "we",
  "they",
  "their"
])

function uniqueContentWords(text: string, limit: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split(/\s+/)) {
    const w = raw.toLowerCase().replace(/[^a-z0-9-]/g, "")
    if (!w || w.length < 3 || STOP_WORDS.has(w) || seen.has(w)) continue
    seen.add(w)
    out.push(w)
    if (out.length >= limit) break
  }
  return out
}

function countContentWords(text: string): number {
  return uniqueContentWords(text, 9999).length
}

// Enhanced PubMed search with direct API calls
export async function searchPubMedEnhanced(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
    await rateLimiter.checkAndWait("pubmed", 3)
    console.log(`🔍 [PUBMED_ENHANCED] Searching for: ${query}`)

    // First, search for PMIDs
    const searchResponse = await axios.get(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
      {
        params: {
          db: "pubmed",
          term: query,
          retmax: maxResults,
          retmode: "json",
          tool: "chatbot-ui",
          email: "research@example.com"
        }
      }
    )

    const pmids = searchResponse.data.esearchresult?.idlist || []
    if (pmids.length === 0) return []

    await rateLimiter.checkAndWait("pubmed", 3)

    // Fetch detailed information
    const detailsResponse = await axios.get(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
      {
        params: {
          db: "pubmed",
          id: pmids.join(","),
          rettype: "xml",
          retmode: "xml",
          tool: "chatbot-ui",
          email: "research@example.com"
        }
      }
    )

    // Parse XML response (simplified - in production, use proper XML parser)
    const results: SearchResult[] = []
    const articles =
      detailsResponse.data.match(/<PubmedArticle[\s\S]*?<\/PubmedArticle>/g) ||
      []

    articles.forEach((article: string, index: number) => {
      try {
        const title =
          article.match(/<ArticleTitle>(.*?)<\/ArticleTitle>/)?.[1] ||
          "No title"
        const abstract =
          article.match(/<AbstractText[^>]*>(.*?)<\/AbstractText>/)?.[1] ||
          "No abstract"
        const journal =
          article.match(/<Title>(.*?)<\/Title>/)?.[1] || "Unknown journal"
        const year =
          article.match(/<Year>(\d{4})<\/Year>/)?.[1] || "Unknown year"
        const authors =
          article
            .match(/<LastName>(.*?)<\/LastName>/g)
            ?.map(m => m.replace(/<\/?LastName>/g, "")) || []

        results.push({
          title: title.replace(/<[^>]*>/g, ""),
          authors,
          abstract: abstract.replace(/<[^>]*>/g, ""),
          publishedDate: year,
          journal,
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmids[index]}/`,
          source: "pubmed",
          relevanceScore: 0.8 + index * -0.05, // Decreasing relevance
          keywords: query.split(" ").filter(word => word.length > 3)
        })
      } catch (error) {
        console.error("Error parsing PubMed article:", error)
      }
    })

    console.log(`✅ [PUBMED_ENHANCED] Found ${results.length} results`)
    return results
  } catch (error) {
    console.error("❌ [PUBMED_ENHANCED] Search error:", error)
    return []
  }
}

// Enhanced ArXiv search
export async function searchArXivEnhanced(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
    await rateLimiter.checkAndWait("arxiv", 3)
    console.log(`🔍 [ARXIV_ENHANCED] Searching for: ${query}`)

    const response = await axios.get("https://export.arxiv.org/api/query", {
      params: {
        search_query: `all:${encodeURIComponent(query)}`,
        start: 0,
        max_results: maxResults,
        sortBy: "relevance",
        sortOrder: "descending"
      },
      timeout: 10000
    })

    const results: SearchResult[] = []
    const entries = response.data.match(/<entry>[\s\S]*?<\/entry>/g) || []

    entries.forEach((entry: string, index: number) => {
      try {
        const title =
          entry
            .match(/<title>(.*?)<\/title>/)?.[1]
            ?.replace(/\s+/g, " ")
            .trim() || "No title"
        const summary =
          entry
            .match(/<summary>(.*?)<\/summary>/)?.[1]
            ?.replace(/\s+/g, " ")
            .trim() || "No abstract"
        const published =
          entry.match(/<published>(.*?)<\/published>/)?.[1] || "Unknown date"
        const id = entry.match(/<id>(.*?)<\/id>/)?.[1] || ""
        const authors =
          entry
            .match(/<name>(.*?)<\/name>/g)
            ?.map(m => m.replace(/<\/?name>/g, "")) || []

        results.push({
          title,
          authors,
          abstract: summary,
          publishedDate: published.split("T")[0],
          url: id,
          source: "arxiv",
          relevanceScore: 0.75 + index * -0.05,
          keywords: query.split(" ").filter(word => word.length > 3)
        })
      } catch (error) {
        console.error("Error parsing ArXiv entry:", error)
      }
    })

    console.log(`✅ [ARXIV_ENHANCED] Found ${results.length} results`)
    return results
  } catch (error) {
    console.error("❌ [ARXIV_ENHANCED] Search error:", error)
    return []
  }
}

// Enhanced Tavily search for comprehensive web coverage
export async function searchTavilyEnhanced(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  if (!process.env.TAVILY_API_KEY) {
    console.log("⚠️ [TAVILY] Tavily API key not configured, skipping...")
    return []
  }

  try {
    await rateLimiter.checkAndWait("tavily", 5)
    console.log(`🔍 [TAVILY_ENHANCED] Searching for: ${query}`)

    // Call Tavily's REST API directly rather than through
    // `TavilySearchResults.invoke()`. The LangChain tool takes a STRING
    // query; we were handing it an object ({query, maxResults}), which it
    // forwarded as a malformed request - Tavily rejected every single call
    // with "422 Unprocessable Entity", silently killing the web arm. Verified
    // the key + endpoint are fine: the same search over REST returns 200.
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${query} research paper academic study`,
        max_results: maxResults,
        // "advanced" pulls the fuller page body, which is what our title +
        // abstract extraction reads - "basic" often returns a stub.
        search_depth: "advanced",
        // Aim the web arm at the repositories and publishers that actually
        // host primary literature (ResearchGate, preprint servers, PMC and
        // the major publishers) instead of the open web, where it was
        // returning news pages and vendor blurb.
        include_domains: [
          "researchgate.net",
          "ncbi.nlm.nih.gov",
          "pmc.ncbi.nlm.nih.gov",
          "europepmc.org",
          "sciencedirect.com",
          "springer.com",
          "link.springer.com",
          "nature.com",
          "wiley.com",
          "onlinelibrary.wiley.com",
          "tandfonline.com",
          "pubs.acs.org",
          "frontiersin.org",
          "mdpi.com",
          "biorxiv.org",
          "medrxiv.org",
          "arxiv.org",
          "academic.oup.com",
          "cell.com",
          "journals.plos.org",
          "semanticscholar.org"
        ]
      })
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      console.error(
        `❌ [TAVILY_ENHANCED] HTTP ${res.status}: ${detail.slice(0, 200)}`
      )
      return []
    }

    const parsed = (await res.json()) as { results?: any[] }
    const results: SearchResult[] = (parsed.results ?? []).map(
      (result: any, index: number) => ({
        title: result.title || `Tavily Result ${index + 1}`,
        authors: [], // Tavily doesn't typically provide author info
        abstract: result.content?.substring(0, 500) || result.snippet || "",
        url: result.url || "",
        publishedDate: "Recent", // Tavily focuses on recent/real-time
        source: "tavily" as const,
        relevanceScore: result.score || 0.7 + index * -0.05,
        keywords: query.split(" ").filter(word => word.length > 3)
      })
    )

    console.log(`✅ [TAVILY_ENHANCED] Found ${results.length} results`)
    return results
  } catch (error) {
    console.error("❌ [TAVILY_ENHANCED] Search error:", error)
    return []
  }
}

/**
 * OpenAlex search.
 *
 * Why we use it: free, 100k req/day, no API key required. Covers ~250M
 * works across all disciplines and is the closest free analogue to the
 * Semantic Scholar paid-tier index we lost when our S2 key expired
 * (2026-05-18). Documentation: https://docs.openalex.org/
 *
 * Auth: we pass `mailto=` as a query parameter to opt into the "polite
 * pool" - higher priority + better rate limits. No bearer token, no
 * registration step. We pull the email from `OPENALEX_MAILTO` env, then
 * fall back to a generic noreply so requests never go un-tagged (the
 * common pool is heavily rate-limited).
 *
 * Abstract reconstruction: OpenAlex stores abstracts in inverted-index
 * form (`{word: [positions, ...]}`) to dodge copyright redistribution
 * problems. We reconstruct linear text by sorting positions and
 * concatenating, which is what every OpenAlex client does. The result
 * is the canonical abstract minus copyrighted formatting.
 */
export async function searchOpenAlexEnhanced(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
    // OpenAlex polite-pool rate limits to 10 req/sec when mailto is set.
    // We stay well under that with a 5-req/sec ceiling.
    await rateLimiter.checkAndWait("openalex", 5)
    console.log(`🔍 [OPENALEX] Searching for: ${query}`)

    const mailto =
      process.env.OPENALEX_MAILTO ||
      process.env.CONTACT_EMAIL ||
      "research@shadowai.dev"

    const response = await axios.get("https://api.openalex.org/works", {
      params: {
        search: query,
        per_page: Math.min(maxResults, 25),
        mailto,
        // Bias OpenAlex toward PRIMARY research. Without this, broad
        // biomedical queries (e.g. antibody formulation/aggregation) come
        // back dominated by review articles, which the downstream review
        // filter then drops - and when OpenAlex is the only live arm that
        // leaves an all-reviews pool. `type:article|preprint` excludes
        // `review` (and datasets/paratext) at the source. Valid OpenAlex
        // filter syntax; the call is wrapped in try/catch so a bad filter
        // degrades to [] rather than throwing.
        filter: "type:article|preprint",
        // Trim the payload to fields we actually render. Without this
        // OpenAlex returns ~50 fields per work and the response can
        // balloon past 1 MB on a 25-result page.
        select: [
          "id",
          "doi",
          "title",
          "publication_year",
          "publication_date",
          "type",
          "cited_by_count",
          "authorships",
          "primary_location",
          "abstract_inverted_index",
          "open_access"
        ].join(",")
      },
      headers: {
        // OpenAlex prefers a real-looking UA even in the polite pool.
        "User-Agent": `chatbot-ui (${mailto})`
      },
      timeout: 12000
    })

    const works: any[] = Array.isArray(response.data?.results)
      ? response.data.results
      : []

    const results: SearchResult[] = works.map((w: any) => {
      const authors: string[] = Array.isArray(w.authorships)
        ? w.authorships
            .map((a: any) => a?.author?.display_name)
            .filter(
              (n: unknown): n is string => typeof n === "string" && n.length > 0
            )
        : []

      // OpenAlex DOIs come back as `https://doi.org/10.xxxx/...` -
      // strip the URL prefix so downstream code that builds APA
      // citations or dedupes by DOI sees a bare DOI.
      const rawDoi: string | undefined =
        typeof w.doi === "string" && w.doi.length > 0 ? w.doi : undefined
      const doi = rawDoi?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")

      const primaryLocation = w.primary_location || {}
      const journal: string | undefined =
        primaryLocation?.source?.display_name ?? undefined

      // Best URL preference order: explicit landing page → DOI link →
      // OpenAlex work page. The OpenAlex `id` is a full URL like
      // `https://openalex.org/W2741809807`.
      const url: string =
        primaryLocation?.landing_page_url ||
        (doi ? `https://doi.org/${doi}` : "") ||
        (typeof w.id === "string" ? w.id : "")

      const abstract = reconstructAbstractFromInvertedIndex(
        w.abstract_inverted_index
      )

      // Map OpenAlex `type` ("article", "review", "book-chapter", ...)
      // to our publicationTypes array so the existing review-filter
      // (isReview heuristic in paper-finder.ts) picks it up.
      const publicationTypes = typeof w.type === "string" ? [w.type] : undefined

      return {
        title: typeof w.title === "string" ? w.title : "No title",
        authors,
        abstract: abstract || "No abstract",
        publishedDate: w.publication_date || String(w.publication_year || ""),
        journal: journal || "Unknown journal",
        url,
        doi,
        citationCount:
          typeof w.cited_by_count === "number" ? w.cited_by_count : undefined,
        source: "openalex" as const,
        publicationTypes,
        // OpenAlex 'type' = 'review' is the strongest signal we can
        // get for free. Title-based fallback heuristics already run
        // downstream so we don't duplicate them here.
        isReview:
          typeof w.type === "string" && w.type.toLowerCase().includes("review")
      }
    })

    console.log(`✅ [OPENALEX] Found ${results.length} results`)
    return results
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.warn(
        "⚠️ [OPENALEX] Rate limited (429). Polite pool overloaded - backing off."
      )
      await new Promise(resolve => setTimeout(resolve, 30000))
      return []
    }
    console.error("❌ [OPENALEX] Search error:", error?.message ?? error)
    return []
  }
}

/**
 * OpenAlex stores abstracts as `{word: [pos1, pos2, ...]}` to avoid
 * redistributing copyrighted long-form text. To get back to readable
 * prose: flatten to `[(pos, word), ...]`, sort by position, join with
 * spaces. Some words appear multiple times (one entry per position),
 * which is handled naturally by the flatten step.
 *
 * Returns "" when the work has no abstract (some pre-prints + grey
 * literature). Callers should treat that as "abstract unavailable".
 */
function reconstructAbstractFromInvertedIndex(
  inverted: Record<string, number[]> | null | undefined
): string {
  if (!inverted || typeof inverted !== "object") return ""
  const tokens: Array<[number, string]> = []
  for (const [word, positions] of Object.entries(inverted)) {
    if (!Array.isArray(positions)) continue
    for (const pos of positions) {
      if (typeof pos === "number") tokens.push([pos, word])
    }
  }
  tokens.sort((a, b) => a[0] - b[0])
  return tokens.map(([, word]) => word).join(" ")
}

// Semantic Scholar search integration
export async function searchSemanticScholar(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
    await rateLimiter.checkAndWait("semantic_scholar", 2)

    console.log(`🔍 [SEMANTIC_SCHOLAR] Searching for: ${query}`)

    const response = await axios.get(
      "https://api.semanticscholar.org/graph/v1/paper/search",
      {
        params: {
          query,
          limit: Math.min(maxResults, 15),
          fields: "title,authors,abstract,year,url,citationCount,journal,doi"
        },
        headers: {
          "User-Agent": "chatbot-ui (research@example.com)"
        },
        timeout: 10000
      }
    )

    const results: SearchResult[] =
      response.data.data?.map((paper: any) => ({
        title: paper.title || "No title",
        authors: paper.authors?.map((author: any) => author.name) || [],
        abstract: paper.abstract || "No abstract",
        publishedDate: paper.year?.toString() || "Unknown year",
        journal: paper.journal?.name || "Unknown journal",
        url:
          paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
        doi: paper.doi,
        citationCount: paper.citationCount,
        source: "semantic_scholar" as const
      })) || []

    console.log(`✅ [SEMANTIC_SCHOLAR] Found ${results.length} results`)
    return results
  } catch (error: any) {
    if (error.response?.status === 429) {
      // PREVIOUSLY this slept 60s before returning []. That 60s sleep
      // ran INSIDE the Promise.allSettled bundle in performMultiSource
      // Search, blocking the entire pre-warm from settling for a full
      // minute even though every other source had already returned.
      // The user-visible symptom was "Got 0 candidate papers from the
      // open indexes (in 60.1s)" - the 60s was this exact sleep.
      // We're already in a parallel fan-out; return immediately on
      // 429 so the slow-source doesn't hold up the bundle. Loss of
      // a single source's results is OK; we have 5 other arms.
      console.warn(
        "⚠️ [SEMANTIC_SCHOLAR] Rate limited (429); skipping this arm (no 60s sleep)."
      )
      return []
    }
    console.error("❌ [SEMANTIC_SCHOLAR] Search error:", error.message || error)
    return []
  }
}

// Enhanced Google Scholar search with better parsing
export async function searchGoogleScholar(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
    if (!scholarTool) {
      console.log(
        "⚠️ [SCHOLAR] SERPAPI key missing; skipping Google Scholar search."
      )
      return []
    }

    await rateLimiter.checkAndWait("scholar", 2)

    console.log(`🔍 [SCHOLAR] Searching for: ${query}`)

    const results = await scholarTool.invoke({
      query,
      num: maxResults
    })

    const parsedResults: SearchResult[] = []

    if (results && typeof results === "string") {
      try {
        const data = JSON.parse(results)
        const organicResults = data.organic_results || []

        organicResults.forEach((result: any) => {
          parsedResults.push({
            title: result.title || "No title",
            authors:
              result.publication_info?.authors
                ?.split(",")
                .map((a: string) => a.trim()) || [],
            abstract: result.snippet || "No abstract",
            publishedDate:
              result.publication_info?.summary?.match(/\d{4}/)?.[0] ||
              "Unknown year",
            journal: result.publication_info?.summary || "",
            url: result.link || "",
            citationCount: result.inline_links?.cited_by?.total || 0,
            source: "scholar" as const
          })
        })
      } catch (parseError) {
        console.error("Error parsing Scholar results:", parseError)
      }
    }

    console.log(`✅ [SCHOLAR] Found ${parsedResults.length} results`)
    return parsedResults
  } catch (error) {
    console.error("❌ [SCHOLAR] Search error:", error)
    return []
  }
}

/**
 * Race a per-source promise against a wall-clock timeout so one slow
 * source can't hold up the bundle. With Promise.allSettled below, the
 * slowest fulfilled promise dominates total wall-clock; before this
 * wrapper, a single source taking 60s+ would block the pre-warm from
 * delivering the 5 other arms that had already returned.
 *
 * Resolves to `[]` on timeout (treated the same as a soft failure).
 * The caller is already in a parallel fan-out where any one source
 * returning empty is fine - we have 5 other arms.
 */
async function withTimeout<T>(
  promise: Promise<T[]>,
  timeoutMs: number,
  sourceLabel: string
): Promise<T[]> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<T[]>(resolve => {
    timer = setTimeout(() => {
      console.warn(
        `⏱️  [MULTI_SEARCH] ${sourceLabel} did not respond within ${timeoutMs}ms; returning empty for this source.`
      )
      resolve([])
    }, timeoutMs)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// Multi-source search aggregator with enhanced capabilities
export async function performMultiSourceSearch(
  query: string,
  maxResultsPerSource: number = 15
): Promise<AggregatedSearchResults> {
  console.log(`🚀 [MULTI_SEARCH] Starting comprehensive search for: ${query}`)

  // Per-source wall-clock cap (15s). Sources that don't respond in
  // this window contribute [] and we move on. Total pre-warm
  // wall-clock is therefore bounded at ~15s, not the previous 60s+
  // worst case dominated by S2's hard 429-backoff sleep.
  const PER_SOURCE_TIMEOUT_MS = 15000
  const searchPromises = [
    withTimeout(
      searchPubMedEnhanced(query, maxResultsPerSource).catch(err => {
        console.error("PubMed search failed:", err)
        return []
      }),
      PER_SOURCE_TIMEOUT_MS,
      "PubMed"
    ),
    withTimeout(
      searchArXivEnhanced(query, maxResultsPerSource).catch(err => {
        console.error("ArXiv search failed:", err)
        return []
      }),
      PER_SOURCE_TIMEOUT_MS,
      "arXiv"
    ),
    withTimeout(
      searchSemanticScholar(query, maxResultsPerSource).catch(err => {
        console.error("Semantic Scholar search failed:", err)
        return []
      }),
      PER_SOURCE_TIMEOUT_MS,
      "Semantic Scholar"
    ),
    withTimeout(
      searchGoogleScholar(query, maxResultsPerSource).catch(err => {
        console.error("Google Scholar search failed:", err)
        return []
      }),
      PER_SOURCE_TIMEOUT_MS,
      "Google Scholar"
    ),
    withTimeout(
      searchTavilyEnhanced(query, maxResultsPerSource).catch(err => {
        console.error("Tavily search failed:", err)
        return []
      }),
      PER_SOURCE_TIMEOUT_MS,
      "Tavily"
    ),
    withTimeout(
      searchOpenAlexEnhanced(query, maxResultsPerSource).catch(err => {
        console.error("OpenAlex search failed:", err)
        return []
      }),
      PER_SOURCE_TIMEOUT_MS,
      "OpenAlex"
    )
  ]

  const [
    pubmedResults,
    arxivResults,
    semanticScholarResults,
    scholarResults,
    tavilyResults,
    openAlexResults
  ] = await Promise.allSettled(searchPromises)

  const aggregatedResults: AggregatedSearchResults = {
    totalResults: 0,
    sources: {
      pubmed: pubmedResults.status === "fulfilled" ? pubmedResults.value : [],
      arxiv: arxivResults.status === "fulfilled" ? arxivResults.value : [],
      semanticScholar:
        semanticScholarResults.status === "fulfilled"
          ? semanticScholarResults.value
          : [],
      scholar:
        scholarResults.status === "fulfilled" ? scholarResults.value : [],
      tavily: tavilyResults.status === "fulfilled" ? tavilyResults.value : [],
      openalex:
        openAlexResults.status === "fulfilled" ? openAlexResults.value : []
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
        pubmed: 0.9, // Highest weight for biomedical
        arxiv: 0.8, // High for technical papers
        semanticScholar: 0.85, // High for cross-disciplinary
        scholar: 0.75, // Good general coverage
        tavily: 0.7, // Recent/real-time content
        openalex: 0.85 // Broad coverage, free, comparable to S2
      }
    }
  }

  // Dedupe cross-source results by DOI/URL/normalized title so the same paper
  // returned by PubMed and Semantic Scholar doesn't show up twice.
  const seenKeys = new Set<string>()
  const dedupe = (list: SearchResult[]): SearchResult[] =>
    list.filter(p => {
      const key = (
        p.doi ||
        p.url ||
        (p.title || "").toLowerCase().replace(/\s+/g, " ").trim()
      ).toLowerCase()
      if (!key) return true
      if (seenKeys.has(key)) return false
      seenKeys.add(key)
      return true
    })

  aggregatedResults.sources.pubmed = dedupe(aggregatedResults.sources.pubmed)
  aggregatedResults.sources.arxiv = dedupe(aggregatedResults.sources.arxiv)
  aggregatedResults.sources.semanticScholar = dedupe(
    aggregatedResults.sources.semanticScholar
  )
  aggregatedResults.sources.scholar = dedupe(aggregatedResults.sources.scholar)
  aggregatedResults.sources.tavily = dedupe(aggregatedResults.sources.tavily)
  aggregatedResults.sources.openalex = dedupe(
    aggregatedResults.sources.openalex
  )

  aggregatedResults.totalResults =
    aggregatedResults.sources.pubmed.length +
    aggregatedResults.sources.arxiv.length +
    aggregatedResults.sources.semanticScholar.length +
    aggregatedResults.sources.scholar.length +
    aggregatedResults.sources.tavily.length +
    aggregatedResults.sources.openalex.length

  console.log(
    `✅ [MULTI_SEARCH] Completed. Total results: ${aggregatedResults.totalResults}`
  )
  console.log(
    `📊 [MULTI_SEARCH] Distribution - PubMed: ${aggregatedResults.sources.pubmed.length}, ArXiv: ${aggregatedResults.sources.arxiv.length}, Semantic Scholar: ${aggregatedResults.sources.semanticScholar.length}, Scholar: ${aggregatedResults.sources.scholar.length}, Tavily: ${aggregatedResults.sources.tavily.length}, OpenAlex: ${aggregatedResults.sources.openalex.length}`
  )

  return aggregatedResults
}

// AI-powered synthesis of search results
export async function synthesizeSearchResults(
  searchResults: AggregatedSearchResults,
  researchProblem: string
): Promise<AggregatedSearchResults> {
  console.log(
    `🧠 [SYNTHESIS] Analyzing ${searchResults.totalResults} papers for insights`
  )

  const allResults = [
    ...searchResults.sources.pubmed,
    ...searchResults.sources.arxiv,
    ...searchResults.sources.semanticScholar,
    ...searchResults.sources.scholar
  ]

  if (allResults.length === 0) {
    console.log(`⚠️ [SYNTHESIS] No results to synthesize`)
    return searchResults
  }

  const synthesispapers = allResults.slice(0, 20) // Limit for token constraints

  const synthesisPrompt = `You are an expert research analyst. Analyze the following research papers and extract key insights for the research problem: "${researchProblem}"

Papers to analyze:
${synthesispapers
  .map(
    (paper, idx) => `
${idx + 1}. Title: ${paper.title}
   Authors: ${paper.authors.join(", ")}
   Abstract: ${paper.abstract.substring(0, 300)}...
   Source: ${paper.source}
   Year: ${paper.publishedDate}
`
  )
  .join("\n")}

Extract and categorize insights into:
1. Key methodologies used across papers
2. Common pitfalls mentioned or implied
3. Recommended approaches based on successful studies
4. Novel insights or emerging trends

Provide specific, actionable insights relevant to experimental design.`

  try {
    const completion = await openai().chat.completions.create({
      model: MODEL_NAME(),
      messages: [
        {
          role: "system",
          content:
            "You are an expert research analyst who extracts actionable insights from academic literature."
        },
        { role: "user", content: synthesisPrompt }
      ],
      // Reasoning model - temperature is forced to 1 by the SDK shim.
      temperature: 1
    })

    const response = completion.choices[0].message.content || ""

    // Parse the response to extract categorized insights
    const methodologies =
      response
        .match(
          /methodologies?:?\s*(.*?)(?=pitfalls?|recommended|novel|$)/gim
        )?.[1]
        ?.split(/[\n•-]/)
        .filter(s => s.trim()) || []
    const pitfalls =
      response
        .match(
          /pitfalls?:?\s*(.*?)(?=methodologies?|recommended|novel|$)/gim
        )?.[1]
        ?.split(/[\n•-]/)
        .filter(s => s.trim()) || []
    const approaches =
      response
        .match(
          /recommended.*?approaches?:?\s*(.*?)(?=methodologies?|pitfalls?|novel|$)/gim
        )?.[1]
        ?.split(/[\n•-]/)
        .filter(s => s.trim()) || []
    const insights =
      response
        .match(
          /novel.*?insights?:?\s*(.*?)(?=methodologies?|pitfalls?|recommended|$)/gim
        )?.[1]
        ?.split(/[\n•-]/)
        .filter(s => s.trim()) || []

    searchResults.synthesizedFindings = {
      keyMethodologies: methodologies
        .map(m => m.trim())
        .filter(m => m.length > 10),
      commonPitfalls: pitfalls.map(p => p.trim()).filter(p => p.length > 10),
      recommendedApproaches: approaches
        .map(a => a.trim())
        .filter(a => a.length > 10),
      novelInsights: insights.map(i => i.trim()).filter(i => i.length > 10)
    }

    console.log(
      `✅ [SYNTHESIS] Extracted insights - Methodologies: ${searchResults.synthesizedFindings.keyMethodologies.length}, Pitfalls: ${searchResults.synthesizedFindings.commonPitfalls.length}, Approaches: ${searchResults.synthesizedFindings.recommendedApproaches.length}, Insights: ${searchResults.synthesizedFindings.novelInsights.length}`
    )
  } catch (error) {
    console.error("❌ [SYNTHESIS] Error:", error)
  }

  return searchResults
}
