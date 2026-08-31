import { IconFileAnalytics } from "@tabler/icons-react"
import { FC, useContext, useEffect, useState } from "react"
import { SidebarItem } from "../sidebar/items/all/sidebar-display-item"
import { Tables } from "../../supabase/types"
import { Label } from "../ui/label"
import { CollectionFile } from "@/types/collection-file"
import { getProjectById } from "@/db/projects"
import { ChatbotUIContext } from "../../context/context"

interface ReportItemProps {
  report: Tables<"reports">
}

export const ReportItem: FC<ReportItemProps> = ({ report }) => {
  const [projectName, setProjectName] = useState<string | null>(null)

  useEffect(() => {
    if (report.project_id) {
      getProjectById(report.project_id).then(project => {
        setProjectName(project?.name || null)
      })
    }
  }, [report.project_id])

  return (
    <SidebarItem
      item={report}
      isTyping={false}
      contentType="reports"
      icon={<IconFileAnalytics size={30} />}
      updateState={{
        name: report.name,
        description: report.description
      }}
      renderInputs={(renderState: {
        startingReports: Tables<"reports">[]
        setStartingReports: React.Dispatch<
          React.SetStateAction<Tables<"reports">[]>
        >
        selectedReports: Tables<"reports">[]
        setSelectedReports: React.Dispatch<
          React.SetStateAction<Tables<"reports">[]>
        >
      }) => {
        return (
          <div className="space-y-1">
            <Label>Reports</Label>
            {projectName && (
              <div className="text-xs text-slate-500">
                Project: {projectName}
              </div>
            )}
          </div>
        )
      }}
    />
  )
}
