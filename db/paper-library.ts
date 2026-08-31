/**
 * Browser-side client for the workspace paper library API.
 * Mirrors the Firestore-fetch pattern used by db/reports-firestore.ts.
 */

export interface PaperLibraryAddPayload {
  title: string
  url?: string
  summary?: string
  authors?: string[]
  year?: string
  journal?: string
  source?: string
}

export const addPaperToLibrary = async (opts: {
  workspaceId: string
  paper: PaperLibraryAddPayload
  sourceDesignId?: string
}) => {
  const response = await fetch("/api/paper-library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts)
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}))
    throw new Error(detail.error || "Failed to add paper to library")
  }
  return response.json()
}

export const getPaperLibrary = async (workspaceId: string) => {
  try {
    const response = await fetch(
      `/api/paper-library?workspaceId=${encodeURIComponent(workspaceId)}`
    )
    if (!response.ok) throw new Error("Failed to load paper library")
    const data = await response.json()
    return data.papers || []
  } catch (error) {
    console.error("[paper-library] list failed:", error)
    return []
  }
}

export const removePaperFromLibrary = async (paperId: string) => {
  const response = await fetch(`/api/paper-library/${paperId}`, {
    method: "DELETE"
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}))
    throw new Error(detail.error || "Failed to remove paper")
  }
  return response.json()
}
