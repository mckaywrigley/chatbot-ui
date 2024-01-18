import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert } from "@/supabase/types"

export const getAssistantCollectionsByAssistantId = async (
  assistantId: string
) => {
  const { data: assistantCollections, error } = await supabase
    .from("assistants")
    .select(
      `
        id, 
        name, 
        collections (*)
      `
    )
    .eq("id", assistantId)
    .single()

  if (!assistantCollections) {
    throw new Error(error.message)
  }

  return assistantCollections
}

export const createAssistantCollection = async (
  assistantCollection: TablesInsert<"assistant_collections">
) => {
  const { data: createdAssistantCollection, error } = await supabase
    .from("assistant_collections")
    .insert(assistantCollection)
    .select("*")

  if (!createdAssistantCollection) {
    throw new Error(error.message)
  }

  return createdAssistantCollection
}

export const createAssistantCollections = async (
  assistantCollections: TablesInsert<"assistant_collections">[]
) => {
  const { data: createdAssistantCollections, error } = await supabase
    .from("assistant_collections")
    .insert(assistantCollections)
    .select("*")

  if (!createdAssistantCollections) {
    throw new Error(error.message)
  }

  return createdAssistantCollections
}

export const deleteAssistantCollection = async (
  assistantId: string,
  collectionId: string
) => {
  const { error } = await supabase
    .from("assistant_collections")
    .delete()
    .eq("assistant_id", assistantId)
    .eq("collection_id", collectionId)

  if (error) throw new Error(error.message)

  return true
}
