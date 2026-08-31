import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { adminDb } from "@/lib/firebase/admin"
import { createClient } from "@/lib/supabase/server"
import { evaluateAccess, getPermissionForUser } from "@/lib/design/sharing"
import { assertBudget, recordCompletionUsage } from "@/lib/billing/account"
import {
  budgetErrorResponse,
  isBudgetExceededError
} from "@/lib/billing/errors"
import { resolveSupabaseFilesToText } from "@/lib/report/file-content"
import {
  isImageFile,
  resolveFilesToImageDataUrls
} from "@/lib/design/lab-images"
import { parseLabData, runValidation } from "@/lib/design/validate"
import { simulateDesign } from "@/lib/design/simulate"
import type {
  DesignContentV2,
  ExperimentIteration,
  GeneratedDesign,
  Hypothesis,
  ParsedLabData
} from "@/lib/design-agent"

/**
 * POST /api/design/:designid/validate
 *
 * Runs one round of the Validate loop: judges the hypothesis against the
 * scientist's lab data (free text + uploaded data files), in the context of
 * every prior iteration, then appends the round to content.validation and
 * refreshes the cumulative synthesis. Server-side persistence keeps the
 * iteration log atomic.
 *
 * Body: {
 *   raw?: string,                       // free-text results / observations
 *   dataFiles?: { id, name, size?, type? }[],  // uploaded data-file refs
 * }
 * Response: { iteration, validation }   // the new round + full updated state
 */
