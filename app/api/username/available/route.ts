import { Database } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit"

// Needs Node runtime so the rate limiter can read headers() and the Upstash
// client can operate on its standard fetch flow.

export async function POST(request: Request) {
  const json = await request.json()
  const { username } = json as {
    username: string
  }

  const limited = await checkRateLimit({
    name: "username-available",
    identifier: getClientIp(),
    requests: 10,
    window: "1 m"
  })
  if (limited) return limited

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: usernames, error } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .eq("username", username)

    if (!usernames) {
      throw new Error(error.message)
    }

    return new Response(JSON.stringify({ isAvailable: !usernames.length }), {
      status: 200
    })
  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
