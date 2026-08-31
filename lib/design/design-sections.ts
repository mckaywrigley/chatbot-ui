/**
 * The 4-section experiment-design pipeline, extracted from the inline
 * `case "design"` of app/api/design/[designid]/generate/route.ts so it can run
 * as discrete Inngest steps (each section is one gpt-5.5 call ≈ 2–3 min; four
 * serial sections blew Vercel's 300s function cap). Each `genX` is one
 * structured-output call; the Inngest worker wraps each in its own
 * `step.run(...)` so no single invocation exceeds the limit.
 *
 * Pure: no Firestore, no auth, no request context - inputs in, parsed sections
 * out. The azure-openai Proxy still coerces temperature / reasoning_effort /
 * max_completion_tokens.
 */
import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"
import { v4 as uuidv4 } from "uuid"
import {
  getAzureOpenAIForDesign,
  getDesignDeployment
} from "@/lib/azure-openai"
import type {
  DesignAssumption,
  DesignContentV2,
  GeneratedDesign,
  Hypothesis,
  ProblemContext
} from "@/lib/design-agent"

// ── Schemas (one per section) ──────────────────────────────────────────────

/**
 * An ASSUMPTION LEDGER entry. Wherever a section needs a number or a choice the
 * researcher hasn't supplied, the model must record what it assumed instead of
 * quietly baking a guess into the protocol. These are surfaced back to the
 * scientist as questions, so the final design rests on their judgement rather
 * than the model's defaults.
 */
const assumptionSchema = z.object({
  /** The parameter assumed, in bench language (e.g. "mAb stock concentration"). */
  parameter: z.string(),
  /** The value actually used in this draft (with units). */
  assumedValue: z.string(),
  /** What in the protocol changes if this is wrong (volumes, counts, feasibility). */
  whyItMatters: z.string(),
  /** 2-6 concrete alternatives for the researcher to pick from, with units. */
  options: z.array(z.string()).min(2).max(6),
  /** high = the design is unusable if wrong; low = a sensible default. */
  impact: z.enum(["high", "medium", "low"])
})

const assumptionsField = {
  assumptions: z.array(assumptionSchema).max(6)
}

const experimentSetupSchema = z.object({
  // Short, complete headline for the design. Previously the title was
  // `hypothesis.slice(0, 80)`, which cut mid-sentence and rendered as a
  // dangling fragment in the UI.
  designTitle: z.string(),
  whatWillBeTested: z.string(),
  whatWillBeMeasured: z.string(),
  controlGroups: z.string(),
  experimentalGroups: z.string(),
  sampleTypes: z.string(),
  replicatesAndConditions: z.string(),
  specificRequirements: z.string(),
  ...assumptionsField
})
const materialsSchema = z.object({
  toolsNeeded: z.string(),
  materialsList: z.string(),
  materialPreparation: z.string(),
  setupInstructions: z.string(),
  storageDisposal: z.string(),
  ...assumptionsField
})
const protocolSchema = z.object({
  stepByStepProcedure: z.string(),
  timeline: z.string(),
  conditionsTable: z.string(),
  /**
   * The bench-prep sheet: for EVERY arm in the conditions table, the exact
   * volumes of each stock plus the buffer make-up that produce it. The
   * conditions table says WHAT each arm is; this says HOW to pipette it.
   */
  conditionPrepTable: z.string(),
  ...assumptionsField
})
const analysisSchema = z.object({
  dataCollectionPlan: z.string(),
  statisticalAnalysis: z.string(),
  safetyNotes: z.string(),
  rationale: z.string(),
  ...assumptionsField
})

export type SetupSection = z.infer<typeof experimentSetupSchema>
export type MaterialsSection = z.infer<typeof materialsSchema>
export type ProtocolSection = z.infer<typeof protocolSchema>
export type AnalysisSection = z.infer<typeof analysisSchema>

export interface DesignBlocks {
  problemBlock: string
  hypBlock: string
  litBlock: string
  papersBlock: string
}

const openai = () => getAzureOpenAIForDesign()
const MODEL = () => getDesignDeployment()

/**
 * How every quantity in the design must be shown.
 *
 * The calculations were correct but compressed - a finished volume with the
 * arithmetic folded away. That reads fine to whoever wrote it and is hard to
 * follow, check, or adapt for anyone else, and bench staff span a wide range of
 * experience. The rule is: each component is prepared SEPARATELY as its own
 * stock, and each condition is then MIXED from those stocks, with one explicit
 * C1V1 = C2V2 line per component and water/buffer closing the volume.
 */
