import { Project } from "@/types/project"

export const getProjectById = async (
  projectId: string
): Promise<Project | null> => {
  try {
    const response = await fetch(`/api/projects/${projectId}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error("Failed to fetch project")
    }
    return await response.json()
  } catch (error) {
    console.error("[Projects API] Error getting project:", error)
    return null
  }
}

export const getProjectsByWorkspaceId = async (
  workspaceId: string
): Promise<Project[]> => {
  try {
    const response = await fetch(`/api/projects?workspaceId=${workspaceId}`)
    if (!response.ok) {
      throw new Error("Failed to fetch projects")
    }
    const data = await response.json()
    return data.projects || []
  } catch (error) {
    console.error("[Projects API] Error getting projects:", error)
    return []
  }
}

export const createProject = async (project: {
  user_id: string
  workspace_id: string
  name: string
  description?: string
  tags?: string[]
}): Promise<Project> => {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: project.name,
      description: project.description || "",
      tags: project.tags || [],
      workspace_id: project.workspace_id
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to create project")
  }

  return await response.json()
}

export const updateProject = async (
  projectId: string,
  updates: Partial<Project>
): Promise<Project> => {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to update project")
  }

  return await response.json()
}

export const deleteProject = async (projectId: string): Promise<boolean> => {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "DELETE"
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to delete project")
  }

  return true
}
