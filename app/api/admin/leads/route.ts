import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabase as serviceClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

async function isAdmin(supabase: any) {
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single()

  return profile?.is_admin === true
}

export async function GET() {
  const supabase = await createClient()

  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const { data: leads, error } = await serviceClient
      .from("lead_captures")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) {
      console.error("Error fetching leads:", error)
      return NextResponse.json({ leads: [], error: error.message })
    }

    return NextResponse.json({ leads: leads || [] })
  } catch (error) {
    console.error("Error fetching leads:", error)
    return NextResponse.json({ leads: [] })
  }
}
