import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/server/require-admin"
import {
  listApplications,
  reviewApplication
} from "@/lib/affiliate/applications"
import { getUserIdByEmail } from "@/lib/affiliate/admin"
import type { ApplicationStatus } from "@/lib/affiliate/types"

/**
 * GET /api/admin/affiliate/applications?status=pending  (ADMIN_API_SECRET)
 * List creator-program applications (newest first), with applicant emails.
 */
export async function GET(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const status = new URL(req.url).searchParams.get(
      "status"
    ) as ApplicationStatus | null
    const valid: ApplicationStatus[] = ["pending", "approved", "rejected"]
    const applications = await listApplications(
      status && valid.includes(status) ? status : undefined
    )
    return NextResponse.json({ ok: true, applications })
  } catch (e) {
    console.error("[admin/affiliate/applications] list failed", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

/**
 * POST /api/admin/affiliate/applications  (ADMIN_API_SECRET)
 * Approve or reject an application. Identify the applicant by `email` or
 * `userId`. Approval mints the affiliate code (and comps to Max if comp:true).
 *
 * Body: {
 *   email?, userId?,
 *   action: "approve" | "reject",
 *   note?,
 *   code?, commissionRate?, viewerBonusCredits?, comp?   // approve-only
 * }
 */
export async function POST(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string
      userId?: string
      action?: "approve" | "reject"
      note?: string
      code?: string
      commissionRate?: number
      viewerBonusCredits?: number
      comp?: boolean
    }

    if (body.action !== "approve" && body.action !== "reject") {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject".' },
        { status: 400 }
      )
    }

    let userId = body.userId?.trim() || ""
    if (!userId && body.email) {
      const resolved = await getUserIdByEmail(body.email)
      if (!resolved) {
        return NextResponse.json(
          { error: `No account found for ${body.email}.` },
          { status: 404 }
        )
      }
      userId = resolved
    }
    if (!userId) {
      return NextResponse.json(
        { error: "Provide an email or userId." },
        { status: 400 }
      )
    }

    const result = await reviewApplication({
      userId,
      action: body.action,
      note: body.note ?? null,
      code: body.code ?? null,
      commissionRate: body.commissionRate ?? null,
      viewerBonusCredits: body.viewerBonusCredits ?? null,
      comp: Boolean(body.comp)
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({
      ok: true,
      action: body.action,
      code: result.code
    })
  } catch (e) {
    console.error("[admin/affiliate/applications] review failed", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
