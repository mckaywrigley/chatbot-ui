// app/api/voice/elevenlabs/route.ts
// Webhook handler for ElevenLabs Conversational AI phone calls
// This endpoint receives webhook events from ElevenLabs when calls are initiated,
// completed, or when real-time conversation events occur.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  lookupCustomerByPhone,
  getWorkspaceByPhoneNumber,
  formatPhoneNumber
} from "@/lib/messaging/gateway"

// Get Supabase service client for database operations
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"

/**
 * POST /api/voice/elevenlabs
 * Main webhook endpoint for ElevenLabs Conversational AI
 *
 * Handles:
 * - Initial call connection requests
 * - Call status updates
 * - Conversation completion callbacks
 * - Real-time conversation events (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const eventType = payload.type || "unknown"

    console.log(`[ElevenLabs Webhook] Event: ${eventType}`, {
      callSid: payload.call_sid,
      timestamp: new Date().toISOString()
    })

    // Route to appropriate handler based on event type
    switch (eventType) {
      case "call_initiated":
        return handleCallInitiated(payload)

      case "call_connected":
        return handleCallConnected(payload)

      case "call_ended":
        return handleCallEnded(payload)

      case "conversation_update":
        return handleConversationUpdate(payload)

      case "transcript":
        return handleTranscript(payload)

      default:
        console.log(`[ElevenLabs Webhook] Unhandled event type: ${eventType}`)
        return NextResponse.json({ received: true })
    }
  } catch (error) {
    console.error("[ElevenLabs Webhook] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Handle call initiated event
 * This fires when ElevenLabs starts dialing a number
 */
async function handleCallInitiated(payload: any) {
  const { call_sid, to_number, from_number, agent_id } = payload

  console.log(`[ElevenLabs] Call initiated: ${from_number} -> ${to_number}`)

  // Log the outbound call initiation
  const supabase = getServiceClient()

  // Find workspace by the ElevenLabs agent ID
  const { data: phoneConfig } = await supabase
    .from("phone_numbers")
    .select("workspace_id, phone_number")
    .eq("elevenlabs_agent_id", agent_id)
    .single()

  if (phoneConfig) {
    await supabase.from("communications").insert({
      workspace_id: phoneConfig.workspace_id,
      channel: "voice",
      direction: "outbound",
      from_number: from_number,
      to_number: to_number,
      status: "pending",
      external_id: call_sid,
      metadata: {
        provider: "elevenlabs",
        agent_id: agent_id,
        event: "call_initiated"
      }
    })
  }

  return NextResponse.json({ received: true, call_sid })
}

/**
 * Handle call connected event
 * This fires when the call is answered and conversation begins
 */
async function handleCallConnected(payload: any) {
  const { call_sid, to_number, from_number, agent_id, conversation_id } =
    payload

  console.log(`[ElevenLabs] Call connected: ${call_sid}`)

  const supabase = getServiceClient()

  // Look up customer by phone number
  const workspaceId = await getWorkspaceByPhoneNumber(from_number)
  const customerData = workspaceId
    ? await lookupCustomerByPhone(to_number, workspaceId)
    : null

  // Update communication record
  await supabase
    .from("communications")
    .update({
      status: "answered",
      customer_id: customerData?.customer?.id,
      metadata: {
        provider: "elevenlabs",
        conversation_id: conversation_id,
        connected_at: new Date().toISOString()
      }
    })
    .eq("external_id", call_sid)

  return NextResponse.json({ received: true, call_sid })
}

/**
 * Handle call ended event
 * This fires when the call is completed
 */
async function handleCallEnded(payload: any) {
  const {
    call_sid,
    conversation_id,
    duration_seconds,
    recording_url,
    end_reason,
    transcript,
    summary
  } = payload

  console.log(
    `[ElevenLabs] Call ended: ${call_sid}, Duration: ${duration_seconds}s`
  )

  const supabase = getServiceClient()

  // Update the communication record with full call details
  const updateData: any = {
    status: end_reason === "completed" ? "answered" : "no_answer",
    duration_seconds: duration_seconds,
    recording_url: recording_url,
    transcript: transcript?.text || null,
    ai_summary: summary,
    metadata: {
      provider: "elevenlabs",
      end_reason: end_reason,
      conversation_id: conversation_id,
      ended_at: new Date().toISOString()
    }
  }

  // Add sentiment analysis if available
  if (transcript?.sentiment) {
    updateData.ai_sentiment = transcript.sentiment
  }

  await supabase
    .from("communications")
    .update(updateData)
    .eq("external_id", call_sid)

  // Trigger any post-call workflows
  await handlePostCallWorkflow(call_sid, payload)

  return NextResponse.json({ received: true, call_sid })
}

/**
 * Handle real-time conversation updates
 * Optional: Use for live monitoring or real-time notifications
 */
async function handleConversationUpdate(payload: any) {
  const { call_sid, conversation_id, turn } = payload

  // This can be used for:
  // - Real-time conversation monitoring
  // - Live agent coaching
  // - Immediate notifications for specific keywords
  // - Escalation triggers

  console.log(
    `[ElevenLabs] Conversation update: ${call_sid}, Turn: ${turn?.role}`
  )

  // Example: Check for escalation keywords
  if (turn?.content) {
    const escalationKeywords = [
      "manager",
      "supervisor",
      "complaint",
      "angry",
      "frustrated",
      "cancel"
    ]
    const shouldEscalate = escalationKeywords.some(keyword =>
      turn.content.toLowerCase().includes(keyword)
    )

    if (shouldEscalate && turn.role === "user") {
      await notifyEscalation(call_sid, turn.content)
    }
  }

  return NextResponse.json({ received: true })
}