const WORKED_EXAMPLE_RULE = `Show it as a SEPARATE-STOCKS-THEN-MIX calculation, never as a single collapsed figure:

1. State the TARGET composition and the FINAL VOLUME first, in one line (e.g. "Target: 150 mg/mL mAb in 20 mM His/HCl pH 6.0 with 100 mM Arg·HCl — final volume 150 µL").
2. List the STOCKS being drawn from, each with its concentration (e.g. "mAb stock 200 mg/mL", "His/HCl buffer stock 200 mM pH 6.0", "Arg·HCl stock 1000 mM", "WFI / dI water").
3. Then ONE LINE PER COMPONENT, each showing the dilution arithmetic in full using C1V1 = C2V2:
   - mAb: V1 = (150 mg/mL × 150 µL) / 200 mg/mL = 112.5 µL of the 200 mg/mL stock
   - His/HCl: V1 = (20 mM × 150 µL) / 200 mM = 15.0 µL of the 200 mM buffer stock
   - Arg·HCl: V1 = (100 mM × 150 µL) / 1000 mM = 15.0 µL of the 1000 mM stock
4. Then the MAKE-UP line, as the balance: "Water/diluent = 150 − (112.5 + 15.0 + 15.0) = 7.5 µL".
5. Then a CHECK line confirming the parts sum to the final volume and restating the delivered concentrations.

Rules for these calculations everywhere they appear - buffer prep, stock prep, excipient prep, dilution series and final sample prep alike:
- NEVER give a bare number. Every volume, mass or concentration shows the expression it came from, with units carried through.
- Prepare each component as its OWN stock at a stated concentration, then mix. Do not weigh powders directly into a condition, and do not present a condition as a single pre-mixed recipe.
- Use the researcher's stated stock concentrations. Where a stock concentration was not given, assume a sensible one, SAY the value you assumed on the line, and log it in the assumptions array.
- Keep the arithmetic to one step per line so it can be checked by eye. Round volumes to what a pipette can actually deliver (0.1 µL) and say so if rounding shifts a concentration.
- Name what each volume is drawn from, so "15.0 µL" is always "15.0 µL of the 1000 mM Arg·HCl stock".`

