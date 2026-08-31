"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { FC } from "react"

type Role =
  | "phd_scholar"
  | "postdoc"
  | "research_scientist"
  | "principal_scientist"
  | "lab_head_pi"
  | "research_manager"
  | "other"

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "phd_scholar", label: "PhD Scholar" },
  { value: "postdoc", label: "Postdoc" },
  { value: "research_scientist", label: "Research Scientist" },
  { value: "principal_scientist", label: "Principal Scientist" },
  { value: "lab_head_pi", label: "Lab Head / PI" },
  { value: "research_manager", label: "Research Manager" },
  { value: "other", label: "Other" }
]

// Suggestions are scoped to life-sciences / biotech only - Shadow AI's
// target B2C audience is wet-lab scientists, not CS / ML / physics
// researchers. Keeping the chip row biotech-flavoured signals product
// fit on first run instead of inviting off-target signups.
const FIELD_SUGGESTIONS = [
  "Drug Discovery",
  "Drug Formulation",
  "Analytical Chemistry",
  "Molecular Biology",
  "Biochemistry",
  "Cell Biology",
  "Genetics & Genomics",
  "Immunology",
  "Pharmacology & Toxicology",
  "Neuroscience",
  "Microbiology & Infectious Disease",
  "Bioprocessing & Manufacturing",
  "Clinical & Translational Research",
  "Computational Biology / Bioinformatics"
]

interface RoleStepProps {
  displayName: string
  role: Role | null
  researchField: string
  onDisplayNameChange: (value: string) => void
  onRoleChange: (value: Role) => void
  onResearchFieldChange: (value: string) => void
}

export const RoleStep: FC<RoleStepProps> = ({
  displayName,
  role,
  researchField,
  onDisplayNameChange,
  onRoleChange,
  onResearchFieldChange
}) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="display_name"
          className="text-ink text-[12.5px] font-medium"
        >
          What should we call you?
        </Label>
        <Input
          id="display_name"
          value={displayName}
          onChange={e => onDisplayNameChange(e.target.value)}
          placeholder="Your name"
          autoComplete="given-name"
          maxLength={80}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-ink text-[12.5px] font-medium">Your role</Label>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map(opt => {
            const selected = role === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onRoleChange(opt.value)}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-medium transition-colors",
                  selected
                    ? "border-rust bg-rust text-paper"
                    : "border-line bg-surface text-ink-2 hover:bg-paper-2 hover:text-ink"
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <Label
            htmlFor="research_field"
            className="text-ink text-[12.5px] font-medium"
          >
            Research field
          </Label>
          <span className="text-ink-3 text-[11.5px]">Optional</span>
        </div>
        <Input
          id="research_field"
          value={researchField}
          onChange={e => onResearchFieldChange(e.target.value)}
          placeholder="e.g. Molecular biology"
          maxLength={100}
        />
        <div className="mt-1 flex flex-wrap gap-1.5">
          {FIELD_SUGGESTIONS.map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onResearchFieldChange(suggestion)}
              className={cn(
                "border-line text-ink-3 hover:bg-paper-2 hover:text-ink inline-flex h-6 items-center rounded-full border px-2.5 text-[11.5px] transition-colors",
                researchField === suggestion &&
                  "border-rust bg-rust-soft text-rust-ink"
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
