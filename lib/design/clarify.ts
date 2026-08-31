/**
 * "Refine" clarifying-question engine. At two checkpoints - after the problem
 * (before literature) and after the chosen hypothesis (before design) - a sharp
 * experimental-design reviewer asks the highest-value questions to remove
 * ambiguity, so literature is on-target and the design is specific (job stories
 * 1, 2, 3). Questions are MCQ (model-picked options) + an always-allowed
 * free-text "other". Adaptive: a second round drills in if answers are vague,
 * capped so it never drags.
 *
 * Pure-ish: inputs in, questions out. The Azure Proxy coerces reasoning params.
 */
import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"
import {
  getAzureOpenAIForDesign,
  getDesignDeployment
} from "@/lib/azure-openai"
import type {
  ClarifyAnswer,
  ClarifyQuestion,
  ProblemContext
} from "@/lib/design-agent"
import type { ClarifyCheckpoint } from "./clarify-shared"

export type { ClarifyCheckpoint } from "./clarify-shared"
export {
  CLARIFY_MAX_ROUNDS,
  CLARIFY_MAX_TOTAL,
  clarifyAnswersToText
} from "./clarify-shared"

const questionSchema = z.object({
  done: z.boolean(),
  questions: z
    .array(
      z.object({
        prompt: z.string(),
        kind: z.enum(["single", "multi"]),
        options: z.array(z.string()).min(2).max(6),
        rationale: z.string().optional()
      })
    )
    .max(8)
})

const openai = () => getAzureOpenAIForDesign()
const MODEL = () => getDesignDeployment()

function rid(): string {
  // Stable-ish id without Date.now/Math.random restrictions (server route is
  // a normal Node runtime, but keep it cheap + collision-safe enough per call).
  return `q-${Math.random().toString(36).slice(2, 10)}`
}

function priorBlock(answers: ClarifyAnswer[] | undefined): string {
  if (!answers || answers.length === 0) return ""
  const lines = answers.map(a => {
    const val = a.skipped
      ? "(skipped - assume a sensible default)"
      : [a.selected.join(", "), a.other].filter(Boolean).join(" · ") ||
        "(blank)"
    return `- ${a.prompt} → ${val}`
  })
  return `\n\nAlready answered:\n${lines.join("\n")}`
}

export interface GenerateClarifyArgs {
  checkpoint: ClarifyCheckpoint
  ctx: ProblemContext
  /** Chosen hypothesis text (design checkpoint only). */
  hypothesis?: string
  /** Short literature context summary (design checkpoint, optional). */
  literature?: string
  priorAnswers?: ClarifyAnswer[]
  /** Round index (1-based). Round > 1 only drills in if needed. */
  round?: number
}

/**
 * Ask the model for the next batch of clarifying questions. `done: true` means
 * the model judges there's nothing material left to ask. The caller enforces
 * the round / total caps regardless.
 */
