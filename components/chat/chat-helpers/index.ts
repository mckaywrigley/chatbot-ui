// Only used in use-chat-handler.tsx to keep it clean

import { AlertAction } from "@/context/alert-context"
import { createChatFiles } from "@/db/chat-files"
import { createChat } from "@/db/chats"
import { createMessageFileItems } from "@/db/message-file-items"
import { createMessages, deleteMessage, updateMessage } from "@/db/messages"
import { uploadMessageImage } from "@/db/storage/message-images"
import {
  buildFinalMessages
  // buildGoogleGeminiFinalMessages
} from "@/lib/build-prompt"
import { consumeReadableStream } from "@/lib/consume-stream"
import { Tables, TablesInsert } from "@/supabase/types"
import {
  ChatFile,
  ChatMessage,
  ChatPayload,
  ChatSettings,
  LLM,
  MessageImage
} from "@/types"
import { PluginID } from "@/types/plugins"
import React from "react"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"

export const validateChatSettings = (
  chatSettings: ChatSettings | null,
  modelData: LLM | undefined,
  profile: Tables<"profiles"> | null,
  selectedWorkspace: Tables<"workspaces"> | null,
  isContinuation: boolean,
  messageContent: string | null
) => {
  if (!chatSettings) {
    throw new Error("Chat settings not found")
  }

  if (!modelData) {
    throw new Error("Model not found")
  }

  if (!profile) {
    throw new Error("Profile not found")
  }

  if (!selectedWorkspace) {
    throw new Error("Workspace not found")
  }

  if (!isContinuation && !messageContent) {
    throw new Error("Message content not found")
  }
}

export const handleRetrieval = async (
  userInput: string,
  newMessageFiles: ChatFile[],
  chatFiles: ChatFile[],
  embeddingsProvider: "openai" | "local",
  sourceCount: number
) => {
  const response = await fetch("/api/retrieval/retrieve", {
    method: "POST",
    body: JSON.stringify({
      userInput,
      fileIds: [...newMessageFiles, ...chatFiles].map(file => file.id),
      embeddingsProvider,
      sourceCount
    })
  })

  if (!response.ok) {
    console.error("Error retrieving:", response)
  }

  const { results } = (await response.json()) as {
    results: Tables<"file_items">[]
  }

  return results
}

const CONTINUE_PROMPT =
  "You got cut off in the middle of your message. Continue exactly from where you stopped. Whatever you output will be appended to your last message, so DO NOT repeat any of the previous message text. Do NOT apologize or add any unrelated text; just continue."

export const createTempMessages = (
  messageContent: string | null,
  chatMessages: ChatMessage[],
  chatSettings: ChatSettings,
  b64Images: string[],
  isContinuation: boolean,
  selectedPlugin: PluginID | null
) => {
  if (!messageContent || isContinuation) messageContent = CONTINUE_PROMPT

  let tempUserChatMessage: ChatMessage = {
    message: {
      chat_id: "",
      content: messageContent,
      created_at: "",
      id: uuidv4(),
      image_paths: b64Images,
      model: chatSettings.model,
      plugin: selectedPlugin,
      role: "user",
      sequence_number: chatMessages.length,
      updated_at: "",
      user_id: ""
    },
    fileItems: []
  }

  let tempAssistantChatMessage: ChatMessage = {
    message: {
      chat_id: "",
      content: "",
      created_at: "",
      id: uuidv4(),
      image_paths: [],
      model: chatSettings.model,
      plugin: selectedPlugin,
      role: "assistant",
      sequence_number: chatMessages.length + 1,
      updated_at: "",
      user_id: ""
    },
    fileItems: []
  }

  return {
    tempUserChatMessage,
    tempAssistantChatMessage
  }
}

