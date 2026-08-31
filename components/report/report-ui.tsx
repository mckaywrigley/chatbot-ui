import { FC } from "react"
import { useReportContext } from "@/context/reportcontext"
import { ReportInput } from "./report-input"

export const ReportUI: FC = () => {
  const { reportDraft } = useReportContext()

  return (
    <div className="flex h-full flex-col">
      {/* Report sections */}
      <div className="flex grow flex-col space-y-4 p-4">
        {/* Data section */}
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 text-lg font-semibold">Input Data</h2>
        </div>

        {/* Report draft */}
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 text-lg font-semibold">Report Draft</h2>
          <div>{reportDraft}</div>
        </div>
      </div>

      {/* Report input */}
      <div className="border-t p-4">
        <ReportInput />
      </div>
    </div>
  )
}
