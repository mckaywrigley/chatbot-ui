import { NextResponse } from "next/server"
import { requireUser } from "@/lib/server/require-user"
import { getAffiliateDashboard } from "@/lib/affiliate/service"
import { getApplicationForUser } from "@/lib/affiliate/applications"
import type { AffiliateMe } from "@/lib/affiliate/types"

/**
 * GET /api/affiliate/me
 * The signed-in user's affiliate dashboard if they're a creator; otherwise
 * their application state (so the panel can show apply / pending / rejected).
 * Aggregated stats only - never returns raw referred ids.
 */
export async function GET(req: Request) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
    const dashboard = await getAffiliateDashboard(auth.user.id, base)
    if (dashboard.isAffiliate) {
      return NextResponse.json(dashboard satisfies AffiliateMe)
    }

    const app = await getApplicationForUser(auth.user.id)
    const payload: AffiliateMe = {
      isAffiliate: false,
      application: app
        ? { status: app.status, reviewNote: app.review_note }
        : null
    }
    return NextResponse.json(payload)
  } catch (e) {
    console.error("[affiliate/me] failed", e)
    return NextResponse.json(
      { error: "Failed to load affiliate dashboard" },
      { status: 500 }
    )
  }
}
