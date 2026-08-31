// Core interfaces for the ShadowAI Co-Scientist pipeline

export interface ResearchPlan {
  planId: string
  userId: string
  title: string
  description: string
  constraints?: Record<string, any>
  preferences?: {
    max_hypotheses?: number
    novelty_vs_feasibility?: number
    [key: string]: any
  }
  createdAt: string
  status?: "pending" | "seed_in_progress" | "completed" | "failed"
  currentPhase?: string
  currentPhaseMessage?: string
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

export type AgentType =
  | "GENERATION"
  | "REFLECTION"
  | "RANKING"
  | "EVOLUTION"
  | "PROXIMITY"
  | "META_REVIEW"
  | "STATCHECK"
  | "REPORT"

export interface AgentTask {
  taskId: string
  planId: string
  agentType: AgentType
  inputText?: string
  hypothesisId?: string
  n_candidates?: number
  timeoutMs?: number
  priority?: number
  metadata?: Record<string, any>
}

export interface AgentResult {
  taskId: string
  status: "success" | "failure"
  hypothesisId?: string | null
  output?: any // structured JSON per agent
  provenance?: any[]
  metrics?: Record<string, number>
  error?: string
}

export interface Hypothesis {
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

export interface TournamentMatch {
  matchId: string
  planId: string
  hypothesisA: string
  hypothesisB: string
  winner?: string
  createdAt: string
  rankingOutput?: any
}

export interface PlanStatus {
  planId: string
  status: "pending" | "seed_in_progress" | "completed" | "failed"
  progress: {
    generated: number
    seedCount: number
    completed: number
    failed: number
    phase?: string
    phaseMessage?: string
  }
  top_hypotheses?: Hypothesis[]
  logs?: LogEntry[]
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

export interface LogEntry {
  timestamp: string
  actor: string
  message: string
  level: "info" | "warn" | "error" | "debug"
  context?: Record<string, any>
}
