import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert } from "@/supabase/types"

export const getAssistantToolsByAssistantId = async (assistantId: string) => {
  const { data: assistantTools, error } = await supabase
    .from("assistants")
    .select(
      `
        id, 
        name, 
        tools (*)
      `
    )
    .eq("id", assistantId)
    .single()

  if (!assistantTools) {
    throw new Error(error.message)
  }

  return assistantTools
}

export const createAssistantTool = async (
  assistantTool: TablesInsert<"assistant_tools">
) => {
  const { data: createdAssistantTool, error } = await supabase
    .from("assistant_tools")
    .insert(assistantTool)
    .select("*")

  if (!createdAssistantTool) {
    throw new Error(error.message)
  }

  return createdAssistantTool
}

export const createAssistantTools = async (
  assistantTools: TablesInsert<"assistant_tools">[]
) => {
  const { data: createdAssistantTools, error } = await supabase
    .from("assistant_tools")
    .insert(assistantTools)
    .select("*")

  if (!createdAssistantTools) {
    throw new Error(error.message)
  }

  return createdAssistantTools
}

export const deleteAssistantTool = async (
  assistantId: string,
  toolId: string
) => {
  const { error } = await supabase
    .from("assistant_tools")
    .delete()
    .eq("assistant_id", assistantId)
    .eq("tool_id", toolId)

  if (error) throw new Error(error.message)

  return true
}
