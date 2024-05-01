import { ChatbotUIContext } from "@/context/context"
import { getChatById } from "@/db/chats"
import { deleteMessagesIncludingAndAfter } from "@/db/messages"
import { buildFinalMessages } from "@/lib/build-prompt"
import { Tables } from "@/supabase/types"
import { ChatMessage, ChatPayload } from "@/types"
import { useRouter } from "next/navigation"
import { useContext, useEffect, useRef } from "react"
import {
  createTempMessages,
  handleCreateAssistantMessage,
  handleCreateChat,
  handleCreateMessages,
  handleRetrieval,
  processResponse
} from "../chat-helpers"
import { StudyState } from "@/lib/studyStates"

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
    isPromptPickerOpen,
    isFilePickerOpen,
    isToolPickerOpen,
    chatStudyState,
    setChatStudyState,
    topicDescription,
    setTopicDescription,
    setChatRecallMetadata,
    chatRecallMetadata
  } = useContext(ChatbotUIContext)

  const chatInputRef = useRef<HTMLTextAreaElement>(null)

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

    setSelectedTools([])
    setToolInUse("none")

    setChatStudyState("topic_creation")

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

      let payload: ChatPayload = {
        chatSettings: chatSettings!,
        workspaceInstructions: selectedWorkspace!.instructions || "",
        chatMessages: isRegeneration
          ? [...chatMessages]
          : [...chatMessages, tempUserChatMessage],
        assistant: selectedChat?.assistant_id ? selectedAssistant : null,
        messageFileItems: retrievedFileItems,
        chatFileItems: chatFileItems
      }

      let generatedText = ""

      const formattedMessages = await buildFinalMessages(
        payload,
        profile!,
        chatImages
      )

      let response: Response

      const formattedMessagesWithoutSystem = formattedMessages.slice(1)

      response = await fetch("/api/chat/functions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: formattedMessagesWithoutSystem,
          chatId: currentChat?.id,
          chatStudyState,
          topicDescription,
          chatRecallMetadata
        })
      })

      const newStudyState = response.headers.get(
        "NEW-STUDY-STATE"
      ) as StudyState

      if (newStudyState) {
        setChatStudyState(newStudyState)
        if (newStudyState === "topic_updated") {
          const newTopicContent = await getChatById(currentChat!.id)
          const topicDescription = newTopicContent!.topic_description || "" // Provide a default value if topicDescription is null
          setTopicDescription(topicDescription)
          // remove files from chat
          setChatFiles([])
          setNewMessageFiles([])
          setShowFilesDisplay(false)
        }
      }

      const score = response.headers.get("SCORE")
      if (score) {
        // there will be a DUE-DATE-FROM-NOW
        const dueDateFromNow = response.headers.get("DUE-DATE-FROM-NOW")

        setChatRecallMetadata({
          score: parseInt(score),
          dueDateFromNow: dueDateFromNow!
        })
      }

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
        const updatedChat = await getChatById(currentChat.id)

        if (updatedChat) {
          setChats(prevChats => {
            const updatedChats = prevChats.map(prevChat =>
              prevChat.id === updatedChat.id ? updatedChat : prevChat
            )

            return updatedChats
          })
        }
      }

      await handleCreateMessages(
        chatMessages,
        currentChat,
        profile!,
        { modelId: "llama2-uncensored:latest" },
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
      console.log({ error })
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

  const handleStartTutorial = async () => {
    setIsGenerating(true)
    setChatStudyState("tutorial_hide_input")
    localStorage.setItem("tutorialDone", "true")

    const messageContent = `👋 Hello! I'm your AI Study Mentor.
I'm here to boost your learning by assisting with creating a topic study sheet and guiding you through optimally spaced free recall study sessions.
This tutorial will walk you through how to craft a revision topic.
You'll find topics listed in the panel on the left side of the chat window. 👈
Open the panel, and you'll see "The Solar System" as our example topic for this tutorial.
Please click 'Next' below to proceed with the tutorial.`

    const topic_description = `### Basic overview of the Solar System
- **Components:** Consists of the Sun, eight planets, their moons, dwarf planets, asteroids, comets, and various other objects.
- **Formation:** Formed about 4.6 billion years ago from the gravitational collapse of a giant molecular cloud.

### The Sun
- **Type:** G-type main-sequence star (G2V)
- **Composition:** About 74% hydrogen, 24% helium, and other elements.
- **Significance:** The Sun is the source of energy for all life on Earth and drives Earth’s climate and weather.

### The Planets
- **Inner Planets (Terrestrial planets):** Mercury, Venus, Earth, and Mars. These are rocky and have relatively few moons.
- **Outer Planets (Gas giants and ice giants):** Jupiter and Saturn are gas giants, made mostly of hydrogen and helium. Uranus and Neptune are ice giants, with more ices such as water, ammonia, and methane.

### Dwarf Planets
- **Examples:** Pluto, Eris, Haumea, Makemake, and Ceres.
- **Characteristics:** Orbit the Sun, have enough mass for their gravity to make them nearly round, but have not cleared their orbital paths of other debris.

### Asteroids and Comets
- **Asteroids:** Primarily found in the asteroid belt between Mars and Jupiter, made of rock and metal.
- **Comets:** Composed of ice and dust, often with highly elliptical orbits, showing visible atmospheres (comas) and tails when near the Sun.`

    try {
      setUserInput("")
      setIsGenerating(true)
      setIsPromptPickerOpen(false)
      setIsFilePickerOpen(false)
      setNewMessageImages([])

      const currentChat = await handleCreateChat(
        chatSettings!,
        profile!,
        selectedWorkspace!,
        messageContent,
        selectedAssistant!,
        newMessageFiles,
        setSelectedChat,
        setChats,
        setChatFiles,
        true,
        topic_description
      )

      await handleCreateAssistantMessage(
        chatMessages,
        currentChat,
        profile!,
        messageContent,
        setChatMessages
      )

      setIsGenerating(false)
      setFirstTokenReceived(false)
    } catch (error) {
      console.log({ error })
      setIsGenerating(false)
      setFirstTokenReceived(false)
      setUserInput(messageContent)
    }
  }

  return {
    chatInputRef,
    prompt,
    handleNewChat,
    handleSendMessage,
    handleFocusChatInput,
    handleStopMessage,
    handleSendEdit,
    handleStartTutorial
  }
}
