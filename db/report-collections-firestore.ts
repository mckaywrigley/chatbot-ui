/**
 * Firestore-backed report collections helpers.
 *
 * Report documents store collection snapshots under `report.collections`.
 */

import { getReportById, updateReport } from "./reports-firestore"

export const getReportCollectionsByReportId = async (reportId: string) => {
  const report = await getReportById(reportId)
  return report?.collections || []
}

export const setReportCollections = async (
  reportId: string,
  collections: any[]
) => {
  return await updateReport(reportId, { collections })
}
