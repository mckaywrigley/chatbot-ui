/**
 * Build a report-generation context from a design row.
 *
 * Reports are now spawned from a completed design. The design supplies the
 * "protocol / method" and literature context to the report generator, and
 * the design's intended measurements drive the data-completeness check.
 *
 * This module is pure (no browser or server deps) so it can run on the
 * client (the Generate-report modal) and the server (the data-check route).
 * It understands the current DesignContentV2 shape
 * (problem / papers / hypotheses / designs / literatureContext) and falls
 * back gracefully on legacy rows.
 */

interface RawDesign {
  id?: string
  name?: string | null
  description?: string | null
  objective?: string | null
  content?: string | Record<string, unknown> | null
}

function parseContent(
  raw: RawDesign | null | undefined
): Record<string, unknown> | null {
  const content = raw?.content
  if (typeof content === "string") {
    try {
      return JSON.parse(content) as Record<string, unknown>
    } catch {
      return null
    }
  }
  if (content && typeof content === "object") {
    return content as Record<string, unknown>
  }
  return null
}

export interface DesignReportContext {
  /** Best-guess objective to pre-fill the report objective field. */
  objective: string
  /**
   * Markdown summary of the design - problem, hypotheses, procedure,
   * analysis, literature. Fed to the report generator as protocol/method
   * context and rendered read-only in the report's design side-panel.
   */
  summary: string
  /**
   * What the experiment set out to measure / produce. Used by the
   * data-completeness check to decide whether the uploaded data covers the
   * design's intended outcomes.
   */
  measuredOutcomes: string
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

/** Pull the user-facing objective, tolerating V2 + legacy shapes. */
export function getDesignObjective(design: RawDesign): string {
  const content = parseContent(design)
  const problem = (content?.problem ?? null) as Record<string, unknown> | null
  return (
    str(problem?.objective) ||
    str(problem?.goal) ||
    str(problem?.problemStatement) ||
    str(design?.objective) ||
    str(design?.description) ||
    str(design?.name)
  )
}

export function buildDesignReportContext(
  design: RawDesign
): DesignReportContext {
  const content = parseContent(design)
  const objective = getDesignObjective(design)

  const lines: string[] = [`# ${str(design?.name) || "Untitled design"}`]
  const measured: string[] = []
  if (objective) measured.push(`Objective: ${objective}`)

  const problem = (content?.problem ?? null) as Record<string, unknown> | null
  if (problem) {
    lines.push("", "## Problem")
    if (str(problem.problemStatement))
      lines.push("", str(problem.problemStatement))
    if (str(problem.objective))
      lines.push("", `**Objective:** ${str(problem.objective)}`)
    const vars = (problem.variablesStructured ?? null) as Record<
      string,
      unknown
    > | null
    if (vars && (str(vars.known) || str(vars.unknown))) {
      lines.push("", "### Variables")
      if (str(vars.known)) lines.push(`- Known: ${str(vars.known)}`)
      if (str(vars.unknown)) {
        lines.push(`- Unknown / to measure: ${str(vars.unknown)}`)
        measured.push(`Variables to measure: ${str(vars.unknown)}`)
      }
    }
    const cons = (problem.constraintsStructured ?? null) as Record<
      string,
      unknown
    > | null
    if (cons && (str(cons.material) || str(cons.time) || str(cons.equipment))) {
      lines.push("", "### Constraints")
      if (str(cons.material)) lines.push(`- Material: ${str(cons.material)}`)
      if (str(cons.time)) lines.push(`- Time: ${str(cons.time)}`)
      if (str(cons.equipment)) lines.push(`- Equipment: ${str(cons.equipment)}`)
    }
    if (str(problem.userProvidedPlan)) {
      lines.push("", "### Provided plan", "", str(problem.userProvidedPlan))
    }
  }

  // Selected hypotheses (fall back to all if none flagged selected).
  const hypotheses = Array.isArray(content?.hypotheses)
    ? (content!.hypotheses as Array<Record<string, unknown>>)
    : []
  if (hypotheses.length) {
    const chosen = hypotheses.filter(h => h?.selected)
    const list = chosen.length ? chosen : hypotheses
    lines.push("", "## Hypotheses")
    list.forEach((h, i) => {
      const text = str(h.text) || str(h.content)
      if (text) lines.push("", `${i + 1}. ${text}`)
      if (str(h.reasoning)) lines.push(`   _${str(h.reasoning)}_`)
    })
  }

  // Experimental design - newest design set (or the version snapshot).
  let designs = Array.isArray(content?.designs)
    ? (content!.designs as Array<Record<string, unknown>>)
    : []
  if (!designs.length && Array.isArray(content?.designVersions)) {
    const versions = content!.designVersions as Array<Record<string, unknown>>
    const latest = versions[0]
    if (latest && Array.isArray(latest.designs))
      designs = latest.designs as Array<Record<string, unknown>>
  }
  if (designs.length) {
    lines.push("", "## Experimental design")
    designs.forEach(d => {
      if (str(d.title)) lines.push("", `### ${str(d.title)}`)
      const sections = Array.isArray(d.sections)
        ? (d.sections as Array<Record<string, unknown>>)
        : []
      sections.forEach(s => {
        const heading = str(s.heading)
        const body = str(s.body)
        if (heading) lines.push("", `**${heading}**`)
        if (body) lines.push(body)
        // The analysis / results / measurement sections describe the data
        // the experiment is expected to produce - feed them to the check.
        if (
          /analy|result|measure|outcome|readout|endpoint|data/i.test(heading)
        ) {
          measured.push(`${heading}: ${body}`)
        }
      })
    })
  }

  // Literature context from the Literature Scout agent.
  const lit = (content?.literatureContext ?? null) as Record<
    string,
    unknown
  > | null
  if (lit) {
    lines.push("", "## Literature context")
    if (str(lit.whatOthersHaveDone))
      lines.push("", `**Prior work:** ${str(lit.whatOthersHaveDone)}`)
    if (str(lit.goodMethodsAndTools))
      lines.push("", `**Methods & tools:** ${str(lit.goodMethodsAndTools)}`)
    if (str(lit.potentialPitfalls))
      lines.push("", `**Pitfalls:** ${str(lit.potentialPitfalls)}`)
  }

  return {
    objective,
    summary: lines.join("\n").trim(),
    measuredOutcomes: measured.join("\n") || objective
  }
}
