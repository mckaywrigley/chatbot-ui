import { supabase } from "../lib/supabase/browser-client"
import { TablesInsert } from "../supabase/types"

export const getReportCollectionsByReportId = async (reportId: string) => {
  const { data: reportCollections, error } = await supabase
    .from("reports")
    .select(
      `
        id, 
        name, 
        collections (*)
      `
    )
    .eq("id", reportId)
    .single()

  if (!reportCollections) {
    throw new Error(error.message)
  }

  return reportCollections
}

export const createReportCollection = async (
  reportCollection: TablesInsert<"report_collections">
) => {
  const { data: createdReportCollection, error } = await supabase
    .from("report_collections")
    .insert(reportCollection)
    .select("*")

  if (!createdReportCollection) {
    throw new Error(error.message)
  }

  return createdReportCollection
}

export const createReportCollections = async (
  reportCollections: TablesInsert<"report_collections">[]
) => {
  const { data: createdReportCollections, error } = await supabase
    .from("report_collections")
    .insert(reportCollections)
    .select("*")

  if (!createdReportCollections) {
    throw new Error(error.message)
  }

  return createdReportCollections
}

export const deleteReportCollection = async (
  reportId: string,
  collectionId: string
) => {
  const { error } = await supabase
    .from("report_collections")
    .delete()
    .eq("report_id", reportId)
    .eq("collection_id", collectionId)

  if (error) throw new Error(error.message)

  return true
}
