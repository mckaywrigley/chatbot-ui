// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { unixToDateString } from "@/lib/utils"
import { createClient } from "@supabase/supabase-js"
import { getStripe } from "@/lib/server/stripe"

// Import via bare specifier thanks to the import_map.json file.
import Stripe from "stripe"

export const runtime = "edge"

export async function POST(request: Request) {
  const signature = request.headers.get("Stripe-Signature")

  // This is needed in order to use the Web Crypto API in Deno.
  const cryptoProvider = Stripe.createSubtleCryptoProvider()

  // First step is to verify the event. The .text() method must be used as the
  // verification relies on the raw request body rather than the parsed JSON.
  const body = await request.text()
  let receivedEvent
  try {
    const stripe = getStripe()
    receivedEvent = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SIGNING_SECRET!,
      undefined,
      cryptoProvider
    )
  } catch (err: any) {
    console.error(err.message)
    return new Response(err.message, { status: 400 })
  }
  // console.log(`🔔 Event received: ${receivedEvent.id} ${receivedEvent.type}`)

  // Reference:
  // https://stripe.com/docs/billing/subscriptions/build-subscriptions
  try {
    switch (receivedEvent.type) {
      // Payment is successful and the subscription is created.
      // You should provision the subscription and save the customer ID to your database.
      case "checkout.session.completed":
      // Continue to provision the subscription as payments continue to be made.
      // Store the status in your database and check when a user accesses your service.
      // This approach helps you avoid hitting rate limits.
      case "invoice.paid":
        await upsertSubscription(
          receivedEvent.data.object.subscription as string,
          receivedEvent.data.object.customer as string
        )
        break
      case "customer.subscription.updated":
        await upsertSubscription(
          receivedEvent.data.object.id as string,
          receivedEvent.data.object.customer as string
        )
        break
      case "customer.subscription.deleted":
        await deleteSubscription(
          receivedEvent.data.object as Stripe.Subscription
        )
        break
      case "invoice.payment_failed":
        // The payment failed or the customer does not have a valid payment method.
        // The subscription becomes past_due. Notify your customer and send them to the
        // customer portal to update their payment information.
        break
      default:
      // Unhandled event type
    }
  } catch (err: any) {
    console.error(err.message)
    return new Response(err.message, { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

// Retry configuration
const MAX_RETRY_ATTEMPTS = 5 // Maximum number of retry attempts
const RETRY_DELAY_MS = 2000 // Delay between retries in milliseconds

// Modified upsertSubscription function with retry mechanism
async function upsertSubscription(
  subscriptionId: string,
  customerId: string,
  attempt = 0
) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const stripe = getStripe()
  const customer = await stripe.customers.retrieve(customerId)
  if (!customer || customer.deleted) {
    throw new Error("No customer found. customerId: " + customerId)
  }

  // Attempt to fetch the user profile
  const userId = customer.metadata.userId
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single()

  // If profile is found, proceed as normal
  if (profile) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    const result = await supabaseAdmin.from("subscriptions").upsert(
      {
        subscription_id: subscriptionId,
        user_id: profile.user_id,
        customer_id: customerId,
        status: subscription.status,
        start_date: unixToDateString(subscription.start_date),
        cancel_at: unixToDateString(subscription.cancel_at),
        canceled_at: unixToDateString(subscription.canceled_at),
        ended_at: unixToDateString(subscription.ended_at)
      },
      { onConflict: "subscription_id" }
    )
    if (result.error) {
      console.error(result.error)
      throw new Error(result.error.message)
    }
  } else if (attempt < MAX_RETRY_ATTEMPTS) {
    // If profile is not found and maximum retry attempts are not reached, retry after a delay
    setTimeout(
      () => upsertSubscription(subscriptionId, customerId, attempt + 1),
      RETRY_DELAY_MS
    )
  } else {
    // If maximum retry attempts are reached and profile is still not found, throw an error
    console.error(
      "No profile found after maximum retry attempts.",
      customer.metadata,
      userId
    )
    throw new Error(
      "No profile found. Maximum retry attempts reached. customerId: " +
        customerId
    )
  }
}

async function deleteSubscription(subscription: Stripe.Subscription) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  return supabaseAdmin
    .from("subscriptions")
    .delete()
    .eq("subscription_id", subscription.id)
}
