import { NextResponse } from "next/server"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { supabase } from "@/lib/supabase/service-role"

export async function POST(request: Request) {
  try {
    const profile = await getServerProfile()

    if (!profile?.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { address, lat, lng } = await request.json()

    const currentDate = new Date()
    const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`

    // Track in feature_usage table as "instant_reports"
    const { error } = await supabase.from("feature_usage").insert({
      user_id: profile.user_id,
      feature: "instant_reports",
      quantity: 1,
      month_year: monthYear
    })

    if (error) {
      // Don't fail the request if tracking fails — just log it
      console.warn(
        "[track-instant-report] Failed to track usage:",
        error.message
      )
    }

    return NextResponse.json({ tracked: true })
  } catch (error: any) {
    // If user is not authenticated, still return OK (don't break the UX)
    console.warn("[track-instant-report] Error:", error?.message || error)
    return NextResponse.json({ tracked: false }, { status: 200 })
  }
}
