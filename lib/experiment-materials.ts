/**
 * Utilities for parsing and calculating experiment materials
 * Similar to catering material estimation but for scientific experiments
 */

import {
  ExperimentMaterial,
  MaterialRequirement,
  COMMON_UNITS
} from "@/types/experiment-materials"

/**
 * Parse materials from text descriptions
 * Extracts quantities and units from bullet points or lines
 * Examples:
 * - "50 mL PBS buffer" -> { name: "PBS buffer", quantity: 50, unit: "mL" }
 * - "2-3 g glucose" -> { name: "glucose", quantity: 2.5, unit: "g" }
 * - "Sodium chloride (10 mg)" -> { name: "Sodium chloride", quantity: 10, unit: "mg" }
 */
export function parseMaterialsFromText(
  text: string
): Omit<ExperimentMaterial, "id">[] {
  if (!text || text.trim() === "" || text === "Not specified") {
    return []
  }

  const materials: Omit<ExperimentMaterial, "id">[] = []

  // First, try to split by commas if it looks like a comma-separated list
  let lines: string[] = []

  // Check if text is mostly on one line with commas (like your example)
  const lineCount = text.split(/[\n\r]+/).length
  const commaCount = text.split(",").length

  if (lineCount <= 3 && commaCount > 3) {
    // Looks like a comma-separated list
    lines = text
      .split(/,(?![^()]*\))/) // Split by comma but not inside parentheses
      .map(item => item.trim())
      .filter(item => item.length > 0)
  } else {
    // Split by newlines or common list markers
    lines = text
      .split(/[\n\r]+/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
  }

  for (const line of lines) {
    // Remove leading list markers (-, *, •, numbers)
    const cleanLine = line.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "")

    // Pattern 1: "50 mL PBS buffer" or "50mL PBS buffer"
    // Pattern 2: "PBS buffer (50 mL)" or "PBS buffer: 50 mL"
    // Pattern 3: "2-3 g glucose" (range)

    // Try to find quantity and unit patterns
    const patterns = [
      // Pattern: "50 mL PBS" or "50mL PBS"
      /^(\d+(?:\.\d+)?)\s*([a-zA-Zµμ]+)\s+(.+)$/,
      // Pattern: "50-60 mL PBS" (range)
      /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\s*([a-zA-Zµμ]+)\s+(.+)$/,
      // Pattern: "PBS (50 mL)" or "PBS: 50 mL" or "PBS - 50 mL"
      /^(.+?)\s*[\(:]\s*(\d+(?:\.\d+)?)\s*([a-zA-Zµμ]+)\s*[\)]?$/,
      // Pattern: "PBS buffer 50 mL"
      /^(.+?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Zµμ]+)$/
    ]

    let matched = false

    for (const pattern of patterns) {
      const match = cleanLine.match(pattern)
      if (match) {
        let name: string
        let quantity: number
        let unit: string

        if (pattern === patterns[1]) {
          // Range pattern: take average
          const min = parseFloat(match[1])
          const max = parseFloat(match[2])
          quantity = (min + max) / 2
          unit = normalizeUnit(match[3])
          name = match[4].trim()
        } else if (pattern === patterns[0]) {
          // "50 mL PBS"
          quantity = parseFloat(match[1])
          unit = normalizeUnit(match[2])
          name = match[3].trim()
        } else if (pattern === patterns[2]) {
          // "PBS (50 mL)"
          name = match[1].trim()
          quantity = parseFloat(match[2])
          unit = normalizeUnit(match[3])
        } else {
          // "PBS buffer 50 mL"
          name = match[1].trim()
          quantity = parseFloat(match[2])
          unit = normalizeUnit(match[3])
        }

        // Clean up name - remove extra punctuation
        name = name
          .replace(/[,:;]+$/, "")
          .replace(/\s+/g, " ")
          .trim()

        if (name && quantity > 0 && unit) {
          materials.push({
            name,
            quantityPerRun: quantity,
            unit
          })
          matched = true
          break
        }
      }
    }

    // If no quantity/unit found, still add the material with default values
    if (!matched && cleanLine.length > 0) {
      // Check if it's just a material name without quantity
      const simpleName = cleanLine
        .replace(/[,:;]+$/, "")
        .replace(/\s+/g, " ")
        .trim()
      if (
        simpleName.length > 2 &&
        !simpleName.toLowerCase().includes("not specified") &&
        !simpleName.toLowerCase().includes("including")
      ) {
        materials.push({
          name: simpleName,
          quantityPerRun: 0,
          unit: "units"
        })
      }
    }
  }

  return materials
}

