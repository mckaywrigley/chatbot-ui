// components > chat > chat-hooks > use-chat-handler.tsx

import { useChatbotUI } from "@/context/context"
import { getAssistantCollectionsByAssistantId } from "@/db/assistant-collections"
import { getAssistantFilesByAssistantId } from "@/db/assistant-files"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"
import { updateChat } from "@/db/chats"
import { getCollectionFilesByCollectionId } from "@/db/collection-files"
import { deleteMessagesIncludingAndAfter } from "@/db/messages"
import { buildFinalMessages } from "@/lib/build-prompt"
import { Tables } from "@/supabase/types"
import { ChatMessage, ChatPayload, LLMID, ModelProvider } from "@/types"
import { useRouter } from "next/navigation"
import { useContext, useEffect, useRef } from "react"
import { toast } from "sonner"
import { LLM_LIST } from "../../../lib/models/llm/llm-list"
import { PropertyMessageHandler } from "@/lib/property/property-message-handler"
import {
  createTempMessages,
  handleCreateChat,
  handleCreateMessages,
  handleHostedChat,
  handleLocalChat,
  handleRetrieval,
  processResponse,
  validateChatSettings
} from "../chat-helpers"

// Import the document store functions directly
import {
  setDocumentMode,
  setDocumentContent,
  appendDocumentContent,
  setIsStreaming,
  saveDocument
} from "@/lib/stores/document-store"

