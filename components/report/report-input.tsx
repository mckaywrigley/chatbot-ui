import { FC } from "react"
import { useReportContext } from "@/context/reportcontext"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export const ReportInput: FC = () => {
  const { isGenerating } = useReportContext()

  const handleSubmit = () => {
    // Handle report generation
  }

  return (
    <div className="flex flex-col space-y-4">
      <Button onClick={handleSubmit} disabled={isGenerating}>
        {isGenerating ? "Generating..." : "Generate Report"}
      </Button>
    </div>
  )
}