export const handleHostedChat = async (
  payload: ChatPayload,
  profile: Tables<"profiles">,
  modelData: LLM,
  tempAssistantChatMessage: ChatMessage,
  isRegeneration: boolean,
  isContinuation: boolean,
  newAbortController: AbortController,
  newMessageImages: MessageImage[],
  chatImages: MessageImage[],
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setToolInUse: React.Dispatch<React.SetStateAction<string>>,
  alertDispatch: React.Dispatch<AlertAction>,
  selectedPlugin: PluginID | null
) => {
  const provider =
    modelData.provider === "openai" && profile.use_azure_openai
      ? "azure"
      : modelData.provider

  let formattedMessages = []

  formattedMessages = await buildFinalMessages(
    payload,
    profile,
    chatImages,
    selectedPlugin
  )

  const apiEndpoint =
    provider === "custom" ? "/api/v2/chat/custom" : `/api/v2/chat/${provider}`

  const requestBody = {
    payload: payload,
    chatImages: chatImages,
    selectedPlugin: selectedPlugin,
    isRetrieval:
      payload.messageFileItems && payload.messageFileItems.length > 0,
    isContinuation
  }

  const response = await fetchChatResponse(
    apiEndpoint,
    requestBody,
    true,
    newAbortController,
    setIsGenerating,
    setChatMessages,
    alertDispatch
  )

  return await processResponse(
    response,
    isRegeneration
      ? payload.chatMessages[payload.chatMessages.length - 1]
      : isContinuation
        ? payload.chatMessages[payload.chatMessages.length - 2]
        : tempAssistantChatMessage,
    newAbortController,
    setFirstTokenReceived,
    setChatMessages,
    setToolInUse
  )
}

export const handleHostedPluginsChat = async (
  payload: ChatPayload,
  profile: Tables<"profiles">,
  modelData: LLM,
  tempAssistantChatMessage: ChatMessage,
  isRegeneration: boolean,
  newAbortController: AbortController,
  newMessageImages: MessageImage[],
  chatImages: MessageImage[],
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setToolInUse: React.Dispatch<React.SetStateAction<string>>,
  alertDispatch: React.Dispatch<AlertAction>,
  selectedPlugin: PluginID,
  fileData?: { fileName: string; fileContent: string }[]
) => {
  const apiEndpoint = "/api/v2/chat/plugins"

  const requestBody: any = {
    payload: payload,
    chatImages: chatImages,
    selectedPlugin: selectedPlugin
  }

  if (fileData) {
    requestBody.fileData = fileData
  }

  const response = await fetchChatResponse(
    apiEndpoint,
    requestBody,
    true,
    newAbortController,
    setIsGenerating,
    setChatMessages,
    alertDispatch
  )

  return await processResponsePlugins(
    response,
    isRegeneration
      ? payload.chatMessages[payload.chatMessages.length - 1]
      : tempAssistantChatMessage,
    newAbortController,
    setFirstTokenReceived,
    setChatMessages,
    setToolInUse
  )
}

export const fetchChatResponse = async (
  url: string,
  body: object,
  isHosted: boolean,
  controller: AbortController,
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  alertDispatch: React.Dispatch<AlertAction>
) => {
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    signal: controller.signal
  })

  if (!response.ok) {
    if (response.status === 404 && !isHosted) {
      toast.error(
        "Model not found. Make sure you have it downloaded via Ollama."
      )
    }

    const errorData = await response.json()
    if (response.status === 429 && errorData && errorData.timeRemaining) {
      alertDispatch({
        type: "SHOW",
        payload: { message: errorData.message, title: "Usage Cap Error" }
      })
    } else {
      const errorData = await response.json()
      toast.error(errorData.message)
    }

    setIsGenerating(false)
    setChatMessages(prevMessages => prevMessages.slice(0, -2))
  }

  return response
}

