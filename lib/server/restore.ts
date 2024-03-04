"use server"

import * as Sentry from "@sentry/nextjs"

import { Tables } from "@/supabase/types"
import { User } from "@supabase/supabase-js"
import Stripe from "stripe"
import { Result, errStr, ok } from "../result"
import { unixToDateString } from "../utils"
import {
  createSupabaseAdminClient,
  createSupabaseAppServerClient
} from "./server-utils"
import {
  getActiveSubscriptions,
  getCustomersByEmail,
  getStripe,
  isRestoreableSubscription
} from "./stripe"

export type RestoreSusbcriptionResult = {
  subscription: Tables<"subscriptions"> | null
  error: string | null
}

/**
 * This feature is helpful in some situations.
 *  - In case a subscription could not be registered in the DB due to a temporary trouble with WebHook.
 *  - In case to restore a subscription to an older version of HackerGPT.
 */
export async function restoreSubscription(): Promise<
  Result<Tables<"subscriptions"> | null>
> {
  if (process.env.NEXT_PUBLIC_ENABLE_STRIPE_RESTORE !== "true") {
    return errStr("Stripe restore is not enabled")
  }

  const supabase = createSupabaseAppServerClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) {
    return errStr("User not found")
  }

  const stripe = getStripe()
  const email = user.email
  if (!email) {
    return errStr("User email not found")
  }

  const customers = await getCustomersByEmail(stripe, email!)
  if (customers.length === 0) {
    return ok(null)
  }

  for (const customer of customers) {
    const subscriptions = await getActiveSubscriptions(stripe, customer.id)
    for (const subscription of subscriptions.data) {
      if (isRestoreableSubscription(subscription)) {
        const restoredItem = await restoreToDatabase(
          stripe,
          user,
          subscription.id
        )
        return restoredItem
      }
    }
  }

  return errStr("No subscription to restore")
}

async function restoreToDatabase(
  stripe: Stripe,
  user: User,
  subscriptionId: string
): Promise<Result<Tables<"subscriptions">>> {
  const supabaseAdmin = createSupabaseAdminClient()

  // Retrieve the subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  console.log(subscription.cancel_at_period_end)
  // Check if the subscription is already set to cancel at the period end
  if (subscription.cancel_at_period_end) {
    // If not, update the subscription to ensure it does not cancel at the period end
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    })
  }

  // Check if the user has an active subscription already in Supabase
  const { data: subscriptions, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("status", "active")
    .eq("user_id", user.id)
  if (error) {
    Sentry.withScope(scope => {
      scope.setExtras({ error, userId: user.id, subscriptionId })
      scope.captureMessage("error fetching subscriptions")
    })
    return errStr("error fetching subscriptions")
  }
  if (subscriptions.length > 0) {
    // If an active subscription already exists, return it
    return ok(subscriptions[0])
  }

  // Ensure the subscription has a valid customer ID from Stripe
  if (!subscription.customer || typeof subscription.customer !== "string") {
    return errStr("invalid customer value")
  }

  // Restore subscription data in Supabase without attempting to update the Stripe subscription
  const result = await supabaseAdmin.from("subscriptions").upsert(
    {
      subscription_id: subscriptionId,
      user_id: user.id,
      customer_id: subscription.customer,
      status: subscription.status,
      start_date: unixToDateString(subscription.current_period_start),
      cancel_at: subscription.cancel_at
        ? unixToDateString(subscription.cancel_at)
        : null,
      canceled_at: subscription.canceled_at
        ? unixToDateString(subscription.canceled_at)
        : null,
      ended_at: subscription.ended_at
        ? unixToDateString(subscription.ended_at)
        : null
    },
    { onConflict: "subscription_id" }
  )

  if (result.error) {
    console.error(result.error)
    Sentry.withScope(scope => {
      scope.setExtras({ ...result.error, userId: user.id, subscriptionId })
      scope.captureMessage("error upserting subscription")
    })
    return errStr("error upserting subscription")
  }

  // Retrieve and return the newly restored subscription from Supabase
  const newSubscription = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("status", "active")
    .eq("user_id", user.id)
    .single()
  if (newSubscription.error) {
    Sentry.withScope(scope => {
      scope.setExtras({
        ...newSubscription.error,
        userId: user.id,
        subscriptionId
      })
      scope.captureMessage("error fetching new subscription")
    })
    return errStr("error fetching new subscription")
  }
  return ok(newSubscription.data)
}