/** Build the shared prompt context blocks for one hypothesis. */
export function buildDesignBlocks(
  ctx: ProblemContext,
  existing: DesignContentV2,
  hyp: Hypothesis
): DesignBlocks {
  const litCtx = existing.literatureContext
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

  const userPlan = (
    (ctx as { userProvidedPlan?: string }).userProvidedPlan || ""
  ).trim()
  const userPlanBlock = userPlan
    ? `\n\nUser-supplied draft procedure (treat this as the SCAFFOLDING to adopt; preserve structure/wording where reasonable, fill gaps, correct scientific errors, and complete missing sections such as material quantities, stats, safety):\n<user-plan>\n${userPlan}\n</user-plan>`
    : ""

  const wantsReplicates =
    (ctx as { includeReplicates?: string }).includeReplicates === "yes"
  const replicateN = (
    (ctx as { replicateCount?: string }).replicateCount || ""
  ).trim()
  const replicateDirective = wantsReplicates
    ? `\n\nREPLICATES: The researcher WANTS replicates${replicateN ? ` and specified n = ${replicateN} per condition - USE EXACTLY THAT` : ""}. Include a sensible biological/technical replicate scheme (state n per group) and factor it into every vial-count, the conditions-table "n" column, all material totals, and the statistical power calculation.`
    : `\n\nREPLICATES: The researcher does NOT want replicates - design a SINGLE run per condition (n = 1). Do NOT multiply any count by a replicate factor. State plainly in the replicates/conditions field: "No replicates - single run per condition (n = 1)". Every conditions-table "n" column = 1, and all material totals = conditions × 1 × volume-per-sample (dead-volume buffer only, no replicate multiplier). The statistics section must reflect n = 1 (no replicate-based power calc; note the single-run limitation).`

  const userSuppliedNote = hyp.userSupplied
    ? `\nNOTE: This hypothesis was provided directly by the researcher. Treat it as a fixed input - do NOT rewrite, soften, or re-scope it. Design the experiment around it exactly as written.`
    : ""
  const hypBlock =
    `Hypothesis: ${hyp.text}\nExplanation: ${hyp.reasoning}` + userSuppliedNote

  // Researcher-supplied operating parameters (mandatory Problem field) +
  // pre-generation design spec (molecule concentration, condition count,
  // notes). These are AUTHORITATIVE - the design must use these exact numbers,
  // not invent generic placeholders.
  const additional = (ctx.additionalDetails || "").trim()
  const spec = ctx.designSpec
  const specLines = [
    spec?.moleculeConcentration
      ? `- Molecule / operating concentration: ${spec.moleculeConcentration}`
      : "",
    spec?.conditions
      ? `- Number / type of conditions to design: ${spec.conditions}`
      : "",
    spec?.notes ? `- Additional design instructions: ${spec.notes}` : ""
  ]
    .filter(Boolean)
    .join("\n")
  const directivesBlock =
    additional || specLines
      ? `\n\nRESEARCHER-SUPPLIED SPECIFICS (authoritative for the DESIGN - use these EXACT values; do not substitute generic placeholders, and do not leave ranges vague). These cover working concentrations, stock concentrations, how much material is available (use it to bound condition counts + material calcs), and any specific conditions to incorporate (e.g. stress temperatures, rotation/agitation speed):${additional ? `\nOperating parameters: ${additional}` : ""}${specLines ? `\n${specLines}` : ""}`
      : ""

  // A stated number of conditions/runs is a HARD CEILING. This used to be
  // phrased as guidance ("prefer the smallest set") and the model read it as a
  // suggestion - designs came back with more arms than the researcher said they
  // could run, which makes the whole protocol unrunnable in their lab.
  const statedConditions = (spec?.conditions || "").trim()
  const conditionsCeilingNote = `\n\nCONDITION COUNT - HARD CEILING (violating this makes the design useless):${
    statedConditions
      ? `\nThe researcher stated their condition budget as: "${statedConditions}". Extract the maximum number N from that statement and DO NOT EXCEED IT under any circumstance. Every row in the conditions table counts toward N - including baselines, controls, blanks and reference arms. Replicates of the SAME arm do not count as separate conditions; a different composition, level, timepoint or temperature DOES.`
      : `\nIf the researcher gives a maximum number of conditions / runs anywhere in their inputs, treat it as an absolute ceiling. Every row in the conditions table counts toward it, including controls and baselines.`
  }
- Use the SMALLEST well-chosen condition set that cleanly tests the hypothesis. Only approach the ceiling when each extra arm is scientifically justified. Never pad with filler arms to hit the number.
- If the hypothesis cannot be tested properly within the ceiling, DO NOT quietly add arms. Design the best experiment that FITS, and log the shortfall as a high-impact assumption explaining what was dropped and what it costs.
- Before you finish, COUNT the rows in your conditions table and check the total against the ceiling. If it is over, cut arms until it fits.`

  // What the design must actually serve, in priority order. Without this the
  // model treated every input as equally weighted, so nice-to-have context
  // (known/unknown variables) pulled the design away from the stated objective.
  const priorityNote = `\n\nWHAT THIS DESIGN MUST SERVE (strict priority order - when inputs pull in different directions, the higher item wins):
1. THE PROBLEM STATEMENT AND OBJECTIVE. Every arm must earn its place by moving toward the stated objective. If an arm does not help answer the problem, cut it.
2. THE SUCCESS CRITERIA. The design must be capable of producing a clear pass/fail against them; the readouts and the analysis must measure exactly what the criteria name.
3. THE CONSTRAINTS (material, time, equipment, condition count). These are hard limits on what may be designed, not preferences. A scientifically lovely design that exceeds them is a failed design.
4. THE CHOSEN HYPOTHESIS - the mechanism being tested, within the bounds above.
5. KNOWN / UNKNOWN VARIABLES - SECONDARY, LOW WEIGHT. Use them as helpful context: known variables are values you may hold fixed or reuse rather than assume, and unknown variables are things worth capturing as a secondary readout or noting as a limitation. They must NOT drive the design: do NOT add arms, factors or extra measurement burden purely to chase an unknown variable, and do NOT let them displace anything above. If exploring one would push you over the condition ceiling or dilute the primary objective, leave it out and say so in the rationale.`

  const formatDirective = `\n\nOUTPUT FORMATTING (strict - optimise for at-a-glance readability, not walls of text):\n- Write every procedure / list as DISTINCT point-wise lines. NEVER pack multiple actions into one run-on sentence. If a step has branches, split them into their own numbered sub-lines (4a, 4b, 4c …), one action per line.\n- Use Markdown TABLES wherever data is tabular - the conditions matrix, material quantities, and especially CALCULATIONS. A reader should follow the logic by scanning columns, not parsing prose.\n- Conditions table: well-formed Markdown table, header row, one row per arm, all numbers with units, explicit baseline + control rows.\n- Calculations: present each as a compact table (e.g. \`| Quantity | Value | How it's derived |\`) OR as short labelled lines - one arithmetic step per row, numbers + units, and a brief note on where each number comes from (e.g. moles = 0.020 M × 0.250 L = 5.0e-3 mol - "20 mM target × 250 mL batch"). Never bury a calculation inside a paragraph, and never give a bare result without its derivation. Keep surrounding prose to one short lead-in sentence per block.

CALCULATION STYLE (applies to buffer prep, stock prep, excipient prep, dilution series and final sample prep alike). Bench staff reading this span a wide range of experience, so no step may be implicit. ${WORKED_EXAMPLE_RULE}`

  // The ASSUMPTION LEDGER directive. The scientist's judgement - not the
  // model's defaults - must decide the numbers the protocol depends on. So
  // wherever a value is missing, the model still drafts with a stated working
  // value (the design must stay runnable) but is required to LOG it, and we ask
  // the researcher afterwards.
  const assumptionDirective = `\n\nASSUMPTION LEDGER (mandatory - this is how the design earns the scientist's trust):\nYou will inevitably need values the researcher has not given you: stock concentration, working concentration, how much material is on hand, incubation time, plate format, instrument settings, and so on. NEVER silently invent one and bury it in the protocol.\n- For EVERY value or choice you had to assume rather than read from the researcher's inputs, add an entry to the "assumptions" array: the parameter, the value you used, why it matters (what changes downstream if it's different), 2-6 concrete alternatives with units, and an impact rating.\n- Rate impact "high" when the protocol is unusable or the calculations are wrong if the assumption is off (e.g. stock concentration, total material available, primary readout); "medium" when it shifts numbers but not feasibility; "low" when it's a routine default any lab would accept.\n- Do NOT log things the researcher DID specify - only genuine gaps.\n- Do NOT stall or write "TBD" into the protocol: still commit to the best working value so the design reads as runnable, and log it. The researcher will confirm or correct it.\n- Keep it to the assumptions that actually matter - at most 6 per section, highest impact first.`

  // Everything the researcher told us, in one authoritative block. The
  // objective, the success criteria and the structured constraints / variables
  // captured by the study-details step were all being collected and then never
  // shown to the design agents - which is why designs drifted off the objective
  // and blew past stated limits.
  const cs = ctx.constraintsStructured
  const vs = ctx.variablesStructured
  const problemBlock =
    [
      `Research problem: ${[ctx.title, ctx.problemStatement].filter(Boolean).join(" - ")}`,
      `Objective: ${ctx.objective || ctx.goal || "Not specified"}`,
      ctx.domain ? `Domain: ${ctx.domain}` : "",
      ctx.phase ? `Phase: ${ctx.phase}` : "",
      `Success criteria: ${ctx.successCriteria || "Not specified - infer a defensible target from the objective and log it as an assumption"}`,
      cs?.material ? `Material available: ${cs.material}` : "",
      cs?.time ? `Time available: ${cs.time}` : "",
      cs?.equipment ? `Equipment available: ${cs.equipment}` : "",
      `Other constraints: ${((ctx as { constraints?: string[] }).constraints ?? []).join(", ") || "None stated"}`,
      vs?.known ? `Known variables (secondary, low weight): ${vs.known}` : "",
      vs?.unknown
        ? `Unknown variables (secondary, low weight): ${vs.unknown}`
        : "",
      `Variables: ${((ctx as { variables?: string[] }).variables ?? []).join(", ") || "Not specified"}`
    ]
      .filter(Boolean)
      .join("\n") +
    priorityNote +
    directivesBlock +
    conditionsCeilingNote +
    userPlanBlock +
    replicateDirective +
    assumptionDirective +
    formatDirective

  return { problemBlock, hypBlock, litBlock, papersBlock }
}

