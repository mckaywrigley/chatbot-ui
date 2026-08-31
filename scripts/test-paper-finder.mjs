// Plain-JS paper-finder regression. Five scenarios, hits PAPER_FINDER_URL
// directly, applies the same dedupe + review-filter heuristics the
// literature-scout agent uses. Run with:
//   node scripts/test-paper-finder.mjs

import "dotenv/config"
import fs from "fs"
import path from "path"

// Manually load .env.local since dotenv/config only reads .env
const envPath = path.resolve(process.cwd(), ".env.local")
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]])
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}

const REVIEW_TYPE_RE =
  /\b(review|systematic.review|meta.analysis|narrative.review|scoping.review)\b/i
const REVIEW_TITLE_RE =
  /\b(review|meta-analysis|systematic review|scoping review|narrative review|umbrella review)\b/i

function resolveUrl(raw) {
  const trimmed = raw.trim()
  return /\/api\/\d+\/rounds\/?$/i.test(trimmed)
    ? trimmed
    : `${trimmed.replace(/\/$/, "")}/api/2/rounds`
}

async function callPaperFinder(description) {
  const rawUrl = process.env.PAPER_FINDER_URL
  if (!rawUrl) throw new Error("PAPER_FINDER_URL not set")
  const url = resolveUrl(rawUrl)
  const timeoutMs = Number(process.env.PAPER_FINDER_TIMEOUT_MS || 60000)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paper_description: description,
        operation_mode: "infer",
        inserted_before: null,
        read_results_from_cache: false
      }),
      signal: controller.signal
    })
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}))
      throw new Error(
        `${res.status} ${res.statusText}: ${detail?.error ?? "no body"}`
      )
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function firstStr(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k]
    if (typeof v === "string" && v.trim()) return v.trim()
    if (typeof v === "number" && !Number.isNaN(v)) return String(v)
  }
  return undefined
}

function normalizeSource(raw) {
  if (!raw) return "scholar"
  const v = raw.toLowerCase()
  if (v.includes("pubmed")) return "pubmed"
  if (v.includes("arxiv")) return "arxiv"
  if (v.includes("semantic")) return "semantic_scholar"
  if (v.includes("tavily")) return "tavily"
  return "scholar"
}

function detectReview(title, abstract, publicationTypes) {
  if (publicationTypes.some(t => REVIEW_TYPE_RE.test(t))) return true
  if (title && REVIEW_TITLE_RE.test(title.toLowerCase())) return true
  const head = (abstract ?? "").slice(0, 200).toLowerCase()
  if (
    /^(?:this|the present|in this) (?:review|meta-analysis|systematic review)/.test(
      head
    )
  ) {
    return true
  }
  return false
}

function normalizeDocs(response) {
  const coll = response?.doc_collection
  const docs = Array.isArray(coll)
    ? coll
    : (coll?.documents ??
      coll?.docs ??
      coll?.items ??
      coll?.results ??
      coll?.doc_results ??
      [])
  const out = []
  for (const doc of docs) {
    const candidates = [
      doc.metadata,
      doc.document?.metadata,
      doc.document,
      doc.paper,
      doc
    ].filter(Boolean)
    let title, doi, url
    let abstract = "Abstract not available."
    let publishedDate = ""
    let sourceRaw
    let pubTypes = []
    for (const c of candidates) {
      title ??= firstStr(c, "title", "paper_title", "name", "display_name")
      doi ??= firstStr(c, "doi", "DOI")
      url ??= firstStr(c, "url", "paper_url", "source_url", "link", "pdf_url")
      const a = firstStr(c, "abstract", "summary", "description", "content")
      if (a) abstract = a
      const pd = firstStr(
        c,
        "published_date",
        "publication_date",
        "year",
        "date"
      )
      if (pd) publishedDate = pd
      sourceRaw ??= firstStr(c, "source", "provider", "origin", "collection")
      const pt =
        c?.publication_types ?? c?.publicationTypes ?? c?.publication_type
      if (Array.isArray(pt)) pubTypes = pubTypes.concat(pt.map(String))
      else if (typeof pt === "string") pubTypes.push(pt)
    }
    if (!title && !url && !abstract) continue
    out.push({
      title: title ?? "Untitled",
      doi,
      url: url || (doi ? `https://doi.org/${doi}` : "") || "",
      abstract,
      publishedDate,
      source: normalizeSource(sourceRaw),
      isReview: detectReview(title, abstract, pubTypes),
      publicationTypes: pubTypes
    })
  }
  return out
}