export async function generateClarifyingQuestions(
  args: GenerateClarifyArgs
): Promise<{ questions: ClarifyQuestion[]; done: boolean }> {
  const { checkpoint, ctx, hypothesis, literature, priorAnswers } = args
  const round = args.round ?? 1

  // Everything the researcher has ALREADY told us. The study-details step now
  // collects success criteria, replicates, constraints, variables and
  // operating parameters up front - but none of it reached this prompt, so the
  // questions cheerfully asked for it all over again and felt canned.
  const cs = ctx.constraintsStructured
  const vs = ctx.variablesStructured
  const problemBlock = [
    `Research problem: ${[ctx.title, ctx.problemStatement].filter(Boolean).join(" - ") || "Not specified"}`,
    ctx.objective ? `Goal: ${ctx.objective}` : "",
    ctx.domain ? `Domain: ${ctx.domain}` : "",
    ctx.phase ? `Phase: ${ctx.phase}` : "",
    ctx.successCriteria ? `Success criteria: ${ctx.successCriteria}` : "",
    ctx.includeReplicates === "yes"
      ? `Replicates: yes${ctx.replicateCount ? ` (n = ${ctx.replicateCount} per condition)` : ""}`
      : ctx.includeReplicates === "no"
        ? "Replicates: no - single run per condition (n = 1)"
        : "",
    cs?.material ? `Material available: ${cs.material}` : "",
    cs?.time ? `Time constraint: ${cs.time}` : "",
    cs?.equipment ? `Equipment available: ${cs.equipment}` : "",
    vs?.known ? `Known variables: ${vs.known}` : "",
    vs?.unknown ? `Unknown variables: ${vs.unknown}` : "",
    ctx.additionalDetails
      ? `Operating parameters the researcher supplied: ${ctx.additionalDetails}`
      : ""
  ]
    .filter(Boolean)
    .join("\n")

  const aim =
    checkpoint === "problem"
      ? "Your questions FINE-TUNE a LITERATURE SEARCH so it surfaces the primary research most relevant to THIS problem statement and the stated objective. Anchor EVERY question on the PROBLEM + OBJECTIVE the researcher gave — sharpen the SAME direction, do not widen it. Capture only what changes WHICH papers get found: (a) the specific target system/molecule/material in play; (b) the mechanism or methodological approach family the objective implies (e.g. which formulation route, which assay family, which stabilization strategy); (c) the primary readout/endpoint that marks progress toward the objective.\n\nRULES SPECIFIC TO SEARCH TUNING:\n- STAY ON the problem + objective. Do NOT ask about downstream design trade-offs — secondary properties that must not be affected, 'what else shouldn't be impacted', instruments, run counts, statistics, material budgets. Those belong to the DESIGN stage, not the search. Asking them here dilutes the search and hurts result quality.\n- Every answer is a STEERING SIGNAL, not a hard filter. Numeric values (concentrations, ranges) guide direction only; the literature agent must still surface strong methodologically-relevant adjacent work. Frame options as 'best represents your system', never 'only'.\n- Prefer questions whose answers change the KIND of paper found (system, mechanism family, approach, readout) over minor numeric details."
      : checkpoint === "hypothesis"
        ? "Your questions give the hypothesis agent a CLEAR DIRECTION so it can propose sharp, testable hypotheses and the downstream design is effective. The user is building THEIR OWN hypothesis here, so think like a senior bench scientist helping a colleague sharpen it into something concrete and runnable. Draw on the SELECTED PAPERS. Crucially: do NOT ask paper-by-paper 'based on paper X, take approach Y' one at a time. Instead, offer questions whose OPTIONS are sensible COMBINATIONAL approaches synthesized ACROSS the selected literature (e.g. 'Combine the pH-stabilization finding from [A] with the excipient screen from [B]'), and let the user pick MULTIPLE. Cover: the mechanism/direction of effect to pursue, which cross-paper approach combination to build on, the WORKING CONCENTRATION(S) of the molecule and the operating condition(s) the hypothesis assumes (ALWAYS ask this — the hypothesis and the downstream design both hinge on it), the PRIMARY READOUT that would measure the effect, the comparison/baseline, the expected magnitude or threshold, and what would falsify it. Keep it about scientific direction and the quantities the hypothesis commits to — leave the full prep/reagent/plate-layout detail to the design stage."
        : `Your questions make the EXPERIMENTAL DESIGN concrete and runnable for THIS lab. You are planning it step by step like a senior scientist so the user can follow your output as a bench protocol without confusion.

ASK ABOUT MATERIAL AVAILABILITY FIRST — how much material the researcher actually has on hand — because run count, working concentrations, and replication all follow from it. Make it the first question, and ASK IN THE UNITS THAT FIT THIS KIND OF STUDY:
- purified protein / small molecule / formulation work → mass (mg / g) AND the stock concentration (e.g. mg/mL)
- cell-based assays → number of vials/flasks, cell count (e.g. ×10^6 cells), passage number, plate format
- tissue/animal work → number of samples/animals, tissue mass
- nucleic acid work → µg of DNA/RNA and ng/µL concentration
Pick the units that match the domain/phase and the chosen hypothesis; never ask for "mg" of a cell line.

ASK SEPARATELY (its own question, not bundled into the one above) for the STOCK CONCENTRATION(S) of what they have (the as-supplied/as-stored concentration) — this is what the dilution and volume calculations key off. Frame it so free text is natural (e.g. "e.g. 50 mg/mL in 20 mM histidine, pH 5.5").

THEN cover, thinking like a senior bench scientist who has to PREP, CALCULATE, and SET UP this experiment tomorrow morning — every answer must be something you'd need before you could pipette:
- MAIN MOLECULE: how much is on hand, at what working concentration(s) the experiment runs, and the stock it's diluted from (already asked above — carry it through).
- NUMBER OF CONDITIONS and NUMBER OF REPLICATES the researcher wants (technical vs biological), since these set the plate/tube count and total material draw. The REPLICATES question must ALWAYS include a no-replicate option as its first choice - "1 per condition (no replicates)" - because a single run per condition is a legitimate and common choice for a first screen, and forcing a replicate count wastes material the researcher may not have.
- OTHER CHEMICALS / REAGENTS / CONSUMABLES the experiment needs — buffers, diluents, excipients, stains, standards, kits, cell media, plates/tubes — what they already have vs must order, and at what grade/concentration. Do not assume; ask what's in the bench inventory.
- READOUT(S): the exact measurement(s) that answer the hypothesis (e.g. absorbance at X nm, fluorescence channel, %monomer by SEC, Ct, viability %), the instrument that produces each, and its key settings.
- CONTROLS / BLANKS / REFERENCE STANDARDS, and the comparison/baseline each condition is scored against.
- SUCCESS CRITERIA - the numeric result that counts as a win (e.g. "viscosity < 20 cP at 150 mg/mL", "recovery > 95%"). ALWAYS ask this if the researcher has not already stated one: it is the target the design is optimised against and the simulation is scored against, so without it the whole design is aimless. Offer concrete thresholds for THIS system as options.
- how much material must remain AFTER the first study (so later design iterations stay feasible), instruments/equipment actually available, number of runs feasible, the intended statistical approach (test + power/replication), any secondary properties that must NOT be degraded, time constraints, and any other constraints.

GO DEEPER WHERE IT MAKES THE PROTOCOL EXECUTABLE. The bar is: someone who has never seen this project should be able to read the FINAL design and run it end-to-end without asking a question. Do not hold back on question count if the extra answer removes a real ambiguity in the prep or the calculations — ask what you need to get the dilution series, volumes, buffer/diluent, controls/blanks, replicate structure, plate/tube layout, incubation time+temperature, and readout instrument settings right. Every question must earn its place by changing a number, a reagent, or a step in the final protocol. Where the design legitimately supports several choices at once (multiple instruments, multiple readouts, multiple stressors), let the user select multiple.`

  const system = `You are a sharp, senior experimental-design reviewer (think rigorous PI in a group meeting). ${aim}

Rules:
- ONE ASK PER QUESTION. This is the most important rule. A question must request exactly ONE piece of information. NEVER bundle several parameters into one prompt - "How much material do you have, at what stock concentration, and how many conditions do you want?" is THREE questions and is unanswerable as one. If a prompt contains "and", "as well as", or more than one question mark, split it.
- Ask ONLY the highest-value questions - the ones whose answers most change the outcome. Quality over quantity.
- Each question is multiple-choice with 2–6 CONCRETE, domain-appropriate options (real values/levels/approaches, not vague labels). A free-text box is ALWAYS shown under the options, so don't add an "Other" option yourself.
- OPTIONS MUST BE SPECIFIC AND SUBSTANTIVE. Give real, pickable values for THIS system - actual concentrations with units, named buffers/excipients, named instruments, concrete counts. Generic filler ("Low / Medium / High", "Standard", "Typical", "Not sure", "Other", "Varies", "Depends") is FORBIDDEN as an option.
- QUANTITY QUESTIONS TAKE AN EXACT NUMBER, NOT A RANGE. For "how much material do you have", "what stock concentration is it at", "what working concentration", "how many runs" and the like, the researcher knows the exact figure - asking them to pick a wide bracket throws that precision away and the calculations inherit the error. For these, offer the STANDARD discrete values a lab actually stocks for this kind of molecule (e.g. "10 mg/mL", "50 mg/mL", "100 mg/mL", "150 mg/mL"), plus a bounding option where genuinely useful ("< 10 mg/mL", "> 150 mg/mL"), and say in the prompt that they should type the exact figure in the box if it isn't listed. Never offer wide brackets like "50-150 mg/mL" for a quantity the researcher can simply state.
- Give the FULL set of plausible answers, not two token choices: when the realistic answer space has 4-6 sensible values, list 4-6. Only drop to 2-3 options when the choice really is binary or ternary.
- FREE TEXT IS AUTHORITATIVE: the user may pick option(s) AND type extra context in the box. Downstream agents are told to honor BOTH — so phrase options so they compose cleanly with added free text, never as mutually exclusive when they needn't be.
- kind = "single" ONLY when exactly one answer can physically apply (e.g. one primary readout). Use kind = "multi" for anything a researcher might combine: study approaches, mechanisms, cross-paper approach combinations, instruments/equipment, stressors, assay formats, endpoint panels, controls. When in doubt, default to "multi".
- Be specific to THIS problem${checkpoint === "design" ? " and the chosen hypothesis" : checkpoint === "hypothesis" ? " and the selected literature" : ""} - reference the actual system, not generic placeholders.
- ${
    round > 1
      ? "This is a follow-up round: ask ONLY questions still genuinely needed to remove ambiguity after the prior answers. If nothing material remains, return done=true with an empty questions array."
      : `MANDATORY: return BETWEEN 6 AND 8 questions, each a SINGLE ask, and done=false. Returning zero questions on this first round is NOT an acceptable answer and never will be - there is always something worth sharpening, and the researcher has explicitly asked to be questioned. If you believe the inputs already cover everything, you have not looked hard enough: go after the values the protocol will silently invent otherwise (exact stock concentrations, the diluent and its pH, per-sample volumes, incubation time AND temperature, instrument settings, the blank/reference each reading is zeroed against, acceptance thresholds). Every question must earn its place by changing a number, a reagent, or a step in the final protocol.

DEPTH BAR (the researcher said the questions were "good but not complete" - shallow questions are the failure mode here). A question is too shallow if a competent scientist could answer it and STILL leave the protocol ambiguous. Push one level past the obvious:
  - Not "what readout?" but "what instrument setting / wavelength / channel, and what is it blanked against?"
  - Not "what buffer?" but "which diluent, at what pH and ionic strength, and is it the same one the stock is stored in?"
  - Not "how long?" but "how long at what temperature, and with or without agitation?"
  - Not "how much material?" but "how much, at what stock concentration, and how much must be left over for a follow-up run?"
COVERAGE: across your set, do not leave a whole category untouched when it is undetermined. Sweep quantities/stocks, the diluent and prep, the condition/replicate structure, the readouts and their instrument settings, the controls and baselines, and the acceptance threshold - and ask about the ones this study actually leaves open.`
  }
- This is a BENCH / wet-lab program ONLY. NEVER ask whether the work is computational vs bench, in-silico vs experimental, or dry-lab vs wet-lab — always assume bench.
- Never ask for information already provided. Everything listed above came
  FROM the researcher - re-asking any of it (their success criteria, replicate
  choice, material/time/equipment constraints, known/unknown variables, or the
  operating parameters they typed) makes the tool look like it wasn't
  listening. Read what's there, then ask only about what is genuinely still
  missing. If a supplied value is ambiguous, ask to SHARPEN that specific value
  rather than asking the question from scratch. This rule exists to remove
  DUPLICATION - it is not a licence to return an empty set. A study is never
  fully specified; find the gaps that remain.
- Because the gaps differ from study to study, your questions should differ
  too. Do not work through a fixed checklist - derive them from what THIS
  problem, hypothesis and set of supplied values actually leave undetermined.`

  const user = `${problemBlock}${
    hypothesis ? `\n\nChosen hypothesis: ${hypothesis}` : ""
  }${literature ? `\n\nLiterature context: ${literature}` : ""}${priorBlock(
    priorAnswers
  )}\n\nReturn the clarifying questions as structured JSON.`

  const ask = async (nudge?: string) => {
    const completion = await openai().beta.chat.completions.parse({
      model: MODEL(),
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: nudge ? `${user}\n\n${nudge}` : user }
      ],
      response_format: zodResponseFormat(questionSchema, "clarify")
    })
    const parsed = completion.choices[0]?.message?.parsed
    if (!parsed) return null
    return {
      done: parsed.done,
      questions: parsed.questions.map(q => ({
        id: rid(),
        prompt: q.prompt,
        kind: q.kind,
        options: q.options,
        rationale: q.rationale
      }))
    }
  }

  // The researcher reported the flow asking NOTHING. Two distinct causes produced
  // the identical empty result, and both were being swallowed: the model choosing
  // done=true because the inputs looked complete, and the call throwing. On the
  // first round an empty set is never the right answer, so retry with an explicit
  // nudge - and surface a genuine failure as an error rather than as silence.
  try {
    let result = await ask()
    if (round === 1 && (!result || result.questions.length === 0)) {
      console.warn("[clarify] round 1 returned no questions - retrying")
      result = await ask(
        "Your previous attempt returned no questions. That is not acceptable for the first round. Return 6-8 concrete, single-ask questions targeting the values this study still leaves undetermined - stock concentrations, diluent and pH, per-sample volumes, incubation time and temperature, instrument settings, controls/blanks, and the acceptance threshold. done must be false."
      )
    }
    if (!result) throw new Error("Model returned no parsed output")
    // Never let the caller advance thinking there was nothing to ask when the
    // set came back empty on round 1.
    return {
      done: round === 1 && result.questions.length > 0 ? false : result.done,
      questions: result.questions
    }
  } catch (e) {
    console.error("[clarify] generation failed", e)
    throw e
  }
}
