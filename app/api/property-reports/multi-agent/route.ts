// @ts-nocheck
// Multi-Agent Property Report Orchestrator
// Coordinates all 4 agents to generate comprehensive property analysis
// REFACTORED: Direct function calls (no HTTP) to avoid Vercel auth issues

import { NextRequest, NextResponse } from "next/server"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
// Import pure agent functions (no Next.js dependencies, no Vercel auth issues)
import { runMeasurementSpecialist } from "@/lib/agents/measurement-specialist"
import { runConditionInspector } from "@/lib/agents/condition-inspector"
import { runCostEstimator } from "@/lib/agents/cost-estimator"
import { runQualityController } from "@/lib/agents/quality-controller"

export const maxDuration = 300 // 5 minutes for multi-agent processing

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authentication
    const profile = await getServerProfile()
    if (!profile?.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      capturedImages,
      solarData,
      solarMetrics,
      address,
      location,
      workspaceId
    } = body

    if (!capturedImages || capturedImages.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 })
    }

    // Separate overhead images from angled views
    // Images have 'viewName' property, not 'name' (e.g., "Overhead (Context)", "Overhead (Detail)")
    const overheadImages = capturedImages.filter(
      (img: any) =>
        img.viewName?.toLowerCase().includes("overhead") ||
        img.viewName?.toLowerCase().includes("context") ||
        img.viewName?.toLowerCase().includes("detail") ||
        img.viewName?.toLowerCase().startsWith("top-")
    )

    const allImages = capturedImages

    // Track agent execution
    const agentResults: any = {
      measurement: null,
      condition: null,
      cost: null,
      quality: null
    }

    const agentTimings: any = {}

    // ═══════════════════════════════════════════════════════════════════
    // AGENT 1: MEASUREMENT SPECIALIST
    // ═══════════════════════════════════════════════════════════════════
    try {
      const agent1Start = Date.now()

      // Call pure function directly (no Next.js Request/Response, no Vercel auth)
      agentResults.measurement = await runMeasurementSpecialist({
        overheadImages,
        solarData: solarMetrics, // Pass extracted metrics for measurements
        address
      })

      agentTimings.measurement = Date.now() - agent1Start
    } catch (error: any) {
      console.error("[Agent 1] Error:", error)
      return NextResponse.json(
        {
          error: "Measurement Specialist failed",
          details: error.message,
          agent: "measurement-specialist",
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // ═══════════════════════════════════════════════════════════════════
    // AGENT 2: CONDITION INSPECTOR
    // ═══════════════════════════════════════════════════════════════════
    try {
      const agent2Start = Date.now()

      agentResults.condition = await runConditionInspector({
        allImages,
        address,
        measurementData: agentResults.measurement?.data
      })

      agentTimings.condition = Date.now() - agent2Start
    } catch (error: any) {
      console.error("[Agent 2] Error:", error)
      return NextResponse.json(
        {
          error: "Condition Inspector failed",
          details: error.message,
          agent: "condition-inspector",
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // ═══════════════════════════════════════════════════════════════════
    // AGENT 3: COST ESTIMATOR
    // ═══════════════════════════════════════════════════════════════════
    try {
      const agent3Start = Date.now()

      agentResults.cost = await runCostEstimator({
        measurementData: agentResults.measurement?.data,
        conditionData: agentResults.condition?.data,
        address,
        location
      })

      agentTimings.cost = Date.now() - agent3Start
    } catch (error: any) {
      console.error("[Agent 3] Error:", error)
      return NextResponse.json(
        {
          error: "Cost Estimator failed",
          details: error.message,
          agent: "cost-estimator",
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // ═══════════════════════════════════════════════════════════════════
    // AGENT 4: QUALITY CONTROLLER
    // ═══════════════════════════════════════════════════════════════════
    try {
      const agent4Start = Date.now()

      // Extract only essential data for Quality Controller to reduce token usage
      // This prevents sending verbose outputs (methodology, enumeratedLists, etc.) twice
      const essentialMeasurementData = {
        agent: "measurement_specialist",
        measurements: {
          facetCount: agentResults.measurement?.data?.measurements?.facetCount,
          facetCountRange:
            agentResults.measurement?.data?.measurements?.facetCountRange,
          roofFootprintArea:
            agentResults.measurement?.data?.measurements?.roofFootprintArea,
          estimatedPitch:
            agentResults.measurement?.data?.measurements?.estimatedPitch,
          pitchMultiplier:
            agentResults.measurement?.data?.measurements?.pitchMultiplier,
          totalRoofArea:
            agentResults.measurement?.data?.measurements?.totalRoofArea,
          roofAreaRange:
            agentResults.measurement?.data?.measurements?.roofAreaRange,
          squares: agentResults.measurement?.data?.measurements?.squares,
          ridgeLength:
            agentResults.measurement?.data?.measurements?.ridgeLength,
          valleyLength:
            agentResults.measurement?.data?.measurements?.valleyLength,
          hipLength: agentResults.measurement?.data?.measurements?.hipLength,
          eaveLength: agentResults.measurement?.data?.measurements?.eaveLength,
          complexity: agentResults.measurement?.data?.measurements?.complexity,
          confidence: agentResults.measurement?.data?.measurements?.confidence
        },
        observations: agentResults.measurement?.data?.observations,
        uncertainties: agentResults.measurement?.data?.uncertainties
      }

      const essentialConditionData = {
        agent: "condition_inspector",
        condition: {
          material: agentResults.condition?.data?.condition?.material,
          overallCondition:
            agentResults.condition?.data?.condition?.overallCondition,
          estimatedAge: agentResults.condition?.data?.condition?.estimatedAge,
          remainingLifespan:
            agentResults.condition?.data?.condition?.remainingLifespan,
          damageAssessment:
            agentResults.condition?.data?.condition?.damageAssessment,
          specificIssues:
            agentResults.condition?.data?.condition?.specificIssues,
          riskFactors: agentResults.condition?.data?.condition?.riskFactors,
          maintenanceNeeds:
            agentResults.condition?.data?.condition?.maintenanceNeeds,
          urgency: agentResults.condition?.data?.condition?.urgency,
          urgencyReason: agentResults.condition?.data?.condition?.urgencyReason
        },
        recommendations: agentResults.condition?.data?.recommendations,
        confidence: agentResults.condition?.data?.confidence
      }

      const essentialCostData = {
        agent: "cost_estimator",
        materialCalculations: agentResults.cost?.data?.materialCalculations,
        laborEstimate: agentResults.cost?.data?.laborEstimate,
        costEstimates: agentResults.cost?.data?.costEstimates,
        recommendation: agentResults.cost?.data?.recommendation,
        confidence: agentResults.cost?.data?.confidence
      }

      agentResults.quality = await runQualityController({
        measurementData: essentialMeasurementData,
        conditionData: essentialConditionData,
        costData: essentialCostData,
        address,
        solarData
      })
      agentTimings.quality = Date.now() - agent4Start
    } catch (error: any) {
      console.error("[Agent 4] Error:", error)
      return NextResponse.json(
        {
          error: "Quality Controller failed",
          details: error.message,
          agent: "quality-controller",
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMPILE FINAL REPORT
    // ═══════════════════════════════════════════════════════════════════
    const totalTime = Date.now() - startTime

    const finalReport = {
      success: true,
      multiAgent: true,
      model: agentResults.quality?.model || "claude-opus-4-5-20251101", // Use model from agent response

      // Property info at top level for easy access
      address: address,
      location: location,

      // Executive summary from Quality Controller
      executiveSummary:
        agentResults.quality?.data?.finalReport?.executiveSummary,

      // Complete agent outputs
      agents: {
        measurement: agentResults.measurement?.data,
        condition: agentResults.condition?.data,
        cost: agentResults.cost?.data,
        quality: agentResults.quality?.data
      },

      // Final validated report from Quality Controller
      finalReport: agentResults.quality?.data?.finalReport,

      // Validation and confidence scores
      validation: agentResults.quality?.data?.validation,
      flaggedIssues: agentResults.quality?.data?.flaggedIssues,
      overallConfidence: agentResults.quality?.data?.overallConfidence,

      // Solar data - store the FULL Google Solar API response (with solarPotential, financials, etc.)
      solarData: solarData,

      // Captured images
      capturedImages: capturedImages,
      satelliteViews: capturedImages,

      // Performance metrics
      performance: {
        totalTime,
        agentTimings,
        tokensUsed: {
          measurement: agentResults.measurement?.tokensUsed,
          condition: agentResults.condition?.tokensUsed,
          cost: agentResults.cost?.tokensUsed,
          quality: agentResults.quality?.tokensUsed
        }
      },

      // Metadata
      metadata: {
        timestamp: new Date().toISOString(),
        address,
        location,
        workspaceId,
        imageCount: capturedImages.length,
        hasSolarData: !!solarData,
        agentsUsed: 4,
        qualityScore: agentResults.quality?.data?.metadata?.qualityScore,
        readyForCustomer: agentResults.quality?.data?.metadata?.readyForCustomer
      }
    }

    return NextResponse.json(finalReport)
  } catch (error) {
    console.error("[Multi-Agent Orchestrator] Fatal error:", error)
    return NextResponse.json(
      {
        error: "Multi-agent analysis failed",
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