// Strict utility function to detect explicit weather-related queries only
const isWeatherQuery = (input: string): boolean => {
  const weatherPatterns = [
    // Explicit weather requests
    /(?:what'?s?|show|get|check|tell me|give me)\s+(?:the\s+)?weather\s+(?:in|at|for|of)/i,
    /(?:what|how)(?:'s| is| are)\s+the\s+weather/i,
    /(?:weather|forecast|conditions)\s+(?:in|at|for)\s+[A-Z]/i, // Must have location that starts with capital

    // Explicit forecast requests
    /(?:what'?s?|show|get|check)\s+(?:the\s+)?forecast/i,
    /forecast\s+(?:in|at|for)\s+[A-Z]/i,

    // Direct weather condition questions
    /(?:will|is|does) it (?:rain|snow|sunny|windy|cold|hot)/i,
    /(?:should|can) (?:I|we|they) (?:work|roof|install) (?:today|tomorrow|this week|outside)/i,

    // Roofing weather safety questions (very specific)
    /(?:safe|good|okay|ok) (?:to\s+)?(?:work|roof|install|repair).*(?:weather|today|conditions)/i,
    /(?:weather|conditions).*(?:safe|good) (?:for|to) (?:work|roofing|installation)/i
  ]

  return weatherPatterns.some(pattern => pattern.test(input))
}

// Enhanced function to extract location from a weather query using improved patterns
const extractLocationFromWeatherQuery = (input: string): string | null => {
  // Common location extraction patterns
  const patterns = [
    // Direct "weather in X" patterns
    /weather\s+(?:in|at|for|of)\s+([^\.,:;\n?]+)/i,
    /(?:forecast|temperature|conditions)\s+(?:in|at|for)\s+([^\.,:;\n?]+)/i,
    /(?:what|how)(?:'s| is| are) the weather (?:in|at|for)\s+([^\.,:;\n?]+)/i,

    // Roof-related weather patterns
    /roof(?:ing)?\s+(?:conditions|weather)\s+(?:in|at|for)\s+([^\.,:;\n?]+)/i,

    // Project/property related patterns
    /(?:project|property|job site|construction)\s+(?:in|at|for)\s+([^\.,:;\n?]+)/i,
    /(?:working|installing|repairing)\s+(?:in|at|for)\s+([^\.,:;\n?]+)/i,

    // Location followed by weather
    /(?:in|at|for)\s+([^\.,:;\n?]+)(?:\s+weather)/i,

    // Simple city name extraction (last resort)
    /\b([A-Z][a-z]+(?: [A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)\b/
  ]

  // Try each pattern in order
  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match && match[1]) {
      // Clean up the location name
      return match[1]
        .trim()
        .replace(/^(the|in|at|for|of)\s+/i, "") // Remove leading prepositions
        .replace(/\s+(area|region|city|town|state|county)$/i, "") // Remove trailing descriptors
    }
  }

  // If all patterns fail, try to find any capitalized words that might be place names
  const capitalizedWords = input.match(/\b([A-Z][a-z]{2,})\b/g)
  if (capitalizedWords && capitalizedWords.length > 0) {
    return capitalizedWords[0]
  }

  // Try for ZIP codes as a last resort
  const zipMatch = input.match(/\b(\d{5}(?:-\d{4})?)\b/)
  if (zipMatch && zipMatch[1]) {
    return zipMatch[1]
  }

  return null
}

// New function to extract location using API
const extractLocationAPI = async (query: string): Promise<string | null> => {
  try {
    const response = await fetch("app/api/chat/extract-location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: query })
    })

    if (response.ok) {
      const data = await response.json()
      return data.location
    }

    return null
  } catch (error) {
    console.error("Error calling location extraction API:", error)
    return null
  }
}

export const useChatHandler = () => {
  const router = useRouter()
  const context = useChatbotUI()

  const {
    userInput,
    chatFiles,
    setUserInput,
    setNewMessageImages,
    profile,
    userSubscription,
    setIsGenerating,
    setChatMessages,
    setFirstTokenReceived,
    selectedChat,
    selectedWorkspace,
    setSelectedChat,
    setChats,
    setSelectedTools,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels,
    abortController,
    setAbortController,
    chatSettings,
    newMessageImages,
    selectedAssistant,
    chatMessages,
    chatImages,
    setChatImages,
    setChatFiles,
    setNewMessageFiles,
    setShowFilesDisplay,
    newMessageFiles,
    chatFileItems,
    setChatFileItems,
    setToolInUse,
    useRetrieval,
    sourceCount,
    setIsPromptPickerOpen,
    setIsFilePickerOpen,
    selectedTools,
    selectedPreset,
    setChatSettings,
    models,
    isPromptPickerOpen,
    isFilePickerOpen,
    isToolPickerOpen,
    pipedreamDataSources
  } = context || {}

  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isPromptPickerOpen || !isFilePickerOpen || !isToolPickerOpen) {
      chatInputRef.current?.focus()
    }
  }, [isPromptPickerOpen, isFilePickerOpen, isToolPickerOpen])

  const handleNewChat = async () => {
    if (!selectedWorkspace) return

    // reset state for new chat
    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)
    setChatFileItems([])
    setIsGenerating(false)
    setFirstTokenReceived(false)
    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)
    setIsPromptPickerOpen(false)
    setIsFilePickerOpen(false)
    setSelectedTools([])
    setToolInUse("none")

    // Make sure document mode is reset for new chats
    setDocumentMode(false)

    // apply assistant or preset settings
    if (selectedAssistant) {
      setChatSettings({
        model: selectedAssistant.model as LLMID,
        prompt: selectedAssistant.prompt,
        temperature: selectedAssistant.temperature,
        contextLength: selectedAssistant.context_length,
        includeProfileContext: selectedAssistant.include_profile_context,
        includeWorkspaceInstructions:
          selectedAssistant.include_workspace_instructions,
        embeddingsProvider: selectedAssistant.embeddings_provider as
          | "openai"
          | "local"
      })

      let allFiles: typeof chatFiles = []
      const assistantFiles = (
        await getAssistantFilesByAssistantId(selectedAssistant.id)
      ).files
      allFiles = [...assistantFiles]
      const assistantCollections = (
        await getAssistantCollectionsByAssistantId(selectedAssistant.id)
      ).collections
      for (const col of assistantCollections) {
        const collFiles = (await getCollectionFilesByCollectionId(col.id)).files
        allFiles = [...allFiles, ...collFiles]
      }
      const assistantTools = (
        await getAssistantToolsByAssistantId(selectedAssistant.id)
      ).tools

      setSelectedTools(assistantTools)
      setChatFiles(
        allFiles.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          file: null
        }))
      )

      if (allFiles.length > 0) setShowFilesDisplay(true)
    } else if (selectedPreset) {
      setChatSettings({
        model: selectedPreset.model as LLMID,
        prompt: selectedPreset.prompt,
        temperature: selectedPreset.temperature,
        contextLength: selectedPreset.context_length,
        includeProfileContext: selectedPreset.include_profile_context,
        includeWorkspaceInstructions:
          selectedPreset.include_workspace_instructions,
        embeddingsProvider: selectedPreset.embeddings_provider as
          | "openai"
          | "local"
      })
    }

    router.push(`/${selectedWorkspace.id}/chat`)
  }

  const handleFocusChatInput = () => {
    chatInputRef.current?.focus()
  }

  const handleStopMessage = () => {
    abortController?.abort()
  }

  const handleSendMessage = async (
    messageContent: string,
    chatMessages: ChatMessage[],
    isRegeneration: boolean
  ) => {
    // Check for pending Google Drive file context
    const pendingFileContext = sessionStorage.getItem("pendingFileContext")
    const pendingFileName = sessionStorage.getItem("pendingFileName")

    if (pendingFileContext && !isRegeneration) {
      // Prepend file context to the message
      messageContent = `${pendingFileContext}\n\nUser question: ${messageContent}`

      // Clear the session storage
      sessionStorage.removeItem("pendingFileContext")
      sessionStorage.removeItem("pendingFileName")
    }

    // Check if this is a weather-related query
    const isWeatherRequest = isWeatherQuery(messageContent)

    // Document detection with comprehensive regex
    const isDocumentRequest =
      /^\s*(write|draft|create|generate|make|prepare|compose)\s+(a|an|the|some|me a)?\s*(document|template|policy|letter|email|report|plan|proposal|agreement|contract|website|webpage|web page)/i.test(
        messageContent
      )

    // Store the original message to restore on error
    const startingInput = messageContent

    // Set document mode accordingly - ONLY AT THE BEGINNING
    if (isDocumentRequest) {
      setDocumentMode(true)
      setDocumentContent("") // Clear content at the beginning
      setIsStreaming(true)
    } else if (!isRegeneration) {
      // Don't turn off document mode here
    }

    try {
      // Set generating state immediately for better UX
      setIsGenerating(true)
      setIsPromptPickerOpen(false)
      setIsFilePickerOpen(false)
      setNewMessageImages([])
      setNewMessageFiles([]) // Clear files after sending message

      const newAbort = new AbortController()
      setAbortController(newAbort)

      const allAvailableModels = [
        ...models.map(m => ({
          modelId: m.model_id as LLMID,
          modelName: m.name,
          provider: "custom" as ModelProvider,
          hostedId: m.id,
          platformLink: "",
          imageInput: false
        })),
        ...LLM_LIST,
        ...(availableHostedModels || []),
        ...(availableLocalModels || []),
        ...(availableOpenRouterModels || [])
      ]

      let modelData = allAvailableModels.find(
        llm => llm.modelId === chatSettings?.model
      )

      // If model not found, try to fallback to gpt-4o
      if (!modelData && chatSettings) {
        const fallbackModel = allAvailableModels.find(
          llm => llm.modelId === "gpt-4o"
        )
        if (fallbackModel) {
          setChatSettings({ ...chatSettings, model: "gpt-4o" as LLMID })
          modelData = fallbackModel
        }
      }

      validateChatSettings(
        chatSettings,
        modelData,
        profile,
        selectedWorkspace,
        messageContent
      )

      // Check if user has access to the selected model based on their subscription
      if (chatSettings?.model) {
        const { isModelAllowed } = await import("@/lib/subscription-utils")

        // Determine plan type (default to free if no subscription)
        const planType =
          userSubscription &&
          (userSubscription.status === "active" ||
            userSubscription.status === "trialing")
            ? (userSubscription.plan_type as "free" | "premium" | "business") ||
              "free"
            : "free"

        if (!isModelAllowed(planType, chatSettings.model)) {
          // Stop generation and redirect to pricing page
          setIsGenerating(false)
          toast.error(
            "This model requires a Business plan. Redirecting to pricing..."
          )
          setTimeout(() => {
            router.push("/pricing")
          }, 1500)
          return
        }
      }

      let currentChat = selectedChat ? { ...selectedChat } : null
      const b64s = newMessageImages.map(img => img.base64)
      let retrieved: Tables<"file_items">[] = []

      // Filter out files that are still loading before retrieval
      const validNewFiles = newMessageFiles.filter(
        file => file.id !== "loading" && file.id && file.id.length > 0
      )
      const validChatFiles = chatFiles.filter(
        file => file.id !== "loading" && file.id && file.id.length > 0
      )

      // Always retrieve uploaded files - they should be automatically available
      if (validNewFiles.length || validChatFiles.length) {
        setToolInUse("retrieval")
        retrieved = await handleRetrieval(
          userInput,
          validNewFiles,
          validChatFiles,
          chatSettings!.embeddingsProvider,
          sourceCount
        )
      }

      // Create temp messages
      const { tempUserChatMessage, tempAssistantChatMessage } =
        createTempMessages(
          messageContent,
          chatMessages,
          chatSettings!,
          b64s,
          isRegeneration,
          setChatMessages,
          selectedAssistant
        )

      // Special handling for weather queries
      let generatedText = ""
      let documentMetadata: any[] = []

      if (isWeatherRequest && !isRegeneration) {
        // First try extracting location via API if available
        let location = await extractLocationAPI(messageContent)

        // Fall back to pattern matching if API fails
        if (!location) {
          location = extractLocationFromWeatherQuery(messageContent)
        }

        // Use a default as last resort
        if (!location) {
          location = "unknown location"
        }

        // Create a response with both visible and hidden markers for the weather widget
        generatedText = `Here's the current weather information for ${location}:\n\n[TRIGGER_WEATHER_LOOKUP:${location}]\n\nThe weather widget above shows current conditions and forecast for ${location}. This includes precipitation forecast, wind conditions, temperature, and safety indicators important for roofing work.`

        // Also add a hidden HTML comment that the weather widget can find
        generatedText += `\n\n<!-- WEATHER_WIDGET_LOCATION:${location} -->`

        // Mark as completed so we skip the LLM
        setFirstTokenReceived(true)
      } else {
        // For non-weather queries, process normally
        const payload: ChatPayload = {
          chatSettings: chatSettings!,
          workspaceInstructions: selectedWorkspace?.instructions || "",
          workspaceId: selectedWorkspace?.id || "",
          chatMessages: isRegeneration
            ? [...chatMessages]
            : [...chatMessages, tempUserChatMessage],
          assistant: selectedChat?.assistant_id ? selectedAssistant : null,
          messageFileItems: retrieved,
          chatFileItems
        }

        // Generate the response using the appropriate method
        // Check if Pipedream apps are enabled
        const enabledPipedreamApps = (pipedreamDataSources || [])
          .filter((ds: { enabled: boolean; app_slug: string }) => ds.enabled)
          .map((ds: { app_slug: string }) => ds.app_slug)

        if (enabledPipedreamApps.length > 0) {
          // Route to Pipedream endpoint when user has connected apps
          setToolInUse("Pipedream")
          const formatted = await buildFinalMessages(
            payload,
            profile!,
            chatImages
          )

          const res = await fetch("/api/chat/pipedream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatSettings: payload.chatSettings,
              messages: formatted,
              enabledApps: enabledPipedreamApps,
              chatId: selectedChat?.id
            })
          })

          // Handle API errors gracefully
          if (!res.ok) {
            setToolInUse("none")
            let errorMessage = "Failed to process with connected apps"
            try {
              const errorData = await res.json()
              errorMessage = errorData.message || errorMessage
            } catch {
              // If we can't parse JSON, use default message
            }
            throw new Error(errorMessage)
          }

          setToolInUse("none")
          const result = await processResponse(
            res,
            isRegeneration
              ? payload.chatMessages[payload.chatMessages.length - 1]
              : tempAssistantChatMessage,
            true,
            newAbort,
            setFirstTokenReceived,
            setChatMessages,
            setToolInUse
          )
          generatedText = result.fullText
          documentMetadata = result.documentMetadata
        } else if (selectedTools.length) {
          setToolInUse("Tools")
          const formatted = await buildFinalMessages(
            payload,
            profile!,
            chatImages
          )
          const res = await fetch("/api/chat/tools", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatSettings: payload.chatSettings,
              messages: formatted,
              selectedTools
            })
          })

          setToolInUse("none")
          const result = await processResponse(
            res,
            isRegeneration
              ? payload.chatMessages[payload.chatMessages.length - 1]
              : tempAssistantChatMessage,
            true,
            newAbort,
            setFirstTokenReceived,
            setChatMessages,
            setToolInUse
          )
          generatedText = result.fullText
          documentMetadata = result.documentMetadata
        } else {
          const result =
            modelData!.provider === "ollama"
              ? await handleLocalChat(
                  payload,
                  profile!,
                  chatSettings!,
                  tempAssistantChatMessage,
                  isRegeneration,
                  newAbort,
                  setIsGenerating,
                  setFirstTokenReceived,
                  setChatMessages,
                  setToolInUse
                )
              : await handleHostedChat(
                  payload,
                  profile!,
                  modelData!,
                  tempAssistantChatMessage,
                  isRegeneration,
                  newAbort,
                  newMessageImages,
                  chatImages,
                  setIsGenerating,
                  setFirstTokenReceived,
                  setChatMessages,
                  setToolInUse
                )

          // Handle both string (local chat) and object (hosted chat) return values
          if (typeof result === "string") {
            generatedText = result
          } else {
            generatedText = result.fullText
            documentMetadata = result.documentMetadata
          }

          // Removed auto-injection of weather markers from AI responses
          // Weather widget should only trigger when user explicitly requests weather
        }
      }

      // Create or update the chat
      if (!currentChat) {
        currentChat = await handleCreateChat(
          chatSettings!,
          profile!,
          selectedWorkspace!,
          messageContent,
          selectedAssistant!,
          validNewFiles,
          setSelectedChat,
          setChats,
          setChatFiles
        )
      } else {
        const updated = await updateChat(currentChat.id, {
          updated_at: new Date().toISOString()
        })
        setChats(prev => prev.map(c => (c.id === updated.id ? updated : c)))
      }

      // After text generation is complete and before message creation:
      if (isDocumentRequest && generatedText) {
        // Create a unique ID for this document
        const documentId = `doc_${Date.now()}`

        // Set the content
        setDocumentContent(generatedText)

        // Save the document with this ID
        saveDocument(documentId)

        // Make sure document mode stays enabled
        setDocumentMode(true)

        // Turn off streaming
        setIsStreaming(false)

        // Use plain text format that won't be rendered as a code block
        const chatDisplayText = `I've created a document based on your request.\n\nDOCUMENT_ID:${documentId}\n\nClick to view the document.`

        // Create messages with the modified text
        await handleCreateMessages(
          chatMessages,
          currentChat!,
          profile!,
          modelData!,
          messageContent,
          chatDisplayText, // Use the modified text
          newMessageImages,
          isRegeneration,
          retrieved,
          setChatMessages,
          setChatFileItems,
          setChatImages,
          selectedAssistant
        )
      } else {
        // Normal message creation for non-document requests
        const metadataJson =
          documentMetadata.length > 0
            ? JSON.stringify({ sources: documentMetadata })
            : undefined
        await handleCreateMessages(
          chatMessages,
          currentChat!,
          profile!,
          modelData!,
          messageContent,
          generatedText,
          newMessageImages,
          isRegeneration,
          retrieved,
          setChatMessages,
          setChatFileItems,
          setChatImages,
          selectedAssistant,
          metadataJson
        )
      }

      // IMPORTANT: Even if there's an error later, we want to make sure the document isn't closed
      if (isDocumentRequest) {
        // One final check to ensure document mode stays on
        setDocumentMode(true)
      }

      setIsGenerating(false)
      setFirstTokenReceived(false)
      setIsStreaming(false)
    } catch (err) {
      console.error("Error in handleSendMessage:", err)
      setIsGenerating(false)
      setFirstTokenReceived(false)
      setIsStreaming(false)

      // Don't reset document mode on error, just restore the input
      setUserInput(startingInput)
    }
  }

  const handleSendEdit = async (
    editedContent: string,
    sequenceNumber: number
  ) => {
    if (!selectedChat) return
    await deleteMessagesIncludingAndAfter(
      selectedChat.user_id,
      selectedChat.id,
      sequenceNumber
    )
    const filtered = chatMessages.filter(
      m => m.message.sequence_number < sequenceNumber
    )
    setChatMessages(filtered)
    handleSendMessage(editedContent, filtered, false)
  }

  return {
    chatInputRef,
    prompt: userInput,
    handleNewChat,
    handleSendMessage,
    handleFocusChatInput,
    handleStopMessage,
    handleSendEdit
  }
}
