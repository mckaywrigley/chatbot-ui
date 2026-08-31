import { Fragment, type ReactElement, type ReactNode } from "react"
import {
  Context,
  Instructions,
  Constraints,
  Formatting,
  Output,
  Data,
  Documents,
  Document,
  Findings,
  Summary,
  Analysis,
  Result,
  Task,
  prompt
} from "react-prompt-kit"

import { designAgentPromptSchemas } from "@/lib/design/prompt-schemas"
import {
  conditionsTableToMarkdown,
  masterMixToMarkdown,
  procedureStepsToMarkdown,
  reagentsToMarkdown,
  workingSolutionsToMarkdown
} from "@/lib/design/render-structured"
import {
  AgentPromptOverrides,
  DesignAgentPromptId,
  PromptSectionOverrides,
  PromptSectionType
} from "@/types/design-prompts"

import { ExperimentDesignState, Domain, Phase } from "../types"

type SectionOverride = PromptSectionOverrides | undefined

const sectionComponentMap: Record<
  PromptSectionType,
  (props: { children: ReactNode }) => ReactElement
> = {
  context: Context,
  instructions: Instructions,
  constraints: Constraints,
  formatting: Formatting,
  output: Output
}

const defaultSectionComponent = Context

const sourceLabels: Record<string, string> = {
  pubmed: "PubMed",
  arxiv: "ArXiv",
  semanticScholar: "Semantic Scholar",
  scholar: "Google Scholar",
  tavily: "Recent Web",
  openalex: "OpenAlex"
}

const domainLabels: Record<Domain, string> = {
  formulation_development: "Formulation development",
  discovery_biology: "Discovery biology / target identification",
  molecular_biology: "Molecular biology / genomics",
  protein_expression: "Protein expression and purification",
  cell_culture: "Cell culture / upstream",
  fermentation: "Fermentation / bioprocess",
  analytics_qc: "Analytics / QC"
}

const phaseLabels: Record<Phase, string> = {
  screening: "Screening",
  optimization: "Optimization",
  robustness: "Robustness",
  scale_up: "Scale-up",
  validation: "Validation"
}

const getSectionValue = (
  sectionId: string,
  overrides: SectionOverride,
  fallback: string
) => {
  const value = overrides?.sections?.[sectionId]
  return value && value.trim().length > 0 ? value : fallback
}

const buildEditableSections = (
  agentId: DesignAgentPromptId,
  overrides: SectionOverride
) => {
  const schema = designAgentPromptSchemas[agentId]
  return schema.sections.map(section => {
    const value = getSectionValue(section.id, overrides, section.defaultValue)
    const Component =
      sectionComponentMap[section.type] || defaultSectionComponent
    return (
      <Component key={`${agentId}-${section.id}`}>
        <p>{value}</p>
      </Component>
    )
  })
}

const renderList = (label: string, items?: string[]) => {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <>
      <p>{label}:</p>
      <ul>
        {items.map((item, index) => (
          <li key={`${label}-${index}`}>{item}</li>
        ))}
      </ul>
    </>
  )
}

const renderPlanContext = (state: ExperimentDesignState) => {
  const domainLabel = state.domain
    ? domainLabels[state.domain]
    : "(not specified)"
  const phaseLabel = state.phase ? phaseLabels[state.phase] : "(not specified)"
  const material = state.constraints?.material?.trim()
  const time = state.constraints?.time?.trim()
  const equipment = state.constraints?.equipment?.trim()
  const hasAnyConstraint = Boolean(material || time || equipment)

  return (
    <Data>
      <Task>
        <p>Research Problem: {state.problem || "Not specified"}</p>
      </Task>
      <p>Domain: {domainLabel}</p>
      <p>Phase: {phaseLabel}</p>
      {renderList("Objectives", state.objectives)}
      {renderList("Known variables", state.variables?.known)}
      {renderList("Unknown variables", state.variables?.unknown)}
      {hasAnyConstraint && (
        <>
          <p>Constraints:</p>
          <ul>
            {material && (
              <li>
                Material: {material}
                <br />
                <em>
                  Any &quot;max runs / conditions&quot; figure above is the
                  TOTAL including replicate conditions. Do not propose more
                  distinct × replicate combinations than this total.
                </em>
              </li>
            )}
            {time && <li>Time: {time}</li>}
            {equipment && <li>Equipment: {equipment}</li>}
          </ul>
        </>
      )}
      {renderList("Additional considerations", state.specialConsiderations)}
    </Data>
  )
}

