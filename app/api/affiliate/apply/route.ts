import { NextResponse } from "next/server"
import { requireUser } from "@/lib/server/require-user"
import { submitApplication } from "@/lib/affiliate/applications"

/**
 * POST /api/affiliate/apply
 * Self-serve: the signed-in user applies to the creator program. Blocked if
 * they're already a creator or have a pending application; a rejected one can
 * be re-submitted.
 *
 * Body: { handle: string, platform?, audience?, pitch? }
 */
export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  try {
    const body = (await req.json().catch(() => ({}))) as {
      handle?: string
      platform?: string
      audience?: string
      pitch?: string
    }

    const result = await submitApplication({
      userId: auth.user.id,
      handle: body.handle ?? "",
      platform: body.platform ?? null,
      audience: body.audience ?? null,
      pitch: body.pitch ?? null
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ ok: true, status: result.status })
  } catch (e) {
    console.error("[affiliate/apply] failed", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
