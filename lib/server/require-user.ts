import { createClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export type RequireUserResult =
  | { user: User; response?: undefined }
  | { user?: undefined; response: NextResponse }

export async function requireUser(): Promise<RequireUserResult> {
  const supabase = createClient(cookies())
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  return { user }
}

export async function userOwnsWorkspace(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const supabase = createClient(cookies())
  const { data, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle()

  return !error && !!data
}
