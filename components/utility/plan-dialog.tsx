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
import {
  IconCircleCheck,
  // IconCurrencyBitcoin,
  IconLockOpen,
  IconX
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { FC, useContext, useState } from "react"

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

  if (!profile) return null

  const handleOpenChange = (value: boolean) => {
    setShowDialog(value)
    onOpenChange && onOpenChange(value)
  }

  const redirectToStripePortal = async () => {
    const checkoutUrl = await getCheckoutUrl()
    router.push(checkoutUrl)
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
          <div className="flex justify-between">
            <DialogTitle>Your Plan</DialogTitle>
            <IconX
              className="cursor-pointer text-gray-500 hover:opacity-50"
              size={24}
              onClick={() => handleOpenChange(false)}
            />
          </div>
        </DialogHeader>

        <div className="mt-1">
          <div className="mb-2 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div className="bg-hgpt-dark-gray mb-4 flex-1 rounded-lg sm:mb-0">
              <h3 className="mb-2 text-lg font-bold">Free plan</h3>
              <button
                className="text-hgpt-dark-gray mb-4 w-full rounded bg-[#8e8ea0] px-4 py-2 text-[#28292c]"
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
                <h3 className="mb-2 text-lg font-bold">HackerGPT Plus</h3>
                <div className="mb-2 text-lg text-[#8e8ea0]">USD $20/mo</div>
              </div>
              <div className="mb-4 grid grid-cols-1 gap-1">
                <Button
                  variant="custom_accent1"
                  onClick={redirectToStripePortal}
                >
                  <IconLockOpen color={"white"} size={22} strokeWidth={2} />
                  <span className="ml-1 text-white">Upgrade to Plus</span>
                </Button>
                {/* <Button variant="custom_accent2">
                  <IconCurrencyBitcoin
                    color={"white"}
                    size={22}
                    strokeWidth={2}
                  />
                  <span className="ml-1">Pay with Crypto</span>
                </Button> */}
              </div>
              <ProsStatement>
                Unlimited access to our HackerGPT model
              </ProsStatement>
              <ProsStatement>Access to GPT-4 Turbo model</ProsStatement>
              {/* <ProsStatement>
                Access to additional tools like Subfinder, Katana, Web Browsing
                and more
              </ProsStatement> */}
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