export const processResponse = async (
  response: Response,
  lastChatMessage: ChatMessage,
  controller: AbortController,
  setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setToolInUse: React.Dispatch<React.SetStateAction<string>>
) => {
  let fullText = ""
  let contentToAdd = ""
  let finishReason = ""

  if (!response.ok) {
    const result = await response.json()
    let errorMessage = result.error?.message || "An unknown error occurred"

    switch (response.status) {
      case 400:
        throw new Error(`Bad Request: ${errorMessage}`)
      case 401:
        throw new Error(`Invalid Credentials: ${errorMessage}`)
      case 402:
        throw new Error(`Out of Credits: ${errorMessage}`)
      case 403:
        throw new Error(`Moderation Required: ${errorMessage}`)
      case 408:
        throw new Error(`Request Timeout: ${errorMessage}`)
      case 429:
        throw new Error(`Rate Limited: ${errorMessage}`)
      case 502:
        Error
        throw new Error(`Service Unavailable: ${errorMessage}`)
      default:
        throw new Error(`HTTP Error: ${errorMessage}`)
    }
  }

  if (response.body) {
    let jsonBuffer = ""

    await consumeReadableStream(
      response.body,
      chunk => {
        setFirstTokenReceived(true)
        setToolInUse("none")
        let contentToAdd = ""
        jsonBuffer += chunk

        // Process complete JSON objects
        while (true) {
          const lastIndex = jsonBuffer.indexOf("\n")
          if (lastIndex === -1) break

          const jsonLine = jsonBuffer.slice(0, lastIndex).trim()
          jsonBuffer = jsonBuffer.slice(lastIndex + 1)

          if (jsonLine.startsWith("data: ")) {
            if (jsonLine.substring(6) === "[DONE]") {
              // Stream has ended
              break
            }

            const data = JSON.parse(jsonLine.substring(6))

            const choice = data.choices[0]
            finishReason = choice.finish_reason || finishReason

            if (choice.delta.content) {
              contentToAdd += choice.delta.content
            }
          }
        }

        if (contentToAdd) {
          fullText += contentToAdd

          setChatMessages(prev =>
            prev.map(chatMessage => {
              if (chatMessage.message.id === lastChatMessage.message.id) {
                return {
                  ...chatMessage,
                  message: {
                    ...chatMessage.message,
                    content: chatMessage.message.content + contentToAdd
                  }
                }
              }
              return chatMessage
            })
          )
        }
      },
      controller.signal
    )

    return { fullText, finishReason }
  } else {
    throw new Error("Response body is null")
  }
}

export const processResponsePlugins = async (
  response: Response,
  lastChatMessage: ChatMessage,
  controller: AbortController,
  setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setToolInUse: React.Dispatch<React.SetStateAction<string>>
) => {
  let fullText = ""
  let contentToAdd = ""

  if (response.body) {
    await consumeReadableStream(
      response.body,
      chunk => {
        setFirstTokenReceived(true)
        setToolInUse("none")
        fullText += chunk
        setChatMessages(prev =>
          prev.map(chatMessage => {
            if (chatMessage.message.id === lastChatMessage.message.id) {
              const updatedChatMessage: ChatMessage = {
                message: {
                  ...chatMessage.message,
                  content: chatMessage.message.content + chunk
                },
                fileItems: chatMessage.fileItems
              }

              return updatedChatMessage
            }

            return chatMessage
          })
        )
      },
      controller.signal
    )

    return { fullText, finishReason: "" }
  } else {
    throw new Error("Response body is null")
  }
}

export const handleCreateChat = async (
  chatSettings: ChatSettings,
  profile: Tables<"profiles">,
  selectedWorkspace: Tables<"workspaces">,
  messageContent: string,
  selectedAssistant: Tables<"assistants">,
  newMessageFiles: ChatFile[],
  finishReason: string,
  setSelectedChat: React.Dispatch<React.SetStateAction<Tables<"chats"> | null>>,
  setChats: React.Dispatch<React.SetStateAction<Tables<"chats">[]>>,
  setChatFiles: React.Dispatch<React.SetStateAction<ChatFile[]>>
) => {
  const createdChat = await createChat({
    user_id: profile.user_id,
    workspace_id: selectedWorkspace.id,
    assistant_id: selectedAssistant?.id || null,
    context_length: chatSettings.contextLength,
    include_profile_context: chatSettings.includeProfileContext,
    include_workspace_instructions: chatSettings.includeWorkspaceInstructions,
    model: chatSettings.model,
    name: messageContent.substring(0, 100),
    prompt: chatSettings.prompt,
    temperature: chatSettings.temperature,
    embeddings_provider: chatSettings.embeddingsProvider,
    finish_reason: finishReason
  })

  setSelectedChat(createdChat)
  setChats(chats => [createdChat, ...chats])

  await createChatFiles(
    newMessageFiles.map(file => ({
      user_id: profile.user_id,
      chat_id: createdChat.id,
      file_id: file.id
    }))
  )

  setChatFiles(prev => [...prev, ...newMessageFiles])

  return createdChat
}

