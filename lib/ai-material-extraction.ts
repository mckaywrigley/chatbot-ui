/**
 * AI-powered material extraction from experimental design text
 */

import { ExperimentMaterial } from "@/types/experiment-materials"

interface AIExtractionResult {
  materials: Omit<ExperimentMaterial, "id">[]
  error?: string
}

/**
 * Extract materials using AI (OpenAI via dedicated endpoint)
 */
export async function extractMaterialsWithAI(
  materialsText: string,
  preparationText?: string
): Promise<AIExtractionResult> {
  try {
    const response = await fetch("/api/design/extract-materials", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        materialsText,
        preparationText
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error || `API call failed: ${response.statusText}`
      )
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    if (!data.materials || !Array.isArray(data.materials)) {
      throw new Error("Invalid response format")
    }

    return { materials: data.materials }
  } catch (error) {
    console.error("[AI_MATERIAL_EXTRACTION] Error:", error)
    return {
      materials: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to extract materials with AI"
    }
  }
}