const renderLiteratureSummary = (
  state: ExperimentDesignState,
  options?: { includeCitations?: boolean }
) => {
  if (!state.literatureScoutOutput) {
    return null
  }

  const output = state.literatureScoutOutput
  return (
    <Findings>
      <p>What Others Have Done:</p>
      <p>{output.whatOthersHaveDone}</p>
      <p>Good Methods and Tools:</p>
      <p>{output.goodMethodsAndTools}</p>
      <p>Potential Pitfalls:</p>
      <p>{output.potentialPitfalls}</p>
      {options?.includeCitations && output.citations?.length > 0 && (
        <>
          <p>Citations:</p>
          <ul>
            {output.citations.map((citation, index) => (
              <li key={`citation-${index}`}>{citation}</li>
            ))}
          </ul>
        </>
      )}
    </Findings>
  )
}

const renderHypothesisData = (state: ExperimentDesignState) => {
  if (!state.hypothesisBuilderOutput) {
    return null
  }
  return (
    <Summary>
      <p>Hypothesis: {state.hypothesisBuilderOutput.hypothesis}</p>
      {state.hypothesisBuilderOutput.explanation && (
        <p>Explanation: {state.hypothesisBuilderOutput.explanation}</p>
      )}
    </Summary>
  )
}

const renderExperimentDesignData = (state: ExperimentDesignState) => {
  const designerOutput = state.experimentDesignerOutput
  if (!designerOutput) {
    return null
  }

  const design = designerOutput.experimentDesign

  return (
    <Result>
      <p>Experiment Design Summary:</p>
      <p>{designerOutput.designSummary}</p>
      <p>Design Components:</p>
      <ul>
        <li>What Will Be Tested: {design.whatWillBeTested}</li>
        <li>What Will Be Measured: {design.whatWillBeMeasured}</li>
        <li>Control Groups: {design.controlGroups}</li>
        <li>Experimental Groups: {design.experimentalGroups}</li>
        <li>Sample Types: {design.sampleTypes}</li>
        <li>Tools Needed: {design.toolsNeeded}</li>
        <li>Replicates & Conditions: {design.replicatesAndConditions}</li>
        <li>Specific Requirements: {design.specificRequirements}</li>
      </ul>
      <p>Conditions Table (markdown):</p>
      <p>{conditionsTableToMarkdown(designerOutput.conditionsTable)}</p>
      <p>Experimental Groups Overview:</p>
      <p>{designerOutput.experimentalGroupsOverview}</p>
      <p>Statistical Rationale:</p>
      <p>{designerOutput.statisticalRationale}</p>
      <p>Critical Technical Requirements:</p>
      <p>{designerOutput.criticalTechnicalRequirements}</p>
      <p>Handoff Note for Planner:</p>
      <p>{designerOutput.handoffNoteForPlanner}</p>
      {designerOutput.rationale && (
        <p>Designer Rationale: {designerOutput.rationale}</p>
      )}
    </Result>
  )
}

const renderStatCheckData = (state: ExperimentDesignState) => {
  if (!state.statCheckOutput) {
    return null
  }

  const review = state.statCheckOutput
  return (
    <Analysis>
      <p>What Looks Good:</p>
      <p>{review.whatLooksGood}</p>
      {review.problemsOrRisks?.length > 0 && (
        <>
          <p>Problems or Risks:</p>
          <ul>
            {review.problemsOrRisks.map((risk, index) => (
              <li key={`risk-${index}`}>{risk}</li>
            ))}
          </ul>
        </>
      )}
      {review.suggestedImprovements?.length > 0 && (
        <>
          <p>Suggested Improvements:</p>
          <ul>
            {review.suggestedImprovements.map((tip, index) => (
              <li key={`tip-${index}`}>{tip}</li>
            ))}
          </ul>
        </>
      )}
      {review.correctedDesign && (
        <>
          <p>
            Corrected Design (use this as the current design going forward):
          </p>
          <p>{review.correctedDesign}</p>
        </>
      )}
      {review.changeLog?.length > 0 && (
        <>
          <p>Change Log:</p>
          <ul>
            {review.changeLog.map((entry, index) => (
              <li key={`change-${index}`}>{entry}</li>
            ))}
          </ul>
        </>
      )}
      {review.improvementRationale && (
        <>
          <p>Improvement Rationale:</p>
          <p>{review.improvementRationale}</p>
        </>
      )}
      {review.overallAssessment && (
        <p>Overall Assessment: {review.overallAssessment}</p>
      )}
      {review.finalAssessment && (
        <p>Final Assessment: {review.finalAssessment}</p>
      )}
    </Analysis>
  )
}

