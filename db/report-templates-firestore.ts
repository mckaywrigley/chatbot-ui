/**
 * Firestore-backed report templates store.
 *
 * Templates capture the structure of a finished report so the user
 * can reuse it on a future project: which sections (with their
 * original heading + description), what visualisation type they
 * picked for the chart, and any custom sections they added in the
 * input flow. Distinct from the built-in templates in
 * `lib/report/templates.ts` which are baked into the app.
 *
 * Client-side wrapper around three API routes:
 *   GET    /api/report-templates?workspaceId=…
 *   POST   /api/report-templates
 *   DELETE /api/report-templates/{templateId}
 */

export interface ReportTemplateSection {
  /** Stable key the templated report uses internally. */
  key: string
  title: string
  description?: string
  group?: string
  /** Sections marked as custom were added by the user (not built-in). */
  custom?: boolean
}

export interface ReportTemplateRow {
  id: string
  user_id: string
  workspace_id: string
  name: string
  description: string | null
  sections: ReportTemplateSection[]
  /** Persisted chart preference (bar / line / pie / none) when present. */
  chart_type?: "bar" | "line" | "pie" | null
  /** Convenience count for slab rendering - kept in sync server-side. */
  section_count: number
  created_at: string
  updated_at: string | null
}

export interface ReportTemplateInput {
  name: string
  description?: string | null
  sections: ReportTemplateSection[]
  chart_type?: "bar" | "line" | "pie" | null
}

export async function listReportTemplates(
  workspaceId: string
): Promise<ReportTemplateRow[]> {
  const res = await fetch(
    `/api/report-templates?workspaceId=${encodeURIComponent(workspaceId)}`
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? "Failed to fetch templates")
  }
  const data = (await res.json()) as { templates: ReportTemplateRow[] }
  return data.templates ?? []
}

export async function createReportTemplate(
  workspaceId: string,
  input: ReportTemplateInput
): Promise<ReportTemplateRow> {
  const res = await fetch("/api/report-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId, ...input })
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? "Failed to save template")
  }
  const data = (await res.json()) as { template: ReportTemplateRow }
  return data.template
}

export async function deleteReportTemplate(templateId: string): Promise<void> {
  const res = await fetch(
    `/api/report-templates/${encodeURIComponent(templateId)}`,
    { method: "DELETE" }
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? "Failed to delete template")
  }
}
