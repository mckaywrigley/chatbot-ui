import { FC, useState } from "react"
import { IconLockOpen } from "@tabler/icons-react"
import { PlanDialog } from "../utility/plan-dialog"

export const ProBadge: FC = () => {
  const [showPlanDialog, setShowPlanDialog] = useState(false)

  const togglePlanDialog = () => {
    setShowPlanDialog(!showPlanDialog)
  }

  return (
    <>
      <div
        className="mt-4 flex cursor-pointer items-center justify-end space-x-1 opacity-75"
        onClick={togglePlanDialog}
      >
        <span className="text-md font-medium">Get Pro</span>
        <IconLockOpen size={16} />
      </div>
      {showPlanDialog && (
        <PlanDialog
          showIcon={false}
          open={showPlanDialog}
          onOpenChange={setShowPlanDialog}
        />
      )}
    </>
  )
}
