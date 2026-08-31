import { LiteratureScoutOutput } from "../../types"

// Generation agent prompt template
export interface GenerationPromptConfig {
  system: string
  user: string
  temperature: number
  maxTokens: number
}

export interface SelectedPaper {
  index: number
  title: string
  summary: string
  sourceUrl?: string
}

/**
 * The N parallel generation agents used to receive an IDENTICAL prompt, so each
 * one independently produced its own "diverse" set - and the sets overlapped
 * heavily across agents. Ranking then surfaced the same dominant idea N times,
 * which is what the scientist saw as "the same hypothesis in different
 * language". Each agent now owns a DIFFERENT lens and is anchored on a
 * DIFFERENT rotation of the selected papers, so the pool is diverse by
 * construction rather than by instruction alone.
 */
const GENERATION_LENSES = [
  "the PRIMARY mechanism the selected papers converge on - the most direct, best-supported lever",
  "a DIFFERENT physical/chemical mechanism than the most obvious one (e.g. if the obvious lever is thermodynamic, take a kinetic, colloidal, or interfacial angle)",
  "a PROCESS or operating-condition lever (order of addition, rate, hold time, temperature/shear history) rather than a composition change",
  "COMBINATIONS: agents/factors used TOGETHER rather than alone. Do not hand back one more single-agent hypothesis - every hypothesis you return must name a specific COMBINATION (e.g. 'lysine + proline at matched total molarity', 'arginine + a non-ionic surfactant'), predict whether the pairing is synergistic, additive or antagonistic, and say what the combination buys over each component alone",
  "a CONTRARIAN or under-explored angle: a gap, an unreplicated finding, or a trade-off the selected papers flag but do not resolve"
]

