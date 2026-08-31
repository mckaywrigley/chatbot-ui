import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/server/require-admin"
import { getUserIdByEmail, grantComp } from "@/lib/affiliate/admin"
import { getPlan } from "@/lib/billing/plans"

/**
 * POST /api/admin/comp  (operator-only; ADMIN_API_SECRET bearer)
 *
 * Grant a user a comp plan so they can explore the app for free (e.g. an
 * influencer on Max). Identify by `email` or `userId`.
 *
 * Body: { email?: string, userId?: string, plan?: "free" | "pro" | "max" }
 *        plan defaults to "max".
 */
export async function POST(req: Request) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string
      userId?: string
      plan?: string
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

    const plan = getPlan(body.plan ?? "max").id
    const { ok, error } = await grantComp({ userId, plan })
    if (!ok) {
      return NextResponse.json(
        { error: error ?? "Could not grant comp." },
        { status: 400 }
      )
    }
    return NextResponse.json({ ok: true, userId, plan })
  } catch (e) {
    console.error("[admin/comp] failed", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