const renderPlannerData = (state: ExperimentDesignState) => {
  const planner = state.plannerOutput
  if (!planner) return null

  return (
    <Result>
      <p>Planner Output:</p>
      <ul>
        <li>Feasibility Check: {planner.feasibilityCheck}</li>
        <li>Summary of Totals: {planner.summaryOfTotals}</li>
        <li>Materials Checklist: {planner.materialsChecklist}</li>
        <li>Stock Solution Preparation: {planner.stockSolutionPreparation}</li>
        <li>Tube & Label Planning: {planner.tubeAndLabelPlanning}</li>
        <li>Consumable Prep & QC: {planner.consumablePrepAndQC}</li>
        <li>Study Layout: {planner.studyLayout}</li>
        <li>Prep Schedule: {planner.prepSchedule}</li>
        <li>Kit Pack List: {planner.kitPackList}</li>
        <li>Critical Error Points: {planner.criticalErrorPoints}</li>
        <li>
          Material Optimization Summary: {planner.materialOptimizationSummary}
        </li>
        <li>
          Assumptions & Confirmations: {planner.assumptionsAndConfirmations}
        </li>
      </ul>
      <p>Reagents & Buffers (structured):</p>
      <pre>{reagentsToMarkdown(planner.reagents)}</pre>
      <p>Master Mix (structured):</p>
      <pre>{masterMixToMarkdown(planner.masterMix)}</pre>
      <p>Working Solutions (structured):</p>
      <pre>{workingSolutionsToMarkdown(planner.workingSolutions)}</pre>
    </Result>
  )
}

const renderProcedureData = (state: ExperimentDesignState) => {
  const procedure = state.procedureOutput
  if (!procedure) return null

  return (
    <Result>
      <p>Procedure (SOP):</p>
      <ul>
        <li>Pre-run Checklist: {procedure.preRunChecklist}</li>
        <li>Bench Setup & Safety: {procedure.benchSetupAndSafety}</li>
        <li>Sample Labeling & ID Scheme: {procedure.sampleLabelingIdScheme}</li>
        <li>
          Instrument Setup & Calibration: {procedure.instrumentSetupCalibration}
        </li>
        <li>Critical Handling Rules: {procedure.criticalHandlingRules}</li>
        <li>
          Data Recording & Processing: {procedure.dataRecordingProcessing}
        </li>
        <li>Acceptance Criteria: {procedure.acceptanceCriteria}</li>
        <li>Troubleshooting Guide: {procedure.troubleshootingGuide}</li>
        <li>Run Log Template: {procedure.runLogTemplate}</li>
        <li>Cleanup & Disposal: {procedure.cleanupDisposal}</li>
        <li>Data Handoff: {procedure.dataHandoff}</li>
      </ul>
      <p>Sample Preparation Steps:</p>
      <pre>{procedureStepsToMarkdown(procedure.samplePreparation)}</pre>
      <p>Measurement Steps:</p>
      <pre>{procedureStepsToMarkdown(procedure.measurementSteps)}</pre>
      <p>Experimental Condition Execution Steps:</p>
      <pre>
        {procedureStepsToMarkdown(procedure.experimentalConditionExecution)}
      </pre>
    </Result>
  )
}

