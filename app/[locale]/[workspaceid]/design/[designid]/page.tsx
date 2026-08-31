"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { DesignReview } from "../components/design-review"
import PromptOverridesDialog from "@/components/design/prompt-overrides-dialog"
import ShareDialog from "@/components/design-flow/share-dialog"
import { DesignProgress } from "@/components/ui/design-progress"
import {
  DesignPlanMetadata,
  DesignPlanStatus,
  DesignPlanHypothesis
} from "@/types/design-plan"
import { AgentPromptOverrides, AgentPromptUsage } from "@/types/design-prompts"
import type { Sharing } from "@/types/sharing"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  EyeOff,
  PanelTopOpen,
  Save,
  CheckCircle2,
  Share2
} from "lucide-react"

interface DesignData {
  name?: string
  description?: string
  objectives?: string[]
  variables?: string[]
  specialConsiderations?: string[]
  reportWriterOutput?: any
  searchResults?: any
}

const planMetadataKey = (designId: string) => `design_plan_${designId}`
const planStatusKey = (designId: string) => `design_plan_status_${designId}`
const DESIGN_SAVE_VERSION = "shadowai.design.save@v1"

const stripEphemeralFields = (payload: any) => {
  if (!payload || typeof payload !== "object") {
    return null
  }
  const { savedAt, ...rest } = payload
  return rest
}

