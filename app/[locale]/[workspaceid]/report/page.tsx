"use client"

import { useReportHandler } from "@/components/report/report-hooks/use-report-handler"
import { ReportInput } from "@/components/report/report-input"
import { Brand } from "@/components/ui/brand"
import { useReportContext } from "@/context/reportcontext"
import useHotkey from "@/lib/hooks/use-hotkey"
import { useTheme } from "next-themes"
import { ReportReviewComponent } from "./components/report-review"

export default function ReportPage() {
  // Hotkeys for new report and focus
  useHotkey("o", () => handleNewReport())
  useHotkey("l", () => {
    handleFocusReportInput()
  })

  const { selectedReport, reportDraft } = useReportContext()
  const { handleNewReport, handleFocusReportInput } = useReportHandler()
  const { theme } = useTheme()

  return (
    <>
      {!selectedReport || !reportDraft ? (
        // Empty state when no report is selected
        <div className="relative flex h-full flex-col items-center justify-center">
          <div className="top-50% left-50% -translate-x-50% -translate-y-50% absolute mb-20">
            <Brand theme={theme === "dark" ? "dark" : "light"} />
          </div>

          <div className="flex grow flex-col items-center justify-center" />
          <div className="w-full min-w-[300px] items-end px-2 pb-3 pt-0 sm:w-[600px] sm:pb-8 sm:pt-5 md:w-[700px] lg:w-[700px] xl:w-[800px]">
            <ReportInput />
          </div>
        </div>
      ) : (
        // Show report UI when a report is selected
        <div className="container mx-auto flex h-full flex-col p-4">
          <h1 className="text-primary mb-6 text-center text-3xl font-semibold">
            Report
          </h1>
          <div className="grow">
            <ReportReviewComponent
              reportId={selectedReport.id}
              onSave={() => {}}
            />
          </div>
        </div>
      )}
    </>
  )
}