const setupSummaryOf = (s: SetupSection) =>
  `Experimental design:\n- Testing: ${s.whatWillBeTested}\n- Measuring: ${s.whatWillBeMeasured}\n- Controls: ${s.controlGroups}\n- Experimental groups: ${s.experimentalGroups}\n- Samples: ${s.sampleTypes}\n- Replicates: ${s.replicatesAndConditions}`
const materialsSummaryOf = (m: MaterialsSection) =>
  `Materials: ${m.toolsNeeded}\nPreparation: ${m.materialPreparation}`
const protocolSummaryOf = (p: ProtocolSection) =>
  `Procedure summary: ${p.stepByStepProcedure.slice(0, 500)}...\nTimeline: ${p.timeline}`

// ── Phase 1: Experimental Setup ─────────────────────────────────────────────
export async function genSetup(blocks: DesignBlocks): Promise<SetupSection> {
  const completion = await openai().beta.chat.completions.parse({
    model: MODEL(),
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: `You are an expert experiment design scientist writing SOP-grade output. Every field is Markdown. Each section must use bolded lead-in labels and bullet / numbered lists - never walls of prose. Be specific: concentrations with units, temperatures in °C, volumes in mL/µL, durations in h/min, replicate counts, equipment grades.

Fields to produce:

- **designTitle** - a SHORT, COMPLETE title naming what this design does. HARD RULES: at most 70 characters; a self-contained noun phrase that reads as a finished label, never a truncated sentence; no trailing ellipsis, no trailing punctuation, no "A study to…" preamble. Name the intervention/approach and the readout or goal. Good: "Excipient screen for viscosity reduction at 150 mg/mL". Bad: "This experiment will evaluate whether the addition of arginine…".
- **whatWillBeTested** - one short paragraph stating the concrete test objective, then a bulleted list of the 2–4 specific variables / factors being manipulated.
- **whatWillBeMeasured** - bullet list. Each bullet: \`**Readout** - method - unit - expected range\`.
- **controlGroups** - bullet list. Each bullet: \`**Control name** - what it isolates / why it's needed\`. PURPOSE only - do NOT restate the full per-arm value matrix (that lives in the Conditions Table downstream).
- **experimentalGroups** - bullet list. Each bullet: \`**Group name** - what it tests - expected effect\`. PURPOSE only - exact factor values go in the Conditions Table, not here.
- **sampleTypes** - bulleted. Describe sample matrix, concentration, container (material, volume, cap type), aliquot strategy.
- **replicatesAndConditions** - ONE or two bullets: the replicate scheme (n per group, biological vs technical) and any blocking / randomization. Example: \`n = 3 biological per arm; arms randomized across 2 incubator shelves\`. This feeds the Conditions Table's n column - keep it to the scheme, not a full enumeration.
- **specificRequirements** - anything out-of-ordinary: BSL level, cold-chain, light-sensitive handling, certified reference standards, specific instrument calibration. Bullet list with bold hazard / requirement class.

Do not output plain paragraphs. Every field uses bullets and/or bolded labels. SCOPE - do not duplicate across fields: controls/experimental groups state PURPOSE; the per-arm numbers belong in the Conditions Table (written later).`
      },
      {
        role: "user",
        content: `${blocks.problemBlock}\n\n${blocks.hypBlock}${blocks.litBlock}${blocks.papersBlock}\n\nDesign the experimental setup per the SOP format. Reference specific methods or findings from the selected papers where relevant, citing as [Author, Year].`
      }
    ],
    response_format: zodResponseFormat(experimentSetupSchema, "experimentSetup")
  })
  const parsed = completion.choices[0]?.message?.parsed
  if (!parsed) throw new Error("Empty response from Phase 1 (setup)")
  return parsed
}