export default function DesignIDPage({
  params
}: {
  params: { designid: string }
}) {
  const [designData, setDesignData] = useState<DesignData | null>(null)
  const [planMetadata, setPlanMetadata] = useState<DesignPlanMetadata | null>(
    null
  )
  const [planStatus, setPlanStatus] = useState<DesignPlanStatus | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [planError, setPlanError] = useState<string | null>(null)
  const [generatingHypothesisId, setGeneratingHypothesisId] = useState<
    string | null
  >(null)
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<
    string | null
  >(null)
  const [generatedDesign, setGeneratedDesign] = useState<any | null>(null)
  const [generatedLiteratureSummary, setGeneratedLiteratureSummary] = useState<
    any | null
  >(null)
  const [generatedStatReview, setGeneratedStatReview] = useState<any | null>(
    null
  )
  const [designError, setDesignError] = useState<string | null>(null)
  const [promptInput, setPromptInput] = useState("")
  const [isPromptSubmitting, setIsPromptSubmitting] = useState(false)
  const [promptOverridesDialogOpen, setPromptOverridesDialogOpen] =
    useState(false)
  const [promptOverridesHypothesis, setPromptOverridesHypothesis] =
    useState<DesignPlanHypothesis | null>(null)
  const [isPromptOverridesSubmitting, setIsPromptOverridesSubmitting] =
    useState(false)
  const [showPromptToolbar, setShowPromptToolbar] = useState(true)
  const [savedHypothesisSnapshot, setSavedHypothesisSnapshot] =
    useState<DesignPlanHypothesis | null>(null)
  const [isSavingDesign, setIsSavingDesign] = useState(false)
  const [lastSavedPayloadSignature, setLastSavedPayloadSignature] = useState<
    string | null
  >(null)
  const [latestPromptsUsed, setLatestPromptsUsed] = useState<
    AgentPromptUsage[] | null
  >(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [sharingState, setSharingState] = useState<{
    sharing: Sharing
    share_token: string | null
  }>({ sharing: "private", share_token: null })
  const [isOwner, setIsOwner] = useState(true)
  const [canEdit, setCanEdit] = useState(true)
  const [rawDesignRecord, setRawDesignRecord] = useState<any>(null)
  const designExportRef = useRef<HTMLDivElement>(null)
  const applySavedPayload = useCallback((rawPayload: any) => {
    if (!rawPayload || typeof rawPayload !== "object") {
      return
    }

    const normalized = {
      version: rawPayload.version || DESIGN_SAVE_VERSION,
      planId: rawPayload.planId ?? null,
      selectedHypothesisId:
        rawPayload.selectedHypothesisId ||
        rawPayload.selectedHypothesis?.hypothesisId ||
        null,
      selectedHypothesis: rawPayload.selectedHypothesis || null,
      generatedDesign: rawPayload.generatedDesign || rawPayload.report || null,
      generatedLiteratureSummary:
        rawPayload.generatedLiteratureSummary ||
        rawPayload.literatureSummary ||
        rawPayload.report?.literatureSummary ||
        null,
      generatedStatReview:
        rawPayload.generatedStatReview ||
        rawPayload.statReview ||
        rawPayload.report?.statisticalReview ||
        null,
      promptsUsed: rawPayload.promptsUsed || null
    }

    if (!normalized.generatedDesign) {
      return
    }

    setGeneratedDesign(normalized.generatedDesign)
    setGeneratedLiteratureSummary(normalized.generatedLiteratureSummary)
    setGeneratedStatReview(normalized.generatedStatReview)
    setLatestPromptsUsed(normalized.promptsUsed)

    if (normalized.selectedHypothesisId) {
      setSelectedHypothesisId(normalized.selectedHypothesisId)
    }
    if (normalized.selectedHypothesis) {
      setSavedHypothesisSnapshot(
        normalized.selectedHypothesis as DesignPlanHypothesis
      )
    }

    const signatureBase = stripEphemeralFields(normalized)
    if (signatureBase) {
      setLastSavedPayloadSignature(JSON.stringify(signatureBase))
    }
  }, [])

  const loadDesignFromDatabase = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/design/${params.designid}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch design: ${response.status}`)
      }

      const designFromDb = await response.json()
      setRawDesignRecord(designFromDb)
      setSharingState({
        sharing: designFromDb.sharing ?? "private",
        share_token: designFromDb.share_token ?? null
      })
      const access = designFromDb._access ?? {}
      setIsOwner(access.isOwner ?? true)
      setCanEdit(access.canEdit ?? true)
      setLastSavedPayloadSignature(null)
      setSavedHypothesisSnapshot(null)
      const base: DesignData = {
        name: designFromDb.name || `Design ${params.designid}`,
        description: designFromDb.description || "",
        objectives: designFromDb.objectives || [],
        variables: designFromDb.variables || [],
        specialConsiderations: designFromDb.special_considerations || []
      }

      if (designFromDb.content) {
        try {
          const parsed = JSON.parse(designFromDb.content)
          if (parsed && typeof parsed === "object") {
            setDesignData({ ...base, ...parsed })
            if (
              typeof parsed.version === "string" &&
              parsed.version.startsWith("shadowai.design")
            ) {
              applySavedPayload(parsed)
            } else if (parsed.savedDesign) {
              applySavedPayload(parsed.savedDesign)
            } else if (parsed.generatedDesign) {
              applySavedPayload(parsed)
            }
          } else {
            setDesignData(base)
          }
        } catch {
          setDesignData(base)
        }
      } else {
        setDesignData(base)
      }
    } catch (error: any) {
      console.error("❌ [DESIGN_PAGE] Error loading design:", error)
      setDesignData(null)
      toast.error(
        `Unable to load design: ${error?.message || "Unexpected error"}`
      )
    } finally {
      setIsLoading(false)
    }
  }, [params.designid, applySavedPayload])

  useEffect(() => {
    // Check if this design is actively being generated (flag set by sidebar)
    const isGeneratingFlag = localStorage.getItem(
      `design_generating_${params.designid}`
    )

    const storedMetadata = (() => {
      try {
        const value = localStorage.getItem(planMetadataKey(params.designid))
        return value ? (JSON.parse(value) as DesignPlanMetadata) : null
      } catch {
        localStorage.removeItem(planMetadataKey(params.designid))
        return null
      }
    })()

    const storedStatus = (() => {
      try {
        const value = localStorage.getItem(planStatusKey(params.designid))
        return value ? (JSON.parse(value) as DesignPlanStatus) : null
      } catch {
        localStorage.removeItem(planStatusKey(params.designid))
        return null
      }
    })()

    // Set generating state if flag is set OR metadata exists
    if (isGeneratingFlag === "true" || storedMetadata) {
      console.log("🔄 [DESIGN_PAGE] Generation in progress detected")
      setIsGenerating(true)
    }

    if (storedMetadata) {
      setPlanMetadata(storedMetadata)
      if (storedMetadata.request) {
        setDesignData({
          name: storedMetadata.request.title,
          description: storedMetadata.request.description,
          objectives: storedMetadata.request.constraints?.objectives || [],
          variables: storedMetadata.request.constraints?.variables || [],
          specialConsiderations:
            storedMetadata.request.constraints?.specialConsiderations || []
        })
      }
    }

    if (storedStatus) {
      setPlanStatus(storedStatus)
      if (storedStatus.status === "completed") {
        setIsGenerating(false)
        localStorage.removeItem(`design_generating_${params.designid}`)
      }
    }

    loadDesignFromDatabase()

    // Listen for storage changes (in case metadata is added after page load)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === planMetadataKey(params.designid) && e.newValue) {
        try {
          const metadata = JSON.parse(e.newValue) as DesignPlanMetadata
          console.log(
            "🔔 [DESIGN_PAGE] Plan metadata detected via storage event"
          )
          setPlanMetadata(metadata)
          setIsGenerating(true)
          if (metadata.request) {
            setDesignData({
              name: metadata.request.title,
              description: metadata.request.description,
              objectives: metadata.request.constraints?.objectives || [],
              variables: metadata.request.constraints?.variables || [],
              specialConsiderations:
                metadata.request.constraints?.specialConsiderations || []
            })
          }
        } catch (error) {
          console.error("Error parsing metadata from storage event:", error)
        }
      }
    }

    // Also poll localStorage for the first few seconds (for same-tab updates)
    let pollCount = 0
    const maxPolls = 10 // Poll for 5 seconds (10 x 500ms)
    const pollInterval = setInterval(() => {
      pollCount++
      if (pollCount > maxPolls) {
        clearInterval(pollInterval)
        return
      }

      const currentMetadata = localStorage.getItem(
        planMetadataKey(params.designid)
      )
      if (currentMetadata && !storedMetadata) {
        try {
          const metadata = JSON.parse(currentMetadata) as DesignPlanMetadata
          console.log("🔔 [DESIGN_PAGE] Plan metadata detected via polling")
          setPlanMetadata(metadata)
          setIsGenerating(true)
          if (metadata.request) {
            setDesignData({
              name: metadata.request.title,
              description: metadata.request.description,
              objectives: metadata.request.constraints?.objectives || [],
              variables: metadata.request.constraints?.variables || [],
              specialConsiderations:
                metadata.request.constraints?.specialConsiderations || []
            })
          }
          clearInterval(pollInterval)
        } catch (error) {
          console.error("Error parsing metadata from poll:", error)
        }
      }
    }, 500)

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      clearInterval(pollInterval)
    }
  }, [params.designid, loadDesignFromDatabase])

  useEffect(() => {
    if (!planMetadata) {
      return
    }

    let isActive = true
    let timer: NodeJS.Timeout | null = null

    const pollStatus = async () => {
      try {
        const response = await fetch(planMetadata.statusUrl)
        if (!response.ok) {
          throw new Error(`Status poll failed: ${response.status}`)
        }

        const status = (await response.json()) as DesignPlanStatus
        if (!isActive) {
          return
        }

        setPlanStatus(status)
        localStorage.setItem(
          planStatusKey(params.designid),
          JSON.stringify(status)
        )
        setPlanError(null)

        if (status.status === "completed" || status.status === "failed") {
          setIsGenerating(false)
          localStorage.removeItem(planMetadataKey(params.designid))
          localStorage.removeItem(`design_generating_${params.designid}`)
          if (timer) {
            clearInterval(timer)
            timer = null
          }
          if (status.status === "completed") {
            toast.success("Design draft completed.")
          } else {
            const hasPartialResults =
              status.top_hypotheses && status.top_hypotheses.length > 0
            const reason = (status as any).failureReason || "Unknown error"
            if (hasPartialResults) {
              toast.error(
                `Design draft partially failed: ${reason}. ${status.top_hypotheses!.length} hypotheses were still generated.`,
                { duration: 8000 }
              )
            } else {
              toast.error(`Design draft failed: ${reason}`, {
                duration: 8000
              })
            }
          }
        }
      } catch (error: any) {
        console.error("❌ [DESIGN_PAGE] Poll error:", error)
        if (isActive) {
          setPlanError(error?.message || "Unable to fetch plan status")
        }
      }
    }

    pollStatus()
    timer = setInterval(pollStatus, 5000)

    return () => {
      isActive = false
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [planMetadata, params.designid])

  const latestHypotheses = useMemo(
    () => planStatus?.top_hypotheses || [],
    [planStatus?.top_hypotheses]
  )

  const displayHypotheses = useMemo(() => {
    if (!savedHypothesisSnapshot || !savedHypothesisSnapshot.hypothesisId) {
      return latestHypotheses
    }

    const alreadyPresent = latestHypotheses.some(
      hypothesis =>
        hypothesis.hypothesisId === savedHypothesisSnapshot.hypothesisId
    )

    if (alreadyPresent) {
      return latestHypotheses
    }

    return [...latestHypotheses, savedHypothesisSnapshot]
  }, [latestHypotheses, savedHypothesisSnapshot])

  const selectedHypothesis = useMemo(() => {
    if (!selectedHypothesisId) return null
    return displayHypotheses.find(
      hypothesis => hypothesis.hypothesisId === selectedHypothesisId
    )
  }, [displayHypotheses, selectedHypothesisId])

  const logs = useMemo(() => planStatus?.logs || [], [planStatus?.logs])

  const reviewProblem = designData?.name || "Untitled Research Plan"

  const isDesignLoaded = !!designData

  // Reset state when planId changes, BUT preserve saved designs that were loaded from DB
  useEffect(() => {
    // Only reset if we don't have a saved design loaded
    // This prevents wiping out restored designs when planStatus updates
    if (lastSavedPayloadSignature) {
      console.log("⏭️ [DESIGN_PAGE] Skipping reset - saved design loaded")
      return
    }

    console.log(
      "🔄 [DESIGN_PAGE] Resetting state for new plan:",
      planStatus?.planId
    )
    setSelectedHypothesisId(null)
    setGeneratingHypothesisId(null)
    setGeneratedDesign(null)
    setGeneratedLiteratureSummary(null)
    setGeneratedStatReview(null)
    setDesignError(null)
    setPromptInput("")
    setShowPromptToolbar(true)
    setSavedHypothesisSnapshot(null)
    setLatestPromptsUsed(null)
  }, [planStatus?.planId, lastSavedPayloadSignature])

  useEffect(() => {
    setPromptInput("")
    setShowPromptToolbar(true)
  }, [selectedHypothesisId])

  const handleGenerateDesign = useCallback(
    async (
      hypothesis: DesignPlanHypothesis,
      options?: {
        instructions?: string
        promptOverrides?: AgentPromptOverrides
      }
    ) => {
      if (!hypothesis?.hypothesisId) {
        return
      }

      if (!planStatus || planStatus.status !== "completed") {
        toast.error(
          "The research plan is still running. Please wait until it completes."
        )
        return
      }

      setSelectedHypothesisId(hypothesis.hypothesisId)
      setGeneratingHypothesisId(hypothesis.hypothesisId)
      setGeneratedDesign(null)
      setGeneratedLiteratureSummary(null)
      setGeneratedStatReview(null)
      setDesignError(null)
      setLastSavedPayloadSignature(null)
      setSavedHypothesisSnapshot(null)
      setLatestPromptsUsed(null)

      try {
        const fetchOptions: RequestInit = { method: "POST" }
        const payload: Record<string, unknown> = {}
        if (options?.instructions) {
          payload.instructions = options.instructions
        }
        if (options?.promptOverrides) {
          payload.promptOverrides = options.promptOverrides
        }
        if (Object.keys(payload).length > 0) {
          fetchOptions.headers = { "Content-Type": "application/json" }
          fetchOptions.body = JSON.stringify(payload)
        }

        const response = await fetch(
          `/api/design/draft/hypothesis/${hypothesis.hypothesisId}/design`,
          fetchOptions
        )

        const data = await response.json()

        if (!response.ok || !data?.success) {
          throw new Error(
            data?.error ||
              `Design generation failed with status ${response.status}`
          )
        }

        setGeneratedDesign(data.report)
        setGeneratedLiteratureSummary(
          data.literatureSummary || data.report?.literatureSummary || null
        )
        setGeneratedStatReview(
          data.statReview || data.report?.statisticalReview || null
        )
        setLatestPromptsUsed(data.promptsUsed || null)
        toast.success("Experiment design generated.")
      } catch (error: any) {
        console.error("❌ [DESIGN_PAGE] Design generation error:", error)
        const message = error?.message || "Failed to generate experiment design"
        setDesignError(message)
        toast.error(message)
      } finally {
        setGeneratingHypothesisId(null)
      }
    },
    [planStatus]
  )

  const handleCustomizePrompts = useCallback(
    (hypothesis: DesignPlanHypothesis) => {
      setPromptOverridesHypothesis(hypothesis)
      setPromptOverridesDialogOpen(true)
    },
    []
  )

  const handleLoadSavedDesign = useCallback(
    async (hypothesis: DesignPlanHypothesis) => {
      try {
        setGeneratingHypothesisId(hypothesis.hypothesisId)
        setSelectedHypothesisId(hypothesis.hypothesisId)
        setDesignError(null)

        const response = await fetch(
          `/api/design/draft/hypothesis/${hypothesis.hypothesisId}/saved-design`
        )

        if (!response.ok) {
          throw new Error("Failed to load saved design")
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || "Failed to load saved design")
        }

        setGeneratedDesign(data.generatedDesign)
        setGeneratedLiteratureSummary(data.generatedLiteratureSummary || null)
        setGeneratedStatReview(data.generatedStatReview || null)
        setLatestPromptsUsed(data.promptsUsed || null)

        toast.success("Design loaded successfully.")
      } catch (error: any) {
        console.error("❌ [DESIGN_PAGE] Load saved design error:", error)
        const message = error?.message || "Failed to load saved design"
        setDesignError(message)
        toast.error(message)
      } finally {
        setGeneratingHypothesisId(null)
      }
    },
    []
  )

  const handleRegenerateSelected = useCallback(async () => {
    if (!selectedHypothesis) {
      toast.error("Select a hypothesis before regenerating.")
      return
    }
    await handleGenerateDesign(selectedHypothesis)
  }, [selectedHypothesis, handleGenerateDesign])

  const handlePromptSubmit = useCallback(async () => {
    if (!selectedHypothesis) {
      toast.error("Select a hypothesis before regenerating.")
      return
    }
    const trimmed = promptInput.trim()
    if (!trimmed) {
      toast.error("Add instructions before regenerating.")
      return
    }
    setIsPromptSubmitting(true)
    try {
      await handleGenerateDesign(selectedHypothesis, {
        instructions: trimmed
      })
      setPromptInput("")
    } finally {
      setIsPromptSubmitting(false)
    }
  }, [selectedHypothesis, promptInput, handleGenerateDesign])

  const handlePromptDialogOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setPromptOverridesHypothesis(null)
    }
    setPromptOverridesDialogOpen(nextOpen)
  }, [])

  const handlePromptOverridesSubmit = useCallback(
    async (overrides: AgentPromptOverrides) => {
      if (!promptOverridesHypothesis) {
        toast.error("Select a hypothesis to customize prompts.")
        return
      }
      const targetHypothesis = promptOverridesHypothesis
      setPromptOverridesDialogOpen(false)
      setPromptOverridesHypothesis(null)
      setIsPromptOverridesSubmitting(true)
      try {
        await handleGenerateDesign(targetHypothesis, {
          promptOverrides: overrides
        })
      } finally {
        setIsPromptOverridesSubmitting(false)
      }
    },
    [handleGenerateDesign, promptOverridesHypothesis]
  )

  const currentDesignSnapshot = useMemo(() => {
    if (!generatedDesign) return null
    return {
      version: DESIGN_SAVE_VERSION,
      planId: planStatus?.planId || null,
      selectedHypothesisId:
        selectedHypothesisId || savedHypothesisSnapshot?.hypothesisId || null,
      selectedHypothesis: selectedHypothesis || savedHypothesisSnapshot || null,
      generatedDesign,
      generatedLiteratureSummary,
      generatedStatReview,
      promptsUsed: latestPromptsUsed
    }
  }, [
    generatedDesign,
    generatedLiteratureSummary,
    generatedStatReview,
    planStatus?.planId,
    selectedHypothesis,
    selectedHypothesisId,
    savedHypothesisSnapshot,
    latestPromptsUsed
  ])

  const currentSnapshotSignature = useMemo(() => {
    if (!currentDesignSnapshot) return null
    const normalized = stripEphemeralFields(currentDesignSnapshot)
    return normalized ? JSON.stringify(normalized) : null
  }, [currentDesignSnapshot])

  const hasUnsavedChanges =
    !!currentSnapshotSignature &&
    currentSnapshotSignature !== lastSavedPayloadSignature

  const handleSaveDesign = useCallback(async () => {
    if (!currentDesignSnapshot || !currentSnapshotSignature) {
      toast.error("Nothing to save yet.")
      return
    }

    setIsSavingDesign(true)
    try {
      const payloadToPersist = {
        ...currentDesignSnapshot,
        savedAt: new Date().toISOString()
      }

      const response = await fetch(`/api/design/${params.designid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: payloadToPersist,
          objectives: designData?.objectives || [],
          variables: designData?.variables || [],
          specialConsiderations: designData?.specialConsiderations || []
        })
      })

      const data = await response.json()

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || `Failed to save design (status ${response.status})`
        )
      }

      setLastSavedPayloadSignature(currentSnapshotSignature)
      if (currentDesignSnapshot.selectedHypothesis) {
        setSavedHypothesisSnapshot(
          currentDesignSnapshot.selectedHypothesis as DesignPlanHypothesis
        )
      }
      toast.success("Design saved.")
    } catch (error: any) {
      console.error("❌ [DESIGN_PAGE] Save error:", error)
      toast.error(error?.message || "Failed to save design.")
    } finally {
      setIsSavingDesign(false)
    }
  }, [
    currentDesignSnapshot,
    currentSnapshotSignature,
    designData,
    params.designid
  ])

  if (isGenerating) {
    return (
      <div className="flex h-[calc(100vh-60px)] w-full flex-col overflow-hidden">
        <div className="flex items-center justify-center border-b px-4 py-3">
          <h1 className="text-2xl font-bold">Design Generation in Progress</h1>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <DesignProgress
            isGenerating
            status={planStatus?.status}
            progress={planStatus?.progress}
            logs={logs}
            error={planError}
          />
        </div>
      </div>
    )
  }

  if (isLoading && !isDesignLoaded) {
    return (
      <div className="flex h-[calc(100vh-60px)] w-full flex-col overflow-hidden">
        <div className="flex items-center justify-center border-b px-4 py-3">
          <h1 className="text-2xl font-bold">Loading Design</h1>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="space-y-4 text-center">
            <div className="mx-auto size-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
            <p className="text-gray-600">Loading your design…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-60px)] w-full flex-col overflow-hidden">
      <div className="relative flex items-center justify-center border-b px-4 py-3">
        <h1 className="text-2xl font-bold">{reviewProblem}</h1>
        {isOwner && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareDialogOpen(true)}
            >
              <Share2 className="mr-2 size-4" />
              Share
              {sharingState.sharing !== "private" && (
                <span className="bg-primary ml-2 size-2 rounded-full" />
              )}
            </Button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div ref={designExportRef} className="pb-28">
          <DesignReview
            designData={designData}
            planStatus={planStatus}
            topHypotheses={displayHypotheses}
            logs={logs}
            onGenerateDesign={handleGenerateDesign}
            onCustomizePrompts={handleCustomizePrompts}
            generatingHypothesisId={generatingHypothesisId}
            selectedHypothesisId={selectedHypothesisId}
            generatedDesign={generatedDesign}
            generatedLiteratureSummary={generatedLiteratureSummary}
            generatedStatReview={generatedStatReview}
            designError={designError}
            onRegenerateDesign={handleRegenerateSelected}
            promptsUsed={latestPromptsUsed}
            onLoadSavedDesign={handleLoadSavedDesign}
          />
        </div>
      </div>
      {selectedHypothesis &&
        generatedDesign &&
        !generatingHypothesisId &&
        showPromptToolbar && (
          <div className="border-border/70 from-background via-muted/70 to-background w-full border-t bg-gradient-to-r p-4 shadow-[-8px_0_24px_rgba(0,0,0,0.25)] supports-[backdrop-filter]:backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide">
                  <p className="text-muted-foreground/90 font-semibold">
                    Regenerate with prompt
                  </p>
                  <span className="text-muted-foreground/80">
                    Target: {selectedHypothesis.content.slice(0, 60)}
                    {selectedHypothesis.content.length > 60 ? "…" : ""}
                  </span>
                </div>
                <Textarea
                  value={promptInput}
                  onChange={event => setPromptInput(event.target.value)}
                  placeholder="Describe how the experiment should change or what to emphasize…"
                  className="border-border/60 bg-background/80 mt-2 w-full"
                  rows={2}
                />
                <p className="text-muted-foreground text-[11px]">
                  Suggestions can adjust materials, statistical rigor, controls,
                  or focus.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  onClick={handleSaveDesign}
                  disabled={!hasUnsavedChanges || isSavingDesign || !canEdit}
                  variant={hasUnsavedChanges ? "default" : "secondary"}
                >
                  {isSavingDesign ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving
                    </>
                  ) : hasUnsavedChanges ? (
                    <>
                      <Save className="mr-2 size-4" />
                      Save design
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 size-4" />
                      Saved
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPromptToolbar(false)}
                >
                  <EyeOff className="mr-2 size-4" />
                  Hide
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPromptInput("")}
                  disabled={!promptInput.trim() || isPromptSubmitting}
                >
                  Clear
                </Button>
                <Button
                  onClick={handlePromptSubmit}
                  disabled={
                    isPromptSubmitting ||
                    !promptInput.trim() ||
                    generatingHypothesisId === selectedHypothesis.hypothesisId
                  }
                >
                  {isPromptSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Sending
                    </>
                  ) : (
                    "Regenerate"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      {selectedHypothesis &&
        generatedDesign &&
        !generatingHypothesisId &&
        !showPromptToolbar && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
            <Button
              size="sm"
              variant="outline"
              className="border-border/60 bg-background/80 pointer-events-auto backdrop-blur"
              onClick={() => setShowPromptToolbar(true)}
            >
              <PanelTopOpen className="mr-2 size-4" />
              Show prompt controls
            </Button>
          </div>
        )}
      <PromptOverridesDialog
        open={promptOverridesDialogOpen}
        onOpenChange={handlePromptDialogOpenChange}
        onSubmit={handlePromptOverridesSubmit}
        isSubmitting={isPromptOverridesSubmitting}
        hypothesis={promptOverridesHypothesis}
      />
      {isOwner && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          designId={params.designid}
          design={{
            id: params.designid,
            name: rawDesignRecord?.name ?? reviewProblem,
            description: rawDesignRecord?.description,
            content: currentDesignSnapshot ?? rawDesignRecord?.content,
            sharing: sharingState.sharing,
            share_token: sharingState.share_token
          }}
          onSharingChange={setSharingState}
          pdfTargetRef={designExportRef}
        />
      )}
    </div>
  )
}
