import { Database } from "@/supabase/types"
import { SupabaseClient } from "@supabase/supabase-js"

export type RedirectTarget =
  | { kind: "path"; path: string }
  | { kind: "profile_pending" }

export async function getRedirectTarget(
  supabase: SupabaseClient<Database>
): Promise<RedirectTarget> {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session) {
    return { kind: "path", path: "/login" }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_onboarded")
    .eq("user_id", session.user.id)
    .maybeSingle()

  if (!profile) {
    // Signup trigger hasn't completed yet. Caller decides how to stall.
    return { kind: "profile_pending" }
  }

  if (!profile.has_onboarded) {
    return { kind: "path", path: "/onboarding" }
  }

  const { data: homeWorkspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("is_home", true)
    .maybeSingle()

  if (!homeWorkspace) {
    // Onboarded but no home workspace - re-run onboarding to recreate it.
    return { kind: "path", path: "/onboarding" }
  }

  return { kind: "path", path: `/${homeWorkspace.id}` }
}
