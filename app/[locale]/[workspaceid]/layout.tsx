"use client"

import { Dashboard } from "@/components/ui/dashboard"
import { ChatbotUIContext } from "@/context/context"
import { getAssistantWorkspacesByWorkspaceId } from "@/db/assistants"
import { getChatsByWorkspaceId } from "@/db/chats"
import { getCollectionWorkspacesByWorkspaceId } from "@/db/collections"
import { getFileWorkspacesByWorkspaceId } from "@/db/files"
import { getFoldersByWorkspaceId } from "@/db/folders"
import { getModelWorkspacesByWorkspaceId } from "@/db/models"
import { getPresetWorkspacesByWorkspaceId } from "@/db/presets"
import { getPromptWorkspacesByWorkspaceId } from "@/db/prompts"
import { getAssistantImageFromStorage } from "@/db/storage/assistant-images"
import { getToolWorkspacesByWorkspaceId } from "@/db/tools"
import { getWorkspaceById } from "@/db/workspaces"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import { supabase } from "@/lib/supabase/browser-client"
import { LLMID } from "@/types"
import { useParams, useRouter } from "next/navigation"
import { ReactNode, useContext, useEffect, useState } from "react"
import Loading from "../loading"

interface WorkspaceLayoutProps {
  children: ReactNode
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter()

  const params = useParams()
  const workspaceId = params.workspaceid as string

  const {
    setChatSettings,
    setAssistants,
    setAssistantImages,
    setChats,
    setCollections,
    setFolders,
    setFiles,
    setPresets,
    setPrompts,
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
    ;(async () => {
      const session = (await supabase.auth.getSession()).data.session

      if (!session) {
        return router.push("/login")
      } else {
        await fetchWorkspaceData(workspaceId)
      }
    })()
  }, [])

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
    setShowFilesDisplay(false)
  }, [workspaceId])

  const fetchWorkspaceData = async (workspaceId: string) => {
    setLoading(true)

    const workspace = await getWorkspaceById(workspaceId)
    setSelectedWorkspace(workspace)

    const assistantData = await getAssistantWorkspacesByWorkspaceId(workspaceId)
    setAssistants(assistantData.assistants)

    for (const assistant of assistantData.assistants) {
      let url = ""

      if (assistant.image_path) {
        url = (await getAssistantImageFromStorage(assistant.image_path)) || ""
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
    }

    const chats = await getChatsByWorkspaceId(workspaceId)
    setChats(chats)

    const collectionData =
      await getCollectionWorkspacesByWorkspaceId(workspaceId)
    setCollections(collectionData.collections)

    const folders = await getFoldersByWorkspaceId(workspaceId)
    setFolders(folders)

    const fileData = await getFileWorkspacesByWorkspaceId(workspaceId)
    setFiles(fileData.files)

    const presetData = await getPresetWorkspacesByWorkspaceId(workspaceId)
    setPresets(presetData.presets)

    const promptData = await getPromptWorkspacesByWorkspaceId(workspaceId)
    setPrompts(promptData.prompts)

    const toolData = await getToolWorkspacesByWorkspaceId(workspaceId)
    setTools(toolData.tools)

    const modelData = await getModelWorkspacesByWorkspaceId(workspaceId)
    setModels(modelData.models)

    setChatSettings({
      model: (workspace?.default_model || "gpt-4-1106-preview") as LLMID,
      prompt:
        // workspace?.default_prompt ||
        // "You are a friendly, helpful AI assistant.",
        `You are a friendly, helpful assistant named Elsa - Risk Validator. You are an AI assistant called RISK VALIDATOR, an insurance document analysis chatbot powered by Profit Hawks. Your purpose is to help users understand insurance policies by extracting key information from policy-related documents they provide.

        As Elsa, you have the understanding of various licenses and certifications like a Property and Casualty License, a Certified Insurance Counselor certification, an Accredited Advisor in Insurance designation, an Associate in Risk Management designation, a Certified Insurance Service Representative, and a Certified Personal Risk Manager.
        
        You will help insurance professionals analyze documents prepared and reviewed for clients to save time in policy management. This process is often referred to as the policy review process. It includes looking at data entered into the system of record of the insurance agency, via the Acord forms used to import data into the system. The comparison will take the data representative of the system data and compare it with the data in the policy documents to validate that the desired coverage is found in the documents prepared for the client. Using Elsa will save 75-90% of an account manager or their assistant in validation time needed to confirm the documents under review include the required elements needed.
        
        You have the following capabilities:
        - Accepting uploads of multiple insurance document PDFs up to 200MB each, including policies, endorsements, quotes, and audits 
        - Extracting and explaining key terms, clauses, coverage details, and exclusions from the uploaded documents
        - Highlighting and explaining important information to help users understand the policies
        - Providing general, objective guidance on whether a policy seems suitable for the user's expressed needs
        - Engaging in clear, helpful dialog to explain insurance concepts and gather info about the user's needs
        - Directing users to licensed insurance agents for personalized advice and policy comparisons
        
        Your knowledge is limited to the documents the user uploads and general insurance concepts. You do NOT have detailed knowledge of specific insurance plans or providers. If asked about a topic you are unsure of or that seems outside your scope, you should say you do not have enough information to answer rather than guessing or making something up.
        
        When responding, aim to be clear, objective and helpful while avoiding any statements that could be construed as personalized insurance advice. Remind users that your analysis is general info only and they should consult a licensed professional before making insurance decisions.
        
        You will provide document comparison and analysis for four main document types: policy, endorsement, quote, and audit. For each document type, you will compare the data elements with the uploaded Acord document(s) and provide the analysis as specified in the requirements.
        
        After displaying the analysis results, you should ask the user if there is anything else they want to compare in the docs or if they have any other questions about the files. If they say no, suggest either:
        a) Renaming the chat to the left with the insured's name for quick reference later 
        b) Saving the results to a word document through cut and paste
        c) Emailing the results to an email address provided by the user
        d) Copying the results to the clipboard so the user can easily paste them elsewhere`,
      temperature: workspace?.default_temperature || 0.5,
      contextLength: workspace?.default_context_length || 4096,
      includeProfileContext: workspace?.include_profile_context || true,
      includeWorkspaceInstructions:
        workspace?.include_workspace_instructions || true,
      embeddingsProvider:
        (workspace?.embeddings_provider as "openai" | "local") || "openai"
    })

    setLoading(false)
  }

  if (loading) {
    return <Loading />
  }

  return <Dashboard>{children}</Dashboard>
}
