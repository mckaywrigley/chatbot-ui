/**
 * API endpoint for AI-powered material extraction from experimental designs
 * Uses OpenAI to parse complex material lists
 */

import { NextRequest, NextResponse } from "next/server"
import { getAzureOpenAI, getAzureOpenAIModel } from "@/lib/azure-openai"
import { requireUser } from "@/lib/server/require-user"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { UPLOAD_SIZE_LIMITS, enforceSize } from "@/lib/server/file-validation"
import { assertBudget, recordCompletionUsage } from "@/lib/billing/account"
import {
  budgetErrorResponse,
  isBudgetExceededError
} from "@/lib/billing/errors"

// Note: this route was previously `runtime = "edge"`, but auth / file-type
// helpers rely on Node APIs (dns, crypto). Running on the Node runtime is
// safe here and unblocks the auth check.

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response

    try {
      await assertBudget(auth.user.id)
    } catch (e) {
      if (isBudgetExceededError(e)) return budgetErrorResponse(e.plan)
    }

    const limited = await checkRateLimit({
      name: "extract-materials",
      identifier: auth.user.id,
      requests: 30,
      window: "1 h"
    })
    if (limited) return limited

    const { materialsText, preparationText } = await request.json()

    if (!materialsText && !preparationText) {
      return NextResponse.json(
        { error: "No text provided for extraction" },
        { status: 400 }
      )
    }

    const combinedSize =
      Buffer.byteLength(materialsText || "", "utf8") +
      Buffer.byteLength(preparationText || "", "utf8")
    const sizeError = enforceSize(combinedSize, "text")
    if (sizeError) return sizeError
    void UPLOAD_SIZE_LIMITS

    const openai = getAzureOpenAI()
    const model = getAzureOpenAIModel()

    const fullText = [materialsText, preparationText]
      .filter(Boolean)
      .join("\n\n")

    const prompt = `Extract all materials and reagents from the following experimental design text. For each material, identify:
1. Material name (clean, without extra details like catalog numbers or brands)
2. Quantity per experimental run or per sample (look carefully through the entire text)
3. Unit of measurement

IMPORTANT: Look for quantities in multiple places:
- In the materials list itself
- In the preparation steps (e.g., "prepare 100 mL of buffer", "add 50 µL of reagent")
- In procedure descriptions (e.g., "pipette 20 µL per well", "use 5 mg per sample")
- In parenthetical notes (e.g., "PBS (100 mL per experiment)")

Return ONLY a valid JSON array with this exact structure:
[
  {
    "name": "material name",
    "quantityPerRun": number (extract from text, use 0 ONLY if truly not specified anywhere),
    "unit": "unit" (use appropriate unit based on context)
  }
]

Rules:
- Extract each distinct material separately (split comma-separated items)
- Remove catalog numbers (e.g., "CAS 74-79-3", "Eppendorf 022363204"), brand names (e.g., "Sigma-Aldrich", "Gilson")
- For concentrations like "180 mg/ml", if it says "X mL of 180 mg/ml solution", extract X mL as the quantity
- Look for patterns like "prepare X amount", "add Y to each", "use Z per sample/well/tube"
- If you see "per sample", "per well", "per tube", "per reaction", "each", use that as the per-run quantity
- Use standard units: mL, L, µL, mg, g, kg, µg, units, plates, wells, tubes, samples, each
- If a range is given (e.g., "2-3 g"), use the average (2.5)
- Ignore PPE (gloves, coats, goggles) and non-consumable equipment (balances, pH meters, viscometers)
- Clean up material names: "analytical grade arginine" -> "Arginine", "deionized water" -> "Deionized water"
- Be intelligent: if the text mentions preparing a solution or buffer, extract the total volume as quantity

Examples:
- "100 mL PBS buffer" -> name: "PBS buffer", quantityPerRun: 100, unit: "mL"
- "Prepare 50 µL of reagent per well" -> name: "Reagent", quantityPerRun: 50, unit: "µL"
- "Add 10 mg glucose to each tube" -> name: "Glucose", quantityPerRun: 10, unit: "mg"
- "Bispecific antibody (20 µL per sample)" -> name: "Bispecific antibody", quantityPerRun: 20, unit: "µL"

Experimental design text:
${fullText}

JSON array:`

    // Make non-streaming request for extraction
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a scientific material extraction assistant. Extract materials accurately and return ONLY valid JSON with no markdown formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      stream: false
    })

    await recordCompletionUsage(
      { userId: auth.user.id, feature: "design", model },
      response
    )

    const content = response.choices[0]?.message?.content?.trim() || ""

    // Remove markdown code blocks if present
    let jsonText = content
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "")
        .trim()
    }

    // Parse and validate
    const parsed = JSON.parse(jsonText)

    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "Invalid response format from AI" },
        { status: 500 }
      )
    }

    // Validate and clean each material
    const materials = parsed
      .filter((item: any) => {
        return (
          item &&
          typeof item.name === "string" &&
          item.name.trim().length > 0 &&
          typeof item.quantityPerRun === "number" &&
          typeof item.unit === "string"
        )
      })
      .map((item: any) => ({
        name: item.name.trim(),
        quantityPerRun: Number(item.quantityPerRun) || 0,
        unit: item.unit.trim() || "units",
        notes: item.notes
      }))

    return NextResponse.json({ materials })
  } catch (error: any) {
    console.error("[EXTRACT_MATERIALS] Error:", error)

    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Azure OpenAI credentials not found. Please set AZURE_OPENAI_KEY/AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION, and AZURE_OPENAI_DEPLOYMENT."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "Azure OpenAI API Key is incorrect. Please verify AZURE_OPENAI_KEY/AZURE_OPENAI_API_KEY."
    } else if (error instanceof SyntaxError) {
      errorMessage = "Failed to parse AI response. Please try again."
    }

    return NextResponse.json({ error: errorMessage }, { status: errorCode })
  }
}
