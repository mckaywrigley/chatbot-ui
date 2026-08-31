/**
 * Build the system-prompt context for tier-3 (single-design) chat.
 *
 * Tier-3 strategy is "long-context dump" (locked decision in
 * /Users/piyush/.claude/plans/rosy-rolling-flute.md): the whole design goes
 * into the system prompt so the model has the full document and doesn't have to
 * play retrieval games on its own document.
 *
 * Hard cap at TIER3_MAX_CHARS to leave room for chat history + the user's
 * question + the model's response. If the design exceeds the cap we truncate.
 *
 * The cap is bounded by a HARD DB limit: this context is persisted into
 * `chats.prompt`, whose column has `CHECK (char_length(prompt) <= 100000)`. A
 * larger dump makes the chat-row INSERT fail with `chats_prompt_check` (the
 * "can't open the design chat" bug). So the cap stays comfortably under 100k,
 * leaving headroom for the workspace/base system prompt that gets prepended.
 * ScopedChatRail additionally hard-clamps the merged prompt as a final guard.
 *
 * Extracted from the design page so it can be unit-tested (it's the seam that
 * guarantees the design chat actually has the experiment's context).
 */
import type {
  DesignVersionSnapshot,
  GeneratedDesign,
  Hypothesis,
  Paper,
  ValidationState
} from "@/lib/design-agent"

export const TIER3_MAX_CHARS = 90_000

export interface DesignChatContextInput {
  title: string
  problemStatement: string
  objective: string
  domain: string
  phase: string
  selectedHypotheses: Hypothesis[]
  hypotheses?: Hypothesis[]
  papers?: Paper[]
  generatedDesigns?: GeneratedDesign[]
  activeDesign: GeneratedDesign | undefined
  /**
   * Flattened researcher-set presets / constraints (condition caps, material /
   * time / equipment limits, success criteria, Refine answers). Surfaced so the
   * chat honours them and asks before overriding one.
   */
  presets?: string
  /** The design→lab→analyze iteration loop, so the chat can reason across the
   *  whole series (find patterns, track what changed and why, maintain context
   *  for a PhD scholar's write-up). */
  validation?: ValidationState
  /** Prior design versions (each iteration's snapshot), newest first. */
  designVersions?: DesignVersionSnapshot[]
}

