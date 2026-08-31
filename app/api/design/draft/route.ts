import { NextResponse } from "next/server"
import { ResearchPlan } from "./types/interfaces"
import { v4 as uuidv4 } from "uuid"
import { inngest } from "@/lib/inngest/client"
import { saveResearchPlan } from "./utils/persistence-firestore"
import { requireUser } from "@/lib/server/require-user"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { assertBudget } from "@/lib/billing/account"
import {
  budgetErrorResponse,
  isBudgetExceededError
} from "@/lib/billing/errors"

export async function POST(req: Request) {
  const requestStartTime = Date.now()
  console.log("\n" + "=".repeat(100))
  console.log("🚀 [DESIGN_DRAFT_API] New Request Received")
  console.log("=".repeat(100))

  try {
    const auth = await requireUser()
    if (auth.response) return auth.response
    const user = auth.user

    // Block enqueueing a research plan if the user is out of credits - the
    // background pipeline (lib/inngest/functions.ts) is the heaviest AI path.
    try {
      await assertBudget(user.id)
    } catch (e) {
      if (isBudgetExceededError(e)) return budgetErrorResponse(e.plan)
    }

    const limited = await checkRateLimit({
      name: "design-draft",
      identifier: user.id,
      requests: 20,
      window: "1 h"
    })
    if (limited) return limited

    const requestData = await req.json()
    // Log only metadata - user research problem bodies can contain sensitive
    // objectives/constraints we do not want persisted in server logs.
    console.log("📥 [DESIGN_DRAFT_REQUEST] Received", {
      userId: user.id,
      hasPlanId: !!requestData.planId,
      bodyKeys: Object.keys(requestData || {})
    })

    // Support both old format (for backward compatibility) and new format
    let planId: string
    let title: string
    let description: string
    let constraints: Record<string, any> = {}
    let preferences: Record<string, any> = {}

    if (requestData.planId || requestData.title) {
      // New format: accept the structured constraints shape (domain, phase,
      // objectives, knownVariables/unknownVariables, material/time/equipment).
      planId = requestData.planId || uuidv4()
      title = requestData.title
      description = requestData.description || requestData.problem || ""
      constraints = requestData.constraints || {}
      preferences = requestData.preferences || {}
    } else {
      // Old format (backward compatibility) - maps legacy freeform arrays
      // into the new constraints shape as best we can.
      planId = uuidv4()
      title = requestData.problem || "Untitled Research Plan"
      description = requestData.problem || ""
      constraints = {
        domain: requestData.domain,
        phase: requestData.phase,
        objectives: requestData.objectives || [],
        knownVariables:
          requestData.knownVariables || requestData.variables || [],
        unknownVariables: requestData.unknownVariables || [],
        material: requestData.material || "",
        time: requestData.time || "",
        equipment: requestData.equipment || "",
        specialConsiderations: requestData.specialConsiderations || []
      }
      preferences = {
        max_hypotheses: 5
      }
    }

    // Validation
    if (!title || !description) {
      console.error("❌ [DESIGN_DRAFT] Missing required fields")
      return NextResponse.json(
        { success: false, error: "Title and description are required" },
        { status: 400 }
      )
    }

    console.log("\n🔧 [DESIGN_DRAFT_STATE] Creating Research Plan")
    const plan: ResearchPlan = {
      planId,
      userId: user.id,
      title,
      description,
      constraints,
      preferences,
      createdAt: new Date().toISOString(),
      status: "pending"
    }

    console.log("📋 [DESIGN_DRAFT_STATE] Plan Created:", {
      planId: plan.planId,
      userId: plan.userId,
      descriptionLength: plan.description.length
    })

    // Save plan to database first
    try {
      await saveResearchPlan(plan)
      console.log("✅ [DESIGN_DRAFT] Plan saved to database")
    } catch (error: any) {
      console.error("❌ [DESIGN_DRAFT] Failed to save plan:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save research plan"
        },
        { status: 500 }
      )
    }

    // Trigger Inngest function to process in background
    const statusUrl = `/api/design/draft/status/${plan.planId}`

    try {
      console.log("🚀 [DESIGN_DRAFT] Sending event to Inngest...")

      const eventResult = await inngest.send({
        name: "design/draft.requested",
        data: {
          planId: plan.planId
        }
      })

      console.log("✅ [DESIGN_DRAFT] Inngest event sent:", eventResult)
      console.log("\n📤 [DESIGN_DRAFT_RESPONSE] Response Summary:")
      console.log("  📊 Plan ID:", plan.planId)
      console.log("  🔗 Status URL:", statusUrl)
      console.log("  🚀 Inngest background function triggered")
      console.log("=".repeat(100))

      return NextResponse.json(
        {
          success: true,
          planId: plan.planId,
          statusUrl,
          message: "Research plan enqueued successfully",
          backgroundTriggered: true
        },
        { status: 202 }
      )
    } catch (error: any) {
      console.error("❌ [DESIGN_DRAFT] Inngest send error:", error)
      console.error("❌ [DESIGN_DRAFT] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      })

      // In local dev, the most common failure is simply that the Inngest dev server
      // isn't running (default UI: http://localhost:8288). Don't fail design creation
      // in this case-return 202 so the UI can proceed and show status polling.
      if (process.env.NODE_ENV !== "production") {
        const isAuthError =
          typeof error?.message === "string" &&
          (error.message.includes("401") ||
            error.message.toLowerCase().includes("event key not found"))

        const devHelpMessage = isAuthError
          ? "Inngest rejected your event key (401). Ensure INNGEST_EVENT_KEY is the *Event Key* from the Inngest dashboard (not the Signing Key), then restart `npm run dev`."
          : "Research plan saved, but background processing is not running. Configure INNGEST_EVENT_KEY for cloud, or set INNGEST_USE_DEV_SERVER=true and run: npx inngest-cli@latest dev"

        console.warn(
          "⚠️ [DESIGN_DRAFT] Inngest unavailable. If using local dev server set INNGEST_USE_DEV_SERVER=true and run: npx inngest-cli@latest dev"
        )

        return NextResponse.json(
          {
            success: true,
            planId: plan.planId,
            statusUrl,
            backgroundTriggered: false,
            message: devHelpMessage,
            inngestError: {
              message: error?.message,
              name: error?.name
            }
          },
          { status: 202 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to enqueue research plan",
          details:
            process.env.NODE_ENV !== "production" ? error.stack : undefined
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    const totalRequestTime = Date.now() - requestStartTime
    console.error(
      `❌ [DESIGN_DRAFT_ERROR] Request failed after ${totalRequestTime}ms:`,
      error
    )
    console.log("=".repeat(100))
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error"
      },
      { status: 500 }
    )
  }
}

export const config = {
  api: {
    bodyParser: process.env.NODE_ENV !== "production"
  }
}