// ── Phase 2: Materials & Setup ──────────────────────────────────────────────
export async function genMaterials(
  blocks: DesignBlocks,
  setup: SetupSection
): Promise<MaterialsSection> {
  const completion = await openai().beta.chat.completions.parse({
    model: MODEL(),
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

3. **materialPreparation** - For EACH buffer, stock solution, or reagent that must be prepared, write a Markdown sub-section. Keep prose minimal - put the numbers in a TABLE so the logic is scannable. Use exactly this shape:
   \`### Buffer name (e.g. 20 mM Histidine, pH 6.0)\`
   One short lead-in line (target conc / pH / volume needed). Then a **calculation table**:
   \`| Quantity | Value | How it's derived |\`
   e.g.
   \`| Batch volume | 250 mL | X mL/condition × Y conditions × 1.2 dead-volume |\`
   \`| Moles histidine | 5.0e-3 mol | 0.020 M × 0.250 L |\`
   \`| Mass histidine | 0.776 g | 5.0e-3 mol × 155.16 g/mol (MW) |\`
   Then a numbered **prep** list, one action per line:
     1. Weigh 0.776 g L-histidine base on analytical balance.
     2. Dissolve in 200 mL WFI in a 250 mL volumetric flask.
     3. Titrate to pH 6.0 at 25 °C with 1 N HCl (expect ~3–4 mL).
     4. QS to 250 mL with WFI. Invert 10× to mix.
     5. Filter through 0.22 µm PES. Label (date + initials + lot). Store 2–8 °C, use within 14 days.
   One subsection per buffer/reagent. Every derived number must show its derivation in the table - never a bare value, and never a wall of prose.

   PREPARE EACH COMPONENT SEPARATELY AS ITS OWN STOCK. Every excipient, salt, sugar and surfactant gets its own concentrated stock subsection with its own calculation - do NOT weigh several components straight into one combined solution, because a shared weigh-out cannot be re-used across arms at different levels and cannot be checked. Give each stock a NAME and a CONCENTRATION that the Condition Preparation table can then draw volumes from (e.g. "Arg·HCl stock, 1000 mM"). Choose stock concentrations high enough that every arm's draw stays pipettable at the working volume, and say why if a stock is near its solubility limit.

4. **setupInstructions** - Numbered Markdown list of WORKSTATION / INSTRUMENT setup ONLY (balance calibration, pH-meter cal, biosafety cabinet setup, vial labeling scheme, temperature blocks). Each step has a bolded lead-in verb. Do NOT include reagent/buffer preparation (that's materialPreparation) or the run-time experimental steps (that's the procedure) - equipment readiness only.

5. **storageDisposal** - Markdown bullets. For each material class: storage condition, container type, disposal stream (e.g. *Aqueous biowaste - 10% bleach, 30-min soak, rinse down sink; log in biohazard register*). Use bold labels.

SCOPE - do not repeat across fields: **materialPreparation** is recipes/calculations for making reagents; **setupInstructions** is instrument/bench readiness only. Neither restates the chronological run (that's the Step-by-Step Procedure, written later). Never use placeholder text like "TBD" - if a spec is reasonable to infer, infer it and mark the assumption.`
      },
      {
        role: "user",
        content: `${blocks.problemBlock}\n\n${blocks.hypBlock}\n\n${setupSummaryOf(setup)}${blocks.papersBlock}\n\nProduce the five fields in the SOP format above. Base material quantities on the conditions × replicates you see in the experimental setup summary.`
      }
    ],
    response_format: zodResponseFormat(materialsSchema, "materials")
  })
  const parsed = completion.choices[0]?.message?.parsed
  if (!parsed) throw new Error("Empty response from Phase 2 (materials)")
  return parsed
}

