/**
 * Server-side handlers for the report-templates collection.
 *
 * Each template captures the section list (plus custom additions) +
 * chart-type preference of a finished report so the user can clone
 * the structure on a future report. Owned by a single user, scoped
 * to a workspace - we deliberately don't share across workspaces yet.
 */

import { NextResponse } from "next/server"
import type { QueryDocumentSnapshot } from "firebase-admin/firestore"

import { adminDb } from "@/lib/firebase/admin"
import { requireUser } from "@/lib/server/require-user"
import { serverError } from "@/lib/server/firestore-resource"

const COLLECTION = "report_templates"

interface SectionInput {
  key: string
  title: string
  description?: string | null
  group?: string | null
  custom?: boolean
}

function sanitizeSections(input: unknown): SectionInput[] {
  if (!Array.isArray(input)) return []
  return input
    .map((row: any, i: number) => {
      const key =
        typeof row?.key === "string" && row.key.trim()
          ? row.key.trim()
          : `s-${i}`
      const title =
        typeof row?.title === "string" && row.title.trim()
          ? row.title.trim().slice(0, 120)
          : "Untitled section"
      return {
        key,
        title,
        description:
          typeof row?.description === "string"
            ? row.description.trim().slice(0, 600)
            : null,
        group: typeof row?.group === "string" ? row.group : null,
        custom: !!row?.custom
      }
    })
    .filter(Boolean)
}

export async function listTemplates(request: Request): Promise<Response> {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response
    const user = auth.user

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    if (!workspaceId) {
      return NextResponse.json({ templates: [] })
    }

    const snap = await adminDb
      .collection(COLLECTION)
      .where("user_id", "==", user.id)
      .where("workspace_id", "==", workspaceId)
      .get()

    const templates = snap.docs
      .map((d: QueryDocumentSnapshot) => ({
        id: d.id,
        ...(d.data() as Record<string, unknown>)
      }))
      .sort(
        (a: any, b: any) =>
          new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
          new Date(a.updated_at ?? a.created_at ?? 0).getTime()
      )
    return NextResponse.json({ templates })
  } catch (error) {
    console.error("[REPORT_TEMPLATES] list failed:", error)
    return serverError("Failed to list templates")
  }
}

export async function createTemplate(request: Request): Promise<Response> {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response
    const user = auth.user

    const body = (await request.json()) as Record<string, unknown>
    const workspaceId = body.workspaceId
    if (typeof workspaceId !== "string" || !workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      )
    }
    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim().slice(0, 120)
        : ""
    if (!name) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      )
    }
    const description =
      typeof body.description === "string"
        ? body.description.trim().slice(0, 600)
        : null
    const sections = sanitizeSections(body.sections)
    if (sections.length === 0) {
      return NextResponse.json(
        { error: "At least one section is required" },
        { status: 400 }
      )
    }
    const chartType =
      typeof body.chart_type === "string" &&
      ["bar", "line", "pie"].includes(body.chart_type)
        ? (body.chart_type as "bar" | "line" | "pie")
        : null

    const now = new Date().toISOString()
    const docRef = await adminDb.collection(COLLECTION).add({
      user_id: user.id,
      workspace_id: workspaceId,
      name,
      description,
      sections,
      chart_type: chartType,
      section_count: sections.length,
      created_at: now,
      updated_at: now
    })
    const created = await docRef.get()
    return NextResponse.json({
      template: {
        id: created.id,
        ...(created.data() as Record<string, unknown>)
      }
    })
  } catch (error) {
    console.error("[REPORT_TEMPLATES] create failed:", error)
    return serverError("Failed to create template")
  }
}

export async function deleteTemplate(
  _request: Request,
  templateId: string
): Promise<Response> {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response
    const user = auth.user

    const ref = adminDb.collection(COLLECTION).doc(templateId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const data = snap.data() as Record<string, unknown> | undefined
    if (data?.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await ref.delete()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[REPORT_TEMPLATES] delete failed:", error)
    return serverError("Failed to delete template")
  }
}
