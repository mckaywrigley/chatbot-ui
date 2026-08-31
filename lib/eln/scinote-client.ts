import {
  ELNExportResult,
  SciNoteProject,
  SciNoteExperiment,
  SciNoteTask,
  ELNProject,
  ELNExperiment
} from "@/types/eln"

export class SciNoteClient {
  private apiToken: string
  private baseUrl: string

  constructor(apiToken: string, baseUrl: string = "https://www.scinote.net") {
    this.apiToken = apiToken
    this.baseUrl = baseUrl.replace(/\/$/, "") // Remove trailing slash
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(
        `SciNote API error: ${response.status} ${response.statusText}`
      )
    }

    return response.json()
  }

  async authenticate(): Promise<boolean> {
    try {
      // Test authentication by fetching user info
      await this.makeRequest("/users/current")
      return true
    } catch (error) {
      console.error("SciNote authentication failed:", error)
      return false
    }
  }

  async listProjects(): Promise<ELNProject[]> {
    try {
      const data = await this.makeRequest<{ data: SciNoteProject[] }>(
        "/projects"
      )
      return data.data
        .filter(project => !project.archived)
        .map(project => ({
          id: project.id.toString(),
          name: project.name,
          description: project.code
        }))
    } catch (error) {
      console.error("Failed to list SciNote projects:", error)
      throw error
    }
  }

  async listExperiments(projectId: string): Promise<ELNExperiment[]> {
    try {
      const data = await this.makeRequest<{ data: SciNoteExperiment[] }>(
        `/projects/${projectId}/experiments`
      )
      return data.data.map(experiment => ({
        id: experiment.id.toString(),
        name: experiment.name,
        description: experiment.description,
        project_id: projectId
      }))
    } catch (error) {
      console.error("Failed to list SciNote experiments:", error)
      throw error
    }
  }

  async createExperiment(
    projectId: string,
    name: string,
    description?: string
  ): Promise<ELNExperiment> {
    try {
      const data = await this.makeRequest<{ data: SciNoteExperiment }>(
        `/projects/${projectId}/experiments`,
        {
          method: "POST",
          body: JSON.stringify({
            data: {
              type: "experiments",
              attributes: {
                name,
                description: description || ""
              }
            }
          })
        }
      )

      return {
        id: data.data.id.toString(),
        name: data.data.name,
        description: data.data.description,
        project_id: projectId
      }
    } catch (error) {
      console.error("Failed to create SciNote experiment:", error)
      throw error
    }
  }

  async createTask(
    experimentId: string,
    name: string,
    description?: string
  ): Promise<SciNoteTask> {
    try {
      const data = await this.makeRequest<{ data: SciNoteTask }>(
        `/experiments/${experimentId}/tasks`,
        {
          method: "POST",
          body: JSON.stringify({
            data: {
              type: "tasks",
              attributes: {
                name,
                description: description || ""
              }
            }
          })
        }
      )

      return data.data
    } catch (error) {
      console.error("Failed to create SciNote task:", error)
      throw error
    }
  }

  async uploadAttachment(
    taskId: string,
    fileContent: Blob,
    filename: string
  ): Promise<string> {
    try {
      const formData = new FormData()
      formData.append("file", fileContent, filename)

      const response = await fetch(
        `${this.baseUrl}/api/v1/tasks/${taskId}/attachments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiToken}`
          },
          body: formData
        }
      )

      if (!response.ok) {
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()
      return data.data.id
    } catch (error) {
      console.error("Failed to upload attachment to SciNote:", error)
      throw error
    }
  }

  async exportReport(
    reportContent: string,
    targetProjectId: string,
    targetExperimentId?: string,
    experimentName?: string
  ): Promise<ELNExportResult> {
    try {
      let experiment: ELNExperiment

      if (targetExperimentId) {
        // Use existing experiment
        const experiments = await this.listExperiments(targetProjectId)
        experiment = experiments.find(exp => exp.id === targetExperimentId)!
        if (!experiment) {
          throw new Error(`Experiment ${targetExperimentId} not found`)
        }
      } else if (experimentName) {
        // Create new experiment
        experiment = await this.createExperiment(
          targetProjectId,
          experimentName,
          "Shadow AI Generated Report"
        )
      } else {
        throw new Error(
          "Either targetExperimentId or experimentName must be provided"
        )
      }

      // Create a task for the report
      const task = await this.createTask(
        experiment.id,
        "Shadow AI Report",
        "Generated report from Shadow AI analysis"
      )

      // Convert report content to PDF blob (simplified - in real implementation,
      // you'd use a proper PDF generation library)
      const reportBlob = new Blob([reportContent], { type: "text/plain" })

      // Upload report as attachment
      const attachmentId = await this.uploadAttachment(
        task.id.toString(),
        reportBlob,
        "shadowai-report.txt"
      )

      const entryUrl = `${this.baseUrl}/experiments/${experiment.id}/tasks/${task.id}`

      return {
        success: true,
        entry_url: entryUrl,
        entry_id: task.id.toString()
      }
    } catch (error) {
      console.error("Failed to export report to SciNote:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }
}
