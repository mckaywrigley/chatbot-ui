/**
 * Types for experiment material calculation and management
 * Similar to catering ingredient management but for scientific experiments
 */

export interface ExperimentMaterial {
  id: string
  name: string
  quantityPerRun: number
  unit: string
  totalQuantity?: number
  estimatedCost?: number
  notes?: string
  category?: string
}

export interface MaterialRequirement {
  id: string
  materialName: string
  unit: string
  totalQuantity: number
  estimatedCost?: number
  notes?: string
}

export interface ExperimentCondition {
  conditionId: string
  name: string
  replicates: number
  materials: ExperimentMaterial[]
}

export interface MaterialCalculationResult {
  materials: MaterialRequirement[]
  totalCost: number
  totalRuns: number
}

export const COMMON_UNITS = [
  "mL",
  "L",
  "µL",
  "mg",
  "g",
  "kg",
  "µg",
  "units",
  "plates",
  "wells",
  "tubes",
  "samples",
  "each"
] as const

export type CommonUnit = (typeof COMMON_UNITS)[number]
