"use client"

/**
 * Client-side user preferences (Lab standards, Notifications) persisted in
 * localStorage - no DB columns exist for these yet, so they live per-device.
 * Lab standards are the impactful one: `labStandardsToText` turns them into a
 * directive block injected into the design generation + chat so every output
 * honours the researcher's defaults (the "mastery" config).
 */

export interface LabStandards {
  /** Replicate default for generated designs. */
  replicates: "auto" | "require" | "single"
  /** Statistical rigor. */
  statistics: "auto" | "standard" | "strict"
  /** Controls policy. */
  controls: "auto" | "require"
  /** Documentation detail level. */
  documentation: "concise" | "detailed" | "regulatory"
  /** Free-text house rules appended verbatim. */
  notes: string
}

export interface NotificationPrefs {
  emailOnComplete: boolean
  inAppOnComplete: boolean
  weeklyDigest: boolean
}

const LAB_KEY = "sa_lab_standards"
const NOTIF_KEY = "sa_notifications"

export const DEFAULT_LAB_STANDARDS: LabStandards = {
  replicates: "auto",
  statistics: "auto",
  controls: "auto",
  documentation: "detailed",
  notes: ""
}

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  emailOnComplete: true,
  inAppOnComplete: true,
  weeklyDigest: false
}

export function getLabStandards(): LabStandards {
  try {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem(LAB_KEY) : null
    return raw
      ? { ...DEFAULT_LAB_STANDARDS, ...JSON.parse(raw) }
      : DEFAULT_LAB_STANDARDS
  } catch {
    return DEFAULT_LAB_STANDARDS
  }
}

export function setLabStandards(v: LabStandards): void {
  try {
    localStorage.setItem(LAB_KEY, JSON.stringify(v))
  } catch {
    /* ignore */
  }
}

export function getNotificationPrefs(): NotificationPrefs {
  try {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem(NOTIF_KEY) : null
    return raw
      ? { ...DEFAULT_NOTIFICATIONS, ...JSON.parse(raw) }
      : DEFAULT_NOTIFICATIONS
  } catch {
    return DEFAULT_NOTIFICATIONS
  }
}

export function setNotificationPrefs(v: NotificationPrefs): void {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(v))
  } catch {
    /* ignore */
  }
}

/**
 * Flatten lab standards into a directive block for the generation / chat
 * prompts. Returns "" when everything is on "auto" (nothing to impose).
 */
export function labStandardsToText(
  ls: LabStandards = getLabStandards()
): string {
  const lines: string[] = []
  if (ls.replicates === "require")
    lines.push(
      "Always include biological/technical replicates and state n per arm."
    )
  else if (ls.replicates === "single")
    lines.push(
      "Default to a single run (n = 1) per condition unless replicates are essential."
    )

  if (ls.statistics === "standard")
    lines.push("Statistics: target α = 0.05 and power ≥ 0.8.")
  else if (ls.statistics === "strict")
    lines.push(
      "Statistics: strict - target α = 0.01, power ≥ 0.9, with a pre-specified analysis plan and multiple-comparison correction."
    )

  if (ls.controls === "require")
    lines.push("Always include vehicle, positive, and negative controls.")

  if (ls.documentation === "concise")
    lines.push("Documentation: concise - key steps and values only.")
  else if (ls.documentation === "regulatory")
    lines.push(
      "Documentation: regulatory / SOP-grade - full detail, explicit acceptance criteria, audit-ready."
    )

  if (ls.notes.trim()) lines.push(ls.notes.trim())

  if (lines.length === 0) return ""
  return `Lab standards (apply as defaults unless the researcher overrides):\n${lines.map(l => `- ${l}`).join("\n")}`
}
