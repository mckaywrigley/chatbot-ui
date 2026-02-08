// CRM Sequence Automation Engine
// Processes follow-up sequences and sends automated messages

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SequenceStep {
  day: number // Days after enrollment to send
  channel: "sms" | "email" | "call"
  template: string
  subject?: string // For email
  waitForReply?: boolean
}

interface Sequence {
  id: string
  workspace_id: string
  name: string
  steps: SequenceStep[]
  active: boolean
  stop_on_reply: boolean
  stop_on_booking: boolean
}

interface Enrollment {
  id: string
  sequence_id: string
  customer_id: string
  job_id?: string
  current_step: number
  status: string
  next_step_at: string
  customer?: {
    id: string
    name: string
    phone?: string
    email?: string
  }
  sequence?: Sequence
}

interface ProcessResult {
  processed: number
  sent: number
  errors: number
  details: Array<{
    enrollment_id: string
    status: "sent" | "error" | "skipped"
    message: string
  }>
}

/**
 * Process all pending sequence steps
 * This should be called by a cron job every few minutes
 */
export async function processSequenceSteps(): Promise<ProcessResult> {
  const result: ProcessResult = {
    processed: 0,
    sent: 0,
    errors: 0,
    details: []
  }

  try {
    // Get all active enrollments where next_step_at is in the past
    const { data: enrollments, error } = await supabase
      .from("sequence_enrollments")
      .select(
        `
        id,
        sequence_id,
        customer_id,
        job_id,
        current_step,
        status,
        next_step_at,
        customer:customers(id, name, phone, email),
        sequence:sequences(id, workspace_id, name, steps, active, stop_on_reply, stop_on_booking)
      `
      )
      .eq("status", "active")
      .lte("next_step_at", new Date().toISOString())
      .limit(100) // Process in batches

    if (error) {
      console.error("[Sequence Engine] Error fetching enrollments:", error)
      throw error
    }

    if (!enrollments || enrollments.length === 0) {
      console.log("[Sequence Engine] No pending steps to process")
      return result
    }

    console.log(
      `[Sequence Engine] Processing ${enrollments.length} pending steps`
    )

    for (const enrollment of enrollments as unknown as Enrollment[]) {
      result.processed++

      try {
        // Skip if sequence is no longer active
        if (!enrollment.sequence?.active) {
          await updateEnrollmentStatus(
            enrollment.id,
            "paused",
            "Sequence deactivated"
          )
          result.details.push({
            enrollment_id: enrollment.id,
            status: "skipped",
            message: "Sequence deactivated"
          })
          continue
        }

        // Get the current step
        const steps = enrollment.sequence?.steps || []
        const currentStep = steps[enrollment.current_step]

        if (!currentStep) {
          // No more steps - mark as completed
          await updateEnrollmentStatus(enrollment.id, "completed")
          await incrementSequenceStats(enrollment.sequence_id, "completed")
          result.details.push({
            enrollment_id: enrollment.id,
            status: "sent",
            message: "Sequence completed"
          })
          continue
        }

        // Check if customer has contact info for this channel
        const customer = enrollment.customer
        if (!customer) {
          result.details.push({
            enrollment_id: enrollment.id,
            status: "error",
            message: "Customer not found"
          })
          result.errors++
          continue
        }

        // Send the message based on channel
        let sendResult: { success: boolean; error?: string }

        if (currentStep.channel === "sms" && customer.phone) {
          sendResult = await sendSMS(
            customer.phone,
            personalizeTemplate(
              currentStep.template,
              customer,
              enrollment.job_id
            )
          )
        } else if (currentStep.channel === "email" && customer.email) {
          sendResult = await sendEmail(
            customer.email,
            currentStep.subject || enrollment.sequence?.name || "Follow-up",
            personalizeTemplate(
              currentStep.template,
              customer,
              enrollment.job_id
            )
          )
        } else {
          sendResult = {
            success: false,
            error: `No ${currentStep.channel} contact info for customer`
          }
        }

        if (sendResult.success) {
          // Move to next step
          const nextStepIndex = enrollment.current_step + 1
          const nextStep = steps[nextStepIndex]

          if (nextStep) {
            // Calculate next step time
            const nextStepAt = new Date()
            nextStepAt.setDate(
              nextStepAt.getDate() + (nextStep.day - currentStep.day)
            )

            await supabase
              .from("sequence_enrollments")
              .update({
                current_step: nextStepIndex,
                next_step_at: nextStepAt.toISOString()
              })
              .eq("id", enrollment.id)
          } else {
            // No more steps - mark as completed
            await updateEnrollmentStatus(enrollment.id, "completed")
            await incrementSequenceStats(enrollment.sequence_id, "completed")
          }

          // Log the activity
          await logActivity(
            enrollment.sequence?.workspace_id,
            enrollment.customer_id,
            `sequence_${currentStep.channel}`,
            `Sent ${currentStep.channel} from sequence "${enrollment.sequence?.name}"`,
            { enrollment_id: enrollment.id, step: enrollment.current_step }
          )

          result.sent++
          result.details.push({
            enrollment_id: enrollment.id,
            status: "sent",
            message: `Sent ${currentStep.channel}`
          })
        } else {
          result.errors++
          result.details.push({
            enrollment_id: enrollment.id,
            status: "error",
            message: sendResult.error || "Failed to send"
          })

          // Log the error but don't stop the sequence
          console.error(
            `[Sequence Engine] Failed to send for enrollment ${enrollment.id}:`,
            sendResult.error
          )
        }
      } catch (stepError) {
        result.errors++
        result.details.push({
          enrollment_id: enrollment.id,
          status: "error",
          message:
            stepError instanceof Error ? stepError.message : "Unknown error"
        })
      }
    }

    return result
  } catch (error) {
    console.error("[Sequence Engine] Error:", error)
    throw error
  }
}

