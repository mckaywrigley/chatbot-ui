import { NextResponse } from "next/server"
import { processSequenceSteps } from "@/lib/crm/sequence-engine"

// This endpoint should be called by a cron job (e.g., Vercel Cron)
// Set up in vercel.json: { "crons": [{ "path": "/api/crm/sequences/process", "schedule": "*/5 * * * *" }] }

export async function GET(request: Request) {
  // Verify this is a cron request or has authorization
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // Allow cron requests from Vercel or requests with valid secret
  const isVercelCron = request.headers.get("x-vercel-cron") === "true"
  const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isVercelCron && !hasValidSecret) {
    // In development, allow without auth
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    console.log("[Sequence Cron] Starting sequence processing...")
    const result = await processSequenceSteps()

    console.log(
      `[Sequence Cron] Completed: ${result.sent} sent, ${result.errors} errors, ${result.processed} processed`
    )

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error("[Sequence Cron] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Processing failed"
      },
      { status: 500 }
    )
  }
}

// Also allow POST for manual triggering
export async function POST(request: Request) {
  return GET(request)
}
