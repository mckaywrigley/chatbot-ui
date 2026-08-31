"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import {
  Calculator,
  Plus,
  Trash2,
  Download,
  AlertCircle,
  Beaker,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2 as SpinnerIcon,
  RefreshCw
} from "lucide-react"
import {
  ExperimentMaterial,
  MaterialRequirement,
  COMMON_UNITS
} from "@/types/experiment-materials"
import {
  parseMaterialsFromText,
  calculateMaterialRequirements,
  sumMaterialCosts,
  extractConditionCount,
  generateMaterialId,
  formatQuantity
} from "@/lib/experiment-materials"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

interface MaterialCalculatorProps {
  materialsListText?: string
  materialPreparationText?: string
  replicatesAndConditionsText?: string
  conditionsTableText?: string
  stepByStepProcedure?: string
}

export function MaterialCalculator({
  materialsListText,
  materialPreparationText,
  replicatesAndConditionsText,
  conditionsTableText,
  stepByStepProcedure
}: MaterialCalculatorProps) {
  // Extract suggested number of runs from the design
  const suggestedRuns = useMemo(() => {
    const sources = [
      replicatesAndConditionsText,
      conditionsTableText,
      materialsListText
    ].filter(Boolean)

    for (const source of sources) {
      const count = extractConditionCount(source || "")
      if (count && count > 0) {
        return count
      }
    }
    return 3 // default
  }, [replicatesAndConditionsText, conditionsTableText, materialsListText])

  // Parse initial materials from text (fallback for basic parsing)
  const initialMaterials = useMemo(() => {
    const parsedFromList = materialsListText
      ? parseMaterialsFromText(materialsListText)
      : []
    const parsedFromPrep = materialPreparationText
      ? parseMaterialsFromText(materialPreparationText)
      : []
    const parsedFromProcedure = stepByStepProcedure
      ? parseMaterialsFromText(stepByStepProcedure)
      : []

    // Combine and deduplicate by name+unit
    const combined = [
      ...parsedFromList,
      ...parsedFromPrep,
      ...parsedFromProcedure
    ]
    const deduped = new Map<string, ExperimentMaterial>()

    combined.forEach(mat => {
      const key = `${mat.name.toLowerCase()}-${mat.unit}`
      if (!deduped.has(key)) {
        deduped.set(key, {
          ...mat,
          id: generateMaterialId()
        })
      } else {
        // If duplicate, take the higher quantity
        const existing = deduped.get(key)!
        if (mat.quantityPerRun > existing.quantityPerRun) {
          existing.quantityPerRun = mat.quantityPerRun
        }
      }
    })

    return Array.from(deduped.values())
  }, [materialsListText, materialPreparationText, stepByStepProcedure])

  const [materials, setMaterials] = useState<ExperimentMaterial[]>([])
  const [numberOfRuns, setNumberOfRuns] = useState<number>(suggestedRuns)
  const [safetyFactor, setSafetyFactor] = useState<number>(1.1) // 10% extra
  const [isExpanded, setIsExpanded] = useState<boolean>(true)
  const [showPerRunTable, setShowPerRunTable] = useState<boolean>(false)
  const [isExtracting, setIsExtracting] = useState<boolean>(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)

  // Automatically extract materials with AI on mount
  useEffect(() => {
    const extractOnMount = async () => {
      // Only run if we have text and haven't extracted yet
      if (
        materials.length === 0 &&
        (materialsListText || materialPreparationText || stepByStepProcedure) &&
        !isExtracting
      ) {
        setIsExtracting(true)
        setExtractionError(null)

        try {
          const { extractMaterialsWithAI } = await import(
            "@/lib/ai-material-extraction"
          )

          // Combine all text sources for better extraction
          const combinedText = [
            materialsListText,
            materialPreparationText,
            stepByStepProcedure
          ]
            .filter(Boolean)
            .join("\n\n=== NEXT SECTION ===\n\n")

          const result = await extractMaterialsWithAI(combinedText, undefined)

          if (result.error) {
            // Fall back to basic parsing if AI fails
            console.warn(
              "[MATERIAL_CALCULATOR] AI extraction failed, using basic parsing:",
              result.error
            )
            if (initialMaterials.length > 0) {
              setMaterials(initialMaterials)
            }
            setExtractionError(result.error)
          } else if (result.materials.length > 0) {
            const materialsWithIds = result.materials.map(mat => ({
              ...mat,
              id: generateMaterialId()
            }))
            setMaterials(materialsWithIds)
          } else {
            // Fall back to basic parsing if no materials found
            if (initialMaterials.length > 0) {
              setMaterials(initialMaterials)
            }
          }
        } catch (error) {
          console.error("[MATERIAL_CALCULATOR] Auto-extraction error:", error)
          // Fall back to basic parsing on error
          if (initialMaterials.length > 0) {
            setMaterials(initialMaterials)
          }
          setExtractionError(
            error instanceof Error
              ? error.message
              : "Failed to extract materials"
          )
        } finally {
          setIsExtracting(false)
        }
      }
    }

    extractOnMount()
  }, [
    materialsListText,
    materialPreparationText,
    stepByStepProcedure,
    materials.length,
    initialMaterials,
    isExtracting
  ])

  // Calculate total requirements
  const requirements = useMemo(
    () => calculateMaterialRequirements(materials, numberOfRuns, safetyFactor),
    [materials, numberOfRuns, safetyFactor]
  )

  const totalCost = useMemo(
    () => sumMaterialCosts(requirements),
    [requirements]
  )

  const handleAddMaterial = () => {
    setMaterials([
      ...materials,
      {
        id: generateMaterialId(),
        name: "",
        quantityPerRun: 0,
        unit: "mL"
      }
    ])
  }

  const handleRemoveMaterial = (id: string) => {
    if (materials.length > 1) {
      setMaterials(materials.filter(m => m.id !== id))
    }
  }

  const handleMaterialChange = (
    id: string,
    field: keyof ExperimentMaterial,
    value: string | number
  ) => {
    setMaterials(
      materials.map(m => {
        if (m.id === id) {
          return {
            ...m,
            [field]:
              field === "quantityPerRun" || field === "estimatedCost"
                ? Number(value)
                : value
          }
        }
        return m
      })
    )
  }

  const handleExportCSV = () => {
    const headers = ["Material", "Unit", "Qty per Run", "Total Quantity"]
    const rows = requirements.map(req => {
      const mat = materials.find(
        m =>
          m.name.toLowerCase() === req.materialName.toLowerCase() &&
          m.unit === req.unit
      )
      return [
        req.materialName,
        req.unit,
        mat ? mat.quantityPerRun.toString() : "-",
        formatQuantity(req.totalQuantity)
      ]
    })

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `experiment-materials-${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleResetMaterials = () => {
    if (
      initialMaterials.length > 0 &&
      confirm(
        "Reset to initially detected materials? Any manual changes will be lost."
      )
    ) {
      setMaterials(initialMaterials)
    }
  }

  const handleReExtractWithAI = async () => {
    if (
      !materialsListText &&
      !materialPreparationText &&
      !stepByStepProcedure
    ) {
      return
    }

    if (
      materials.length > 0 &&
      !confirm(
        "Re-extract materials with AI? This will replace your current materials and any manual changes will be lost."
      )
    ) {
      return
    }

    setIsExtracting(true)
    setExtractionError(null)

    try {
      const { extractMaterialsWithAI } = await import(
        "@/lib/ai-material-extraction"
      )

      // Combine all text sources for better extraction
      const combinedText = [
        materialsListText,
        materialPreparationText,
        stepByStepProcedure
      ]
        .filter(Boolean)
        .join("\n\n=== NEXT SECTION ===\n\n")

      const result = await extractMaterialsWithAI(combinedText, undefined)

      if (result.error) {
        setExtractionError(result.error)
        // Fall back to basic parsing if AI fails
        if (initialMaterials.length > 0) {
          setMaterials(initialMaterials)
        }
      } else if (result.materials.length > 0) {
        const materialsWithIds = result.materials.map(mat => ({
          ...mat,
          id: generateMaterialId()
        }))
        setMaterials(materialsWithIds)
        setShowPerRunTable(true) // Expand to show extracted materials
      } else {
        setExtractionError("No materials found in the text")
      }
    } catch (error) {
      console.error("[MATERIAL_CALCULATOR] AI re-extraction error:", error)
      setExtractionError(
        error instanceof Error
          ? error.message
          : "Failed to re-extract materials"
      )
    } finally {
      setIsExtracting(false)
    }
  }

  if (!materialsListText && !materialPreparationText) {
    return null
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-emerald-500/5 shadow-lg">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-1 items-start gap-3">
            <div className="bg-primary/10 text-primary rounded-lg p-2.5 shadow-sm">
              <Calculator className="size-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Material Calculator</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="text-muted-foreground size-4 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Automatically parses materials from your design and
                        calculates total quantities needed based on the number
                        of experimental runs. You can edit quantities and add
                        materials manually.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {isExtracting
                  ? "AI extracting materials from design..."
                  : materials.length > 0
                    ? `${materials.length} material${materials.length === 1 ? "" : "s"} detected • ${numberOfRuns} runs configured`
                    : "Configure materials and experimental runs"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {requirements.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="shrink-0"
              >
                <Download className="mr-2 size-4" />
                Export CSV
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isExpanded && requirements.length > 0 && (
        <CardContent className="pt-0">
          <Alert className="border-primary/20 bg-primary/5">
            <Calculator className="size-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">
                <strong>{requirements.length}</strong> materials calculated for{" "}
                <strong>{numberOfRuns}</strong> runs
              </span>
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Configuration Section */}
            <div className="border-border/50 from-background to-muted/20 grid gap-4 rounded-lg border bg-gradient-to-br p-4 shadow-sm md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="numberOfRuns" className="text-sm font-semibold">
                  Number of Experimental Runs
                </Label>
                <Input
                  id="numberOfRuns"
                  type="number"
                  min="1"
                  value={numberOfRuns}
                  onChange={e => setNumberOfRuns(parseInt(e.target.value) || 1)}
                  className="bg-background shadow-sm"
                />
                <p className="text-muted-foreground text-xs">
                  Total conditions × replicates (detected: {suggestedRuns})
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="safetyFactor" className="text-sm font-semibold">
                  Safety Factor (Buffer)
                </Label>
                <Select
                  value={safetyFactor.toString()}
                  onValueChange={value => setSafetyFactor(parseFloat(value))}
                >
                  <SelectTrigger
                    id="safetyFactor"
                    className="bg-background shadow-sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.0">No buffer (1.0x)</SelectItem>
                    <SelectItem value="1.1">10% extra (1.1x)</SelectItem>
                    <SelectItem value="1.2">20% extra (1.2x)</SelectItem>
                    <SelectItem value="1.25">25% extra (1.25x)</SelectItem>
                    <SelectItem value="1.5">50% extra (1.5x)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Add buffer to account for pipetting errors and wastage
                </p>
              </div>
            </div>

            {/* Materials Table - Per Run */}
            <Collapsible
              open={showPerRunTable}
              onOpenChange={setShowPerRunTable}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-muted/50"
                    >
                      <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
                        <Beaker className="size-4" />
                        Materials per Run ({materials.length})
                        {showPerRunTable ? (
                          <ChevronUp className="ml-1 size-3" />
                        ) : (
                          <ChevronDown className="ml-1 size-3" />
                        )}
                      </h3>
                    </Button>
                  </CollapsibleTrigger>
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={handleReExtractWithAI}
                            disabled={isExtracting}
                            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                          >
                            {isExtracting ? (
                              <>
                                <SpinnerIcon className="mr-2 size-4 animate-spin" />
                                Extracting...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 size-4" />
                                Re-extract
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Re-run AI extraction to refresh materials from the
                            design text. Useful if you&apos;ve made changes or
                            want to start over.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {initialMaterials.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleResetMaterials}
                        className="text-muted-foreground text-xs"
                      >
                        Reset
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddMaterial}
                    >
                      <Plus className="mr-2 size-4" />
                      Add Material
                    </Button>
                  </div>
                </div>
                <CollapsibleContent>
                  {extractionError && (
                    <Alert className="mb-3 border-amber-500/30 bg-amber-500/5">
                      <AlertCircle className="size-4" />
                      <AlertDescription className="text-sm">
                        AI extraction failed: {extractionError}. Showing basic
                        parsing results.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="border-border/50 overflow-hidden rounded-lg border shadow-sm">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[45%]">
                              Material Name
                            </TableHead>
                            <TableHead className="w-1/4">Qty per Run</TableHead>
                            <TableHead className="w-1/5">Unit</TableHead>
                            <TableHead className="w-[10%]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isExtracting ? (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="py-8 text-center"
                              >
                                <div className="flex flex-col items-center gap-3">
                                  <SpinnerIcon className="text-primary size-8 animate-spin" />
                                  <p className="text-muted-foreground text-sm">
                                    AI is extracting materials from your
                                    design...
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : materials.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center">
                                <Alert className="border-amber-500/30 bg-amber-500/5">
                                  <AlertCircle className="size-4" />
                                  <AlertDescription>
                                    No materials detected. Add materials
                                    manually.
                                  </AlertDescription>
                                </Alert>
                              </TableCell>
                            </TableRow>
                          ) : (
                            materials.map(material => (
                              <TableRow key={material.id}>
                                <TableCell>
                                  <Input
                                    value={material.name}
                                    onChange={e =>
                                      handleMaterialChange(
                                        material.id,
                                        "name",
                                        e.target.value
                                      )
                                    }
                                    placeholder="e.g., PBS buffer, Glucose"
                                    className="bg-background"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={material.quantityPerRun}
                                    onChange={e =>
                                      handleMaterialChange(
                                        material.id,
                                        "quantityPerRun",
                                        e.target.value
                                      )
                                    }
                                    className="bg-background"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={material.unit}
                                    onValueChange={value =>
                                      handleMaterialChange(
                                        material.id,
                                        "unit",
                                        value
                                      )
                                    }
                                  >
                                    <SelectTrigger className="bg-background">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {COMMON_UNITS.map(unit => (
                                        <SelectItem key={unit} value={unit}>
                                          {unit}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleRemoveMaterial(material.id)
                                    }
                                    disabled={materials.length === 1}
                                  >
                                    <Trash2 className="size-4 text-rose-400" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Total Requirements Table */}
            {requirements.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
                    <Calculator className="size-4" />
                    Total Requirements for {numberOfRuns} Runs
                    {safetyFactor > 1 && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        +{Math.round((safetyFactor - 1) * 100)}% buffer
                      </span>
                    )}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPerRunTable(!showPerRunTable)}
                    className="text-muted-foreground text-xs"
                  >
                    {showPerRunTable ? "Hide" : "Show"} per-run details
                  </Button>
                </div>

                <div className="border-primary/20 bg-primary/5 overflow-hidden rounded-lg border shadow-md">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-primary/10">
                          <TableHead className="font-semibold">
                            Material
                          </TableHead>
                          <TableHead className="font-semibold">
                            Total Quantity
                          </TableHead>
                          <TableHead className="font-semibold">Unit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requirements.map(req => (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium">
                              {req.materialName}
                            </TableCell>
                            <TableCell className="text-primary font-semibold">
                              {formatQuantity(req.totalQuantity)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {req.unit}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
