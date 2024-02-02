import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { TabsContent } from "@/components/ui/tabs"
import { ChatbotUIContext } from "@/context/context"
import { getBillingPortalUrl } from "@/lib/server/stripe-url"
import { useRouter } from "next/navigation"
import { FC, useContext, useState } from "react"
import { PlanDialog } from "../plan-dialog"

interface SubscriptionTabProps {
  value: string
}

export const SubscriptionTab: FC<SubscriptionTabProps> = ({ value }) => {
  const router = useRouter()
  const [showPlanDialog, setShowPlanDialog] = useState(false)
  const { subscription } = useContext(ChatbotUIContext)
  const isPremium = subscription !== null

  const redirectToBillingPortal = async () => {
    const checkoutUrl = await getBillingPortalUrl()
    router.push(checkoutUrl)
  }

  return (
    <TabsContent className="mt-4 space-y-4" value={value}>
      <div>
        <div className="flex items-center space-x-2">
          <Label>Current Plan</Label>
        </div>
        <p className="mt-1">
          <PlanName isPremium={isPremium} />
        </p>
        <p className="mt-4">
          {isPremium && (
            <Button
              className="w-full"
              variant="destructive"
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
