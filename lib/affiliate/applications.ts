import { getBillingAdminClient } from "@/lib/billing/service-client"
import type { PlanId } from "@/lib/billing/plans"
import { createAffiliate, grantComp } from "./admin"
import { getAffiliateForUser } from "./service"
import type { ApplicationRow, ApplicationStatus } from "./types"

export interface SubmitApplicationInput {
  userId: string
  handle: string
  platform?: string | null
  audience?: string | null
  pitch?: string | null
}

/** The signed-in user's application, or null. */
export async function getApplicationForUser(
  userId: string
): Promise<ApplicationRow | null> {
  const admin = getBillingAdminClient()
  const { data, error } = await (admin as any)
    .from("affiliate_applications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) {
    console.error("[affiliate] getApplicationForUser failed", error)
    return null
  }
  return (data as ApplicationRow) ?? null
}

/**
 * Submit (or re-submit) a creator-program application. Blocks if the user is
 * already an affiliate or has a pending application; a previously rejected
 * application can be re-submitted (flips back to 'pending').
 */
export async function submitApplication(
  input: SubmitApplicationInput
): Promise<{ ok: boolean; status?: ApplicationStatus; error?: string }> {
  const handle = (input.handle ?? "").trim()
  if (!input.userId) return { ok: false, error: "Not signed in." }
  if (handle.length < 2) {
    return { ok: false, error: "Please enter your creator name / handle." }
  }

  // Already a creator? Nothing to apply for.
  const existingAffiliate = await getAffiliateForUser(input.userId)
  if (existingAffiliate) {
    return { ok: false, error: "You're already in the creator program." }
  }

  const existing = await getApplicationForUser(input.userId)
  if (existing?.status === "pending") {
    return { ok: false, error: "Your application is already under review." }
  }

  const admin = getBillingAdminClient()
  const { error } = await (admin as any).from("affiliate_applications").upsert(
    {
      user_id: input.userId,
      handle,
      platform: input.platform?.trim() || null,
      audience: input.audience?.trim() || null,
      pitch: input.pitch?.trim() || null,
      status: "pending",
      review_note: null,
      reviewed_at: null
    },
    { onConflict: "user_id" }
  )
  if (error) {
    console.error("[affiliate] submitApplication failed", error)
    return { ok: false, error: "Could not submit your application." }
  }
  return { ok: true, status: "pending" }
}

export interface ApplicationListItem extends ApplicationRow {
  email: string | null
}

/** Admin: list applications (optionally by status), newest first, with emails. */
export async function listApplications(
  status?: ApplicationStatus
): Promise<ApplicationListItem[]> {
  const admin = getBillingAdminClient()
  let query = (admin as any)
    .from("affiliate_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500)
  if (status) query = query.eq("status", status)
  const { data, error } = await query
  if (error) {
    console.error("[affiliate] listApplications failed", error)
    return []
  }
  const rows = (data as ApplicationRow[]) ?? []
  if (rows.length === 0) return []

  // Resolve applicant emails in one batch (auth schema isn't in public types).
  const ids = rows.map(r => r.user_id)
  const emailById = new Map<string, string>()
  try {
    const { data: users } = await (admin as any)
      .schema("auth")
      .from("users")
      .select("id,email")
      .in("id", ids)
    for (const u of (users as { id: string; email: string | null }[]) ?? []) {
      if (u.email) emailById.set(u.id, u.email)
    }
  } catch (e) {
    console.error("[affiliate] application email lookup failed", e)
  }
  return rows.map(r => ({ ...r, email: emailById.get(r.user_id) ?? null }))
}

export interface ReviewApplicationInput {
  userId: string
  action: "approve" | "reject"
  note?: string | null
  // approve-only knobs (forwarded to createAffiliate / grantComp):
  code?: string | null
  commissionRate?: number | null
  viewerBonusCredits?: number | null
  comp?: boolean // also grant a comp Max plan
}

/**
 * Admin: approve or reject an application. Approval mints the affiliate row
 * (using the application's handle as the display name) and, when `comp` is set,
 * grants a comp Max plan so the creator can explore.
 */
export async function reviewApplication(
  input: ReviewApplicationInput
): Promise<{ ok: boolean; code?: string; error?: string }> {
  if (!input.userId) return { ok: false, error: "userId is required" }
  const admin = getBillingAdminClient()

  const app = await getApplicationForUser(input.userId)
  if (!app) return { ok: false, error: "No application for that user." }

  if (input.action === "reject") {
    const { error } = await (admin as any)
      .from("affiliate_applications")
      .update({
        status: "rejected",
        review_note: input.note ?? null,
        reviewed_at: new Date().toISOString()
      })
      .eq("user_id", input.userId)
    if (error) {
      console.error("[affiliate] reject failed", error)
      return { ok: false, error: "Could not reject the application." }
    }
    return { ok: true }
  }

  // approve
  const { affiliate, error: createErr } = await createAffiliate({
    userId: input.userId,
    code: input.code ?? null,
    displayName: app.handle,
    commissionRate: input.commissionRate ?? null,
    viewerBonusCredits: input.viewerBonusCredits ?? null
  })
  if (createErr || !affiliate) {
    return { ok: false, error: createErr ?? "Could not create the affiliate." }
  }

  if (input.comp) {
    const comp = await grantComp({
      userId: input.userId,
      plan: "max" as PlanId
    })
    if (!comp.ok) {
      // Affiliate was created; surface the comp failure but don't fail the whole
      // approval (the operator can comp manually via /api/admin/comp).
      console.error("[affiliate] approve: comp grant failed", comp.error)
    }
  }

  const { error: updErr } = await (admin as any)
    .from("affiliate_applications")
    .update({
      status: "approved",
      review_note: input.note ?? null,
      reviewed_at: new Date().toISOString()
    })
    .eq("user_id", input.userId)
  if (updErr) console.error("[affiliate] approve: status update failed", updErr)

  return { ok: true, code: affiliate.code }
}