export function buildDesignChatContext(input: DesignChatContextInput): string {
  const lines: string[] = []
  lines.push(
    "You are Shadow AI, the scientific design assistant for this experiment. The full experiment is provided below - refer to it directly without asking the user to re-supply which design they mean. Use numeric values from the design's procedure and materials when calculations are requested."
  )

  const problemLines: string[] = []
  if (input.title) problemLines.push(`Title: ${input.title}`)
  if (input.problemStatement)
    problemLines.push(`Problem: ${input.problemStatement}`)
  if (input.objective) problemLines.push(`Objective: ${input.objective}`)
  if (input.domain) problemLines.push(`Domain: ${input.domain}`)
  if (input.phase) problemLines.push(`Phase: ${input.phase}`)
  if (problemLines.length) {
    lines.push("", "## Problem", ...problemLines)
  }

  // Researcher-set presets are AUTHORITATIVE. The chat must honour them and,
  // crucially, must not silently override one (e.g. a stated "8 conditions
  // only" cap) - see the override-confirmation rule in the patch instructions.
  if (input.presets?.trim()) {
    lines.push(
      "",
      "## Researcher presets & constraints (authoritative)",
      "These were explicitly set by the researcher and are HARD constraints on the design. Treat them as binding:",
      input.presets.trim()
    )
  }

  // All hypotheses (selected first, then the rest) - full reasoning, no
  // truncation. The model needs to know what was rejected to answer
  // "why didn't we test X" questions.
  const allHyp = [
    ...input.selectedHypotheses,
    ...(input.hypotheses ?? []).filter(
      h => !input.selectedHypotheses.find(s => s.id === h.id)
    )
  ]
  // Index the literature by id so a hypothesis can name the papers it was
  // built on, using the SAME [N] numbering as the "Cited literature" section
  // below. Without this the chat can see a hypothesis and can see the papers,
  // but not the edge between them - so "which paper supports the arginine
  // arm?" is a three-hop question (design → hypothesis → papers) that the
  // model has to guess at from topic overlap.
  const paperIndexById = new Map<string, number>()
  ;(input.papers ?? []).forEach((p, i) => paperIndexById.set(p.id, i + 1))
  const citeFor = (ids: string[] | undefined): string => {
    const refs = (ids ?? [])
      .map(id => {
        const n = paperIndexById.get(id)
        if (!n) return null
        const title = input.papers![n - 1].title
        return `[${n}] ${title}`
      })
      .filter(Boolean) as string[]
    if (refs.length === 0) return ""
    // Cap the inline list; the full set is one section further down.
    const shown = refs.slice(0, 6).join("; ")
    return refs.length > 6 ? `${shown}; +${refs.length - 6} more` : shown
  }

  if (allHyp.length) {
    lines.push("", "## Hypotheses")
    allHyp.forEach((h, i) => {
      const tag = input.selectedHypotheses.find(s => s.id === h.id)
        ? "[selected]"
        : "[not selected]"
      lines.push(`${i + 1}. ${tag} ${h.text}`)
      if (h.reasoning) lines.push(`   Reasoning: ${h.reasoning}`)
      const cited = citeFor(h.basedOnPaperIds)
      if (cited) lines.push(`   Built on: ${cited}`)
    })
  }

  // Generated designs come BEFORE the literature: the design is what the chat
  // is about, so if the dump exceeds the cap it must be the papers that get
  // truncated, never the design itself. Active design first (full body), then
  // alternates so the model can compare/contrast.
  const ordered = input.activeDesign
    ? [
        input.activeDesign,
        ...(input.generatedDesigns ?? []).filter(
          d => d.id !== input.activeDesign!.id
        )
      ]
    : (input.generatedDesigns ?? [])
  ordered.forEach((d, idx) => {
    const heading =
      idx === 0
        ? `## Active design: ${d.title}`
        : `## Alternate design: ${d.title}`
    lines.push("", heading)
    // Close the design → hypothesis hop explicitly. The link is stored on
    // `hypothesisId`, and stating it here means the chat never has to infer
    // which hypothesis a design came from by comparing wording.
    const srcIdx = allHyp.findIndex(h => h.id === d.hypothesisId)
    if (srcIdx >= 0) {
      const src = allHyp[srcIdx]
      lines.push(`Built from hypothesis ${srcIdx + 1}: ${src.text}`)
      const cited = citeFor(src.basedOnPaperIds)
      if (cited) lines.push(`That hypothesis was built on: ${cited}`)
    }
    d.sections.forEach(sec => {
      lines.push("", `### ${sec.heading}`)
      lines.push(sec.body.trim())
    })
  })

  // ── Design lineage ────────────────────────────────────────────────────────
  //
  // Every earlier version, oldest to newest, with the verdict that justified
  // it and the changes actually carried into the version after it.
  //
  // This replaces a single sentence - "The design has N prior version(s)
  // saved" - which named a count and threw the rest away. The consequence was
  // that a question like "why does v3 run 6 conditions and not 8?" was
  // unanswerable: the answer is v2's simulation verdict plus the changes
  // applied from it, and the chat was never shown either, even though both sit
  // in the object already being passed in.
  //
  // Deliberately OUTSIDE the `validation` gate below. Versions exist without a
  // validation record - a manual edit or a promoted older version both create
  // one - and gating the lineage on validation dropped the entire history in
  // exactly those cases.
  //
  // Stored newest-first, so sort ascending: a lineage only reads as a
  // narrative forwards.
  if (input.designVersions?.length) {
    const series = [...input.designVersions].sort(
      (a, b) => a.versionNumber - b.versionNumber
    )
    lines.push("", "## Design lineage (oldest → newest)")
    lines.push(
      `${series.length} earlier version(s) are recorded. The Active design above is the current one.`
    )
    series.forEach(ver => {
      const origin =
        ver.origin === "simulation"
          ? "produced by applying simulation suggestions"
          : ver.origin === "lab-data"
            ? "produced from lab data"
            : ver.origin === "manual"
              ? "edited by hand"
              : "the original design"
      lines.push("", `### v${ver.versionNumber} — ${origin}`)

      const o = ver.outcome
      if (!o) {
        lines.push("No recorded outcome for this version.")
        return
      }
      if (typeof o.meetRate === "number") {
        lines.push(
          `Met the target in ${Math.round(o.meetRate * 100)}% of simulated runs (${
            o.metTarget
              ? "judged as hitting the target"
              : "judged as falling short"
          }).`
        )
      }
      if (o.verdict) lines.push(`Verdict: ${o.verdict}`)
      if (o.insights?.length) lines.push(`Insights: ${o.insights.join("; ")}`)
      const sim = o.simulation
      if (sim?.gapAnalysis) lines.push(`Gap to target: ${sim.gapAnalysis}`)
      if (sim?.distribution) {
        lines.push(
          `Predicted readout: mean ${sim.distribution.mean}${
            sim.distribution.unit ? ` ${sim.distribution.unit}` : ""
          }, sd ${sim.distribution.sd}.`
        )
      }
      // The edge that answers "why did the next version change?".
      if (o.appliedChanges?.length) {
        lines.push(
          `Changes carried into v${ver.versionNumber + 1}: ${o.appliedChanges.join("; ")}`
        )
      } else {
        lines.push(
          `No changes were recorded as carried into v${ver.versionNumber + 1}.`
        )
      }
    })
    lines.push(
      "",
      "When asked why the current design differs from an earlier one, answer from this lineage - cite the version, its verdict, and the changes carried forward. Do not infer the reason from the protocol text."
    )
  }

  // Iteration history: the design→lab→analyze loop. This is what lets the chat
  // "find patterns across the design series" and keep a PhD scholar's context.
  const v = input.validation
  // `designVersions` is no longer part of this condition: the lineage above
  // renders it, and leaving it here emitted an "Iteration history" heading
  // with nothing under it whenever versions existed but no validation did.
  if (v && (v.iterations?.length || v.cumulativeInsights || v.simulation)) {
    lines.push("", "## Iteration history (design → lab → analyze loop)")
    if (v.desiredOutcome)
      lines.push(`Desired outcome / target: ${v.desiredOutcome}`)
    if (v.cumulativeInsights) {
      lines.push("", "### Cumulative synthesis across all rounds")
      lines.push(v.cumulativeInsights.trim())
    }
    if (v.simulation) {
      const s = v.simulation
      lines.push("", "### Latest pre-lab simulation")
      if (s.executed) {
        lines.push(
          `Modeled simulation (${s.modelUsed ?? "monte-carlo"}, ${s.nTrials ?? "?"} in-silico runs).`
        )
        if (typeof s.meetRate === "number")
          lines.push(
            `As-written design met the target in ${Math.round(s.meetRate * 100)}% of runs (target: ${s.targetMetric ?? "?"} ${s.targetDirection ?? ""} ${s.targetThreshold ?? "?"}).`
          )
        if (s.distribution)
          lines.push(
            `Readout distribution: mean ${s.distribution.mean}, sd ${s.distribution.sd}, median ${s.distribution.median}, p10 ${s.distribution.p10}, p90 ${s.distribution.p90}.`
          )
        if (s.sensitivity?.length)
          lines.push(
            `Highest-leverage knobs: ${[...s.sensitivity]
              .sort((a, b) => b.effect - a.effect)
              .slice(0, 4)
              .map(x => `${x.factor} (${x.direction})`)
              .join(", ")}.`
          )
        if (s.gotchas?.length)
          lines.push(
            `Gotchas: ${s.gotchas.map(g => `${g.issue} → ${g.fix}`).join("; ")}.`
          )
        if (s.rounds && s.rounds.length > 1)
          lines.push(
            `Optimization trajectory (meet-rate by round): ${s.rounds
              .map(r => `r${r.round} ${Math.round(r.meetRate * 100)}%`)
              .join(" → ")}.`
          )
      }
      lines.push(
        `Predicted: ${s.predictedResults}`,
        `Meets target: ${s.meetsTarget ? "yes" : "no"} (${Math.round(
          s.confidence * 100
        )}% confidence).`
      )
      if (s.gapAnalysis) lines.push(`Gap: ${s.gapAnalysis}`)
      if (s.optimizedChanges?.length)
        lines.push(`Suggested edits: ${s.optimizedChanges.join("; ")}.`)
    }
    ;(v.iterations ?? []).forEach(it => {
      lines.push("", `### Iteration ${it.index} — verdict: ${it.verdict}`)
      if (it.hypothesisText)
        lines.push(`Hypothesis tested: ${it.hypothesisText}`)
      if (it.structuredData?.summary)
        lines.push(`Data: ${it.structuredData.summary}`)
      else if (it.data?.raw) lines.push(`Data: ${it.data.raw.slice(0, 600)}`)
      if (it.reasoning) lines.push(`Reasoning: ${it.reasoning}`)
      if (it.insights?.length) lines.push(`Insights: ${it.insights.join("; ")}`)
      if (it.suggestedChanges?.length)
        lines.push(`Changes suggested after: ${it.suggestedChanges.join("; ")}`)
    })
  }

  if (input.papers?.length) {
    lines.push("", "## Cited literature")
    input.papers.forEach((p, i) => {
      const meta = [
        p.authors?.length ? p.authors.join(", ") : "",
        (p as any).year ?? "",
        (p as any).journal ?? ""
      ]
        .filter(Boolean)
        .join(" · ")
      lines.push(
        `${i + 1}. ${p.title}${meta ? ` - ${meta}` : ""}${
          p.sourceUrl ? ` (${p.sourceUrl})` : ""
        }`
      )
      if (p.summary) lines.push(`   ${p.summary}`)
    })
  }

  let context = lines.join("\n")

  if (context.length > TIER3_MAX_CHARS) {
    console.warn(
      `[design-chat-context] design content ${context.length} chars exceeds tier-3 cap ${TIER3_MAX_CHARS}; truncating. Consider RAG fallback.`
    )
    context = context.slice(0, TIER3_MAX_CHARS) + "\n\n…[truncated]"
  }

  return context
}
