import { createClient } from "@/lib/supabase/server"
import { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { OnboardingForm } from "./onboarding-form"
import { AuthHero } from "@/components/auth/auth-hero"
import { Brand } from "@/components/ui/brand"

export const metadata: Metadata = {
  title: "Welcome"
}

export default async function OnboardingPage() {
  const supabase = createClient(cookies())

  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session) {
    // Middleware should already have redirected, but guard anyway.
    return redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, display_name, role, research_field, use_case, onboarding_step, has_onboarded"
    )
    .eq("user_id", session.user.id)
    .maybeSingle()

  if (profile?.has_onboarded) {
    // Already done - get them out.
    const { data: homeWorkspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("is_home", true)
      .maybeSingle()
    if (homeWorkspace) return redirect(`/${homeWorkspace.id}`)
  }

  const emailLocalPart = session.user.email?.split("@")[0] ?? ""

  return (
    <div className="bg-paper flex min-h-dvh w-full">
      <AuthHero />
      <main className="flex w-full flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[560px]">
          {/* Mobile brand */}
          <div className="mb-6 flex justify-center lg:hidden">
            <Brand size={26} />
          </div>
          {profile ? (
            <OnboardingForm
              initialStep={profile.onboarding_step ?? 0}
              initialDisplayName={profile.display_name || emailLocalPart}
              initialRole={
                (profile.role as
                  | "phd_scholar"
                  | "postdoc"
                  | "research_scientist"
                  | "principal_scientist"
                  | "lab_head_pi"
                  | "research_manager"
                  | "other"
                  | null) ?? null
              }
              initialResearchField={profile.research_field ?? ""}
              initialUseCase={profile.use_case ?? null}
            />
          ) : (
            <ProfilePendingFallback />
          )}
        </div>
      </main>
    </div>
  )
}

function ProfilePendingFallback() {
  return (
    <div className="border-line bg-surface flex w-full max-w-[480px] flex-col items-center gap-3 rounded-xl border p-10 text-center shadow-sm">
      <div className="text-ink text-[18px] font-medium">
        Setting up your account…
      </div>
      <div className="text-ink-3 text-[13px]">
        This takes a moment. Refresh if it doesn&apos;t appear shortly.
      </div>
      <meta httpEquiv="refresh" content="2" />
    </div>
  )
}
