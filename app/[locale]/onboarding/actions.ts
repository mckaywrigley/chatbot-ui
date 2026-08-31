"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

const ROLE_VALUES = [
  "phd_scholar",
  "postdoc",
  "research_scientist",
  "principal_scientist",
  "lab_head_pi",
  "research_manager",
  "other"
] as const
const USE_CASE_VALUES = ["design", "validate", "explore", "browse"] as const

type Role = (typeof ROLE_VALUES)[number]
type UseCase = (typeof USE_CASE_VALUES)[number]

export type Step1Input = {
  display_name: string
  role: Role
  research_field: string | null
}

export type Step2Input = {
  /** One or more selected use-cases (stored CSV in profiles.use_case). */
  use_cases: UseCase[]
}

export type OnboardingResult =
  | { ok: true; homeWorkspaceId: string | null }
  | { ok: false; error: string }

async function getSessionAndProfile() {
  const supabase = createClient(cookies())
  const {
    data: { session }
  } = await supabase.auth.getSession()
  if (!session) return { supabase, session: null as null, profileId: null }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", session.user.id)
    .maybeSingle()

  return { supabase, session, profileId: profile?.id ?? null }
}

export async function saveOnboardingStep1(
  input: Step1Input
): Promise<OnboardingResult> {
  const { supabase, session, profileId } = await getSessionAndProfile()
  if (!session) return { ok: false, error: "Not signed in." }
  if (!profileId)
    return { ok: false, error: "Profile not ready. Please wait a moment." }

  const display_name = input.display_name.trim()
  if (!display_name) return { ok: false, error: "Display name is required." }
  if (!ROLE_VALUES.includes(input.role)) {
    return { ok: false, error: "Please pick a role." }
  }

  const research_field = input.research_field?.trim() || null
  if (research_field && research_field.length > 100) {
    return { ok: false, error: "Research field is too long." }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name,
      role: input.role,
      research_field,
      onboarding_step: 1
    })
    .eq("id", profileId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, homeWorkspaceId: null }
}

export async function completeOnboarding(
  input: Step2Input
): Promise<OnboardingResult> {
  const { supabase, session, profileId } = await getSessionAndProfile()
  if (!session) return { ok: false, error: "Not signed in." }
  if (!profileId)
    return { ok: false, error: "Profile not ready. Please wait a moment." }

  const useCases = (input.use_cases ?? []).filter(u =>
    USE_CASE_VALUES.includes(u)
  )
  if (useCases.length === 0) {
    return { ok: false, error: "Please pick at least one option." }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      use_case: useCases.join(","),
      onboarding_step: 2,
      has_onboarded: true
    })
    .eq("id", profileId)

  if (error) return { ok: false, error: error.message }

  const { data: homeWorkspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("is_home", true)
    .maybeSingle()

  return { ok: true, homeWorkspaceId: homeWorkspace?.id ?? null }
}