export async function POST(
  request: Request,
  { params }: { params: { designid: string } }
) {
  try {
    const designId = params.designid
    if (!designId || designId === "undefined" || designId === "null") {
      return NextResponse.json({ error: "Invalid design ID" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await assertBudget(user.id)
    } catch (e) {
      if (isBudgetExceededError(e)) return budgetErrorResponse((e as any).plan)
    }

    const body = (await request.json().catch(() => ({}))) as {
      mode?: "parse" | "validate" | "simulate"
      raw?: string
      dataFiles?: { id?: string; name: string; size?: number; type?: string }[]
      structured?: ParsedLabData
      desiredOutcome?: string
    }
    const mode =
      body.mode === "parse"
        ? "parse"
        : body.mode === "simulate"
          ? "simulate"
          : "validate"
    const raw = (body.raw ?? "").trim()
    const dataFiles = Array.isArray(body.dataFiles) ? body.dataFiles : []

    // Simulate needs no lab data (it predicts from the design); other modes do.
    if (mode !== "simulate" && !raw && dataFiles.length === 0) {
      return NextResponse.json(
        { error: "Add your lab results as text or upload a data file first." },
        { status: 400 }
      )
    }

    const docRef = adminDb.collection("designs").doc(designId)
    const doc = await docRef.get()
    if (!doc.exists) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 })
    }
    const designData = doc.data() as any

    const permission = await getPermissionForUser(
      designId,
      user.id,
      user.email ?? null
    )
    if (
      designData.user_id &&
      !evaluateAccess(designData, user.id, permission).canEdit
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const content: DesignContentV2 =
      typeof designData.content === "string"
        ? JSON.parse(designData.content || "{}")
        : (designData.content ?? { schemaVersion: 2 })

    const designs: GeneratedDesign[] = Array.isArray(content.designs)
      ? content.designs
      : []
    if (designs.length === 0) {
      return NextResponse.json(
        { error: "Generate a design before validating it against data." },
        { status: 400 }
      )
    }

    // The hypothesis under test: the selected one(s), else the first.
    const hypotheses: Hypothesis[] = Array.isArray(content.hypotheses)
      ? content.hypotheses
      : []
    const selectedHyps = hypotheses.filter(h => (h as any).selected)
    const hypothesisText =
      (selectedHyps.length ? selectedHyps : hypotheses)
        .map(h => h.text)
        .filter(Boolean)
        .join("\n") || ""

    // The design that was run: concatenate the active/first design's sections.
    const activeDesign = designs[0]
    const designText = (activeDesign?.sections ?? [])
      .map((s: any) => `### ${s.heading}\n${s.body}`)
      .join("\n\n")

    // ── SIMULATE mode (5a): pre-lab prediction + design optimization. ────────
    if (mode === "simulate") {
      const desiredOutcome = (
        body.desiredOutcome ||
        content.problem?.successCriteria ||
        content.problem?.objective ||
        ""
      ).trim()
      const {
        result: sim,
        completions: scs,
        model: sm,
        reason,
        executed
      } = await simulateDesign({
        problem: content.problem ?? {},
        hypothesisText,
        designText,
        desiredOutcome,
        cumulativeInsights: content.validation?.cumulativeInsights
      })
      // The modeled sim makes several model calls (plan + one interpret per
      // improve-round) — meter every one against the design owner.
      for (const sc of scs) {
        if (sc)
          await recordCompletionUsage(
            { userId: user.id, feature: "design", model: sm },
            sc
          )
      }
      console.log(
        `[VALIDATE] simulate: executed=${executed} rounds=${sim?.rounds?.length ?? 0} meetRate=${sim?.meetRate ?? "n/a"}${reason ? ` reason="${reason}"` : ""}`
      )
      if (!sim) {
        console.error("[VALIDATE] simulate returned nothing:", reason)
        return NextResponse.json(
          { error: `Couldn't simulate — ${reason ?? "unknown reason"}.` },
          { status: 502 }
        )
      }
      const nextValidation = {
        ...(content.validation ?? { iterations: [] }),
        iterations: content.validation?.iterations ?? [],
        desiredOutcome,
        simulation: sim
      }
      await docRef.update({
        content: JSON.stringify({
          ...content,
          schemaVersion: 2,
          validation: nextValidation,
          approvedPhases: Array.from(
            new Set([...(content.approvedPhases ?? []), "validate" as const])
          )
        }),
        updated_at: new Date().toISOString()
      })
      return NextResponse.json({ simulation: sim, validation: nextValidation })
    }

    // Split uploads: IMAGES go to the vision model as-is (gel photos, scans,
    // instrument screenshots); everything else (text-layer PDF, CSV, docx) uses
    // the cheap text-extraction path.
    let fileText = ""
    let fileWarn = ""
    let images: string[] = []
    if (dataFiles.length > 0) {
      const withId = dataFiles.filter(f => f.id)
      if (withId.length === 0) {
        fileWarn =
          "The file is still uploading (no id yet) — wait a second and re-attach it."
      } else {
        const imageIds = withId
          .filter(f => isImageFile(f))
          .map(f => f.id as string)
        const docIds = withId
          .filter(f => !isImageFile(f))
          .map(f => f.id as string)

        if (docIds.length > 0) {
          try {
            const resolved = await resolveSupabaseFilesToText(docIds, {
              maxCharsPerFile: 20_000
            })
            fileText = resolved
              .map(r => `## ${r.fileName || "data file"}\n${r.content || ""}`)
              .join("\n\n")
            if (!fileText.trim()) {
              fileWarn =
                "That PDF has no readable text layer (likely a scan). Export the page as an image (PNG/JPG) and upload that — we read images directly."
            }
          } catch (e: any) {
            console.error("[VALIDATE] doc resolve failed", e)
            fileWarn = `Couldn't read the uploaded document (${e?.message ?? "unknown error"}). Try an image export or paste the numbers.`
          }
        }

        // Images are only needed to BUILD the structured table (parse step).
        // On validate we already have `structured`, so skip the re-download.
        if (imageIds.length > 0 && mode === "parse") {
          try {
            const resolvedImages = await resolveFilesToImageDataUrls(imageIds)
            images = resolvedImages.map(i => i.dataUrl)
            if (images.length === 0) {
              fileWarn =
                "Couldn't decode the uploaded image(s). Try re-exporting as PNG or JPG."
            }
          } catch (e: any) {
            console.error("[VALIDATE] image resolve failed", e)
            fileWarn = `Couldn't read the uploaded image (${e?.message ?? "unknown error"}).`
          }
        }
      }
    }
    const roundData = [raw, fileText].filter(Boolean).join("\n\n")

    // Need SOMETHING to work with: text, an image to read (parse), or an
    // already-parsed table carried over from the parse step (validate).
    const hasStructured = mode === "validate" && !!body.structured
    if (!roundData.trim() && images.length === 0 && !hasStructured) {
      return NextResponse.json(
        {
          error:
            fileWarn ||
            "No usable data found. Paste your results, attach a data file, or upload an image of your results."
        },
        { status: 400 }
      )
    }

    // ── PARSE mode: extract a structured table + summary, no persistence. ────
    if (mode === "parse") {
      console.log(
        `[VALIDATE] parse: text=${roundData.length}c images=${images.length}`
      )
      const {
        structured,
        completion: pc,
        model: pm,
        reason
      } = await parseLabData({ hypothesisText, designText, roundData, images })
      if (pc) {
        await recordCompletionUsage(
          { userId: user.id, feature: "design", model: pm },
          pc
        )
      }
      if (!structured) {
        console.error("[VALIDATE] parse returned no structure:", reason)
        return NextResponse.json(
          { error: `Couldn't read the data — ${reason ?? "unknown reason"}.` },
          { status: 502 }
        )
      }
      return NextResponse.json({ structured, warning: fileWarn || undefined })
    }

    const prior = content.validation?.iterations ?? []
    const cumulativeInsights = content.validation?.cumulativeInsights

    const { result, completion, model } = await runValidation({
      problem: content.problem ?? {},
      hypothesisText,
      designText,
      roundData,
      priorIterations: prior,
      cumulativeInsights,
      structured: body.structured ?? null
    })

    await recordCompletionUsage(
      { userId: user.id, feature: "design", model },
      completion
    )

    if (!result) {
      return NextResponse.json(
        { error: "The validation agent returned an empty result. Try again." },
        { status: 502 }
      )
    }

    const iteration: ExperimentIteration = {
      id: `iter-${Math.random().toString(36).slice(2, 10)}`,
      index: prior.length + 1,
      designSnapshot: designs,
      hypothesisText,
      data: {
        raw: raw || undefined,
        files: dataFiles.length ? dataFiles : undefined
      },
      structuredData: body.structured ?? undefined,
      verdict: result.verdict,
      confidence: result.confidence,
      reasoning: result.reasoning,
      insights: result.insights,
      suggestedChanges: result.suggestedChanges,
      revisedHypothesis: result.revisedHypothesis ?? undefined,
      createdAt: new Date().toISOString()
    }

    const nextValidation = {
      iterations: [...prior, iteration],
      cumulativeInsights: result.cumulativeInsights || cumulativeInsights || ""
    }
    const nextContent: DesignContentV2 = {
      ...content,
      schemaVersion: 2,
      validation: nextValidation,
      approvedPhases: Array.from(
        new Set([...(content.approvedPhases ?? []), "validate" as const])
      )
    }

    await docRef.update({
      content: JSON.stringify(nextContent),
      updated_at: new Date().toISOString()
    })

    return NextResponse.json({ iteration, validation: nextValidation })
  } catch (error: any) {
    console.error("[VALIDATE] Error:", error)
    return NextResponse.json(
      { error: error?.message ?? "Internal error" },
      { status: 500 }
    )
  }
}
