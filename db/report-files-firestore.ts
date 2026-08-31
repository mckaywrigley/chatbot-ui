/**
 * Firestore-backed report file grouping helper.
 *
 * Report documents store file snapshots under:
 *   report.files.protocol / papers / dataFiles
 */

import { getReportById } from "./reports-firestore"

export const getReportFilesByReportId = async (reportId: string) => {
  const report = await getReportById(reportId)

  const files = report?.files || {}

  return {
    protocol: Array.isArray(files.protocol) ? files.protocol : [],
    papers: Array.isArray(files.papers) ? files.papers : [],
    dataFiles: Array.isArray(files.dataFiles) ? files.dataFiles : []
  }
}
