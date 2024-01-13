// TODO: Separate into multiple contexts, keeping simple for now

"use client"

import Loading from "@/app/loading"
import { ChatbotUIContext } from "@/context/context"
import { getAssistantWorkspacesByWorkspaceId } from "@/db/assistants"
import { getChatsByWorkspaceId } from "@/db/chats"
import { getCollectionWorkspacesByWorkspaceId } from "@/db/collections"
import { getFileWorkspacesByWorkspaceId } from "@/db/files"
import { getFoldersByWorkspaceId } from "@/db/folders"
import { getPresetWorkspacesByWorkspaceId } from "@/db/presets"
import { getProfileByUserId } from "@/db/profile"
import { getPromptWorkspacesByWorkspaceId } from "@/db/prompts"
import { getAssistantImageFromStorage } from "@/db/storage/assistant-images"
import { getWorkspacesByUserId } from "@/db/workspaces"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import { supabase } from "@/lib/supabase/browser-client"
import { Tables } from "@/supabase/types"
import {
  ChatFile,
  ChatMessage,
  ChatSettings,
  LLM,
  LLMID,
  MessageImage
} from "@/types"
import { AssistantImage } from "@/types/assistant-image"
import { useRouter } from "next/navigation"
import { FC, useEffect, useState } from "react"

interface GlobalStateProps {
  children: React.ReactNode
}

