import { supabase } from "@/lib/supabase/browser-client"

export async function getSubscriptionByUserId(userId: string) {
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single()

  return subscription
}
