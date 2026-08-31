import { supabase } from "../lib/supabase/browser-client"
import { TablesInsert } from "../supabase/types"

export const getReportFilesByReportId = async (reportId: string) => {
  const { data: reportFiles, error } = await supabase
    .from("report_files")
    .select(
      `
      file_type,
      files:file_id (
        id,
        name,
        file_path,
        type,
        size,
        tokens,
        description,
        created_at,
        updated_at,
        user_id,
        folder_id,
        sharing
      )
  `
    )
    .eq("report_id", reportId)
  if (error) {
    throw new Error(error.message)
  }

  if (!reportFiles) {
    return {
      protocol: [],
      papers: [],
      dataFiles: []
    }
  }

  const groupedFiles = {
    protocol: reportFiles
      .filter(rf => rf.file_type === "protocol" && rf.files !== null)
      .map(rf => rf.files),
    papers: reportFiles
      .filter(rf => rf.file_type === "papers" && rf.files !== null)
      .map(rf => rf.files),
    dataFiles: reportFiles
      .filter(rf => rf.file_type === "dataFiles" && rf.files !== null)
      .map(rf => rf.files)
  }

  return groupedFiles
}

export const getReportFilesWithDetails = async (reportId: string) => {
  const { data, error } = await supabase
    .from("report_files")
    .select(
      `
      *,
      files:file_id(*)
    `
    )
    .eq("report_id", reportId)

  if (error) throw error
  if (!data) throw new Error("No data returned from query")
  const groupedFiles = {
    protocol: data
      .filter(rf => rf.file_type === "protocol" && rf.files !== null)
      .map(rf => rf.files),
    papers: data
      .filter(rf => rf.file_type === "papers" && rf.files !== null)
      .map(rf => rf.files),
    dataFiles: data
      .filter(rf => rf.file_type === "dataFiles" && rf.files !== null)
      .map(rf => rf.files)
  }

  return groupedFiles
}

export const createReportFile = async (
  reportFile: TablesInsert<"report_files">
) => {
  const { data: createdReportFile, error } = await supabase
    .from("report_files")
    .insert(reportFile)
    .select("*")

  if (!createdReportFile) {
    throw new Error(error.message)
  }

  return createdReportFile
}

export const createReportFiles = async (
  reportFiles: TablesInsert<"report_files">[]
) => {
  const { data: createdReportFiles, error } = await supabase
    .from("report_files")
    .insert(reportFiles)
    .select("*")

  if (!createdReportFiles) {
    throw new Error(error.message)
  }

  return createdReportFiles
}

export const deleteReportFile = async (reportId: string, fileId: string) => {
  const { error } = await supabase
    .from("report_files")
    .delete()
    .eq("report_id", reportId)
    .eq("file_id", fileId)

  if (error) throw new Error(error.message)

  return true
}
