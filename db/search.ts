import { supabase } from "@/lib/supabase/browser-client"
import { SearchResult } from "@/components/search/global-search"

/**
 * Performs global search across projects, chats, files, and reports
 */
export const searchGlobalContent = async (
  workspaceId: string,
  userId: string,
  query: string
): Promise<SearchResult[]> => {
  const searchTerm = query.trim().toLowerCase()
  if (!searchTerm) return []

  const results: SearchResult[] = []

  try {
    // Search Projects
    const { data: projects } = await supabase
      .from("projects")
      .select(
        `
        id, 
        name, 
        description, 
        tags, 
        created_at, 
        updated_at
      `
      )
      .eq("workspace_id", workspaceId)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order("updated_at", { ascending: false })
      .limit(10)

    if (projects) {
      projects.forEach(project => {
        results.push({
          id: project.id,
          type: "project",
          title: project.name,
          description: project.description || undefined,
          url: `/projects/${project.id}`,
          metadata: {
            // updated_at can be null on freshly-created projects;
            // created_at is also typed nullable in the generated
            // Database types - fall back to current time as last resort
            // so the search row always renders a date.
            date: new Date(
              project.updated_at ?? project.created_at ?? Date.now()
            ).toLocaleDateString(),
            tags: project.tags || []
          }
        })
      })
    }

    // Search Chats
    const { data: chats } = await supabase
      .from("chats")
      .select(
        `
        id, 
        name, 
        model, 
        created_at, 
        updated_at,
        project_id,
        projects!left(name)
      `
      )
      .eq("workspace_id", workspaceId)
      .ilike("name", `%${searchTerm}%`)
      .order("updated_at", { ascending: false })
      .limit(10)

    if (chats) {
      chats.forEach(chat => {
        const projectName = (chat.projects as any)?.name
        results.push({
          id: chat.id,
          type: "chat",
          title: chat.name,
          url: `/chat/${chat.id}`,
          metadata: {
            model: chat.model,
            date: new Date(
              chat.updated_at || chat.created_at
            ).toLocaleDateString(),
            projectName: projectName || undefined
          }
        })
      })
    }

    // Search Files
    const { data: files } = await supabase
      .from("files")
      .select(
        `
        id, 
        name, 
        type, 
        size, 
        created_at,
        project_id,
        projects!left(name)
      `
      )
      .eq("workspace_id", workspaceId)
      .or(`name.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%`)
      .order("created_at", { ascending: false })
      .limit(10)

    if (files) {
      files.forEach(file => {
        const projectName = (file.projects as any)?.name
        results.push({
          id: file.id,
          type: "file",
          title: file.name,
          description: file.type,
          url: `/files/${file.id}`,
          metadata: {
            size: formatFileSize(file.size),
            date: new Date(file.created_at).toLocaleDateString(),
            projectName: projectName || undefined
          }
        })
      })
    }

    // Search Reports.
    //
    // Pre-PR-9a this query selected `summary` - a column that doesn't
    // exist on the Supabase `reports` table (the equivalent field is
    // `description`). The regenerated Database types caught it.
    //
    // NOTE: report content has migrated to Firestore (see
    // db/reports-firestore.ts). This Supabase row is now metadata-only;
    // the Firestore doc holds the real `report_draft` + `report_outline`.
    // A future cleanup should query Firestore for full-text search of
    // report bodies - for now we match against the metadata columns.
    const { data: reports } = await supabase
      .from("reports")
      .select(
        `
        id,
        name,
        description,
        created_at,
        project_id,
        projects!left(name)
      `
      )
      .eq("user_id", userId)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order("created_at", { ascending: false })
      .limit(10)

    if (reports) {
      reports.forEach(report => {
        const projectName = (report.projects as any)?.name
        results.push({
          id: report.id,
          type: "report",
          title: report.name,
          description: report.description || undefined,
          url: `/reports/${report.id}`,
          metadata: {
            date: new Date(report.created_at).toLocaleDateString(),
            projectName: projectName || undefined
          }
        })
      })
    }

    // Sort results by relevance (exact matches first, then by date)
    return results.sort((a, b) => {
      const aExact = a.title.toLowerCase().includes(searchTerm)
      const bExact = b.title.toLowerCase().includes(searchTerm)

      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1

      // If both exact or both partial, sort by date (newest first)
      const aDate = a.metadata?.date ? new Date(a.metadata.date) : new Date(0)
      const bDate = b.metadata?.date ? new Date(b.metadata.date) : new Date(0)
      return bDate.getTime() - aDate.getTime()
    })
  } catch (error) {
    console.error("Global search error:", error)
    return []
  }
}

/**
 * Get filtered projects with advanced filtering options (Firebase)
 */
export const getFilteredProjects = async (
  workspaceId: string,
  filters: {
    tags?: string[]
    dateRange?: { start: Date; end: Date }
    sortBy?: "name" | "created_at" | "updated_at" | "activity"
    sortOrder?: "asc" | "desc"
    searchTerm?: string
  }
) => {
  try {
    const params = new URLSearchParams({
      workspaceId,
      sortBy: filters.sortBy || "updated_at",
      sortOrder: filters.sortOrder || "desc"
    })

    if (filters.searchTerm) {
      params.set("searchTerm", filters.searchTerm)
    }
    if (filters.tags && filters.tags.length > 0) {
      params.set("tags", filters.tags.join(","))
    }

    const response = await fetch(`/api/projects?${params.toString()}`)
    if (!response.ok) {
      throw new Error("Failed to fetch projects")
    }
    const data = await response.json()
    let projects = data.projects || []

    // Client-side date range filter (Firestore doesn't support range on non-ordered fields easily)
    if (filters.dateRange) {
      const start = filters.dateRange.start.getTime()
      const end = filters.dateRange.end.getTime()
      projects = projects.filter((p: any) => {
        const created = new Date(p.created_at).getTime()
        return created >= start && created <= end
      })
    }

    return projects
  } catch (error) {
    console.error("Error fetching filtered projects:", error)
    return []
  }
}

/**
 * Get filtered chats with advanced filtering options
 */
export const getFilteredChats = async (
  workspaceId: string,
  filters: {
    projectId?: string
    model?: string
    dateRange?: { start: Date; end: Date }
    sortBy?: "name" | "created_at" | "updated_at"
    sortOrder?: "asc" | "desc"
    searchTerm?: string
  }
) => {
  let query = supabase
    .from("chats")
    .select(
      `
      *,
      projects!left(name)
    `
    )
    .eq("workspace_id", workspaceId)

  // Apply search filter
  if (filters.searchTerm) {
    query = query.ilike("name", `%${filters.searchTerm}%`)
  }

  // Apply project filter
  if (filters.projectId) {
    query = query.eq("project_id", filters.projectId)
  }

  // Apply model filter
  if (filters.model) {
    query = query.eq("model", filters.model)
  }

  // Apply date range filter
  if (filters.dateRange) {
    query = query
      .gte("created_at", filters.dateRange.start.toISOString())
      .lte("created_at", filters.dateRange.end.toISOString())
  }

  // Apply sorting
  const sortBy = filters.sortBy || "updated_at"
  const sortOrder = filters.sortOrder || "desc"
  const ascending = sortOrder === "asc"

  query = query.order(sortBy, { ascending })

  const { data: chats, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return chats || []
}

/**
 * Helper function to format file size
 */
const formatFileSize = (bytes: number): string => {
  if (!bytes) return "0 B"

  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))

  if (i === 0) return `${bytes} ${sizes[i]}`
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}