// ── Phase 3: Protocol & Timeline ────────────────────────────────────────────
export async function genProtocol(
  blocks: DesignBlocks,
  setup: SetupSection,
  materials: MaterialsSection
): Promise<ProtocolSection> {
  const completion = await openai().beta.chat.completions.parse({
    model: MODEL(),
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: `You are an experimental protocol writer producing SOP-grade Markdown. All three fields must be scannable and copy-exec ready.

- **stepByStepProcedure** - the chronological RUN as a single numbered Markdown list. Each step begins with a **bold imperative verb** ("**Dissolve**", "**Filter**", "**Incubate**", "**Aliquot**") followed by concrete quantities + times + temperatures + equipment. Group steps under Markdown sub-headings like \`### Day 1 - Formulation\`, \`### Day 3–28 - Stress incubation\`, \`### Day 28 - Readouts\`. When a step has multiple actions or branches, ALWAYS split them into separate sub-step lines (\`4a.\`, \`4b.\`, \`4c.\` …) - each on its OWN line, one action per line. NEVER combine several actions into one run-on sentence. Include a short **"Checkpoint"** bold callout after each major phase. IMPORTANT - do NOT repeat content from earlier sections: refer to prepared reagents BY NAME ("the 20 mM histidine buffer prepared in Material Preparation") instead of re-deriving their recipes, and assume equipment was readied per Setup. This section is the run, not a re-statement of prep.

- **timeline** - Markdown table:
  \`| Day | Activity | Duration | Notes |\`
  One row per scheduled day / phase. Notes column carries dependencies, decision points, and who performs the step.

- **conditionsTable** - the SINGLE authoritative enumeration of every experimental arm (this replaces any separate groups/replicates list, so it must be complete). Markdown table, at minimum:
  \`| Group | Condition / composition | Variable 1 | Variable 2 | T (°C) | Time | n | Read-outs |\`
  Include baseline and stressed controls explicitly as their own rows. All numbers must have units. Above the table, ONE short line summarizing the factorial structure + replicate scheme (e.g. "5 arginine levels × 2 temperatures × 3 biological replicates = 30 vials; arms randomized across shelves"). Do not return prose in place of a table.
  COUNT YOUR ROWS against any condition ceiling stated in the research problem before you finish. Every row counts, controls included. If you are over, cut arms.
  If the hypothesis is COMBINATIONAL (it proposes two or more agents/factors acting together), the arms MUST let the combination be attributed: include each single agent alone at its matched level, the combination(s), and the untreated baseline. A combination arm without its own single-agent arms cannot be interpreted.

- **conditionPrepTable** - the BENCH PREP SHEET. The conditions table says what each arm IS; this says exactly how to PIPETTE it. One row per arm from the conditions table, same Group names, in the same order - no arm may be missing. Markdown table:
  \`| Group | Stock A (µL) | Stock B (µL) | ... | Buffer make-up (µL) | Final volume (µL) | Final conc. of each component |\`
  Rules:
  - One column per stock/component that gets pipetted, headed with the stock's NAME and its CONCENTRATION (e.g. \`Arg·HCl 500 mM (µL)\`), so the reader never has to look up which stock is meant. Reference the stocks BY THE NAME used in Material Preparation.
  - Every arm's volumes must ARITHMETICALLY SUM to the stated final volume - the buffer make-up column is the balance that closes it. Check each row adds up before returning.
  - The final-concentration column must restate what that arm is actually delivering (e.g. \`mAb 150 mg/mL, Arg 50 mM\`), so it can be checked against the conditions table.
  - Volumes are per single sample/vial at the stated final volume. Below the table add one short line for the per-arm total to prepare including replicates and dead volume (e.g. "×3 replicates × 1.15 dead volume = prepare 3.45 mL per arm").
  - If a component is absent from an arm, write \`—\`, never leave the cell blank.
  Do not return prose in place of a table, and do not repeat the buffer recipes here (they live in Material Preparation) - this section is quantities to combine, nothing else.

  THEN, BELOW the table, WORK ONE ARM ALL THE WAY THROUGH, component by component. ${WORKED_EXAMPLE_RULE}`
      },
      {
        role: "user",
        content: `${blocks.problemBlock}\n\n${blocks.hypBlock}\n\n${setupSummaryOf(setup)}\n\n${materialsSummaryOf(materials)}\n\nWrite the step-by-step protocol (by day, with Checkpoints), timeline table, conditions table, and the condition preparation table per the SOP format. The prep table must cover EVERY arm in the conditions table, with volumes that sum to the final volume.`
      }
    ],
    response_format: zodResponseFormat(protocolSchema, "protocol")
  })
  const parsed = completion.choices[0]?.message?.parsed
  if (!parsed) throw new Error("Empty response from Phase 3 (protocol)")
  return parsed
}

