/**
 * Firestore-backed Data Collections DB helpers (client-side).
 * Mirrors `db/designs-firestore.ts` pattern.
 */

export const getDataCollections = async (userId: string) => {
  try {
    const response = await fetch(`/api/data-collections?userId=${userId}`)
    if (!response.ok) throw new Error("Failed to fetch data collections")
    const data = await response.json()
    return data.dataCollections || []
  } catch (error) {
    console.error(
      "[DataCollections API] Error getting data collections:",
      error
    )
    return []
  }
}

export const getDataCollectionsByWorkspaceId = async (workspaceId: string) => {
  try {
    const response = await fetch(
      `/api/data-collections?workspaceId=${workspaceId}`
    )
    if (!response.ok) throw new Error("Failed to fetch data collections")
    const data = await response.json()
    return data.dataCollections || []
  } catch (error) {
    console.error(
      "[DataCollections API] Error getting data collections by workspace:",
      error
    )
    return []
  }
}

export const getDataCollectionWorkspacesByWorkspaceId = async (
  workspaceId: string
) => {
  const dataCollections = await getDataCollectionsByWorkspaceId(workspaceId)
  return { dataCollections }
}

export const createDataCollection = async (
  dataCollection: any,
  workspaceId: string
) => {
  const response = await fetch("/api/data-collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataCollection, workspaceId })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || "Failed to create data collection")
  }

  return await response.json()
}

export const getDataCollectionById = async (dataCollectionId: string) => {
  const response = await fetch(`/api/data-collections/${dataCollectionId}`)
  if (!response.ok) return null
  return await response.json()
}

export const updateDataCollection = async (
  dataCollectionId: string,
  updates: any
) => {
  const response = await fetch(`/api/data-collections/${dataCollectionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || "Failed to update data collection")
  }

  return await response.json()
}

export const deleteDataCollection = async (dataCollectionId: string) => {
  const response = await fetch(`/api/data-collections/${dataCollectionId}`, {
    method: "DELETE"
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || "Failed to delete data collection")
  }
  return await response.json()
}
