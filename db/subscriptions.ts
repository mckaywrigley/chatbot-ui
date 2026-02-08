// db/subscriptions.ts
import { supabase } from "@/lib/supabase/service-role"
import { Tables, TablesInsert, TablesUpdate } from "@/supabase/types"

export type Subscription = Tables<"subscriptions">
export type SubscriptionInsert = TablesInsert<"subscriptions">
export type SubscriptionUpdate = TablesUpdate<"subscriptions">

export async function getSubscriptionByUserId(
  userId: string
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error && error.code !== "PGRST116") {
    throw new Error(`Error fetching subscription: ${error.message}`)
  }

  return data
}

export async function getSubscriptionByStripeId(
  stripeSubscriptionId: string
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .single()

  if (error && error.code !== "PGRST116") {
    throw new Error(`Error fetching subscription: ${error.message}`)
  }

  return data
}

export async function createSubscription(
  subscription: SubscriptionInsert
): Promise<Subscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .insert(subscription)
    .select()
    .single()

  if (error) {
    throw new Error(`Error creating subscription: ${error.message}`)
  }

  return data
}

export async function updateSubscription(
  stripeSubscriptionId: string,
  updates: SubscriptionUpdate
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .select()
    .single()

  if (error) {
    // PGRST116 = no rows found — subscription may not exist yet
    // (Stripe can fire "updated" before "checkout.session.completed")
    if (error.code === "PGRST116") {
      console.warn(
        `[updateSubscription] No subscription found for stripe_subscription_id: ${stripeSubscriptionId} — likely a race condition with checkout.session.completed`
      )
      return null
    }
    throw new Error(`Error updating subscription: ${error.message}`)
  }

  return data
}

export async function upsertSubscription(
  subscription: SubscriptionInsert
): Promise<Subscription> {
  console.log("[upsertSubscription] Input:", JSON.stringify(subscription))

  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(subscription, {
      onConflict: "user_id"
    })
    .select()
    .single()

  if (error) {
    console.error("[upsertSubscription] Error:", error)
    console.error("[upsertSubscription] Error code:", error.code)
    console.error("[upsertSubscription] Error details:", error.details)
    throw new Error(`Error upserting subscription: ${error.message}`)
  }

  console.log("[upsertSubscription] Success:", JSON.stringify(data))
  return data
}
