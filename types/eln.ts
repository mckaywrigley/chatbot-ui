// ELN (Electronic Lab Notebook) Integration Types

export interface ELNProvider {
  id: string
  name: string
  icon: string
  baseUrl: string
  authType: "api_key" | "oauth"
  description: string
  supported: boolean
}

export interface ELNConnection {
  id: string
  user_id: string
  provider: string
  access_token: string
  refresh_token?: string
  tenant_url?: string
  display_name?: string
  connected_at: string
  updated_at: string
}

export interface ELNExportResult {
  success: boolean
  entry_url?: string
  entry_id?: string
  error?: string
}

// SciNote specific types
export interface SciNoteProject {
  id: number
  name: string
  code: string
  archived: boolean
}

export interface SciNoteExperiment {
  id: number
  name: string
  description: string
  project_id: number
}

export interface SciNoteTask {
  id: number
  name: string
  experiment_id: number
}

// Benchling specific types
export interface BenchlingProject {
  id: string
  name: string
  description?: string
  archive_reason?: string
}

export interface BenchlingEntry {
  id: string
  name: string
  project_id: string
  days?: any[]
}

export interface BenchlingBlob {
  id: string
  name: string
  type: string
  upload_url?: string
}

// Common interfaces for ELN operations
export interface ELNProject {
  id: string
  name: string
  description?: string
}

export interface ELNExperiment {
  id: string
  name: string
  description?: string
  project_id: string
}

export interface ELNExportRequest {
  provider: string
  connection_id: string
  report_id: string
  report_content: string
  target_project_id: string
  target_experiment_id?: string
  experiment_name?: string
  create_new_experiment: boolean
}
