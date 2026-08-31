"use client"

import { useParams } from "next/navigation"
import { ReportReviewComponent } from "../components/report-review"
import { useReportContext } from "@/context/reportcontext"

export default function ReportIDPage() {
  const params = useParams()

  return (
    <div className="container mx-auto flex h-full flex-col p-4">
      <h1 className="text-primary mb-6 text-center text-3xl font-semibold">
        Report
      </h1>
      <div className="grow">
        <ReportReviewComponent
          reportId={params.reportid as string}
          onSave={() => {}}
        />
      </div>
    </div>
  )
}
