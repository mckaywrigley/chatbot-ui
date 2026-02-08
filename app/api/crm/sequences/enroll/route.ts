import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { enrollCustomer, stopEnrollment } from "@/lib/crm/sequence-engine"

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sequenceId, customerId, jobId } = await request.json()

    if (!sequenceId || !customerId) {
      return NextResponse.json(
        { error: "sequenceId and customerId are required" },
        { status: 400 }
      )
    }

    // Verify user has access to this sequence
    const { data: sequence, error: seqError } = await supabase
      .from("sequences")
      .select("id, workspace_id")
      .eq("id", sequenceId)
      .single()

    if (seqError || !sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    // Verify user owns the workspace
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", sequence.workspace_id)
      .eq("user_id", user.id)
      .single()

    if (wsError || !workspace) {
      return NextResponse.json(
        { error: "Not authorized to access this sequence" },
        { status: 403 }
      )
    }

    // Enroll the customer
    const result = await enrollCustomer(sequenceId, customerId, jobId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      enrollmentId: result.enrollmentId
    })
  } catch (error) {
    console.error("[Sequence Enroll] Error:", error)
    return NextResponse.json(
      { error: "Failed to enroll customer" },
      { status: 500 }
    )
  }
}

// Stop an enrollment
export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { enrollmentId, reason } = await request.json()

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "enrollmentId is required" },
        { status: 400 }
      )
    }

    // Verify user has access to this enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from("sequence_enrollments")
      .select("id, sequence:sequences(workspace_id)")
      .eq("id", enrollmentId)
      .single()

    if (enrollError || !enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      )
    }

    const workspaceId = (enrollment.sequence as any)?.workspace_id
    if (workspaceId) {
      const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .select("id")
        .eq("id", workspaceId)
        .eq("user_id", user.id)
        .single()

      if (wsError || !workspace) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 })
      }
    }

    const result = await stopEnrollment(enrollmentId, reason || "Manual stop")

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Sequence Stop] Error:", error)
    return NextResponse.json(
      { error: "Failed to stop enrollment" },
      { status: 500 }
    )
  }
}
