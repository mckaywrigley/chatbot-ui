import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    await supabase.auth.exchangeCodeForSession(code)
  }

  if (next) {
    // requestUrl.origin returns `localhost:3000`, manually override from .env.local
    return NextResponse.redirect(
      process.env.NEXT_PUBLIC_PRODUCTION_ORIGIN! || requestUrl.origin + next
    )
  } else {
    return NextResponse.redirect(
      process.env.NEXT_PUBLIC_PRODUCTION_ORIGIN! || requestUrl.origin
    )
  }
}