/**
 * Normalize unit names to standard forms
 */
function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().replace(/\s+/g, "")

  // Map common variations to standard units
  const unitMap: Record<string, string> = {
    milliliter: "mL",
    milliliters: "mL",
    ml: "mL",
    liter: "L",
    liters: "L",
    l: "L",
    microliter: "µL",
    microliters: "µL",
    ul: "µL",
    µl: "µL",
    milligram: "mg",
    milligrams: "mg",
    gram: "g",
    grams: "g",
    kilogram: "kg",
    kilograms: "kg",
    kg: "kg",
    microgram: "µg",
    micrograms: "µg",
    ug: "µg",
    µg: "µg",
    unit: "units",
    plate: "plates",
    well: "wells",
    tube: "tubes",
    sample: "samples"
  }

  return unitMap[normalized] || unit
}

/**
 * Calculate total material requirements based on number of runs
 */
export function calculateMaterialRequirements(
  materials: ExperimentMaterial[],
  numberOfRuns: number,
  safetyFactor: number = 1.1 // 10% extra by default
): MaterialRequirement[] {
  if (numberOfRuns <= 0) {
    return []
  }

  const aggregated = new Map<string, MaterialRequirement>()

  materials.forEach(material => {
    if (!material.name || material.quantityPerRun <= 0) {
      return
    }

    const key = `${material.name.toLowerCase()}-${material.unit}`
    const totalQty = material.quantityPerRun * numberOfRuns * safetyFactor

    const existing = aggregated.get(key)
    if (existing) {
      existing.totalQuantity += totalQty
      if (material.estimatedCost) {
        existing.estimatedCost =
          (existing.estimatedCost || 0) + material.estimatedCost * numberOfRuns
      }
    } else {
      aggregated.set(key, {
        id: key,
        materialName: material.name,
        unit: material.unit,
        totalQuantity: Number(totalQty.toFixed(3)),
        estimatedCost: material.estimatedCost
          ? Number((material.estimatedCost * numberOfRuns).toFixed(2))
          : undefined,
        notes: material.notes
      })
    }
  })

  return Array.from(aggregated.values()).sort((a, b) =>
    a.materialName.localeCompare(b.materialName)
  )
}

/**
 * Sum up total estimated costs
 */
export function sumMaterialCosts(materials: MaterialRequirement[]): number {
  return materials.reduce(
    (sum, material) => sum + (material.estimatedCost || 0),
    0
  )
}

/**
 * Extract number of conditions/replicates from text
 * Looks for patterns like "3 replicates", "5 conditions", "n=10", etc.
 */
export function extractConditionCount(text: string): number | null {
  if (!text) return null

  const patterns = [
    /(\d+)\s*replicates?/i,
    /(\d+)\s*conditions?/i,
    /n\s*=\s*(\d+)/i,
    /(\d+)\s*samples?/i,
    /(\d+)\s*groups?/i,
    /(\d+)\s*runs?/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return parseInt(match[1], 10)
    }
  }

  return null
}

/**
 * Generate a unique ID for materials
 */
export function generateMaterialId(): string {
  return `mat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Format number for display (removes trailing zeros)
 */
export function formatQuantity(quantity: number): string {
  if (quantity === 0) return "0"
  if (quantity >= 1000) {
    return quantity.toLocaleString(undefined, {
      maximumFractionDigits: 1
    })
  }
  return quantity.toLocaleString(undefined, {
    maximumFractionDigits: 3
  })
}