const renderSearchDocuments = (searchResults: any) => {
  if (!searchResults || !searchResults.sources) {
    return null
  }

  const sourceOrder = [
    "pubmed",
    "arxiv",
    "semanticScholar",
    "openalex",
    "scholar",
    "tavily"
  ]

  const sections = sourceOrder
    .map(source => {
      const items = searchResults.sources[source] || []
      if (!items.length) {
        return null
      }
      return (
        <Document key={source}>
          <p>
            {sourceLabels[source] || source} ({items.length} results)
          </p>
          <ul>
            {items.slice(0, 3).map((paper: any, index: number) => (
              <li key={`${source}-${index}`}>
                {`${index + 1}. ${paper.title || "Untitled"}`}
                {paper.authors?.length
                  ? ` | Authors: ${paper.authors.join(", ")}`
                  : ""}
                {paper.journal ? ` | Journal: ${paper.journal}` : ""}
                {paper.publishedDate ? ` | Year: ${paper.publishedDate}` : ""}
                {paper.url ? ` | URL: ${paper.url}` : ""}
                {paper.abstract
                  ? ` | Abstract: ${paper.abstract.substring(0, 200)}...`
                  : ""}
              </li>
            ))}
          </ul>
        </Document>
      )
    })
    .filter(Boolean)

  // Zero-paper path: previously this returned `null`, which left the LLM
  // with no context about why - so it cheerfully invented 4 fake papers
  // (observed 2026-05-18 when Vespa 403'd inside PaperFinder). Now we
  // emit an explicit "0 papers, do NOT invent citations" block so the
  // model knows the search ran and came back empty, and we tell it
  // exactly which queries were tried so its `whatOthersHaveDone`
  // narrative can describe the gap honestly.
  if (sections.length === 0) {
    const status = searchResults.searchMetrics?.searchStatus
    const queries: string[] = Array.isArray(
      searchResults.searchMetrics?.queryOptimization
    )
      ? searchResults.searchMetrics.queryOptimization
      : []
    const upstreamFailed = status?.mode === "upstream_unreachable"
    return (
      <Documents>
        <Document>
          <p>
            <strong>⚠ Paper search returned ZERO results.</strong>
          </p>
          <p>
            {upstreamFailed
              ? `The upstream paper-finding service was unreachable (${status?.roundsServerError ?? "?"}/${status?.roundsAttempted ?? "?"} rounds returned 5xx errors${status?.lastServerError ? `; last error: ${String(status.lastServerError).slice(0, 200)}` : ""}).`
              : `Searches ran successfully but matched zero papers in the indexed corpus.`}
          </p>
          {queries.length > 0 && (
            <>
              <p>Queries attempted ({queries.length}):</p>
              <ul>
                {queries.map((q: string, i: number) => (
                  <li key={`q-${i}`}>{q}</li>
                ))}
              </ul>
            </>
          )}
          <p>
            <strong>MANDATORY behaviour given zero results:</strong>
          </p>
          <ul>
            <li>
              Set <code>citations</code> to an empty array <code>[]</code>. Do
              NOT invent or guess any citations. Do NOT cite papers from general
              knowledge - this output is shown to a scientist and fabricated
              references break trust irrecoverably.
            </li>
            <li>
              In <code>whatOthersHaveDone</code>, state explicitly that the
              literature search returned no results, list the queries that were
              tried (above), and{" "}
              {upstreamFailed
                ? "note that the paper search service appears to be temporarily unreachable so the user should retry shortly"
                : "suggest that the user broaden the problem statement, add more domain keywords, or upload PDFs manually"}
              .
            </li>
            <li>
              In <code>goodMethodsAndTools</code> and{" "}
              <code>potentialPitfalls</code>, you may share general domain-level
              guidance from your training, but do NOT attribute it to any
              specific paper.
            </li>
          </ul>
        </Document>
      </Documents>
    )
  }

  return (
    <Documents>
      <Document>
        <p>
          Total Papers Found: {searchResults.totalResults || sections.length}
        </p>
      </Document>
      {sections}
    </Documents>
  )
}

const buildSystemPrompt = (
  agentId: DesignAgentPromptId,
  overrides: SectionOverride,
  ...extra: Array<ReactNode | null>
) => {
  const editableSections = buildEditableSections(agentId, overrides)
  const additionalSections = extra.filter((section): section is ReactNode =>
    Boolean(section)
  )
  return prompt(
    <>
      {editableSections}
      {additionalSections.map((section, index) => (
        <Fragment key={`${agentId}-extra-${index}`}>{section}</Fragment>
      ))}
    </>
  )
}

export const getAgentUserPrompt = (
  agentId: DesignAgentPromptId,
  overrides?: PromptSectionOverrides
) => {
  const schema = designAgentPromptSchemas[agentId]
  const override = overrides?.userPrompt?.trim()
  if (override) {
    return override
  }
  return schema.userPrompt?.defaultValue || ""
}

export const createLiteratureScoutPrompt = (
  state: ExperimentDesignState,
  searchResults: any,
  overrides?: AgentPromptOverrides["literatureScout"]
): string => {
  return buildSystemPrompt(
    "literatureScout",
    overrides,
    renderPlanContext(state),
    renderSearchDocuments(searchResults)
  )
}

