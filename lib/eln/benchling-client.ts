import {
  ELNExportResult,
  BenchlingProject,
  BenchlingEntry,
  BenchlingBlob,
  ELNProject,
  ELNExperiment
} from "@/types/eln"

export class BenchlingClient {
  private apiKey: string
  private tenantUrl: string
  private baseUrl: string

  constructor(apiKey: string, tenantUrl: string) {
    this.apiKey = apiKey
    this.tenantUrl = tenantUrl.replace(/\/$/, "") // Remove trailing slash
    this.baseUrl = `${this.tenantUrl}/api/v2`
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Basic ${btoa(this.apiKey + ":")}`,
        "Content-Type": "application/json",
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(
        `Benchling API error: ${response.status} ${response.statusText}`
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
      console.error("Benchling authentication failed:", error)
      return false
    }
  }

  async listProjects(): Promise<ELNProject[]> {
    try {
      const data = await this.makeRequest<{ projects: BenchlingProject[] }>(
        "/projects"
      )
      return data.projects
        .filter(project => !project.archive_reason)
        .map(project => ({
          id: project.id,
          name: project.name,
          description: project.description
        }))
    } catch (error) {
      console.error("Failed to list Benchling projects:", error)
      throw error
    }
  }

  async listEntries(projectId: string): Promise<ELNExperiment[]> {
    try {
      const data = await this.makeRequest<{ entries: BenchlingEntry[] }>(
        `/entries?projectId=${projectId}`
      )
      return data.entries.map(entry => ({
        id: entry.id,
        name: entry.name,
        project_id: projectId
      }))
    } catch (error) {
      console.error("Failed to list Benchling entries:", error)
      throw error
    }
  }

  async listExperiments(projectId: string): Promise<ELNExperiment[]> {
    return this.listEntries(projectId)
  }

  async createEntry(
    projectId: string,
    name: string,
    content?: string
  ): Promise<ELNExperiment> {
    try {
      const entryData = {
        name,
        project_id: projectId,
        days: content
          ? [
              {
                notes: [
                  {
                    type: "text",
                    text: content
                  }
                ]
              }
            ]
          : []
      }

      const data = await this.makeRequest<BenchlingEntry>("/entries", {
        method: "POST",
        body: JSON.stringify(entryData)
      })

      return {
        id: data.id,
        name: data.name,
        project_id: projectId
      }
    } catch (error) {
      console.error("Failed to create Benchling entry:", error)
      throw error
    }
  }

  async uploadBlob(
    entryId: string,
    fileContent: Blob,
    filename: string
  ): Promise<string> {
    try {
      // First, create a blob upload URL
      const blobData = await this.makeRequest<BenchlingBlob>("/blobs", {
        method: "POST",
        body: JSON.stringify({
          name: filename,
          type: "application/pdf",
          parts: [
            {
              size: fileContent.size
            }
          ]
        })
      })

      // Upload the file to the provided upload URL
      if (blobData.upload_url) {
        const uploadResponse = await fetch(blobData.upload_url, {
          method: "PUT",
          body: fileContent,
          headers: {
            "Content-Type": "application/pdf"
          }
        })

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.status}`)
        }
      }

      // Complete the upload
      await this.makeRequest(`/blobs/${blobData.id}/complete-upload`, {
        method: "POST",
        body: JSON.stringify({
          parts: [
            {
              part_number: 1,
              etag: "dummy-etag" // In real implementation, get from upload response
            }
          ]
        })
      })

      // Attach blob to entry
      await this.makeRequest(`/entries/${entryId}`, {
        method: "PATCH",
        body: JSON.stringify({
          days: [
            {
              notes: [
                {
                  type: "attachment",
                  attachment_id: blobData.id
                }
              ]
            }
          ]
        })
      })

      return blobData.id
    } catch (error) {
      console.error("Failed to upload blob to Benchling:", error)
      throw error
    }
  }

  async exportReport(
    reportContent: string,
    targetProjectId: string,
    targetEntryId?: string,
    entryName?: string
  ): Promise<ELNExportResult> {
    try {
      let entry: ELNExperiment

      if (targetEntryId) {
        // Use existing entry
        const entries = await this.listEntries(targetProjectId)
        entry = entries.find(ent => ent.id === targetEntryId)!
        if (!entry) {
          throw new Error(`Entry ${targetEntryId} not found`)
        }
      } else if (entryName) {
        // Create new entry
        entry = await this.createEntry(
          targetProjectId,
          entryName,
          reportContent
        )
      } else {
        throw new Error("Either targetEntryId or entryName must be provided")
      }

      // Convert report content to PDF blob (simplified)
      const reportBlob = new Blob([reportContent], { type: "application/pdf" })

      // Upload report as attachment
      const blobId = await this.uploadBlob(
        entry.id,
        reportBlob,
        "shadowai-report.pdf"
      )

      const entryUrl = `${this.tenantUrl}/entries/${entry.id}`

      return {
        success: true,
        entry_url: entryUrl,
        entry_id: entry.id
      }
    } catch (error) {
      console.error("Failed to export report to Benchling:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }
}
