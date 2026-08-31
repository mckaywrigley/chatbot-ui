import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { useReportHandler } from "@/components/report/report-hooks/use-report-handler"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { useReportContext } from "@/context/reportcontext"
import { deleteReport } from "@/db/reports-firestore"
import useHotkey from "@/lib/hooks/use-hotkey"
import { Tables } from "@/supabase/types"
import { IconTrash } from "@tabler/icons-react"
import { FC, useRef, useState } from "react"

interface DeleteReportProps {
  report: Tables<"reports">
}

export const DeleteReport: FC<DeleteReportProps> = ({ report }) => {
  useHotkey("Backspace", () => setShowReportDialog(true))

  const { setReports } = useReportContext()
  const { handleNewReport } = useReportHandler()

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showReportDialog, setShowReportDialog] = useState(false)

  const handleDeleteReport = async () => {
    await deleteReport(report.id)

    setReports(prevState => prevState.filter(r => r.id !== report.id))

    setShowReportDialog(false)

    handleNewReport()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  return (
    <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
      <DialogTrigger asChild>
        <IconTrash className="hover:opacity-50" size={18} />
      </DialogTrigger>

      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Delete {report.name}</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this report?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowReportDialog(false)}>
            Cancel
          </Button>

          <Button
            ref={buttonRef}
            variant="destructive"
            onClick={handleDeleteReport}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
