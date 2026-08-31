import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChatbotUIContext } from "@/context/context"
import { useReportContext } from "@/context/reportcontext"
import { updateChat } from "@/db/chats"
import { Tables } from "@/supabase/types"
import { IconEdit } from "@tabler/icons-react"
import { FC, useContext, useRef, useState } from "react"
import { updateReport } from "@/db/reports-firestore"
import { ReportContext } from "@/context/reportcontext"

interface UpdateReportProps {
  report: Tables<"reports">
}

export const UpdateReport: FC<UpdateReportProps> = ({ report }) => {
  const { setReports } = useContext(ReportContext)

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showReportDialog, setShowReportDialog] = useState(false)
  const [name, setName] = useState(report.name)

  const handleUpdateReport = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const updatedReport = await updateReport(report.id, {
      name
    })
    setReports(prevState =>
      prevState.map(r => (r.id === report.id ? updatedReport : r))
    )

    setShowReportDialog(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  return (
    <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
      <DialogTrigger asChild>
        <IconEdit className="hover:opacity-50" size={18} />
      </DialogTrigger>

      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Edit Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <Label>Name</Label>

          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowReportDialog(false)}>
            Cancel
          </Button>

          <Button ref={buttonRef} onClick={handleUpdateReport}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
