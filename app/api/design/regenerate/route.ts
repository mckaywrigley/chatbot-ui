import { NextRequest, NextResponse } from "next/server"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { SERPGoogleScholarAPITool } from "@langchain/community/tools/google_scholar"
import { TavilySearchResults } from "@langchain/community/tools/tavily_search"
import axios from "axios"
import {
  getAzureOpenAIForDesign,
  getDesignDeployment
} from "@/lib/azure-openai"
import { requireUser } from "@/lib/server/require-user"
import { requireFirestoreOwner } from "@/lib/server/firestore-authz"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { assertBudget, recordCompletionUsage } from "@/lib/billing/account"
import {
  budgetErrorResponse,
  isBudgetExceededError
} from "@/lib/billing/errors"
// OpenAlex is a keyless free index (~250M works). Import the shared
// implementation from search-utils rather than copy-pasting another
// local fn into this already-overgrown file. The other source fns
// here are local because they take slightly different defaults; for
// OpenAlex the search-utils signature works as-is.
import { searchOpenAlexEnhanced } from "../draft/utils/search-utils"

// Add model constant
const MODEL_NAME = () => getDesignDeployment()

process.env.GOOGLE_SCHOLAR_API_KEY = process.env.SERPAPI_API_KEY

const scholarTool = new SERPGoogleScholarAPITool({
  apiKey: process.env.SERPAPI_API_KEY
})

// Initialize Tavily for comprehensive web search (if API key available)
let tavilyTool: TavilySearchResults | null = null
if (process.env.TAVILY_API_KEY) {
  tavilyTool = new TavilySearchResults({
    apiKey: process.env.TAVILY_API_KEY,
    maxResults: 10
  })
}

const openai = () => getAzureOpenAIForDesign()

// Enhanced search result interface with relevance scoring
interface SearchResult {
  title: string
  authors: string[]
  abstract: string
  doi?: string
  url: string
  publishedDate: string
  journal?: string
  citationCount?: number
  source:
    | "pubmed"
    | "arxiv"
    | "scholar"
    | "semantic_scholar"
    | "tavily"
    | "openalex"
  relevanceScore?: number
  keywords?: string[]
  fullText?: string
  // OpenAlex carries `type` (article/review/book-chapter/...). Mirrored
  // from the draft pipeline's SearchResult so the shared
  // searchOpenAlexEnhanced fn assigns into a compatible shape.
  publicationTypes?: string[]
  isReview?: boolean
  problemAwareSummary?: string
}

interface AggregatedSearchResults {
  totalResults: number
  sources: {
    pubmed: SearchResult[]
    arxiv: SearchResult[]
    scholar: SearchResult[]
    semanticScholar: SearchResult[]
    tavily: SearchResult[]
    openalex: SearchResult[]
  }
  synthesizedFindings: {
    keyMethodologies: string[]
    commonPitfalls: string[]
    recommendedApproaches: string[]
    novelInsights: string[]
  }
  searchMetrics: {
    queryOptimization: string[]
    relevanceScores: number[]
    sourceWeights: Record<string, number>
  }
}

// Enhanced rate limiting with backoff strategy
class EnhancedRateLimiter {
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

const rateLimiter = new EnhancedRateLimiter()

// Enhanced query optimization for regeneration context
function optimizeRegenerationQuery(
  problem: string,
  objectives: string[],
  variables: string[],
  userFeedback: string,
  domain: "biomedical" | "technical" | "general" = "biomedical"
): {
  primaryQuery: string
  alternativeQueries: string[]
  keywords: string[]
} {
  const feedbackKeywords = userFeedback
    .split(/\s+/)
    .filter(word => word.length > 3)

  const keywords = [
    ...problem.split(/\s+/).filter(word => word.length > 3),
    ...objectives.flatMap(obj =>
      obj.split(/\s+/).filter(word => word.length > 3)
    ),
    ...variables.flatMap(variable =>
      variable.split(/\s+/).filter(word => word.length > 3)
    ),
    ...feedbackKeywords
  ]

  // Domain-specific query enhancement with feedback integration
  const domainTerms = {
    biomedical: [
      "clinical trial",
      "experimental design",
      "biomarker",
      "therapeutic",
      "efficacy",
      "safety",
      "optimization"
    ],
    technical: [
      "methodology",
      "algorithm",
      "optimization",
      "analysis",
      "validation",
      "improvement"
    ],
    general: [
      "research",
      "study",
      "analysis",
      "method",
      "approach",
      "enhancement"
    ]
  }

  const enhancedKeywords = [...new Set([...keywords, ...domainTerms[domain]])]

  const primaryQuery = `${problem} ${userFeedback} ${objectives.join(" ")} improved experimental design methodology`

  const alternativeQueries = [
    `"${problem}" ${userFeedback} optimization methodology`,
    `${enhancedKeywords.slice(0, 5).join(" ")} enhanced approach`,
    `experimental design improvement ${userFeedback}`,
    `${variables.join(" ")} ${feedbackKeywords.slice(0, 3).join(" ")} advanced techniques`
  ]

  return {
    primaryQuery: primaryQuery.trim(),
    alternativeQueries,
    keywords: enhancedKeywords
  }
}

// Multi-source search functions (reused from draft route)
async function searchPubMed(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
    await rateLimiter.checkAndWait("pubmed", 3)

    console.log(`🔍 [PUBMED] Searching for: ${query}`)

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
          source: "pubmed"
        })
      } catch (error) {
        console.error("Error parsing PubMed article:", error)
      }
    })

    console.log(`✅ [PUBMED] Found ${results.length} results`)
    return results
  } catch (error) {
    console.error("❌ [PUBMED] Search error:", error)
    return []
  }
}