function dedupe(papers) {
  const seen = new Set()
  return papers.filter(p => {
    const key = (p.doi || p.url || p.title).toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const SCENARIOS = [
  {
    label: "Biomedical / formulation",
    queries: [
      "Research problem: Why does our 0.4% xanthan/guar formulation show stronger shear-thinning than either polymer alone at 100 mg/mL antibody?\nDomain: Formulation development\nPhase: Optimization\nObjectives: Identify mechanism behind synergistic shear-thinning; Predict viscosity at clinically relevant shear rates\nVariables: polymer ratio; temperature; shear rate",
      "xanthan guar synergy viscosity monoclonal antibody high concentration",
      "shear-thinning polymer blend protein formulation rheology"
    ]
  },
  {
    label: "Materials / battery",
    queries: [
      "Research problem: How does cycling rate affect dendrite formation in lithium metal anodes with LLZO solid electrolytes?\nDomain: Materials science\nPhase: Discovery\nObjectives: Quantify dendrite onset thresholds\nVariables: cycle rate; current density; interface roughness",
      "lithium dendrite formation LLZO solid electrolyte C-rate",
      "current density threshold dendrite nucleation garnet electrolyte"
    ]
  },
  {
    label: "Neuroscience / behavior",
    queries: [
      "Research problem: Does chronic mild stress alter dopamine receptor density in the nucleus accumbens differently in adolescent vs adult rats?\nDomain: Behavioral neuroscience\nPhase: Discovery\nObjectives: Compare D1/D2 receptor density across age groups; Correlate with sucrose preference\nVariables: age; stress duration; sex",
      "chronic mild stress dopamine receptor nucleus accumbens adolescent rat",
      "D1 D2 receptor density anhedonia age-dependent stress"
    ]
  },
  {
    label: "Vague / weak query",
    queries: [
      "Research problem: Improve protein expression",
      "improve recombinant protein expression yield",
      "optimize protein production E. coli"
    ]
  },
  {
    label: "Niche / recent",
    queries: [
      "Research problem: Can we use CRISPR-Cas13d to knockdown specific viral RNA in cultured astrocytes without triggering interferon response?\nDomain: Virology / molecular biology\nPhase: Feasibility\nObjectives: Validate Cas13d knockdown efficiency in astrocytes; Measure innate immune activation markers\nVariables: guide RNA sequence; MOI; off-target cleavage rate",
      "Cas13d RNA knockdown astrocyte interferon response",
      "CRISPR Cas13 viral RNA neural cells innate immunity"
    ]
  }
]

const SOURCES = ["pubmed", "arxiv", "scholar", "semantic_scholar", "tavily"]

async function runScenario(sc) {
  const t0 = Date.now()
  const rounds = []
  const all = []
  for (const q of sc.queries) {
    const r0 = Date.now()
    try {
      const resp = await callPaperFinder(q)
      const normalized = normalizeDocs(resp)
      rounds.push({
        query: q.split("\n")[0].slice(0, 60),
        durationMs: Date.now() - r0,
        rawCount: normalized.length
      })
      all.push(...normalized)
      if (dedupe(all).length >= 10) break
    } catch (e) {
      rounds.push({
        query: q.split("\n")[0].slice(0, 60),
        durationMs: Date.now() - r0,
        rawCount: 0,
        error: e?.message ?? String(e)
      })
    }
  }
  const deduped = dedupe(all)
  const reviews = deduped.filter(p => p.isReview)
  const primary = deduped.filter(p => !p.isReview)
  const finalPool = primary.length > 0 ? primary : deduped
  const bySource = {}
  for (const s of SOURCES) bySource[s] = 0
  for (const p of deduped) bySource[p.source]++
  return {
    label: sc.label,
    rounds,
    unique: deduped.length,
    reviews: reviews.length,
    primary: primary.length,
    delivered: Math.min(40, finalPool.length),
    bySource,
    durationMs: Date.now() - t0
  }
}

async function main() {
  console.log("=".repeat(78))
  console.log("  Paper-finder regression - 5 scenarios (upstream only)")
  console.log("=".repeat(78))
  if (!process.env.PAPER_FINDER_URL) {
    console.error("PAPER_FINDER_URL not set; aborting.")
    process.exit(1)
  }
  console.log(`PAPER_FINDER_URL = ${process.env.PAPER_FINDER_URL}\n`)

  const results = []
  for (const sc of SCENARIOS) {
    console.log(`▶ ${sc.label}`)
    const r = await runScenario(sc)
    results.push(r)
    console.log(
      `  rounds=${r.rounds.length}  raw=[${r.rounds.map(rr => rr.rawCount).join(",")}]`
    )
    for (const fr of r.rounds.filter(rr => rr.error)) {
      console.log(`    ! round error: ${fr.error}`)
    }
    console.log(
      `  unique=${r.unique}  reviews=${r.reviews}  primary=${r.primary}  delivered=${r.delivered}  time=${(r.durationMs / 1000).toFixed(1)}s`
    )
    const srcStr = Object.entries(r.bySource)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${k}=${n}`)
      .join(", ")
    console.log(`  sources: ${srcStr || "-"}\n`)
  }

  console.log("=".repeat(78))
  console.log("  Summary")
  console.log("=".repeat(78))
  console.log(
    [
      "Scenario".padEnd(30),
      "Unique".padEnd(8),
      "Reviews".padEnd(9),
      "Primary".padEnd(9),
      "Delivered".padEnd(11),
      "Sources"
    ].join("")
  )
  for (const r of results) {
    const srcStr = Object.entries(r.bySource)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${k}=${n}`)
      .join(",")
    console.log(
      [
        r.label.padEnd(30),
        String(r.unique).padEnd(8),
        String(r.reviews).padEnd(9),
        String(r.primary).padEnd(9),
        String(r.delivered).padEnd(11),
        srcStr || "-"
      ].join("")
    )
  }

  console.log("\n  Diagnoses:")
  let under = 0
  for (const r of results) {
    if (r.delivered >= 8) continue
    under++
    console.log(`\n  ✗ "${r.label}" delivered ${r.delivered}/10`)
    if (r.rounds.every(rr => rr.error)) {
      console.log(
        `    → All rounds errored. Likely PAPER_FINDER_URL down / unreachable.`
      )
      for (const rr of r.rounds) console.log(`      ${rr.error}`)
      continue
    }
    if (r.unique === 0) {
      console.log(
        `    → Upstream returned 0 papers across ${r.rounds.length} rounds. Query phrasing too narrow OR source mix not covering this domain.`
      )
      continue
    }
    if (r.primary < 8 && r.reviews >= 3) {
      console.log(
        `    → Pool dominated by reviews: ${r.reviews}/${r.unique} surveys, only ${r.primary} primary research. Review heuristic may be misclassifying.`
      )
      continue
    }
    const dead = SOURCES.filter(s => r.bySource[s] === 0)
    if (dead.length > 0) {
      console.log(
        `    → Sources returning 0: ${dead.join(", ")}. Verify those upstream APIs are configured.`
      )
    }
    if (r.unique < 10) {
      console.log(
        `    → Only ${r.unique} unique papers total. Niche or specificity issue.`
      )
    }
  }
  if (under === 0) {
    console.log("\n  ✓ All 5 scenarios delivered ≥ 8. Pipeline healthy.")
  } else {
    console.log(`\n  ⚠ ${under}/5 under target. See diagnoses above.`)
  }
}

main().catch(e => {
  console.error("[test-paper-finder] fatal:", e)
  process.exit(1)
})
