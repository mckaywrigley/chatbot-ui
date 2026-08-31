import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert } from "@/supabase/types"

export const createDesignWorkspace = async (
  designWorkspace: TablesInsert<"design_workspaces">
) => {
  const { data: createdDesignWorkspace, error } = await supabase
    .from("design_workspaces")
    .insert(designWorkspace)
    .select("*")
    .single()

  if (!createdDesignWorkspace) {
    throw new Error(error.message)
  }

  return createdDesignWorkspace
}

export const deleteDesignWorkspace = async (
  designId: string,
  workspaceId: string
) => {
  const { error } = await supabase
    .from("design_workspaces")
    .delete()
    .eq("design_id", designId)
    .eq("workspace_id", workspaceId)

  if (error) {
    throw new Error(error.message)
  }
}