async function searchArXiv(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
    await rateLimiter.checkAndWait("arxiv", 3)

    console.log(`🔍 [ARXIV] Searching for: ${query}`)

    const response = await axios.get("http://export.arxiv.org/api/query", {
      params: {
        search_query: `all:${query}`,
        start: 0,
        max_results: maxResults,
        sortBy: "relevance",
        sortOrder: "descending"
      }
    })

    const results: SearchResult[] = []
    const entries = response.data.match(/<entry>[\s\S]*?<\/entry>/g) || []

    entries.forEach((entry: string) => {
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
          source: "arxiv"
        })
      } catch (error) {
        console.error("Error parsing ArXiv entry:", error)
      }
    })

    console.log(`✅ [ARXIV] Found ${results.length} results`)
    return results
  } catch (error) {
    console.error("❌ [ARXIV] Search error:", error)
    return []
  }
}

async function searchSemanticScholar(
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
          limit: Math.min(maxResults, 5),
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
      console.warn("⚠️ [SEMANTIC_SCHOLAR] Rate limited (429), backing off...")
      await new Promise(resolve => setTimeout(resolve, 60000))
      return []
    }
    console.error("❌ [SEMANTIC_SCHOLAR] Search error:", error.message || error)
    return []
  }
}

async function searchGoogleScholar(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
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

// Enhanced Tavily search for comprehensive web coverage
async function searchTavilyEnhanced(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  if (!tavilyTool) {
    console.log("⚠️ [TAVILY] Tavily API key not configured, skipping...")
    return []
  }

  try {
    await rateLimiter.checkAndWait("tavily", 5)
    console.log(`🔍 [TAVILY_ENHANCED] Searching for: ${query}`)

    const searchResults = await tavilyTool.invoke({
      query: `${query} research paper academic study`,
      maxResults
    })

    const results: SearchResult[] = []

    if (typeof searchResults === "string") {
      try {
        const parsed = JSON.parse(searchResults)
        const webResults = parsed.results || []

        webResults.forEach((result: any, index: number) => {
          results.push({
            title: result.title || `Tavily Result ${index + 1}`,
            authors: [], // Tavily doesn't typically provide author info
            abstract: result.content?.substring(0, 500) || result.snippet || "",
            url: result.url || "",
            publishedDate: "Recent", // Tavily focuses on recent/real-time
            source: "tavily" as const,
            relevanceScore: result.score || 0.7 + index * -0.05,
            keywords: query.split(" ").filter(word => word.length > 3)
          })
        })
      } catch (parseError) {
        console.error("❌ [TAVILY] Parse error:", parseError)
      }
    }

    console.log(`✅ [TAVILY_ENHANCED] Found ${results.length} results`)
    return results
  } catch (error) {
    console.error("❌ [TAVILY_ENHANCED] Search error:", error)
    return []
  }
}

async function performMultiSourceSearch(
  query: string,
  maxResultsPerSource: number = 8
): Promise<AggregatedSearchResults> {
  console.log(`🚀 [MULTI_SEARCH] Starting comprehensive search for: ${query}`)

  const searchPromises = [
    searchPubMed(query, maxResultsPerSource).catch(err => {
      console.error("PubMed search failed:", err)
      return []
    }),
    searchArXiv(query, maxResultsPerSource).catch(err => {
      console.error("ArXiv search failed:", err)
      return []
    }),
    searchSemanticScholar(query, maxResultsPerSource).catch(err => {
      console.error("Semantic Scholar search failed:", err)
      return []
    }),
    searchGoogleScholar(query, maxResultsPerSource).catch(err => {
      console.error("Google Scholar search failed:", err)
      return []
    }),
    searchTavilyEnhanced(query, maxResultsPerSource).catch(err => {
      console.error("Tavily search failed:", err)
      return []
    }),
    searchOpenAlexEnhanced(query, maxResultsPerSource).catch(err => {
      console.error("OpenAlex search failed:", err)
      return []
    })
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

  return aggregatedResults
}

async function synthesizeSearchResults(
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
    ...searchResults.sources.scholar,
    ...searchResults.sources.tavily,
    ...searchResults.sources.openalex
  ]

  if (allResults.length === 0) {
    console.log(`⚠️ [SYNTHESIS] No results to synthesize`)
    return searchResults
  }

  const synthesispapers = allResults.slice(0, 15) // Limit for token constraints in regeneration

  const synthesisPrompt = `You are an expert research analyst. Analyze the following research papers and extract key insights for improving the research problem: "${researchProblem}"

Papers to analyze:
${synthesispapers
  .map(
    (paper, idx) => `
${idx + 1}. Title: ${paper.title}
   Authors: ${paper.authors.join(", ")}
   Abstract: ${paper.abstract.substring(0, 250)}...
   Source: ${paper.source}
   Year: ${paper.publishedDate}
`
  )
  .join("\n")}

Extract and categorize insights into:
1. Key methodologies that could improve the current approach
2. Common pitfalls to avoid in regeneration  
3. Recommended approaches for better experimental design
4. Novel insights that weren't considered before

Focus on actionable improvements for regenerating the experimental design.`

  try {
    const completion = await openai().chat.completions.create({
      model: MODEL_NAME(),
      messages: [
        {
          role: "system",
          content:
            "You are an expert research analyst who extracts actionable insights from academic literature for experimental design improvement."
        },
        { role: "user", content: synthesisPrompt }
      ],
      temperature: 0.3
    })

    const response = completion.choices[0].message.content || ""

    // Parse the response to extract categorized insights
    const methodologies =
      response
        .match(
          /methodologies?:?\s*(.*?)(?=pitfalls?|recommended|novel|$)/is
        )?.[1]
        ?.split(/[\n•-]/)
        .filter(s => s.trim()) || []
    const pitfalls =
      response
        .match(
          /pitfalls?:?\s*(.*?)(?=methodologies?|recommended|novel|$)/is
        )?.[1]
        ?.split(/[\n•-]/)
        .filter(s => s.trim()) || []
    const approaches =
      response
        .match(
          /recommended.*?approaches?:?\s*(.*?)(?=methodologies?|pitfalls?|novel|$)/is
        )?.[1]
        ?.split(/[\n•-]/)
        .filter(s => s.trim()) || []
    const insights =
      response
        .match(
          /novel.*?insights?:?\s*(.*?)(?=methodologies?|pitfalls?|recommended|$)/is
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

    console.log(`✅ [SYNTHESIS] Extracted insights for regeneration`)
  } catch (error) {
    console.error("❌ [SYNTHESIS] Error:", error)
  }

  return searchResults
}

// Schemas (reused from draft route)
const ExperimentDesignSchema = z
  .object({
    problem: z.string(),
    objectives: z.array(z.string()),
    variables: z.array(z.string()),
    specialConsiderations: z.array(z.string()),
    literatureFindings: z.object({
      papers: z.array(
        z.object({
          title: z.string(),
          summary: z.string(),
          relevance: z.string(),
          methodology: z.string(),
          pitfalls: z.array(z.string())
        })
      )
    }),
    dataAnalysis: z.object({
      correlations: z.array(z.string()),
      outliers: z.array(z.string()),
      keyFindings: z.array(z.string()),
      metrics: z.array(z.string())
    }),
    experimentDesign: z.object({
      hypothesis: z.string(),
      factors: z.array(
        z.object({
          name: z.string(),
          levels: z.array(z.string())
        })
      ),
      randomization: z.string(),
      statisticalPlan: z.object({
        methods: z.array(z.string()),
        significance: z.string()
      })
    }),
    finalReport: z.object({
      introduction: z.string(),
      literatureSummary: z.string(),
      dataInsights: z.string(),
      hypothesis: z.string(),
      designOfExperiments: z.string(),
      statisticalAnalysis: z.string(),
      recommendations: z.string()
    })
  })
  .required()

type ExperimentDesignState = z.infer<typeof ExperimentDesignSchema>

export async function POST(req: NextRequest) {
  console.log(
    "🔄 [REGENERATE] Starting enhanced regeneration with multi-source literature search..."
  )

  try {
    const auth = await requireUser()
    if (auth.response) return auth.response

    try {
      await assertBudget(auth.user.id)
    } catch (e) {
      if (isBudgetExceededError(e)) return budgetErrorResponse(e.plan)
    }

    const limited = await checkRateLimit({
      name: "design-regenerate",
      identifier: auth.user.id,
      requests: 20,
      window: "1 h"
    })
    if (limited) return limited

    const { designId, feedback, currentDesign } = await req.json()

    if (!designId || typeof designId !== "string") {
      return NextResponse.json(
        { success: false, error: "designId is required" },
        { status: 400 }
      )
    }

    const owner = await requireFirestoreOwner("designs", designId, auth.user.id)
    if (owner.response) return owner.response

    console.log(`📋 [REGENERATE] Design ID: ${designId}`)

    // Enhanced query optimization for regeneration context
    const queryData = optimizeRegenerationQuery(
      currentDesign.problem || "experimental design",
      currentDesign.objectives || [],
      currentDesign.variables || [],
      feedback,
      "biomedical"
    )

    console.log(`🎯 [REGENERATE] Primary query: ${queryData.primaryQuery}`)
    console.log(
      `🔄 [REGENERATE] Alternative queries: ${queryData.alternativeQueries.length}`
    )
    console.log(
      `📝 [REGENERATE] Enhanced keywords: ${queryData.keywords.slice(0, 10).join(", ")}`
    )

    // Enhanced regeneration with targeted multi-source literature search
    console.log(
      "🔍 [REGENERATE] Performing enhanced literature search for regeneration..."
    )

    // Use a focused search strategy for regeneration - fewer results but more targeted
    const searchPromises = [
      // Primary feedback-focused query
      performMultiSourceSearch(queryData.primaryQuery, 5),
      // Best alternative query for additional insights
      performMultiSourceSearch(
        queryData.alternativeQueries[0] || queryData.primaryQuery,
        3
      )
    ]

    const allSearchResults = await Promise.allSettled(searchPromises)

    // Consolidate results with emphasis on feedback relevance
    const consolidatedResults: AggregatedSearchResults = {
      totalResults: 0,
      sources: {
        pubmed: [],
        arxiv: [],
        semanticScholar: [],
        scholar: [],
        tavily: [],
        openalex: []
      },
      synthesizedFindings: {
        keyMethodologies: [],
        commonPitfalls: [],
        recommendedApproaches: [],
        novelInsights: []
      },
      searchMetrics: {
        queryOptimization: queryData.alternativeQueries,
        relevanceScores: [],
        sourceWeights: {
          pubmed: 0.9,
          arxiv: 0.8,
          semanticScholar: 0.85,
          scholar: 0.75,
          tavily: 0.8, // Higher weight for recent content in regeneration
          openalex: 0.85
        }
      }
    }

    // Merge and deduplicate results
    const seenUrls = new Set<string>()

    allSearchResults.forEach(result => {
      if (result.status === "fulfilled") {
        const searchResult = result.value

        Object.keys(searchResult.sources).forEach(sourceKey => {
          const source = sourceKey as keyof typeof searchResult.sources
          searchResult.sources[source].forEach(paper => {
            if (!seenUrls.has(paper.url) && paper.url) {
              seenUrls.add(paper.url)
              // Boost relevance for papers matching feedback keywords
              const feedbackBoost = queryData.keywords.some(
                keyword =>
                  paper.title.toLowerCase().includes(keyword.toLowerCase()) ||
                  paper.abstract.toLowerCase().includes(keyword.toLowerCase())
              )
                ? 0.15
                : 0

              consolidatedResults.sources[source].push({
                ...paper,
                relevanceScore: (paper.relevanceScore || 0) + feedbackBoost
              })
            }
          })
        })
      }
    })

    // Sort by relevance and keep top results
    Object.keys(consolidatedResults.sources).forEach(sourceKey => {
      const source = sourceKey as keyof typeof consolidatedResults.sources
      consolidatedResults.sources[source].sort(
        (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)
      )
      consolidatedResults.sources[source] = consolidatedResults.sources[
        source
      ].slice(0, 8)
    })

    consolidatedResults.totalResults =
      consolidatedResults.sources.pubmed.length +
      consolidatedResults.sources.arxiv.length +
      consolidatedResults.sources.semanticScholar.length +
      consolidatedResults.sources.scholar.length +
      consolidatedResults.sources.tavily.length +
      consolidatedResults.sources.openalex.length

    console.log(
      `📊 [REGENERATE] Consolidated ${consolidatedResults.totalResults} targeted papers`
    )

    // Perform AI synthesis focused on regeneration improvements
    const synthesizedResults = await synthesizeSearchResults(
      consolidatedResults,
      `${currentDesign.problem} - ${feedback}`
    )

    // Create enhanced regeneration prompt with comprehensive context
    const regenerationPrompt = `You are an expert experimental designer tasked with improving an existing experimental design based on user feedback and cutting-edge literature insights from a comprehensive multi-source search.

CURRENT DESIGN TO IMPROVE:
${JSON.stringify(currentDesign, null, 2)}

USER FEEDBACK FOR TARGETED IMPROVEMENT:
${feedback}

ENHANCED LITERATURE SEARCH RESULTS (Feedback-Focused):
- Total targeted papers analyzed: ${synthesizedResults.totalResults}
- Search strategy: Feedback-optimized multi-query approach with ${queryData.alternativeQueries.length + 1} queries
- Primary query: "${queryData.primaryQuery}"
- Feedback-enhanced keywords: ${queryData.keywords.slice(0, 15).join(", ")}

SOURCE DISTRIBUTION & RELEVANCE WEIGHTS:
- PubMed (biomedical, weight: 0.9): ${synthesizedResults.sources.pubmed.length} papers
- ArXiv (technical preprints, weight: 0.8): ${synthesizedResults.sources.arxiv.length} papers
- Semantic Scholar (cross-disciplinary, weight: 0.85): ${synthesizedResults.sources.semanticScholar.length} papers
- OpenAlex (broad open index, weight: 0.85): ${synthesizedResults.sources.openalex.length} papers
- Google Scholar (comprehensive, weight: 0.75): ${synthesizedResults.sources.scholar.length} papers
- Tavily (recent developments, weight: 0.8): ${synthesizedResults.sources.tavily.length} papers

AI-SYNTHESIZED IMPROVEMENT INSIGHTS:
Key Methodologies for Enhancement: ${synthesizedResults.synthesizedFindings.keyMethodologies.map(m => `• ${m}`).join("\n")}

Critical Pitfalls to Address: ${synthesizedResults.synthesizedFindings.commonPitfalls.map(p => `• ${p}`).join("\n")}

Evidence-Based Improvement Approaches: ${synthesizedResults.synthesizedFindings.recommendedApproaches.map(a => `• ${a}`).join("\n")}

Latest Research Insights: ${synthesizedResults.synthesizedFindings.novelInsights.map(i => `• ${i}`).join("\n")}

TOP PAPERS BY RELEVANCE (Feedback-Focused):

High-Impact PubMed Results:
${synthesizedResults.sources.pubmed
  .slice(0, 3)
  .map(
    (paper, idx) =>
      `${idx + 1}. ${paper.title} (Relevance: ${paper.relevanceScore?.toFixed(2)})
   Authors: ${paper.authors.join(", ")}
   Journal: ${paper.journal} | Year: ${paper.publishedDate}
   URL: ${paper.url}
   Key Insights: ${paper.abstract.substring(0, 300)}...`
  )
  .join("\n\n")}

Recent Technical Advances (ArXiv):
${synthesizedResults.sources.arxiv
  .slice(0, 2)
  .map(
    (paper, idx) =>
      `${idx + 1}. ${paper.title} (Relevance: ${paper.relevanceScore?.toFixed(2)})
   Authors: ${paper.authors.join(", ")} | Year: ${paper.publishedDate}
   URL: ${paper.url}
   Methodology: ${paper.abstract.substring(0, 300)}...`
  )
  .join("\n\n")}

Cross-Disciplinary Insights (Semantic Scholar):
${synthesizedResults.sources.semanticScholar
  .slice(0, 2)
  .map(
    (paper, idx) =>
      `${idx + 1}. ${paper.title} (Relevance: ${paper.relevanceScore?.toFixed(2)})
   Authors: ${paper.authors.join(", ")} | Citations: ${paper.citationCount || "N/A"}
   URL: ${paper.url}
   Innovation: ${paper.abstract.substring(0, 300)}...`
  )
  .join("\n\n")}

Latest Developments (Tavily):
${synthesizedResults.sources.tavily
  .slice(0, 2)
  .map(
    (paper, idx) =>
      `${idx + 1}. ${paper.title} (Relevance: ${paper.relevanceScore?.toFixed(2)})
   URL: ${paper.url}
   Recent Insights: ${paper.abstract.substring(0, 300)}...`
  )
  .join("\n\n")}

Your expert regeneration task:
1. Address the specific user feedback directly and comprehensively
2. Incorporate the most relevant cutting-edge methodologies from the literature
3. Apply evidence-based improvements while maintaining scientific rigor
4. Leverage cross-disciplinary insights for innovative solutions
5. Consider recent developments and emerging best practices
6. Ensure the regenerated design is more robust and addresses feedback concerns
7. Integrate novel approaches that align with the improvement goals

Regeneration Requirements:
- Directly address every aspect of the user feedback
- Incorporate high-relevance literature findings with source attribution
- Enhance methodological approaches based on latest research
- Mitigate identified pitfalls using evidence-based strategies
- Implement novel insights where they improve the design
- Maintain experimental validity while embracing innovation
- Provide clear rationale for all improvements made

Generate a comprehensive improved experimental design that transforms the feedback into actionable enhancements supported by cutting-edge research evidence.`

    console.log(
      "🤖 [REGENERATE] Sending enhanced regeneration request with comprehensive literature context..."
    )
    const completion = await openai().beta.chat.completions.parse({
      model: MODEL_NAME(),
      messages: [
        { role: "system", content: regenerationPrompt },
        {
          role: "user",
          content: `Please regenerate the experimental design with comprehensive improvements based on the feedback and ${synthesizedResults.totalResults} targeted research papers. Focus on evidence-based enhancements and cutting-edge methodologies.`
        }
      ],
      response_format: zodResponseFormat(
        ExperimentDesignSchema,
        "experimentDesign"
      )
    })

    await recordCompletionUsage(
      { userId: auth.user.id, feature: "design", model: MODEL_NAME() },
      completion
    )

    const regeneratedDesign = completion.choices[0].message.parsed!

    // Add the enhanced search results to the regenerated design
    const enhancedDesign = {
      ...regeneratedDesign,
      literatureFindings: {
        ...regeneratedDesign.literatureFindings,
        searchResults: synthesizedResults,
        synthesizedInsights: synthesizedResults.synthesizedFindings
      }
    }

    console.log(
      "✅ [REGENERATE] Successfully regenerated design with enhanced literature insights"
    )
    console.log(
      `📊 [REGENERATE] Enhanced metrics - Papers: ${synthesizedResults.totalResults}, Queries: ${queryData.alternativeQueries.length + 1}, Sources: ${Object.keys(synthesizedResults.sources).length}`
    )

    return NextResponse.json({
      success: true,
      design: enhancedDesign,
      searchMetrics: {
        totalPapers: synthesizedResults.totalResults,
        searchStrategy: "feedback-optimized multi-source",
        queryOptimization: queryData.alternativeQueries.length + 1,
        sourceBreakdown: {
          pubmed: synthesizedResults.sources.pubmed.length,
          arxiv: synthesizedResults.sources.arxiv.length,
          semanticScholar: synthesizedResults.sources.semanticScholar.length,
          scholar: synthesizedResults.sources.scholar.length,
          tavily: synthesizedResults.sources.tavily.length,
          openalex: synthesizedResults.sources.openalex.length
        },
        feedbackIntegration: "enhanced with keyword boosting"
      }
    })
  } catch (error) {
    console.error("❌ [REGENERATE] Enhanced regeneration error:", error)

    // The previous implementation tried to re-read the request body for a
    // fallback pass, but Next.js consumes request bodies once - the retry
    // always threw. Surface the failure so the client can retry cleanly.
    return NextResponse.json(
      {
        success: false,
        error: "Failed to regenerate design with enhanced capabilities"
      },
      { status: 500 }
    )
  }
}
