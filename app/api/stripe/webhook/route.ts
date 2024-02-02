// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { Tables } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"

// Import via bare specifier thanks to the import_map.json file.
import Stripe from "stripe"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const stripe = new Stripe(process.env.STRIPE_API_KEY as string, {
  // This is needed to use the Fetch API rather than relying on the Node http
  // package.
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient()
})
// This is needed in order to use the Web Crypto API in Deno.
const cryptoProvider = Stripe.createSubtleCryptoProvider()

export const runtime = "edge"

export async function POST(request: Request) {
  const signature = request.headers.get("Stripe-Signature")

  // First step is to verify the event. The .text() method must be used as the
  // verification relies on the raw request body rather than the parsed JSON.
  const body = await request.text()
  let receivedEvent
  try {
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
  console.log(`🔔 Event received: ${receivedEvent.id} ${receivedEvent.type}`)

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

function unixToDateString(unix: number | null): string | null {
  if (unix === null) {
    return null
  }
  return new Date(unix * 1000).toISOString()
}

async function upsertSubscription(subscriptionId: string, customerId: string) {
  console.log("upsertSubscription", subscriptionId, customerId)

  const customer = await stripe.customers.retrieve(customerId)
  if (!customer || customer.deleted) {
    throw new Error("No customer found. customerId: " + customerId)
  }

  const userId = customer.metadata.userId
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single()
  if (!profile) {
    console.error("No profile found.", customer.metadata, userId)
    throw new Error("No profile found. customerId: " + customerId)
  }

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
}

async function deleteSubscription(subscription: Stripe.Subscription) {
  console.log("deleteSubscription", subscription.id)
  return supabaseAdmin
    .from("subscriptions")
    .delete()
    .eq("subscription_id", subscription.id)
}