export const handleCreateMessages = async (
  chatMessages: ChatMessage[],
  currentChat: Tables<"chats">,
  profile: Tables<"profiles">,
  modelData: LLM,
  messageContent: string | null,
  generatedText: string,
  newMessageImages: MessageImage[],
  isRegeneration: boolean,
  isContinuation: boolean,
  retrievedFileItems: Tables<"file_items">[],
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setChatImages: React.Dispatch<React.SetStateAction<MessageImage[]>>,
  selectedPlugin: PluginID | null
) => {
  const finalUserMessage: TablesInsert<"messages"> = {
    chat_id: currentChat.id,
    user_id: profile.user_id,
    content: messageContent || "",
    model: modelData.modelId,
    plugin: selectedPlugin,
    role: "user",
    sequence_number: chatMessages.length,
    image_paths: []
  }

  const finalAssistantMessage: TablesInsert<"messages"> = {
    chat_id: currentChat.id,
    user_id: profile.user_id,
    content: generatedText,
    model: modelData.modelId,
    plugin: selectedPlugin,
    role: "assistant",
    sequence_number: chatMessages.length + 1,
    image_paths: []
  }

  let finalChatMessages: ChatMessage[] = []

  if (isRegeneration) {
    const lastMessageId = chatMessages[chatMessages.length - 1].message.id
    await deleteMessage(lastMessageId)

    const createdMessages = await createMessages([finalAssistantMessage])

    finalChatMessages = [
      ...chatMessages.slice(0, -1),
      {
        message: createdMessages[0],
        fileItems: retrievedFileItems
      }
    ]

    setChatMessages(finalChatMessages)
  } else if (isContinuation) {
    const lastStartingMessage = chatMessages[chatMessages.length - 1].message

    const updatedMessage = await updateMessage(lastStartingMessage.id, {
      ...lastStartingMessage,
      content: lastStartingMessage.content + generatedText
    })

    chatMessages[chatMessages.length - 1].message = updatedMessage

    finalChatMessages = [...chatMessages]

    setChatMessages(finalChatMessages)
  } else {
    const createdMessages = await createMessages([
      finalUserMessage,
      finalAssistantMessage
    ])

    // Upload each image (stored in newMessageImages) for the user message to message_images bucket
    const uploadPromises = newMessageImages
      .filter(obj => obj.file !== null)
      .map(obj => {
        let filePath = `${profile.user_id}/${currentChat.id}/${
          createdMessages[0].id
        }/${uuidv4()}`

        return uploadMessageImage(filePath, obj.file as File).catch(error => {
          console.error(`Failed to upload image at ${filePath}:`, error)
          return null
        })
      })

    const paths = (await Promise.all(uploadPromises)).filter(
      Boolean
    ) as string[]

    setChatImages(prevImages => [
      ...prevImages,
      ...newMessageImages.map((obj, index) => ({
        ...obj,
        messageId: createdMessages[0].id,
        path: paths[index]
      }))
    ])

    const updatedMessage = await updateMessage(createdMessages[0].id, {
      ...createdMessages[0],
      image_paths: paths
    })

    const createdMessageFileItems = await createMessageFileItems(
      retrievedFileItems.map(fileItem => {
        return {
          user_id: profile.user_id,
          message_id: createdMessages[1].id,
          file_item_id: fileItem.id
        }
      })
    )

    finalChatMessages = [
      ...chatMessages,
      {
        message: updatedMessage,
        fileItems: []
      },
      {
        message: createdMessages[1],
        fileItems: retrievedFileItems
      }
    ]

    setChatMessages(finalChatMessages)
  }
}