/**
 * Enroll a customer in a sequence
 */
export async function enrollCustomer(
  sequenceId: string,
  customerId: string,
  jobId?: string
): Promise<{ success: boolean; enrollmentId?: string; error?: string }> {
  try {
    // Check if already enrolled in this sequence
    const { data: existing } = await supabase
      .from("sequence_enrollments")
      .select("id")
      .eq("sequence_id", sequenceId)
      .eq("customer_id", customerId)
      .eq("status", "active")
      .single()

    if (existing) {
      return { success: false, error: "Already enrolled in this sequence" }
    }

    // Get the sequence to calculate first step time
    const { data: sequence, error: seqError } = await supabase
      .from("sequences")
      .select("steps, active")
      .eq("id", sequenceId)
      .single()

    if (seqError || !sequence) {
      return { success: false, error: "Sequence not found" }
    }

    if (!sequence.active) {
      return { success: false, error: "Sequence is not active" }
    }

    const steps = sequence.steps as SequenceStep[]
    const firstStep = steps[0]

    if (!firstStep) {
      return { success: false, error: "Sequence has no steps" }
    }

    // Calculate when to send first step
    const nextStepAt = new Date()
    nextStepAt.setDate(nextStepAt.getDate() + firstStep.day)

    // Create enrollment
    const { data: enrollment, error } = await supabase
      .from("sequence_enrollments")
      .insert({
        sequence_id: sequenceId,
        customer_id: customerId,
        job_id: jobId,
        current_step: 0,
        status: "active",
        next_step_at: nextStepAt.toISOString()
      })
      .select("id")
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Increment enrolled count
    await incrementSequenceStats(sequenceId, "enrolled")

    return { success: true, enrollmentId: enrollment.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

/**
 * Stop a customer's enrollment in a sequence
 */
export async function stopEnrollment(
  enrollmentId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("sequence_enrollments")
    .update({
      status: "stopped",
      stopped_at: new Date().toISOString(),
      stop_reason: reason
    })
    .eq("id", enrollmentId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Helper functions

async function updateEnrollmentStatus(
  enrollmentId: string,
  status: string,
  reason?: string
) {
  const updates: any = { status }
  if (status === "completed") {
    updates.completed_at = new Date().toISOString()
  }
  if (status === "stopped" || status === "paused") {
    updates.stopped_at = new Date().toISOString()
    if (reason) updates.stop_reason = reason
  }

  await supabase
    .from("sequence_enrollments")
    .update(updates)
    .eq("id", enrollmentId)
}

async function incrementSequenceStats(
  sequenceId: string,
  field: "enrolled" | "completed" | "converted"
) {
  const columnMap = {
    enrolled: "total_enrolled",
    completed: "total_completed",
    converted: "total_converted"
  }

  await supabase.rpc("increment_counter", {
    table_name: "sequences",
    column_name: columnMap[field],
    row_id: sequenceId
  })
}

async function logActivity(
  workspaceId: string | undefined,
  customerId: string,
  type: string,
  description: string,
  metadata: any
) {
  if (!workspaceId) return

  await supabase.from("activities").insert({
    workspace_id: workspaceId,
    customer_id: customerId,
    type,
    description,
    metadata
  })
}

function personalizeTemplate(
  template: string,
  customer: { name: string; phone?: string; email?: string },
  jobId?: string
): string {
  let result = template
  result = result.replace(/\{\{name\}\}/gi, customer.name || "there")
  result = result.replace(
    /\{\{first_name\}\}/gi,
    customer.name?.split(" ")[0] || "there"
  )
  return result
}

async function sendSMS(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      return { success: false, error: "Twilio not configured" }
    }

    // Dynamic import to avoid build issues
    const twilio = (await import("twilio")).default
    const client = twilio(accountSid, authToken)

    await client.messages.create({
      body,
      from: fromNumber,
      to
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS send failed"
    }
  }
}

async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  // For now, log that we would send email
  // In production, integrate with SendGrid, Resend, etc.
  console.log(`[Sequence Engine] Would send email to ${to}: ${subject}`)
  console.log(`[Sequence Engine] Body: ${body.substring(0, 100)}...`)

  // Return success for now - replace with actual email sending
  return { success: true }
}
