import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { ChatbotUIContext } from "@/context/context"
import { getCheckoutUrl } from "@/lib/server/stripe-url"
import * as Sentry from "@sentry/nextjs"
import {
  IconCircleCheck,
  IconLockOpen,
  IconX,
  IconLoader2
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { FC, useContext, useState, useEffect } from "react"
import { toast } from "sonner"

interface PlanDialogProps {
  showIcon?: boolean
  open?: boolean
  onOpenChange?: (value: boolean) => void
}

export const PlanDialog: FC<PlanDialogProps> = ({
  showIcon = true,
  open,
  onOpenChange
}) => {
  const router = useRouter()
  const { profile } = useContext(ChatbotUIContext)
  const [showDialog, setShowDialog] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null) // State to store the fetched URL
  const [isLoading, setIsLoading] = useState(false) // State to track loading status

  useEffect(() => {
    if (!profile || !showDialog) return

    const fetchStripeCheckoutUrl = async () => {
      const result = await getCheckoutUrl()

      if (result.type === "error") {
        Sentry.withScope(scope => {
          scope.setExtras({ userId: profile.user_id })
          scope.captureMessage(result.error.message)
        })
        toast.error(result.error.message)
      } else {
        setCheckoutUrl(result.value)
      }
    }

    fetchStripeCheckoutUrl()
  }, [showDialog, profile?.user_id])

  const handleOpenChange = (value: boolean) => {
    setShowDialog(value)
    if (onOpenChange) onOpenChange(value)
  }

  const handleUpgradeClick = async () => {
    if (checkoutUrl) {
      router.push(checkoutUrl)
    } else if (!isLoading && profile) {
      setIsLoading(true)
      const result = await getCheckoutUrl()
      setIsLoading(false)
      if (result.type === "error") {
        Sentry.withScope(scope => {
          scope.setExtras({ userId: profile.user_id })
          scope.captureMessage(result.error.message)
        })
        toast.error(result.error.message)
      } else {
        router.push(result.value)
      }
    }
  }

  if (!profile) {
    return null
  }

  const show = open ?? showDialog
  return (
    <Dialog open={show} onOpenChange={handleOpenChange}>
      {showIcon && (
        <DialogTrigger asChild>
          <IconLockOpen className="hover:opacity-50" size={24} />
        </DialogTrigger>
      )}

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex justify-between border-b border-gray-300 pb-4">
            <DialogTitle>Upgrade your plan</DialogTitle>
            <IconX
              className="cursor-pointer text-gray-500 hover:opacity-50"
              size={22}
              onClick={() => handleOpenChange(false)}
            />
          </div>
        </DialogHeader>

        <div className="mt-1">
          <div className="mb-2 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div className="mb-4 flex-1 rounded-lg sm:mb-0">
              <h3 className="mb-2 text-lg font-bold">Free</h3>
              <button
                className="mb-4 w-full rounded bg-[#8e8ea0] px-4 py-2 text-[#28292c]"
                disabled
              >
                Your current plan
              </button>
              <FreePlanStatement>
                Access to our HackerGPT model
              </FreePlanStatement>
              <FreePlanStatement>Regular model updates</FreePlanStatement>
              <FreePlanStatement>Standard response speed</FreePlanStatement>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="mb-2 text-lg font-bold">Pro</h3>
                <div className="mb-2 text-lg text-[#8e8ea0]">USD $29/month</div>
              </div>
              <div className="mb-4 grid grid-cols-1 gap-1">
                <Button
                  variant="custom_accent1"
                  onClick={handleUpgradeClick}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <IconLoader2 size={22} className="animate-spin" />
                  ) : (
                    <IconLockOpen color={"white"} size={22} strokeWidth={2} />
                  )}
                  <span className="ml-1 text-white">Upgrade to Pro</span>
                </Button>
              </div>
              <ProsStatement>Access to our HackerGPT Pro model</ProsStatement>
              <ProsStatement>
                Unlimited access to our HackerGPT model
              </ProsStatement>
              <ProsStatement>
                Access to additional tools like Nuclei, Katana, HttpX and more
              </ProsStatement>
              <ProsStatement>Faster response speed</ProsStatement>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProsStatement({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center">
      <div className="icon-container mr-2">
        <IconCircleCheck color={"#43A047"} size={22} strokeWidth={2} />
      </div>
      <div className="text-container flex-1 text-sm">
        <p>{children}</p>
      </div>
    </div>
  )
}

function FreePlanStatement({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center">
      <div className="icon-container mr-2">
        <IconCircleCheck color={"#8e8ea0"} size={22} strokeWidth={2} />
      </div>
      <div className="text-container flex-1 text-sm">
        <p>{children}</p>
      </div>
    </div>
  )
}
