"use client"

import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { RoleStep } from "@/components/onboarding/role-step"
import { UseCaseStep } from "@/components/onboarding/use-case-step"
import { FC, useState, useTransition } from "react"
import { toast } from "sonner"
import { setWalkthroughActive } from "@/components/onboarding/design-coach"
import { track } from "@/lib/analytics"
import { completeOnboarding, saveOnboardingStep1 } from "./actions"

type Role =
  | "phd_scholar"
  | "postdoc"
  | "research_scientist"
  | "principal_scientist"
  | "lab_head_pi"
  | "research_manager"
  | "other"
type UseCase = "design" | "validate" | "explore" | "browse"

interface OnboardingFormProps {
  initialStep: number
  initialDisplayName: string
  initialRole: Role | null
  initialResearchField: string
  /** CSV of previously-selected use-cases (profiles.use_case). */
  initialUseCase: string | null
}

const USE_CASE_VALUES: UseCase[] = ["design", "validate", "explore", "browse"]

export const OnboardingForm: FC<OnboardingFormProps> = ({
  initialStep,
  initialDisplayName,
  initialRole,
  initialResearchField,
  initialUseCase
}) => {
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState<1 | 2>(initialStep >= 1 ? 2 : 1)

  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [role, setRole] = useState<Role | null>(initialRole)
  const [researchField, setResearchField] = useState(initialResearchField)

  const [useCases, setUseCases] = useState<UseCase[]>(
    (initialUseCase ?? "")
      .split(",")
      .map(s => s.trim())
      .filter((s): s is UseCase => USE_CASE_VALUES.includes(s as UseCase))
  )
  const toggleUseCase = (value: UseCase) =>
    setUseCases(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )

  const handleStep1Continue = () => {
    if (!displayName.trim()) {
      toast.error("Display name is required.")
      return
    }
    if (!role) {
      toast.error("Pick a role to continue.")
      return
    }

    startTransition(async () => {
      const result = await saveOnboardingStep1({
        display_name: displayName.trim(),
        role,
        research_field: researchField.trim() || null
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      track("onboarding_step1_completed", { role: role ?? "unknown" })
      setStep(2)
    })
  }

  const handleFinish = () => {
    if (useCases.length === 0) {
      toast.error("Pick at least one thing you'd like to do.")
      return
    }

    startTransition(async () => {
      const result = await completeOnboarding({ use_cases: useCases })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      // Fresh signup just finished onboarding → arm the first-run walkthrough
      // (the ONLY place it's armed, so existing accounts never see it). The
      // flag survives the full-page nav below and GuidedTour picks it up.
      track("onboarding_completed", { use_cases: useCases.join(",") })
      setWalkthroughActive(true)
      // Full page navigation so GlobalState remounts with the freshly-saved
      // profile (display_name, use_case) - a client-side router.replace would
      // leave stale context behind and skip the personalization payoff.
      const target = result.homeWorkspaceId ? `/${result.homeWorkspaceId}` : "/"
      window.location.href = target
    })
  }

  if (step === 1) {
    return (
      <OnboardingShell
        stepNum={1}
        totalSteps={2}
        eyebrow="Step 1 of 2"
        title="Welcome to Shadow AI"
        description="A couple of quick things so we can tailor your experience."
        onContinue={handleStep1Continue}
        continueLabel="Continue"
        continueDisabled={isPending || !displayName.trim() || !role}
        isPending={isPending}
      >
        <RoleStep
          displayName={displayName}
          role={role}
          researchField={researchField}
          onDisplayNameChange={setDisplayName}
          onRoleChange={setRole}
          onResearchFieldChange={setResearchField}
        />
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell
      stepNum={2}
      totalSteps={2}
      eyebrow="Step 2 of 2"
      title="What brings you here today?"
      description="Pick everything that fits - you can explore the rest later."
      onBack={() => setStep(1)}
      onContinue={handleFinish}
      continueLabel="Open my workspace"
      continueDisabled={isPending || useCases.length === 0}
      isPending={isPending}
    >
      <UseCaseStep useCases={useCases} onToggle={toggleUseCase} />
    </OnboardingShell>
  )
}