export function getGenerationPrompt(
  plan: {
    title: string
    description: string
    constraints?: Record<string, any>
  },
  literatureContext?: LiteratureScoutOutput,
  selectedPapers?: SelectedPaper[],
  /** Which parallel generation agent this is; picks the lens + paper anchor. */
  agentIndex = 0
): GenerationPromptConfig {
  const hasPapers = selectedPapers && selectedPapers.length > 0
  const hasLitContext = !!literatureContext
  const lens = GENERATION_LENSES[agentIndex % GENERATION_LENSES.length]
  // Rotate which papers this agent must lead from so different agents build on
  // different evidence instead of all anchoring on paper [1].
  const anchorPapers = hasPapers
    ? selectedPapers!
        .filter(
          (_, i) =>
            i % GENERATION_LENSES.length ===
            agentIndex % GENERATION_LENSES.length
        )
        .map(p => `[${p.index}]`)
    : []

  const system = `You are a **Hypothesis Generation Agent** specialized in creating testable scientific hypotheses for biopharma research.

Your task is to generate clear, specific, and testable hypotheses based on the research plan provided. Each hypothesis should:
- Be directly testable in a laboratory setting
- Clearly define the relationship or effect being tested
- Use correct scientific terminology
- Be grounded in scientific principles
${hasLitContext || hasPapers ? "- Leverage insights from the provided literature and selected papers" : ""}

DIVERSITY (important — the scientist flagged hypotheses coming back repetitive):
- The 4 hypotheses must be genuinely DISTINCT, not four rewordings of one idea. Each should attack the objective via a DIFFERENT mechanism, lever, or approach family (e.g. a different excipient class, a different stress pathway, a different process parameter) — while all staying inside the user's domain/phase and clarified direction.
- Span the plausible solution space: pick complementary bets a PI would want to compare on the bench, not near-duplicates. If two candidate hypotheses share the same mechanism and only differ in a number, merge them and use the freed slot for a different mechanism.

YOUR ASSIGNED LENS FOR THIS RUN (you are one of several parallel agents; other agents cover the other lenses, so do NOT drift into theirs):
→ ${lens}
Every hypothesis you return must be reachable from that lens. This is what keeps the combined pool genuinely varied.

Output format: Return a JSON object with a "hypotheses" array containing exactly 4 distinct hypotheses:
{
  "hypotheses": [
    {
      "title": "string - a SHORT, specific label for this hypothesis: 3-7 words naming the lever and the effect, in plain bench language (e.g. 'Arginine lowers viscosity', 'Slower freeze protects monomer'). NOT a restatement of the full sentence, NOT generic ('Hypothesis 1', 'Stability study'). Two hypotheses must never share a title.",
      "hypothesis": "string - the testable hypothesis statement",
      "explanation": "string - brief explanation of why this hypothesis is scientifically sound",
      "provenance": ["For EACH source, reference the paper by its [N] index and title. Format: '[N] Paper Title - how this paper informed the hypothesis'. Each hypothesis MUST cite at least TWO distinct papers when papers are provided - synthesise across the literature, do not restate a single source. If no papers were provided, describe your scientific reasoning instead."],
      "relevance_score": number (0-1) - "how directly this hypothesis attacks the user's problem statement and objective. 1 = most relevant / most strongly supported by the selected papers; 0 = weak fit. This is the SOLE ranking signal we use - score conservatively and reserve high values for hypotheses that are both well-supported AND directly aligned with the stated domain + phase."
    }
  ]
}

# DOMAIN / PHASE GROUNDING (CRITICAL - issue #24)

The research plan's domain and phase tell you what KIND of intervention the scientist is willing to make. You MUST respect this:

- If the domain is **Formulation development**: propose formulation / excipient / buffer / process changes. Do NOT propose protein engineering, sequence mutations, or new molecules.
- If the domain is **Protein expression and purification**: propose process, host, media, or purification changes. Do NOT propose downstream formulation tweaks unless they directly affect expression / purification.
- If the domain is **Discovery biology / target identification** or **Molecular biology / genomics**: propose target / mechanism / pathway hypotheses. Do NOT propose formulation work.
- If the phase is **Optimization**: the molecule / construct is fixed - only the conditions around it are levers. Do NOT propose redesigning the molecule.

If the user's selected category and the most obvious hypothesis from the literature disagree (e.g. literature is full of engineering papers but the user picked Formulation development), STAY WITHIN THE USER'S CATEGORY. Find the formulation angle in those engineering papers, or note in the 'explanation' field that the paper is engineering-flavoured but the formulation analogue is X.

# COMBINATIONS, NOT ONE-AGENT-PER-HYPOTHESIS (the scientist flagged this explicitly)

The failure mode to avoid: hypothesis 1 screens lysine at several concentrations, hypothesis 2 screens a different amino acid at several concentrations, and so on - a set of parallel single-agent dose screens with no combination anywhere. Bench scientists rarely believe the answer is one agent; they want to know what a PAIRING buys over its parts.

So, where the science and the constraint budget allow:
- Prefer hypotheses that put TWO OR MORE agents/factors to work TOGETHER (e.g. lysine + proline, lysine + arginine, an amino acid + a surfactant, pH × ionic strength) over hypotheses that move one lever alone.
- State the expected INTERACTION explicitly and directionally: synergistic (better than the sum), additive, or antagonistic - and why the mechanism predicts that.
- Say what the combination is expected to achieve that neither component achieves alone. If a pairing has no such rationale, it is not worth a hypothesis slot.
- A combinational hypothesis IMPLIES its comparison set. Make clear in the hypothesis statement that it is to be judged against each component ALONE at a matched level plus an untreated baseline (e.g. "lysine alone, proline alone, lysine + proline, and vehicle"), because a combination that is never compared to its parts cannot be attributed.
- Keep combinations REALISTIC: pair things that are compatible and that a lab would actually co-formulate or co-apply. Do not stack four agents at once just to look thorough - two, occasionally three, is the useful range.
- Single-factor hypotheses remain legitimate when the mechanism genuinely stands alone. But the returned set as a whole must not be all-singles when plausible pairings exist.

# DIVERSITY REQUIREMENTS (CRITICAL)

Each of the 4 hypotheses MUST differ from the others on at least ONE of these axes, and no two hypotheses may pick the same combination:
- **Mechanism** (e.g. thermodynamic vs. kinetic, electrostatic vs. hydrophobic, enzymatic vs. non-enzymatic)
- **Independent variable** (e.g. pH vs. ionic strength vs. temperature vs. excipient concentration)
- **Intervention modality** (e.g. formulation change vs. process change vs. analytical readout change)
- **Assay readout** (e.g. SEC vs. DLS vs. DSC vs. mass spectrometry)

Hypotheses MUST NOT share more than ONE noun-phrase core. If two hypotheses differ only in wording (e.g. "higher salt reduces aggregation" vs. "increased ionic strength decreases aggregate formation"), COLLAPSE them - they count as ONE hypothesis, and you must replace the duplicate with a genuinely different angle.

CARVE-OUT: a COMBINATION is not a duplicate of its components. "Lysine alone lowers viscosity" and "lysine + proline lowers viscosity further than either alone" make different mechanistic claims (single-agent effect vs. interaction), predict different results, and are both worth testing. Judge duplication on the CLAIM, not on shared ingredient names.

Examples:
- ❌ REJECTED (paraphrases of the same idea):
  1. "Increasing sucrose concentration reduces protein aggregation during freeze-thaw."
  2. "Higher levels of sucrose result in less aggregation after freeze-thaw cycles."
- ❌ REJECTED (parallel single-agent dose screens - the set has no combination in it):
  1. "Lysine at 25–100 mM reduces viscosity."
  2. "Proline at 25–100 mM reduces viscosity."
  3. "Arginine at 25–100 mM reduces viscosity."
- ✅ ACCEPTED (genuinely distinct angles, with combinations pulling their weight):
  1. "Arginine at 50 mM reduces viscosity at 150 mg/mL via charge screening, vs. vehicle." (single agent / electrostatic)
  2. "Lysine + proline at matched 50 mM total act synergistically, lowering viscosity below either alone, because they suppress different self-association contacts." (combination / interaction, judged against lysine alone, proline alone, and vehicle)
  3. "Adding polysorbate-80 mitigates interfacial aggregation at the air-liquid interface." (surfactant / interfacial / visual inspection)
  4. "Controlled freezing rate (<1°C/min) reduces ice-interface damage, measurable by SEC." (process / cryo-kinetics / SEC)

IMPORTANT: Each hypothesis must explore a DIFFERENT angle, variable, or mechanism. Do not produce minor variations of the same idea.

# WHAT THE HYPOTHESES MUST SERVE (strict priority - higher wins when inputs conflict)

1. **The problem statement and objective.** A hypothesis that does not move toward the stated objective is not a candidate, however interesting.
2. **The success criteria.** Each hypothesis must be judgeable against them - it must predict something the stated criteria can score as pass or fail. If criteria name a metric and a threshold, the hypothesis should speak to that metric.
3. **The constraints** in the plan's constraints object - the condition budget, material on hand, time, and equipment. A hypothesis whose test cannot fit inside them is not runnable. If \`conditionBudget\` is present, do NOT propose a hypothesis whose comparison set (all arms, controls and baselines included) would exceed it - for a combinational hypothesis remember it needs its single-agent arms too, so it costs more arms than a single-factor one. Prefer the hypothesis that answers the question inside the budget.
4. **\`knownVariablesLowWeight\` / \`unknownVariablesLowWeight\` are SECONDARY AND LOW WEIGHT.** Treat known variables as context you may hold fixed or build on, and unknown variables as things worth illuminating where it is free to do so. They must NOT become the point of a hypothesis, and must never displace the objective, the success criteria, or the constraints. Do not invent a hypothesis whose purpose is to chase an unknown variable.`

  let user = `Research Plan:
Title: ${plan.title}
Description: ${plan.description}
Constraints: ${JSON.stringify(plan.constraints || {})}`

  // Include the actual selected papers the user chose
  if (hasPapers) {
    user += `\n\nSelected Papers (the researcher chose these as most relevant):`
    for (const p of selectedPapers!) {
      user += `\n[${p.index}] ${p.title}`
      if (p.summary) user += `\n    Summary: ${p.summary}`
      if (p.sourceUrl) user += `\n    URL: ${p.sourceUrl}`
    }
  }

  // Include the synthesized literature insights
  if (hasLitContext) {
    user += `\n\nLiterature Insights (synthesized from broader search):
What Others Have Done: ${literatureContext!.whatOthersHaveDone}
Good Methods & Tools: ${literatureContext!.goodMethodsAndTools}
Potential Pitfalls: ${literatureContext!.potentialPitfalls}`
  }

  user += `\n\nGenerate 4 distinct testable hypotheses for this research plan, ALL reached through your assigned lens: ${lens}.`

  if (hasPapers) {
    user += ` Ground each hypothesis in the selected papers - reference them by [N] index in the provenance array.`
    if (anchorPapers.length) {
      user += ` LEAD from these papers in particular: ${anchorPapers.join(", ")} (you may still cite the others as support, but these must carry the core of your reasoning).`
    }
    user += ` Across your 4 hypotheses, cite as many DIFFERENT papers as you can rather than leaning on the same one repeatedly.`
  }

  return {
    system,
    user,
    temperature: 0.7,
    maxTokens: 1000
  }
}
