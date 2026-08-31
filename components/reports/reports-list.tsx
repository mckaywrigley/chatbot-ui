import { ChatbotUIContext } from "../../context/context"
import { FC, useContext } from "react"
import { ReportItem } from "../sidebar/items/reports/report-item"

export const ReportsList: FC = () => {
  const { reports } = useContext(ChatbotUIContext)

  return (
    <div className="flex flex-col space-y-2">
      {reports.map(report => (
        <ReportItem key={report.id} report={report} />
      ))}
    </div>
  )
}
