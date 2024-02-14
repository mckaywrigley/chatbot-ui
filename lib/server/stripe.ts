import Stripe from "stripe"

export function getStripe(): Stripe {
  const apiKey = process.env.STRIPE_API_KEY
  if (typeof apiKey !== "string") {
    throw new Error("Missing Stripe API key")
  }
  const stripe = new Stripe(apiKey, {
    apiVersion: "2023-10-16"
  })
  return stripe
}

export async function getCustomersByEmail(
  stripe: Stripe,
  email: string
): Promise<Stripe.Customer[]> {
  const searchResult = await stripe.customers.search({
    query: `email:'${email}'`
  })
  return searchResult.data.filter(c => !c.deleted)
}

export async function getActiveSubscriptions(
  stripe: Stripe,
  customerId: string
) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active"
  })
  return subscriptions
}

export function getRestoreProductIds() {
  const restoreProductIds: string[] = (
    process.env.STRIPE_RESTORE_PRODUCT_IDS || ""
  )
    .split(",")
    .map(id => id.trim())
  restoreProductIds.push(process.env.STRIPE_PRODUCT_ID as string)
  return restoreProductIds
}

export function isRestoreableSubscription(
  subscription: Stripe.Subscription
): boolean {
  const restoreProductIds: string[] = getRestoreProductIds()
  const subscribedProductIds = subscription.items.data.map(item => {
    return item.plan.product
  })
  if (subscribedProductIds.length !== 1) {
    throw new Error("Subscription has more than one product")
  }
  const subscribedProductId = subscribedProductIds[0] as string
  return restoreProductIds.includes(subscribedProductId)
}
