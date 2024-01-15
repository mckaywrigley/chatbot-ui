import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

export const getToolById = async (toolId: string) => {
  const { data: tool, error } = await supabase
    .from("tools")
    .select("*")
    .eq("id", toolId)
    .single()

  if (!tool) {
    throw new Error(error.message)
  }

  return tool
}

export const getToolWorkspacesByWorkspaceId = async (workspaceId: string) => {
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select(
      `
      id,
      name,
      tools (*)
    `
    )
    .eq("id", workspaceId)
    .single()

  if (!workspace) {
    throw new Error(error.message)
  }

  return workspace
}

export const getToolWorkspacesByToolId = async (toolId: string) => {
  const { data: tool, error } = await supabase
    .from("tools")
    .select(
      `
      id, 
      name, 
      workspaces (*)
    `
    )
    .eq("id", toolId)
    .single()

  if (!tool) {
    throw new Error(error.message)
  }

  return tool
}

export const createTool = async (
  tool: TablesInsert<"tools">,
  workspace_id: string
) => {
  const { data: createdTool, error } = await supabase
    .from("tools")
    .insert([tool])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await createToolWorkspace({
    user_id: createdTool.user_id,
    tool_id: createdTool.id,
    workspace_id
  })

  return createdTool
}

export const createTools = async (
  tools: TablesInsert<"tools">[],
  workspace_id: string
) => {
  const { data: createdTools, error } = await supabase
    .from("tools")
    .insert(tools)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  await createToolWorkspaces(
    createdTools.map(tool => ({
      user_id: tool.user_id,
      tool_id: tool.id,
      workspace_id
    }))
  )

  return createdTools
}

export const createToolWorkspace = async (item: {
  user_id: string
  tool_id: string
  workspace_id: string
}) => {
  const { data: createdToolWorkspace, error } = await supabase
    .from("tool_workspaces")
    .insert([item])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdToolWorkspace
}

export const createToolWorkspaces = async (
  items: { user_id: string; tool_id: string; workspace_id: string }[]
) => {
  const { data: createdToolWorkspaces, error } = await supabase
    .from("tool_workspaces")
    .insert(items)
    .select("*")

  if (error) throw new Error(error.message)

  return createdToolWorkspaces
}

export const updateTool = async (
  toolId: string,
  tool: TablesUpdate<"tools">
) => {
  const { data: updatedTool, error } = await supabase
    .from("tools")
    .update(tool)
    .eq("id", toolId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedTool
}

export const deleteTool = async (toolId: string) => {
  const { error } = await supabase.from("tools").delete().eq("id", toolId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deleteToolWorkspace = async (
  toolId: string,
  workspaceId: string
) => {
  const { error } = await supabase
    .from("tool_workspaces")
    .delete()
    .eq("tool_id", toolId)
    .eq("workspace_id", workspaceId)

  if (error) throw new Error(error.message)

  return true
}
