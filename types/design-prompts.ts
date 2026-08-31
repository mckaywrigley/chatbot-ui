export type DesignAgentPromptId =
  | "literatureScout"
  | "experimentDesigner"
  | "statCheck"
  | "planner"
  | "procedure"
  | "reportWriter"

export type PromptSectionType =
  | "context"
  | "instructions"
  | "constraints"
  | "formatting"
  | "output"

export interface PromptSectionSchema {
  id: string
  label: string
  type: PromptSectionType
  defaultValue: string
  helperText?: string
}

export interface AgentPromptSchema {
  id: DesignAgentPromptId
  title: string
  description: string
  sections: PromptSectionSchema[]
  userPrompt?: {
    label: string
    defaultValue: string
    helperText?: string
  }
}

export interface PromptSectionOverrides {
  sections?: Record<string, string>
  userPrompt?: string
}

export type AgentPromptOverrides = Partial<
  Record<DesignAgentPromptId, PromptSectionOverrides>
>

export interface AgentPromptUsage {
  agentId: DesignAgentPromptId
  systemPrompt: string
  userPrompt: string
}
