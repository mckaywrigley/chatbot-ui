"use server"

import { cookies } from "next/headers"

import { createClient } from "@/lib/supabase/server"

/**
 * Flip `profiles.viewed_walkthrough` to TRUE once the user finishes or
 * skips the first-run product tour. Idempotent - safe to call from
 * either the "Finish" button or an early "Skip".
 */
export async function markWalkthroughViewed(): Promise<{
  ok: boolean
  error?: string
}> {
  const supabase = createClient(cookies())
  const {
    data: { session }
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: "Not signed in." }

  const { error } = await supabase
    .from("profiles")
    .update({ viewed_walkthrough: true })
    .eq("user_id", session.user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
