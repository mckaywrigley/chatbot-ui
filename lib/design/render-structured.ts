import type {
  ConditionsTable,
  MasterMixPlan,
  PlannerOutput,
  ProcedureOutput,
  ProcedureStep,
  ReagentPreparation,
  WorkingSolutionRow
} from "@/app/api/design/draft/types"

const asCell = (value: string | number | undefined | null) => {
  if (value === undefined || value === null) return "-"
  const str = String(value).trim()
  return str.length > 0 ? str : "-"
}

export const reagentToMarkdown = (reagent: ReagentPreparation): string => {
  const header = `### ${reagent.name} - ${reagent.role}`
  const rows: string[] = []
  if (reagent.molecularWeightGPerMol !== undefined) {
    rows.push(`- MW: ${reagent.molecularWeightGPerMol} g/mol`)
  }
  rows.push(`- Target concentration: ${reagent.targetConcentration}`)
  rows.push(`- Target volume: ${reagent.targetVolume}`)
  if (reagent.massToWeigh) rows.push(`- Mass to weigh: ${reagent.massToWeigh}`)
  if (reagent.volumeToPipette)
    rows.push(`- Volume to pipette: ${reagent.volumeToPipette}`)
  if (reagent.dilutionFromStock)
    rows.push(`- Dilution from stock: ${reagent.dilutionFromStock}`)
  rows.push(`- Diluent: ${reagent.diluent}`)
  if (reagent.pHAdjustment)
    rows.push(`- pH adjustment: ${reagent.pHAdjustment}`)
  rows.push(`- Storage: ${reagent.storage}`)
  if (reagent.notes) rows.push(`- Notes: ${reagent.notes}`)
  return [header, ...rows].join("\n")
}

export const reagentsToMarkdown = (reagents: ReagentPreparation[]): string => {
  if (!reagents?.length) return "_No reagents specified._"
  return reagents.map(reagentToMarkdown).join("\n\n")
}

export const conditionsTableToMarkdown = (table: ConditionsTable): string => {
  if (!table?.headers?.length || !table?.rows?.length) {
    return "_No conditions specified._"
  }
  const header = `| ${table.headers.map(asCell).join(" | ")} |`
  const sep = `| ${table.headers.map(() => "---").join(" | ")} |`
  const body = table.rows.map(row => {
    const cells = table.headers.map((_, i) => asCell(row[i]))
    return `| ${cells.join(" | ")} |`
  })
  return [header, sep, ...body].join("\n")
}

export const masterMixToMarkdown = (plan: MasterMixPlan): string => {
  if (!plan?.components?.length) return "_No master mix plan specified._"
  const header =
    "| Component | Per-reaction (µL) | N reactions (incl. excess) | Total (µL) |"
  const sep = "| --- | ---: | ---: | ---: |"
  const rows = plan.components.map(
    c =>
      `| ${asCell(c.name)} | ${asCell(c.perReactionVolumeUl)} | ${asCell(c.nReactions)} | ${asCell(c.totalVolumeUl)} |`
  )
  const totals = [
    "",
    `**Total per reaction:** ${plan.totalPerReactionUl} µL`,
    `**Total batch:** ${plan.totalBatchUl} µL`
  ]
  const mixing = plan.mixingOrder?.length
    ? [
        "",
        "**Mixing order:**",
        ...plan.mixingOrder.map((s, i) => `${i + 1}. ${s}`)
      ]
    : []
  const notes =
    plan.notes && plan.notes.trim().length > 0 ? ["", `_${plan.notes}_`] : []
  return [header, sep, ...rows, ...totals, ...mixing, ...notes].join("\n")
}

export const workingSolutionsToMarkdown = (
  rows: WorkingSolutionRow[]
): string => {
  if (!rows?.length) return "_No working solutions specified._"
  const header =
    "| Condition ID | Target conc. | Stock used | V_stock (µL) | V_diluent (µL) | V_final (µL) | Notes |"
  const sep = "| --- | --- | --- | ---: | ---: | ---: | --- |"
  const body = rows.map(
    r =>
      `| ${asCell(r.conditionId)} | ${asCell(r.targetConcentration)} | ${asCell(r.stockUsed)} | ${asCell(r.stockVolumeUl)} | ${asCell(r.diluentVolumeUl)} | ${asCell(r.finalVolumeUl)} | ${asCell(r.notes)} |`
  )
  return [header, sep, ...body].join("\n")
}

export const procedureStepToMarkdown = (step: ProcedureStep): string => {
  const meta: string[] = []
  if (step.volume) meta.push(`Volume: ${step.volume}`)
  if (step.temperature) meta.push(`Temp: ${step.temperature}`)
  if (step.duration) meta.push(`Time: ${step.duration}`)
  if (step.mixing) meta.push(`Mix: ${step.mixing}`)
  if (step.instrument) meta.push(`Instrument: ${step.instrument}`)
  const tail = meta.length ? ` _(${meta.join(" · ")})_` : ""
  const note = step.notes ? `\n   _Note: ${step.notes}_` : ""
  return `${step.stepNumber}. ${step.action}${tail}${note}`
}

export const procedureStepsToMarkdown = (steps: ProcedureStep[]): string => {
  if (!steps?.length) return "_No steps specified._"
  return steps.map(procedureStepToMarkdown).join("\n")
}

// Full structured Planner → markdown (used as prompt context for
// downstream agents and as a fallback rendering path).
export const plannerStructuredToMarkdown = (planner: PlannerOutput): string => {
  return [
    "**Reagents & Buffers:**",
    reagentsToMarkdown(planner.reagents),
    "",
    "**Master Mix:**",
    masterMixToMarkdown(planner.masterMix),
    "",
    "**Working Solutions:**",
    workingSolutionsToMarkdown(planner.workingSolutions)
  ].join("\n")
}

export const procedureStructuredToMarkdown = (
  procedure: ProcedureOutput
): string => {
  return [
    "**Sample Preparation:**",
    procedureStepsToMarkdown(procedure.samplePreparation),
    "",
    "**Measurement Steps:**",
    procedureStepsToMarkdown(procedure.measurementSteps),
    "",
    "**Experimental Condition Execution:**",
    procedureStepsToMarkdown(procedure.experimentalConditionExecution)
  ].join("\n")
}
