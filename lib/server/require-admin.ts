import { NextResponse } from "next/server"

/**
 * Guard for operator-only admin endpoints (affiliate minting, comp grants).
 * Authenticated by a shared bearer secret (ADMIN_API_SECRET). Fails CLOSED:
 * if the secret isn't configured, every request is rejected - an admin route
 * must never be open.
 *
 * Usage:
 *   const denied = requireAdmin(req)
 *   if (denied) return denied
 */
export function requireAdmin(req: Request): NextResponse | null {
  const expected = (process.env.ADMIN_API_SECRET ?? "").trim()
  if (!expected) {
    return NextResponse.json(
      { error: "Admin API is not configured." },
      { status: 503 }
    )
  }
  const header = req.headers.get("authorization") ?? ""
  const token = header.replace(/^Bearer\s+/i, "").trim()
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}
