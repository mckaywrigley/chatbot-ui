import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { TabsContent } from "@/components/ui/tabs"
import { ChatbotUIContext } from "@/context/context"
import { getBillingPortalUrl } from "@/lib/server/stripe-url"
import { useRouter } from "next/navigation"
import { FC, useContext, useState } from "react"
import { PlanDialog } from "../plan-dialog"
import { restoreSubscription } from "@/lib/server/restore"
import { toast } from "sonner"
import * as Sentry from "@sentry/nextjs"

interface SubscriptionTabProps {
  value: string
}

export const SubscriptionTab: FC<SubscriptionTabProps> = ({ value }) => {
  const router = useRouter()
  const [showPlanDialog, setShowPlanDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const { subscription, setSubscription, profile } =
    useContext(ChatbotUIContext)
  const isPremium = subscription !== null

  const redirectToBillingPortal = async () => {
    const checkoutUrlResult = await getBillingPortalUrl()
    if (checkoutUrlResult.type === "error") {
      toast.error(checkoutUrlResult.error.message)
    } else {
      router.push(checkoutUrlResult.value)
    }
  }

  const handleRestoreButtonClick = async () => {
    try {
      setLoading(true)
      const restoreResult = await restoreSubscription()
      if (restoreResult.type === "error") {
        Sentry.withScope(scope => {
          scope.setExtra("user.id", profile?.user_id)
          Sentry.captureMessage(restoreResult.error.message)
        })
        toast.error(restoreResult.error.message)
      } else {
        if (restoreResult.value === null) {
          toast.warning("You have no subscription to restore.")
        } else {
          toast.info("Your subscription has been restored.")
          setSubscription(restoreResult.value)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const showRestoreSubscription =
    !isPremium && process.env.NEXT_PUBLIC_ENABLE_STRIPE_RESTORE === "true"

  return (
    <TabsContent className="mt-4 space-y-4" value={value}>
      <div>
        <div className="flex items-center space-x-2">
          <Label>Current Plan</Label>
        </div>
        <p className="mt-1">
          <PlanName isPremium={isPremium} />
        </p>
        <p className="mt-4 flex-row space-y-4">
          {isPremium && (
            <Button
              className="w-full"
              variant="destructive"
              disabled={loading}
              onClick={redirectToBillingPortal}
            >
              Manage Subscription
            </Button>
          )}
          {!isPremium && (
            <>
              <Button
                className="w-full"
                variant="destructive"
                disabled={loading}
                onClick={() => setShowPlanDialog(true)}
              >
                Manage Subscription
              </Button>
              <PlanDialog
                showIcon={false}
                open={showPlanDialog}
                onOpenChange={setShowPlanDialog}
              />
            </>
          )}
          {showRestoreSubscription && (
            <Button
              className="w-full"
              variant="secondary"
              disabled={loading}
              onClick={() => handleRestoreButtonClick()}
            >
              Restore Subscription
            </Button>
          )}
        </p>
      </div>
    </TabsContent>
  )
}

interface PlanNameProps {
  isPremium: boolean
}

export const PlanName: FC<PlanNameProps> = ({ isPremium }) => {
  return (
    <span className="text-xl font-bold">{isPremium ? "Plus" : "Free"}</span>
  )
}
