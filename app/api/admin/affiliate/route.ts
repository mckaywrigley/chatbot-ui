import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/server/require-admin"
import { createAffiliate, getUserIdByEmail } from "@/lib/affiliate/admin"
import { normalizeCode } from "@/lib/affiliate/codes"

/**
 * POST /api/admin/affiliate  (operator-only; ADMIN_API_SECRET bearer)
 *
 * Mint or update an influencer's affiliate row. Identify the influencer by
 * `email` (their account must exist) or `userId`.
 *
 * Body: {
 *   email?: string, userId?: string,
 *   code?: string,            // defaults to one derived from displayName
 *   displayName?: string,
 *   commissionRate?: number,  // 0..1, defaults to 0.20
 *   viewerBonusCredits?: number // defaults to 5000
 * }
 *
 * Returns the affiliate's code + the share URL to hand the influencer.
 */
export async function POST(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string
      userId?: string
      code?: string
      displayName?: string
      commissionRate?: number
      viewerBonusCredits?: number
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

    const { affiliate, error } = await createAffiliate({
      userId,
      code: body.code ? normalizeCode(body.code) : null,
      displayName: body.displayName ?? null,
      commissionRate: body.commissionRate ?? null,
      viewerBonusCredits: body.viewerBonusCredits ?? null
    })
    if (error || !affiliate) {
      return NextResponse.json(
        { error: error ?? "Could not create affiliate." },
        { status: 400 }
      )
    }

    const base = (
      process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
    ).replace(/\/+$/, "")
    return NextResponse.json({
      ok: true,
      code: affiliate.code,
      displayName: affiliate.display_name,
      commissionRate: affiliate.commission_rate,
      viewerBonusCredits: Math.round(affiliate.viewer_bonus_tokens / 1000),
      shareUrl: `${base}/?ref=${encodeURIComponent(affiliate.code)}`
    })
  } catch (e) {
    console.error("[admin/affiliate] failed", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
