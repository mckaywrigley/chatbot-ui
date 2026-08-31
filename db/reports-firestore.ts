/**
 * Firestore-backed Reports DB helpers (client-side).
 * Mirrors `db/designs-firestore.ts` pattern.
 */

export const getReports = async (userId: string) => {
  try {
    const response = await fetch(`/api/reports?userId=${userId}`)
    if (!response.ok) throw new Error("Failed to fetch reports")
    const data = await response.json()
    return data.reports || []
  } catch (error) {
    console.error("[Reports API] Error getting reports:", error)
    return []
  }
}

export const getReportsByProject = async (
  _userId: string,
  projectId: string
) => {
  try {
    const response = await fetch(`/api/reports?projectId=${projectId}`)
    if (!response.ok) throw new Error("Failed to fetch reports for project")
    const data = await response.json()
    return data.reports || []
  } catch (error) {
    console.error("[Reports API] Error getting reports by project:", error)
    return []
  }
}

export const getReportsByWorkspaceId = async (workspaceId: string) => {
  try {
    const response = await fetch(`/api/reports?workspaceId=${workspaceId}`)
    if (!response.ok) throw new Error("Failed to fetch reports")
    const data = await response.json()
    return data.reports || []
  } catch (error) {
    console.error("[Reports API] Error getting reports by workspace:", error)
    return []
  }
}

export const getReportWorkspacesByWorkspaceId = async (workspaceId: string) => {
  const reports = await getReportsByWorkspaceId(workspaceId)
  return { reports }
}

export const createReport = async (
  report: any,
  workspaceId: string,
  selectedFiles: {
    protocol: any[]
    papers: any[]
    dataFiles: any[]
  },
  collections?: any[]
) => {
  const response = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report, workspaceId, selectedFiles, collections })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || "Failed to create report")
  }

  return await response.json()
}

export const getReportById = async (reportId: string) => {
  const response = await fetch(`/api/reports/${reportId}`)
  if (!response.ok) return null
  return await response.json()
}

export const getReportWithDetails = async (reportId: string) => {
  return await getReportById(reportId)
}

export const updateReport = async (reportId: string, updates: any) => {
  const response = await fetch(`/api/reports/${reportId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || "Failed to update report")
  }

  return await response.json()
}

export const deleteReport = async (reportId: string) => {
  const response = await fetch(`/api/reports/${reportId}`, { method: "DELETE" })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || "Failed to delete report")
  }
  return await response.json()
}