export const GlobalState: FC<GlobalStateProps> = ({ children }) => {
  const router = useRouter()

  // PROFILE STORE
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null)

  // ITEMS STORE
  const [assistants, setAssistants] = useState<Tables<"assistants">[]>([])
  const [collections, setCollections] = useState<Tables<"collections">[]>([])
  const [chats, setChats] = useState<Tables<"chats">[]>([])
  const [files, setFiles] = useState<Tables<"files">[]>([])
  const [folders, setFolders] = useState<Tables<"folders">[]>([])
  const [presets, setPresets] = useState<Tables<"presets">[]>([])
  const [prompts, setPrompts] = useState<Tables<"prompts">[]>([])
  const [workspaces, setWorkspaces] = useState<Tables<"workspaces">[]>([])

  // MODELS STORE
  const [availableLocalModels, setAvailableLocalModels] = useState<LLM[]>([])

  // WORKSPACE STORE
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<Tables<"workspaces"> | null>(null)

  // PRESET STORE
  const [selectedPreset, setSelectedPreset] =
    useState<Tables<"presets"> | null>(null)

  // ASSISTANT STORE
  const [selectedAssistant, setSelectedAssistant] =
    useState<Tables<"assistants"> | null>(null)
  const [assistantImages, setAssistantImages] = useState<AssistantImage[]>([])

  // PASSIVE CHAT STORE
  const [userInput, setUserInput] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    model: "gpt-4-1106-preview",
    prompt: "You are a helpful AI assistant.",
    temperature: 0.5,
    contextLength: 4000,
    includeProfileContext: true,
    includeWorkspaceInstructions: true,
    embeddingsProvider: "openai"
  })
  const [selectedChat, setSelectedChat] = useState<Tables<"chats"> | null>(null)
  const [chatFileItems, setChatFileItems] = useState<Tables<"file_items">[]>([])

  // ACTIVE CHAT STORE
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [firstTokenReceived, setFirstTokenReceived] = useState<boolean>(false)
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)

  // CHAT INPUT COMMAND STORE
  const [isPromptPickerOpen, setIsPromptPickerOpen] = useState(false)
  const [slashCommand, setSlashCommand] = useState("")
  const [isAtPickerOpen, setIsAtPickerOpen] = useState(false)
  const [atCommand, setAtCommand] = useState("")
  const [focusPrompt, setFocusPrompt] = useState(false)
  const [focusFile, setFocusFile] = useState(false)
  const [toolInUse, setToolInUse] = useState<"none" | "retrieval">("none")

  // ATTACHMENTS STORE
  const [chatFiles, setChatFiles] = useState<ChatFile[]>([])
  const [chatImages, setChatImages] = useState<MessageImage[]>([])
  const [newMessageFiles, setNewMessageFiles] = useState<ChatFile[]>([])
  const [newMessageImages, setNewMessageImages] = useState<MessageImage[]>([])
  const [showFilesDisplay, setShowFilesDisplay] = useState<boolean>(false)

  // RETIEVAL STORE
  const [useRetrieval, setUseRetrieval] = useState<boolean>(true)
  const [sourceCount, setSourceCount] = useState<number>(4)

  // THIS COMPONENT
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_OLLAMA_URL) {
      fetchOllamaModels()
    }

    fetchStartingData()
  }, [])

  useEffect(() => {
    if (!selectedWorkspace) {
      setLoading(false)
      return
    }

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

    fetchData(selectedWorkspace.id)
  }, [selectedWorkspace])

  const fetchStartingData = async () => {
    const session = (await supabase.auth.getSession()).data.session

    if (session) {
      const user = session.user

      const profile = await getProfileByUserId(user.id)
      setProfile(profile)

      if (!profile.has_onboarded) {
        router.push("/setup")
        return
      }

      const workspaces = await getWorkspacesByUserId(user.id)
      setWorkspaces(workspaces)

      const homeWorkspace = workspaces.find(
        workspace => workspace.is_home === true
      )

      // DB guarantees there will always be a home workspace
      setSelectedWorkspace(homeWorkspace!)

      setChatSettings({
        model: (homeWorkspace?.default_model || "gpt-4-1106-preview") as LLMID,
        prompt:
          homeWorkspace?.default_prompt ||
          "You are a friendly, helpful AI assistant.",
        temperature: homeWorkspace?.default_temperature || 0.5,
        contextLength: homeWorkspace?.default_context_length || 4096,
        includeProfileContext: homeWorkspace?.include_profile_context || true,
        includeWorkspaceInstructions:
          homeWorkspace?.include_workspace_instructions || true,
        embeddingsProvider:
          (homeWorkspace?.embeddings_provider as "openai" | "local") || "openai"
      })
    }
  }

  const fetchData = async (workspaceId: string) => {
    setLoading(true)

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

    setLoading(false)
  }

  const fetchOllamaModels = async () => {
    setLoading(true)

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_OLLAMA_URL + "/api/tags"
      )

      if (!response.ok) {
        throw new Error(`Ollama server is not responding.`)
      }

      const data = await response.json()

      const localModels = data.models.map((model: any) => ({
        modelId: model.name as LLMID,
        modelName: model.name,
        provider: "ollama",
        hostedId: model.name,
        platformLink: "https://ollama.ai/library",
        imageInput: false
      }))

      setAvailableLocalModels(localModels)
    } catch (error) {
      console.warn("Error fetching Ollama models: " + error)
    }

    setLoading(false)
  }

  if (loading) {
    return <Loading />
  }

  return (
    <ChatbotUIContext.Provider
      value={{
        // PROFILE STORE
        profile,
        setProfile,

        // ITEMS STORE
        assistants,
        collections,
        chats,
        files,
        folders,
        presets,
        prompts,
        workspaces,
        setAssistants,
        setCollections,
        setChats,
        setFiles,
        setFolders,
        setPresets,
        setPrompts,
        setWorkspaces,

        // MODELS STORE
        availableLocalModels,
        setAvailableLocalModels,

        // WORKSPACE STORE
        selectedWorkspace,
        setSelectedWorkspace,

        // PRESET STORE
        selectedPreset,
        setSelectedPreset,

        // ASSISTANT STORE
        selectedAssistant,
        assistantImages,
        setSelectedAssistant,
        setAssistantImages,

        // PASSIVE CHAT STORE
        userInput,
        chatMessages,
        chatSettings,
        selectedChat,
        chatFileItems,
        setUserInput,
        setChatMessages,
        setChatSettings,
        setSelectedChat,
        setChatFileItems,

        // ACTIVE CHAT STORE
        abortController,
        firstTokenReceived,
        isGenerating,
        toolInUse,
        setAbortController,
        setFirstTokenReceived,
        setIsGenerating,
        setToolInUse,

        // CHAT INPUT COMMAND STORE
        isPromptPickerOpen,
        slashCommand,
        isAtPickerOpen,
        atCommand,
        focusPrompt,
        focusFile,
        setIsPromptPickerOpen,
        setSlashCommand,
        setIsAtPickerOpen,
        setAtCommand,
        setFocusPrompt,
        setFocusFile,

        // ATTACHMENT STORE
        chatFiles,
        chatImages,
        newMessageFiles,
        newMessageImages,
        showFilesDisplay,
        setChatFiles,
        setChatImages,
        setNewMessageFiles,
        setNewMessageImages,
        setShowFilesDisplay,

        // RETRIEVAL STORE
        useRetrieval,
        sourceCount,
        setUseRetrieval,
        setSourceCount
      }}
    >
      {children}
    </ChatbotUIContext.Provider>
  )
}
