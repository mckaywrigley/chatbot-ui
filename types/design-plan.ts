export type DesignPlanStatusType =
  | "pending"
  | "seed_in_progress"
  | "completed"
  | "failed"

export interface DesignPlanProgress {
  generated: number
  seedCount: number
  completed: number
  failed: number
  phase?:
    | "literature_scout"
    | "hypothesis_generation"
    | "tournament"
    | "reflection"
    | "evolution"
    | "meta_review"
    | "completed"
  phaseMessage?: string
}

export interface DesignPlanHypothesis {
  hypothesisId: string
  planId: string
  content: string
  explanation?: string
  elo?: number
  createdAt: string
  provenance?: any[]
  needs_review?: boolean
  metadata?: Record<string, any>
}

export interface DesignPlanLogEntry {
  timestamp: string
  actor: string
  message: string
  level: "info" | "warn" | "error" | "debug"
  context?: Record<string, any>
}

export interface DesignPlanStatus {
  planId: string
  status: DesignPlanStatusType
  progress: DesignPlanProgress
  top_hypotheses?: DesignPlanHypothesis[]
  logs?: DesignPlanLogEntry[]
  createdAt: string
  completedAt?: string
  failureReason?: string
  literatureContext?: {
    whatOthersHaveDone: string
    goodMethodsAndTools: string
    potentialPitfalls: string
    citations: string[]
    citationsDetailed?: Array<{
      index: number
      title: string
      url: string
      source: string
      authors: string[]
      year?: string
      journal?: string
      doi?: string
    }>
  }
}

export type DesignPlanDomain =
  | "formulation_development"
  | "discovery_biology"
  | "molecular_biology"
  | "protein_expression"
  | "cell_culture"
  | "fermentation"
  | "analytics_qc"

export type DesignPlanPhase =
  | "screening"
  | "optimization"
  | "robustness"
  | "scale_up"
  | "validation"

export interface DesignPlanConstraints {
  domain?: DesignPlanDomain
  phase?: DesignPlanPhase
  objectives?: string[]
  knownVariables?: string[]
  unknownVariables?: string[]
  material?: string
  time?: string
  equipment?: string
  /** Legacy fields - kept so older persisted plans still type-check. */
  variables?: string[]
  specialConsiderations?: string[]
}

export interface DesignPlanMetadata {
  planId: string
  statusUrl: string
  createdAt: string
  request?: {
    title: string
    description: string
    constraints?: DesignPlanConstraints
    preferences?: Record<string, any>
  }
}