export const createHypothesisBuilderPrompt = (
  state: ExperimentDesignState
): string => {
  const knownVars = state.variables?.known?.join("; ") || ""
  const unknownVars = state.variables?.unknown?.join("; ") || ""
  const constraintsParts = [
    state.constraints?.material &&
      `Material: ${state.constraints.material} ` +
        `(Any "max runs / conditions" figure here is the TOTAL including all replicate conditions. ` +
        `Do not propose more distinct × replicate combinations than this total.)`,
    state.constraints?.time && `Time: ${state.constraints.time}`,
    state.constraints?.equipment && `Equipment: ${state.constraints.equipment}`
  ].filter(Boolean)

  return `You are **Hypothesis Builder**, a senior scientific reasoning agent.

Your mission is to generate high-quality, testable research hypotheses based strictly on:
- The research problem
- The research objective
- Defined variables and constraints
- Synthesized insights from the Literature Scout Agent

IMPORTANT: This system uses structured JSON output. You must return a JSON object matching:
{ "hypothesis": string, "explanation": string }
Return exactly ONE best hypothesis in \`hypothesis\` (do not return a list), and a brief justification in \`explanation\`.

<Inputs>
Research problem: ${state.problem}
Domain: ${state.domain || "(not specified)"}
Phase: ${state.phase || "(not specified)"}
Research objective(s): ${state.objectives.join("; ") || "(not specified)"}
Known variables: ${knownVars || "(not specified)"}
Unknown variables: ${unknownVars || "(not specified)"}
Constraints: ${constraintsParts.join(" | ") || "(not specified)"}
Additional considerations: ${state.specialConsiderations.join("; ") || "(not specified)"}
Literature Scout summary:
${
  state.literatureScoutOutput
    ? `Key scientific findings (mapped): ${state.literatureScoutOutput.whatOthersHaveDone}
Relevant methods/strategies/tools (mapped): ${state.literatureScoutOutput.goodMethodsAndTools}
Pitfalls/watch-outs (mapped): ${state.literatureScoutOutput.potentialPitfalls}`
    : "(not available)"
}
</Inputs>

<Instructions>
- Produce a specific, testable hypothesis that combines two or more experimental dimensions when possible (e.g., multiple variables, conditions, or interacting factors) while staying coherent.
- Define (implicitly or explicitly) the independent variables and the dependent outcome(s), and ensure constraints are respected.
- Avoid single-variable or vague hypotheses; avoid speculation beyond the provided literature summary.
- If key details are missing, state what clarification is needed in \`explanation\` instead of guessing.
</Instructions>

<Tone and style>
- Confident, senior-scientist tone
- Precise and technical, but readable
- No filler
</Tone and style>`
}

export const createExperimentDesignerPrompt = (
  state: ExperimentDesignState,
  overrides?: AgentPromptOverrides["experimentDesigner"]
): string => {
  return buildSystemPrompt(
    "experimentDesigner",
    overrides,
    renderPlanContext(state),
    renderLiteratureSummary(state),
    renderHypothesisData(state)
  )
}

export const createStatCheckPrompt = (
  state: ExperimentDesignState,
  overrides?: AgentPromptOverrides["statCheck"]
): string => {
  return buildSystemPrompt(
    "statCheck",
    overrides,
    renderPlanContext(state),
    renderLiteratureSummary(state),
    renderHypothesisData(state),
    renderExperimentDesignData(state)
  )
}

export const createPlannerPrompt = (
  state: ExperimentDesignState,
  overrides?: AgentPromptOverrides["planner"]
): string => {
  return buildSystemPrompt(
    "planner",
    overrides,
    renderPlanContext(state),
    renderHypothesisData(state),
    renderExperimentDesignData(state),
    renderStatCheckData(state)
  )
}

export const createProcedurePrompt = (
  state: ExperimentDesignState,
  overrides?: AgentPromptOverrides["procedure"]
): string => {
  return buildSystemPrompt(
    "procedure",
    overrides,
    renderPlanContext(state),
    renderHypothesisData(state),
    renderExperimentDesignData(state),
    renderStatCheckData(state),
    renderPlannerData(state)
  )
}

export const createReportWriterPrompt = (
  state: ExperimentDesignState,
  overrides?: AgentPromptOverrides["reportWriter"]
): string => {
  return buildSystemPrompt(
    "reportWriter",
    overrides,
    renderPlanContext(state),
    renderLiteratureSummary(state, { includeCitations: true }),
    renderHypothesisData(state),
    renderExperimentDesignData(state),
    renderStatCheckData(state),
    renderPlannerData(state),
    renderProcedureData(state)
  )
}
