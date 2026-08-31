"use client"

import { useParams } from "next/navigation"
import { ReportEditor } from "@/components/reports/report-editor"

/**
 * Standalone report route. The editor itself now lives in
 * components/reports/report-editor.tsx so the design flow's Export modal can
 * render the SAME editor - with section editing, per-section regenerate, chart
 * regeneration, templates and PDF/PPTX export all intact - instead of
 * navigating away to this page.
 */
export default function ReportDetailPage() {
  const params = useParams()
  return (
    <ReportEditor
      reportId={params.reportId as string}
      workspaceId={params.workspaceid as string}
      locale={params.locale as string}
      mode="page"
    />
  )
}
