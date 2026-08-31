export const getDesigns = async (userId: string) => {
  try {
    const response = await fetch(`/api/designs?userId=${userId}`)
    if (!response.ok) {
      throw new Error("Failed to fetch designs")
    }
    const data = await response.json()
    return data.designs || []
  } catch (error) {
    console.error("[Designs API] Error getting designs:", error)
    return []
  }
}

export const createDesign = async (design: any, workspaceId: string) => {
  try {
    const response = await fetch("/api/designs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ design, workspaceId })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to create design")
    }

    return await response.json()
  } catch (error) {
    console.error("[Designs API] Error creating design:", error)
    throw error
  }
}

export const updateDesign = async (designId: string, updates: any) => {
  try {
    const response = await fetch(`/api/design/${designId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to update design")
    }

    return await response.json()
  } catch (error) {
    console.error("[Designs API] Error updating design:", error)
    throw error
  }
}

export const deleteDesign = async (designId: string) => {
  try {
    const response = await fetch(`/api/design/${designId}`, {
      method: "DELETE"
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to delete design")
    }

    return await response.json()
  } catch (error) {
    console.error("[Designs API] Error deleting design:", error)
    throw error
  }
}

export const getDesignWorkspacesByWorkspaceId = async (workspaceId: string) => {
  try {
    const response = await fetch(`/api/designs?workspaceId=${workspaceId}`)
    if (!response.ok) {
      throw new Error("Failed to fetch designs")
    }
    const data = await response.json()
    return { designs: data.designs || [] }
  } catch (error) {
    console.error("[Designs API] Error getting designs by workspace:", error)
    return { designs: [] }
  }
}
