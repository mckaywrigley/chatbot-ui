"use client"

import { FC, useEffect, useState } from "react"
import { IconClipboardList } from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface StudyDetails {
  successCriteria: string
  includeReplicates: "yes" | "no" | ""
  replicateCount: string
  constraintMaterial: string
  constraintTime: string
  constraintEquipment: string
  variablesKnown: string
  variablesUnknown: string
  additionalDetails: string
}

interface StudyDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: StudyDetails
  /** What happens after these are captured, so the copy can name it. */
  nextStepLabel: string
  onSubmit: (details: StudyDetails) => void
}

/**
 * Asked ONCE, before anything is generated. These fields already existed on the
 * Problem page but were never requested, so the researcher only discovered them
 * after the fact - and the hypotheses and design had already been built without
 * them.
 *
 * They feed the HYPOTHESIS and DESIGN prompts only. The literature search is
 * deliberately excluded: constraints and success thresholds narrow which papers
 * come back without making them more relevant, which is what diluted the search
 * when the old problem-stage questions existed.
 */
export const StudyDetailsModal: FC<StudyDetailsModalProps> = ({
  open,
  onOpenChange,
  initial,
  nextStepLabel,
  onSubmit
}) => {
  const [d, setD] = useState<StudyDetails>(initial)

  useEffect(() => {
    if (open) setD(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = <K extends keyof StudyDetails>(k: K, v: StudyDetails[K]) =>
    setD(prev => ({ ...prev, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto pr-1 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconClipboardList size={17} className="text-teal-journey" />A few
            details before we start
          </DialogTitle>
          <DialogDescription>
            These shape the hypotheses and the design — what counts as success,
            and what you actually have to work with. They aren&apos;t used for
            the literature search. Everything here is optional; skip what you
            don&apos;t know yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="sd-success">Success criteria</Label>
            <Textarea
              id="sd-success"
              rows={2}
              placeholder="What result counts as a win? e.g. viscosity below 20 cP at 150 mg/mL with monomer ≥ 95%."
              value={d.successCriteria}
              onChange={e => set("successCriteria", e.target.value)}
            />
            <p className="text-ink-3 text-[11.5px]">
              Also the target the pre-lab simulation is scored against.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Replicates</Label>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["no", "No replicates (n = 1)"],
                  ["yes", "Include replicates"]
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set("includeReplicates", val)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12px] transition-colors",
                    d.includeReplicates === val
                      ? "border-ink bg-ink text-white"
                      : "border-line text-ink-2 hover:border-line-strong"
                  )}
                >
                  {label}
                </button>
              ))}
              {d.includeReplicates === "yes" && (
                <Input
                  value={d.replicateCount}
                  onChange={e => set("replicateCount", e.target.value)}
                  placeholder="n per condition, e.g. 3"
                  className="h-8 w-[180px] text-[12px]"
                />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Constraints</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                value={d.constraintMaterial}
                onChange={e => set("constraintMaterial", e.target.value)}
                placeholder="Material, e.g. 250 mg"
                className="text-[12.5px]"
              />
              <Input
                value={d.constraintTime}
                onChange={e => set("constraintTime", e.target.value)}
                placeholder="Time, e.g. 2 weeks"
                className="text-[12.5px]"
              />
              <Input
                value={d.constraintEquipment}
                onChange={e => set("constraintEquipment", e.target.value)}
                placeholder="Equipment on hand"
                className="text-[12.5px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Variables</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Textarea
                rows={2}
                value={d.variablesKnown}
                onChange={e => set("variablesKnown", e.target.value)}
                placeholder="Known — what you can set or already understand"
              />
              <Textarea
                rows={2}
                value={d.variablesUnknown}
                onChange={e => set("variablesUnknown", e.target.value)}
                placeholder="Unknown — what you're trying to find out"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sd-extra">Additional details</Label>
            <Textarea
              id="sd-extra"
              rows={3}
              placeholder="Stock concentrations, buffers and pH, plate/tube format, instruments and settings, incubation time and temperature, controls you always run, anything that must not change."
              value={d.additionalDetails}
              onChange={e => set("additionalDetails", e.target.value)}
            />
            <p className="text-ink-3 text-[11.5px]">
              The more concrete this is, the fewer choices we have to make for
              you — and the more exact the calculations come out.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onSubmit(d)}>
            Skip for now
          </Button>
          <Button variant="primary" onClick={() => onSubmit(d)}>
            {nextStepLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
