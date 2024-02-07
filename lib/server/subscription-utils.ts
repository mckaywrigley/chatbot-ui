import { createSupabaseAdminClient } from "./server-utils"

export async function isPremiumUser(userId: string): Promise<boolean> {
  const supabaseAdmin = createSupabaseAdminClient()

  const { data: subscriptions, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
  if (error) {
    throw new Error(error.message)
  }

  return subscriptions.length > 0 ? true : false
}
