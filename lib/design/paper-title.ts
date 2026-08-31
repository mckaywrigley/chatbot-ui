/**
 * Shared, dependency-free paper-title cleanup. Lives in its own module so
 * both the server (at fetch time) and the design page (at render time, for
 * papers stored before the cleanup existed) can use it.
 */
/**
 * Web-arm (Tavily) hits carry the PAGE title, not the article title, so they
 * arrive with publisher furniture appended:
 *   "Real article title | Biophysical Reviews | Springer Nature Link"
 *   "Real article title - PubMed"
 * The article title is the first pipe-segment. We only trim when that segment
 * still reads like a title (>= 25 chars) so we never truncate a genuine title
 * that happens to contain a separator.
 */
export function cleanPaperTitle(raw: string): string {
  let title = (raw || "").replace(/\s+/g, " ").trim()
  if (!title) return ""
  if (title.includes("|")) {
    const first = title.split("|")[0].trim()
    if (first.length >= 25) title = first
  }
  // Trailing " - <Site>" furniture from the common bibliographic hosts.
  title = title.replace(
    /\s*[-–—]\s*(PubMed(\s+Central)?|PMC|Europe\s*PMC|ScienceDirect|SpringerLink|Springer\s*Nature\s*Link|Wiley\s*Online\s*Library|Taylor\s*&\s*Francis|ResearchGate|arXiv(\.org)?|Nature|Frontiers|MDPI|bioRxiv|medRxiv|SSRN|ACS\s*Publications|Oxford\s*Academic|Cell\s*Press|PLOS(\s+ONE)?)\s*$/i,
    ""
  )
  return title.trim()
}

/**
 * Source trust order for de-duplication, mirroring the retrieval layer's
 * ranking: a PubMed / OpenAlex record is the canonical one, a Tavily hit is
 * usually the publisher's landing page for the same paper.
 */
const PAPER_SOURCE_RANK: Record<string, number> = {
  pubmed: 0,
  openalex: 1,
  semantic_scholar: 2,
  arxiv: 3,
  scholar: 4,
  tavily: 5,
  web: 6
}

const rankOf = (source?: string): number =>
  PAPER_SOURCE_RANK[(source ?? "").toLowerCase()] ?? 7

/**
 * A title reduced to comparable form - no case, no punctuation, no publisher
 * suffix. Two records of one paper routinely differ only by a trailing period
 * or a " | Journal | Publisher" tail.
 */
export function paperTitleKey(title?: string): string {
  if (!title) return ""
  return cleanPaperTitle(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

/**
 * Collapse the same paper appearing more than once in a list.
 *
 * The retrieval layer de-dupes its own candidates, but papers reach this list
 * from several rounds and several arms, so one study could still show up twice
 * - once from PubMed and once scraped off the web. Matching is on the
 * normalized title (titles are the only field every arm reliably fills), the
 * more authoritative source wins, and the survivor inherits anything it was
 * missing - including a user's `selected` tick, so de-duplicating can never
 * silently drop a paper the researcher had chosen.
 */
export function dedupePapers<
  T extends {
    title: string
    sourceUrl?: string
    source?: string
    summary?: string
    selected?: boolean
    userAdded?: boolean
    citationCount?: number
    journal?: string
    year?: string
  }
>(papers: T[]): T[] {
  const byKey = new Map<string, number>()
  const out: T[] = []

  for (const p of papers) {
    const tkey = paperTitleKey(p.title)
    // Too short to match safely ("Supplementary data") - keep as its own row.
    const key =
      tkey.length >= 15
        ? `t:${tkey}`
        : p.sourceUrl
          ? `u:${p.sourceUrl.toLowerCase()}`
          : ""
    if (!key) {
      out.push(p)
      continue
    }

    const idx = byKey.get(key)
    if (idx === undefined) {
      out.push(p)
      byKey.set(key, out.length - 1)
      continue
    }

    const kept = out[idx]
    // A paper the researcher added by hand always outranks a retrieved copy.
    const pWins = p.userAdded
      ? !kept.userAdded
      : !kept.userAdded && rankOf(p.source) < rankOf(kept.source)
    const winner = pWins ? p : kept
    const loser = pWins ? kept : p
    out[idx] = {
      ...winner,
      summary:
        (winner.summary?.length ?? 0) >= (loser.summary?.length ?? 0)
          ? winner.summary
          : loser.summary,
      journal: winner.journal || loser.journal,
      year: winner.year || loser.year,
      citationCount: Math.max(
        winner.citationCount ?? 0,
        loser.citationCount ?? 0
      ),
      selected: !!(winner.selected || loser.selected)
    }
  }

  return out
}
