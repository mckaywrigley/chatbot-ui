"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { useAlertContext } from "@/context/alert-context"
import { IconX } from "@tabler/icons-react"

export const GlobalAlertDialog = () => {
  const { state, dispatch } = useAlertContext()

  const handleOpenChange = (value: boolean) => {
    dispatch({ type: "HIDE" })
  }

  return (
    <Dialog open={!!state.message} onOpenChange={handleOpenChange}>
      <DialogContent className="xl:max-w-xl">
        <DialogHeader>
          <div className="flex justify-between">
            <DialogTitle>{state.title || "Alert"}</DialogTitle>
            <IconX
              className="cursor-pointer text-gray-500 hover:opacity-50"
              size={24}
              onClick={() => handleOpenChange(false)}
            />
          </div>
        </DialogHeader>

        <div className="mt-4">
          <p className="whitespace-pre-wrap">{state.message}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
