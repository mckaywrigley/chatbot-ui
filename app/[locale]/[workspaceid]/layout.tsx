"use client"

import { AppLayout } from "@/components/navigation/app-layout"
import { ChatbotUIContext } from "@/context/context"
import { getAssistantWorkspacesByWorkspaceId } from "@/db/assistants"
import { getChatsByWorkspaceId } from "@/db/chats"
import { getCollectionWorkspacesByWorkspaceId } from "@/db/collections"
import { getDesignWorkspacesByWorkspaceId } from "@/db/designs-firestore"
import { getFileWorkspacesByWorkspaceId } from "@/db/files"
import { getFoldersByWorkspaceId } from "@/db/folders"
import { getModelWorkspacesByWorkspaceId } from "@/db/models"
import { getPresetWorkspacesByWorkspaceId } from "@/db/presets"
import { getPromptWorkspacesByWorkspaceId } from "@/db/prompts"
import { getAssistantImageFromStorage } from "@/db/storage/assistant-images"
import { getToolWorkspacesByWorkspaceId } from "@/db/tools"
import { getWorkspaceById } from "@/db/workspaces"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import { LLMID } from "@/types"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ReactNode, useContext, useEffect, useState } from "react"
import Loading from "../loading"
import { getReportWorkspacesByWorkspaceId } from "@/db/reports-firestore"
import { getDataCollectionWorkspacesByWorkspaceId } from "@/db/data-collections-firestore"

interface WorkspaceLayoutProps {
  children: ReactNode
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter()

  const params = useParams()
  const searchParams = useSearchParams()
  const workspaceId = params.workspaceid as string

  const {
    setChatSettings,
    setAssistants,
    setAssistantImages,
    setChats,
    setCollections,
    setDesigns,
    setDataCollections,
    setFolders,
    setFiles,
    setPresets,
    setPrompts,
    setReports,
    setTools,
    setModels,
    selectedWorkspace,
    setSelectedWorkspace,
    setSelectedChat,
    setChatMessages,
    setUserInput,
    setIsGenerating,
    setFirstTokenReceived,
    setChatFiles,
    setChatImages,
    setNewMessageFiles,
    setNewMessageImages,
    setShowFilesDisplay
  } = useContext(ChatbotUIContext)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => await fetchWorkspaceData(workspaceId))()

    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)

    setIsGenerating(false)
    setFirstTokenReceived(false)

    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setReports([])
    setShowFilesDisplay(false)
    // Workspace switch is the only real trigger here. The context setters
    // and `fetchWorkspaceData` are stable references from useState /
    // closure; including them would cause a re-run loop on every render
    // without changing behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  const fetchWorkspaceData = async (workspaceId: string) => {
    setLoading(true)

    try {
      const workspace = await getWorkspaceById(workspaceId)
      if (!workspace) {
        console.log("Workspace not found, redirecting to login")
        router.push("/login?message=Workspace not found. Please sign in again.")
        return
      }
      setSelectedWorkspace(workspace)

      // Fetch all workspace data in parallel
      const [
        assistantData,
        reportData,
        designData,
        dataCollectionData,
        chats,
        collectionData,
        folders,
        fileData,
        presetData,
        promptData,
        toolData,
        modelData
      ] = await Promise.all([
        getAssistantWorkspacesByWorkspaceId(workspaceId),
        getReportWorkspacesByWorkspaceId(workspaceId),
        getDesignWorkspacesByWorkspaceId(workspaceId),
        getDataCollectionWorkspacesByWorkspaceId(workspaceId),
        getChatsByWorkspaceId(workspaceId),
        getCollectionWorkspacesByWorkspaceId(workspaceId),
        getFoldersByWorkspaceId(workspaceId),
        getFileWorkspacesByWorkspaceId(workspaceId),
        getPresetWorkspacesByWorkspaceId(workspaceId),
        getPromptWorkspacesByWorkspaceId(workspaceId),
        getToolWorkspacesByWorkspaceId(workspaceId),
        getModelWorkspacesByWorkspaceId(workspaceId)
      ])

      setAssistants(assistantData.assistants)
      setReports(reportData.reports)
      setDesigns(designData.designs)
      setDataCollections(dataCollectionData.dataCollections)
      setChats(chats)
      setCollections(collectionData.collections)
      setFolders(folders)
      setFiles(fileData.files)
      setPresets(presetData.presets)
      setPrompts(promptData.prompts)
      setTools(toolData.tools)
      setModels(modelData.models)

      // Load assistant images in parallel (non-blocking)
      Promise.all(
        assistantData.assistants.map(async assistant => {
          let url = ""
          if (assistant.image_path) {
            url =
              (await getAssistantImageFromStorage(assistant.image_path)) || ""
          }
          if (url) {
            const response = await fetch(url)
            const blob = await response.blob()
            const base64 = await convertBlobToBase64(blob)
            setAssistantImages(prev => [
              ...prev,
              {
                assistantId: assistant.id,
                path: assistant.image_path,
                base64,
                url
              }
            ])
          } else {
            setAssistantImages(prev => [
              ...prev,
              {
                assistantId: assistant.id,
                path: assistant.image_path,
                base64: "",
                url
              }
            ])
          }
        })
      )

      setChatSettings({
        model: (searchParams.get("model") ||
          workspace?.default_model ||
          "gpt-4o") as LLMID,
        prompt:
          workspace?.default_prompt ||
          "You are a friendly, helpful AI assistant.",
        temperature: workspace?.default_temperature || 0.5,
        contextLength: workspace?.default_context_length || 4096,
        includeProfileContext: workspace?.include_profile_context || true,
        includeWorkspaceInstructions:
          workspace?.include_workspace_instructions || true,
        embeddingsProvider:
          (workspace?.embeddings_provider as "openai" | "local") || "openai"
      })

      setLoading(false)
    } catch (error) {
      console.error("Error fetching workspace data:", error)
      router.push(
        "/login?message=Error loading workspace. Please sign in again."
      )
      setLoading(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  return <AppLayout>{children}</AppLayout>
}
