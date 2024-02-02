"use server"

import Stripe from "stripe"
import { createSupabaseAppServerClient } from "./server-utils"

export async function getCheckoutUrl(): Promise<string> {
  const supabase = createSupabaseAppServerClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) {
    throw new Error("User not found")
  }
  const productId = process.env.STRIPE_PRODUCT_ID
  if (typeof productId !== "string") {
    throw new Error("Missing Stripe product ID")
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
    customer = customers.data[0]
  }

  const price = await retrievePriceAndValidation(stripe, productId)

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
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
    throw new Error("Missing checkout URL")
  }

  return session.url
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

export async function getBillingPortalUrl() {
  const supabase = createSupabaseAppServerClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) {
    throw new Error("User not found")
  }
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single()
  if (!subscription) {
    throw new Error("Subscription not found")
  }

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.customer_id,
    return_url: process.env.STRIPE_RETURN_URL
  })
  if (session.url === null) {
    throw new Error("Missing checkout URL")
  }
  return session.url
}

function getStripe() {
  const apiKey = process.env.STRIPE_API_KEY
  if (typeof apiKey !== "string") {
    throw new Error("Missing Stripe API key")
  }
  const stripe = new Stripe(apiKey, {
    apiVersion: "2023-10-16"
  })
  return stripe
}
