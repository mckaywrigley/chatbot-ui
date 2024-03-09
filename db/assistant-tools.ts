import { platformToolList } from "@/lib/platformTools/platformToolsList"
import { platformToolDefinitionById } from "@/lib/platformTools/utils/platformToolsUtils"
import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert } from "@/supabase/types"

export const getAssistantToolsByAssistantId = async (assistantId: string) => {
  const { data: assistantTools, error } = await supabase
    .from("assistants")
    .select(
      `
        id, 
        name, 
        tools (*),
        assistant_platform_tools (*)
      `
    )
    .eq("id", assistantId)
    .single()

  if (!assistantTools) {
    throw new Error(error.message)
  }

  const platformTools = assistantTools.assistant_platform_tools.map(tool =>
    platformToolDefinitionById(tool.tool_id)
  )

  const allAssistantTools = (assistantTools.tools || []).concat(
    platformTools || []
  )

  return {
    tools: allAssistantTools,
    id: assistantTools.id,
    name: assistantTools.name
  }
}

async function insertTools(
  tableName: string,
  tools: TablesInsert<"assistant_tools">[] | TablesInsert<"assistant_tools">
) {
  const { data, error } = await supabase
    .from(tableName)
    .insert(tools)
    .select("*")

  if (!data) {
    throw new Error(error.message)
  }

  return data
}

async function handleToolInsertion(assistantTools: any, tableName: string) {
  const isPlatformTool = (tool: any) =>
    platformToolList.some(ptool => ptool.id === tool.tool_id)
  const filteredTools = assistantTools.filter(isPlatformTool)
  return await insertTools(tableName, filteredTools)
}

export const createAssistantTool = async (
  assistantTool: TablesInsert<"assistant_tools">
) => {
  const tableName = platformToolList.some(
    ptool => ptool.id === assistantTool.tool_id
  )
    ? "assistant_platform_tools"
    : "assistant_tools"
  return await insertTools(tableName, assistantTool)
}

export const createAssistantTools = async (
  assistantTools: TablesInsert<"assistant_tools">[]
) => {
  const createdAssistantUserTools = await handleToolInsertion(
    assistantTools,
    "assistant_tools"
  )
  const createdPlatformTools = await handleToolInsertion(
    assistantTools,
    "assistant_platform_tools"
  )

  return { createdAssistantUserTools, createdPlatformTools }
}

export const createAssistantPlatformTools = async (
  assistantPlatformTools: TablesInsert<"assistant_platform_tools">[]
) => {
  return await insertTools("assistant_platform_tools", assistantPlatformTools)
}

export const deleteAssistantTool = async (
  assistantId: string,
  toolId: string
) => {
  const tableName = platformToolList.map(ptool => ptool.id).includes(toolId)
    ? "assistant_platform_tools"
    : "assistant_tools"
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq("assistant_id", assistantId)
    .eq("tool_id", toolId)

  if (error) throw new Error(error.message)

  return true
}
