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
async function insertAssistantTool(
  assistantTool: TablesInsert<"assistant_tools">
) {
  const { data, error } = await supabase
    .from("assistant_tools")
    .insert(assistantTool)
    .select("*")

  if (!data) {
    throw new Error(error.message)
  }

  return data
}

async function insertAssistantPlatformTool(
  assistantPlatformTool: TablesInsert<"assistant_platform_tools">
) {
  const { data, error } = await supabase
    .from("assistant_platform_tools")
    .insert(assistantPlatformTool)
    .select("*")

  if (!data) {
    throw new Error(error.message)
  }

  return data
}

export const createAssistantTool = async (
  assistantTool: TablesInsert<"assistant_tools">
) => {
  if (platformToolList.some(ptool => ptool.id === assistantTool.tool_id)) {
    return await insertAssistantPlatformTool(assistantTool)
  } else {
    return await insertAssistantTool(assistantTool)
  }
}
export const createAssistantTools = async (
  assistantTools: TablesInsert<"assistant_tools">[]
) => {
  const createdAssistantUserTools = await Promise.all(
    assistantTools
      .filter(
        tool => !platformToolList.some(ptool => ptool.id === tool.tool_id)
      )
      .map(async tool => await insertAssistantTool(tool))
  )
  const createdPlatformTools = await Promise.all(
    assistantTools
      .filter(tool => platformToolList.some(ptool => ptool.id === tool.tool_id))
      .map(async tool => await insertAssistantPlatformTool(tool))
  )

  return { createdAssistantUserTools, createdPlatformTools }
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
