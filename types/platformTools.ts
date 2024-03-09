import { UUID } from "crypto"

export interface ToolFunction {
  id: string
  toolFunction: Function
  description: string
  parameters: Parameter[]
}

export interface Parameter {
  name: string
  description: string
  required: boolean
  schema: Schema
}

export interface Schema {
  type: string
}

export interface PlatformTool {
  id: string
  toolName: string
  name: string
  version: string
  description: string
  toolsFunctions: ToolFunction[]
}
