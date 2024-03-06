import { ChatbotUIContext } from "@/context/context"
import { updateChat } from "@/db/chats"
import { deleteMessagesIncludingAndAfter } from "@/db/messages"
import { buildFinalMessages } from "@/lib/build-prompt"
import { Tables } from "@/supabase/types"
import { ChatMessage, ChatPayload, LLMID, ModelProvider } from "@/types"
import { useRouter } from "next/navigation"
import { useContext, useEffect, useRef } from "react"
import { LLM_LIST } from "../../../lib/models/llm/llm-list"
import {
  createTempMessages,
  handleCreateChat,
  handleCreateMessages,
  handleHostedChat,
  handleLocalChat,
  handleRetrieval,
  processResponse,
  validateChatSettings,
  getRecallAssistantByStudyState
} from "../chat-helpers"
import { usePromptAndCommand } from "./use-prompt-and-command"
import { deleteChatFilesByChatId } from "@/db/chat-files"
import { set } from "date-fns"
import { StudyState } from "@/lib/assistants"
import recallAssistants from "@/lib/assistants"

export const useChatHandler = () => {
  const router = useRouter()

  const {
    userInput,
    chatFiles,
    setUserInput,
    setNewMessageImages,
    profile,
    setIsGenerating,
    setChatMessages,
    setFirstTokenReceived,
    selectedChat,
    selectedWorkspace,
    setSelectedChat,
    setChats,
    setSelectedTools,
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
    models,
    isPromptPickerOpen,
    isFilePickerOpen,
    isToolPickerOpen,
    topicDescription,
    setTopicDescription,
    assistants,
    setChatStudyState,
    chatStudyState
  } = useContext(ChatbotUIContext)

  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const { handleSelectAssistant } = usePromptAndCommand()

  useEffect(() => {
    if (!isPromptPickerOpen || !isFilePickerOpen || !isToolPickerOpen) {
      chatInputRef.current?.focus()
    }
  }, [isPromptPickerOpen, isFilePickerOpen, isToolPickerOpen])

  const handleNewChat = async () => {
    if (!selectedWorkspace) return

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
    setTopicDescription("")

    setToolInUse("none")

    setChatStudyState("topic_creation")

    // get the assistant from assistances context where name ="Study coach"
    const topicAssistant = assistants.find(
      assistant => assistant.name === "Topic creation tutor"
    )
    if (!topicAssistant) {
      console.error("No assistant with name 'Study coach' found")
    } else {
      handleSelectAssistant(topicAssistant)
    }

    return router.push(`/${selectedWorkspace.id}/chat`)
  }

  const handleFocusChatInput = () => {
    chatInputRef.current?.focus()
  }

  const handleStopMessage = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const handleSendMessage = async (
    messageContent: string,
    chatMessages: ChatMessage[],
    isRegeneration: boolean
  ) => {
    const startingInput = messageContent

    try {
      setUserInput("")
      setIsGenerating(true)
      setIsPromptPickerOpen(false)
      setIsFilePickerOpen(false)
      setNewMessageImages([])

      const newAbortController = new AbortController()
      setAbortController(newAbortController)

      const modelData = [
        ...models.map(model => ({
          modelId: model.model_id as LLMID,
          modelName: model.name,
          provider: "custom" as ModelProvider,
          hostedId: model.id,
          platformLink: "",
          imageInput: false
        })),
        ...LLM_LIST,
        ...availableLocalModels,
        ...availableOpenRouterModels
      ].find(llm => llm.modelId === chatSettings?.model)

      validateChatSettings(
        chatSettings,
        modelData,
        profile,
        selectedWorkspace,
        messageContent
      )

      let currentChat = selectedChat ? { ...selectedChat } : null

      const b64Images = newMessageImages.map(image => image.base64)

      let retrievedFileItems: Tables<"file_items">[] = []

      if (
        (newMessageFiles.length > 0 || chatFiles.length > 0) &&
        useRetrieval
      ) {
        setToolInUse("retrieval")

        retrievedFileItems = await handleRetrieval(
          userInput,
          newMessageFiles,
          chatFiles,
          chatSettings!.embeddingsProvider,
          sourceCount
        )
      }

      const { tempUserChatMessage, tempAssistantChatMessage } =
        createTempMessages(
          messageContent,
          chatMessages,
          chatSettings!,
          b64Images,
          isRegeneration,
          setChatMessages,
          selectedAssistant
        )

      let generatedText = ""

      let payload: ChatPayload = {
        chatSettings: chatSettings!,
        workspaceInstructions: selectedWorkspace!.instructions || "",
        chatMessages: isRegeneration
          ? [...chatMessages]
          : [...chatMessages, tempUserChatMessage],
        assistant: selectedAssistant,
        messageFileItems: retrievedFileItems,
        chatFileItems: chatFileItems,
        topicDescription
      }

      const recallAssistant = getRecallAssistantByStudyState(chatStudyState)

      if (chatStudyState.length > 0 && recallAssistant) {
        const formattedMessages = await buildFinalMessages(
          payload,
          profile!,
          chatImages,
          recallAssistant
        )

        const response = await fetch("/api/chat/functions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chatSettings: payload.chatSettings,
            messages: formattedMessages,
            chatId: currentChat?.id,
            recallAssistantFunctions: recallAssistant?.functions ?? [],
            chatStudyState
          })
        })

        const newStudyState = response.headers.get("NEW-STUDY-STATE")
        console.log({ newStudyState })
        if (newStudyState) setChatStudyState(newStudyState as StudyState)

        //////////////////////////

        generatedText = await processResponse(
          response,
          isRegeneration
            ? payload.chatMessages[payload.chatMessages.length - 1]
            : tempAssistantChatMessage,
          true,
          newAbortController,
          setFirstTokenReceived,
          setChatMessages,
          setToolInUse
        )
      } else if (selectedTools.length > 0) {
        setToolInUse("Tools")

        const formattedMessages = await buildFinalMessages(
          payload,
          profile!,
          chatImages,
          recallAssistant!
        )

        const response = await fetch("/api/chat/tools", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chatSettings: payload.chatSettings,
            messages: formattedMessages,
            selectedTools,
            chatId: currentChat?.id,
            recallAssistantFunctions: recallAssistant?.functions ?? []
          })
        })

        setToolInUse("none")

        generatedText = await processResponse(
          response,
          isRegeneration
            ? payload.chatMessages[payload.chatMessages.length - 1]
            : tempAssistantChatMessage,
          true,
          newAbortController,
          setFirstTokenReceived,
          setChatMessages,
          setToolInUse
        )
      } else {
        if (modelData!.provider === "ollama") {
          generatedText = await handleLocalChat(
            payload,
            profile!,
            chatSettings!,
            tempAssistantChatMessage,
            isRegeneration,
            newAbortController,
            setIsGenerating,
            setFirstTokenReceived,
            setChatMessages,
            setToolInUse
          )
        } else {
          generatedText = await handleHostedChat(
            payload,
            profile!,
            modelData!,
            tempAssistantChatMessage,
            isRegeneration,
            newAbortController,
            newMessageImages,
            chatImages,
            setIsGenerating,
            setFirstTokenReceived,
            setChatMessages,
            setToolInUse
          )
        }
      }

      if (!currentChat) {
        currentChat = await handleCreateChat(
          chatSettings!,
          profile!,
          selectedWorkspace!,
          messageContent,
          selectedAssistant!,
          newMessageFiles,
          setSelectedChat,
          setChats,
          setChatFiles
        )
      } else {
        const updatedChat = await updateChat(currentChat.id, {
          updated_at: new Date().toISOString()
        })

        setChats(prevChats => {
          const updatedChats = prevChats.map(prevChat =>
            prevChat.id === updatedChat.id ? updatedChat : prevChat
          )

          return updatedChats
        })
      }

      await handleCreateMessages(
        chatMessages,
        currentChat,
        profile!,
        modelData!,
        messageContent,
        generatedText,
        newMessageImages,
        isRegeneration,
        retrievedFileItems,
        setChatMessages,
        setChatFileItems,
        setChatImages,
        selectedAssistant
      )

      setIsGenerating(false)
      setFirstTokenReceived(false)
      setUserInput("")
    } catch (error) {
      setIsGenerating(false)
      setFirstTokenReceived(false)
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

    const filteredMessages = chatMessages.filter(
      chatMessage => chatMessage.message.sequence_number < sequenceNumber
    )

    setChatMessages(filteredMessages)

    handleSendMessage(editedContent, filteredMessages, false)
  }

  // const handleCreatePassiveMessages = async (messageContent: string, generatedText: string) => {
  //   // Assume a single chat session context, as the existing setup does.
  //   // This simplifies the example, not accounting for selecting different chats or sessions.
  //   let currentChat = selectedChat ? { ...selectedChat } : null;

  //   if (!currentChat) {
  //     console.error('No current chat selected. Unable to create passive messages.');
  //     return;
  //   }

  //   // Mockup chatMessage structure based on your existing code.
  //   // Adjust according to the actual structure of your ChatMessage type.
  //   const chatMessages = [
  //     {
  //       content: messageContent,
  //       type: 'user', // Assuming 'user' and 'assistant' types. Adjust as necessary.
  //       timestamp: new Date().toISOString(),
  //       // Add other necessary properties here.
  //     },
  //     {
  //       content: generatedText,
  //       type: 'assistant',
  //       timestamp: new Date().toISOString(),
  //       // Add other necessary properties here.
  //     },
  //   ];

  //   // Assuming newMessageImages and other arguments are not relevant for passive creation.
  //   // You may need to adjust this based on actual requirements and available data.
  //   const newMessageImages = []; // Adjust if images are relevant for your passive messages.
  //   const isRegeneration = false; // Assuming passive messages are not regenerations.
  //   const retrievedFileItems = []; // Adjust if file items are relevant for your passive messages.

  //   // Now call handleCreateMessages with the structured arguments.
  //   // Adjust the call according to the actual signature of handleCreateMessages.
  //   await handleCreateMessages(
  //     chatMessages,
  //     currentChat,
  //     profile, // Assuming 'profile' is available in your closure. Adjust as necessary.
  //     modelData, // This needs to be defined based on your context or omitted if not relevant.
  //     messageContent,
  //     generatedText,
  //     newMessageImages,
  //     isRegeneration,
  //     retrievedFileItems,
  //     setChatMessages, // Assuming this is a state setter function available in your closure.
  //     setChatFileItems, // Assuming this is relevant and available.
  //     setChatImages, // Assuming this is relevant and available.
  //     selectedAssistant // Assuming this is available in your closure. Adjust as necessary.
  //   );

  //   // Additional logic can be added here if necessary, e.g., post-message creation processing.
  // };

  return {
    chatInputRef,
    prompt,
    handleNewChat,
    handleSendMessage,
    handleFocusChatInput,
    handleStopMessage,
    handleSendEdit
  }
}
