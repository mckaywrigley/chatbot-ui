"use server"

import Stripe from "stripe"
import { createSupabaseAppServerClient } from "./server-utils"
import {
  getActiveSubscriptions,
  getStripe,
  isRestoreableSubscription
} from "./stripe"
import { Result, errStr, ok } from "../result"

export async function getCheckoutUrl(): Promise<Result<string>> {
  const supabase = createSupabaseAppServerClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) {
    return errStr("User not found")
  }
  const productId = process.env.STRIPE_PRODUCT_ID
  if (typeof productId !== "string") {
    return errStr("Missing Stripe product ID")
  }

  const stripe = getStripe()

  let customer = null
  // check if customer exists, if not create them
  const customers = await stripe.customers.list({ email: user.email })
  if (customers.data.length === 0) {
    customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: user.id
      }
    })
  } else {
    for (const existingCustomer of customers.data) {
      // check if customer already has an active subscription
      const subscriptions = await getActiveSubscriptions(
        stripe,
        existingCustomer.id
      )
      const restoreable = subscriptions.data.some(subscription => {
        return isRestoreableSubscription(subscription)
      })
      if (restoreable) {
        return errStr(
          "Try to restore your subscription. You already have an active subscription."
        )
      }
      customer = existingCustomer
    }
  }

  const price = await retrievePriceAndValidation(stripe, productId)

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer!.id,
    line_items: [
      {
        price: price.id,
        quantity: 1
      }
    ],
    allow_promotion_codes: true,
    success_url: process.env.STRIPE_SUCCESS_URL,
    cancel_url: process.env.STRIPE_RETURN_URL
  })
  if (session.url === null) {
    return errStr("Missing checkout URL")
  }

  return ok(session.url)
}

export async function retrievePriceAndValidation(
  stripe: Stripe,
  productId: string
): Promise<Stripe.Price> {
  const product = await stripe.products.retrieve(productId)
  const priceId = product.default_price
  if (product.active === false || typeof priceId !== "string") {
    throw new Error("Product is not active or has no price")
  }

  const price = await stripe.prices.retrieve(priceId)
  if (price.active === false) {
    throw new Error("Price is not active")
  }
  return price
}

export async function getBillingPortalUrl(): Promise<Result<string>> {
  const supabase = createSupabaseAppServerClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) {
    return errStr("User not found")
  }
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single()
  if (!subscription) {
    return errStr("Subscription not found")
  }

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.customer_id,
    return_url: process.env.STRIPE_RETURN_URL
  })
  if (session.url === null) {
    return errStr("Missing checkout URL")
  }
  return ok(session.url)
}