// ── Phase 4: Analysis & Safety ──────────────────────────────────────────────
export async function genAnalysis(
  blocks: DesignBlocks,
  setup: SetupSection,
  materials: MaterialsSection,
  protocol: ProtocolSection
): Promise<AnalysisSection> {
  const completion = await openai().beta.chat.completions.parse({
    model: MODEL(),
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
        content: `${blocks.problemBlock}\n\n${blocks.hypBlock}\n\n${setupSummaryOf(setup)}\n\n${materialsSummaryOf(materials)}\n\n${protocolSummaryOf(protocol)}\n\nReturn the four sections (dataCollectionPlan, statisticalAnalysis, safetyNotes, rationale) per the system-prompt format.`
      }
    ],
    response_format: zodResponseFormat(analysisSchema, "analysis")
  })
  const parsed = completion.choices[0]?.message?.parsed
  if (!parsed) throw new Error("Empty response from Phase 4 (analysis)")
  return parsed
}

/** Assemble the 4 parsed sections into a GeneratedDesign (canonical SOP order). */
export function assembleDesign(
  hyp: Hypothesis,
  setup: SetupSection,
  materials: MaterialsSection,
  protocol: ProtocolSection,
  analysis: AnalysisSection
): GeneratedDesign {
  // Prefer the model's short headline. Fall back to the hypothesis only if it
  // came back empty — and then cut on a WORD boundary so the label never ends
  // mid-word (the old `.slice(0, 80)` produced dangling fragments).
  const cleanTitle = (setup.designTitle ?? "").trim().replace(/[.…]+$/, "")
  const fallback = hyp.text.trim()
  const title =
    cleanTitle.length > 0
      ? cleanTitle
      : fallback.length <= 80
        ? fallback
        : `${fallback.slice(0, 80).replace(/\s+\S*$/, "")}…`

  // Collect the assumption ledger from all four sections, highest impact
  // first, so the UI asks about the design-breaking gaps before the cosmetic
  // ones. De-duplicated by parameter: sections often need the same number
  // (e.g. stock concentration) and would each log it.
  const rank = { high: 0, medium: 1, low: 2 } as const
  const seenParams = new Set<string>()
  const assumptions: DesignAssumption[] = [
    ...(setup.assumptions ?? []).map(a => ({ ...a, section: "Setup" })),
    ...(materials.assumptions ?? []).map(a => ({ ...a, section: "Materials" })),
    ...(protocol.assumptions ?? []).map(a => ({ ...a, section: "Protocol" })),
    ...(analysis.assumptions ?? []).map(a => ({ ...a, section: "Analysis" }))
  ]
    .sort((a, b) => rank[a.impact] - rank[b.impact])
    .filter(a => {
      const key = a.parameter.trim().toLowerCase()
      if (!key || seenParams.has(key)) return false
      seenParams.add(key)
      return true
    })
    .map(a => ({ ...a, id: `as-${uuidv4()}` }))

  return {
    id: `d-${uuidv4()}`,
    hypothesisId: hyp.id,
    title,
    ...(assumptions.length ? { assumptions } : {}),
    // Streamlined section set (no repetition): the Conditions Table is the
    // single enumerated source of every arm + n, so the old separate "Control
    // Groups", "Experimental Groups" and "Replicates & Conditions" sections are
    // merged into one purpose-focused "Groups & Controls" block; and the
    // workstation "Setup Instructions" are folded into the start of the
    // procedure so material-prep / setup / run aren't three overlapping lists.
    sections: [
      { heading: "What Will Be Tested", body: setup.whatWillBeTested },
      { heading: "What Will Be Measured", body: setup.whatWillBeMeasured },
      {
        heading: "Groups & Controls",
        body: `**Controls**\n\n${setup.controlGroups}\n\n**Experimental groups**\n\n${setup.experimentalGroups}`
      },
      { heading: "Conditions Table", body: protocol.conditionsTable },
      { heading: "Sample Types", body: setup.sampleTypes },
      { heading: "Special Requirements", body: setup.specificRequirements },
      { heading: "Tools & Equipment", body: materials.toolsNeeded },
      { heading: "Materials List", body: materials.materialsList },
      { heading: "Material Preparation", body: materials.materialPreparation },
      // Sits between "what stocks exist" and "how the run goes": the per-arm
      // pipetting sheet. Omitted rather than shown empty if the model skipped
      // it, so an older or degraded response never renders a blank section.
      ...((protocol.conditionPrepTable ?? "").trim()
        ? [
            {
              heading: "Condition Preparation",
              body: protocol.conditionPrepTable
            }
          ]
        : []),
      { heading: "Storage & Disposal", body: materials.storageDisposal },
      {
        heading: "Step-by-Step Procedure",
        body: `### Setup & calibration\n\n${materials.setupInstructions}\n\n${protocol.stepByStepProcedure}`
      },
      { heading: "Timeline", body: protocol.timeline },
      { heading: "Data Collection Plan", body: analysis.dataCollectionPlan },
      { heading: "Statistical Analysis", body: analysis.statisticalAnalysis },
      { heading: "Safety Notes", body: analysis.safetyNotes },
      { heading: "Rationale", body: analysis.rationale }
    ],
    saved: false
  }
}