/**
 * Handle transcript events
 * Store or process conversation transcripts
 */
async function handleTranscript(payload: any) {
  const { call_sid, conversation_id, transcript } = payload

  console.log(`[ElevenLabs] Transcript received: ${call_sid}`)

  // Store transcript in database for reference
  const supabase = getServiceClient()

  await supabase
    .from("communications")
    .update({
      transcript: transcript?.text || JSON.stringify(transcript),
      metadata: {
        transcript_segments: transcript?.segments,
        language: transcript?.language
      }
    })
    .eq("external_id", call_sid)

  return NextResponse.json({ received: true })
}

/**
 * Post-call workflow handler
 * Process follow-up actions after a call ends
 */
async function handlePostCallWorkflow(callSid: string, payload: any) {
  const supabase = getServiceClient()

  // Get the communication record
  const { data: comm } = await supabase
    .from("communications")
    .select("*, customers(id, name, email)")
    .eq("external_id", callSid)
    .single()

  if (!comm) return

  // Actions based on call outcome:

  // 1. Send follow-up email if customer requested info
  if (
    payload.summary?.includes("send information") ||
    payload.summary?.includes("email")
  ) {
    // Queue follow-up email
    await supabase.from("scheduled_tasks").insert({
      workspace_id: comm.workspace_id,
      customer_id: comm.customer_id,
      task_type: "follow_up_email",
      status: "pending",
      scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes later
      metadata: {
        source: "voice_call",
        call_sid: callSid,
        summary: payload.summary
      }
    })
  }

  // 2. Create a task for urgent requests
  if (
    payload.summary?.includes("urgent") ||
    payload.summary?.includes("emergency")
  ) {
    await supabase.from("tasks").insert({
      workspace_id: comm.workspace_id,
      customer_id: comm.customer_id,
      title: "URGENT: Follow up on voice call",
      description: `Customer called with urgent request. Call SID: ${callSid}\n\nSummary: ${payload.summary}`,
      priority: "high",
      status: "pending",
      due_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
    })
  }

  // 3. Update customer last contact
  if (comm.customer_id) {
    await supabase
      .from("customers")
      .update({
        last_contact_at: new Date().toISOString(),
        last_contact_channel: "voice"
      })
      .eq("id", comm.customer_id)
  }
}

/**
 * Notify team members about escalations
 */
async function notifyEscalation(callSid: string, message: string) {
  const supabase = getServiceClient()

  // Get call details
  const { data: comm } = await supabase
    .from("communications")
    .select("workspace_id, to_number")
    .eq("external_id", callSid)
    .single()

  if (!comm) return

  // Get workspace admins
  const { data: admins } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", comm.workspace_id)
    .eq("role", "admin")

  // Create notification records
  if (admins && admins.length > 0) {
    const notifications = admins.map(admin => ({
      user_id: admin.user_id,
      type: "voice_escalation",
      title: "Call Escalation Detected",
      message: `Caller mentioned escalation keywords: "${message.substring(0, 100)}..."`,
      metadata: {
        call_sid: callSid,
        phone_number: comm.to_number
      },
      read: false
    }))

    await supabase.from("notifications").insert(notifications)
  }

  console.log(`[ElevenLabs] Escalation notification sent for call: ${callSid}`)
}

/**
 * GET /api/voice/elevenlabs
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "elevenlabs-conversational-ai",
    timestamp: new Date().toISOString()
  })
}

/**
 * Outbound call initiation helper
 * Use this function to trigger calls from your application
 */
export async function initiateElevenLabsCall(
  toNumber: string,
  fromNumber: string,
  workspaceId: string,
  options: {
    customerId?: string
    jobId?: string
    customPrompt?: string
  } = {}
) {
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    throw new Error("ElevenLabs API key or Agent ID not configured")
  }

  const supabase = getServiceClient()

  // Get phone configuration for this workspace
  const { data: phoneConfig } = await supabase
    .from("phone_numbers")
    .select("elevenlabs_agent_id")
    .eq("workspace_id", workspaceId)
    .eq("phone_number", fromNumber)
    .single()

  const agentId = phoneConfig?.elevenlabs_agent_id || ELEVENLABS_AGENT_ID

  // Initiate call via ElevenLabs API
  const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/calls`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      agent_id: agentId,
      to_number: formatPhoneNumber(toNumber),
      from_number: fromNumber,
      // Optional: Override conversation configuration
      conversation_config_override: options.customPrompt
        ? {
            agent: {
              prompt: {
                prompt: options.customPrompt
              }
            }
          }
        : undefined
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs API error: ${error}`)
  }

  const result = await response.json()

  // Log the outbound call
  await supabase.from("communications").insert({
    workspace_id: workspaceId,
    customer_id: options.customerId,
    job_id: options.jobId,
    channel: "voice",
    direction: "outbound",
    from_number: fromNumber,
    to_number: toNumber,
    status: "pending",
    external_id: result.call_sid,
    metadata: {
      provider: "elevenlabs",
      agent_id: agentId
    }
  })

  return {
    success: true,
    callSid: result.call_sid,
    status: result.status
  }
}

/**
 * Update agent configuration dynamically
 * Use this to customize the AI agent for specific customers or scenarios
 */
export async function updateAgentConfig(
  agentId: string,
  config: {
    systemPrompt?: string
    voiceId?: string
    language?: string
  }
) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured")
  }

  const updates: any = {}

  if (config.systemPrompt) {
    updates.conversation_config = {
      agent: {
        prompt: {
          prompt: config.systemPrompt
        }
      }
    }
  }

  if (config.voiceId) {
    updates.voice_id = config.voiceId
  }

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
      },
      body: JSON.stringify(updates)
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update agent: ${error}`)
  }

  return await response.json()
}
