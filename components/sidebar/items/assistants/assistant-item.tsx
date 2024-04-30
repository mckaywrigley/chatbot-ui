import { ChatSettingsForm } from "@/components/ui/chat-settings-form"
import ImagePicker from "@/components/ui/image-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChatbotUIContext } from "@/context/context"
import { ASSISTANT_DESCRIPTION_MAX, ASSISTANT_NAME_MAX } from "@/db/limits"
import { Tables } from "@/supabase/types"
import { IconInfoCircle, IconRobotFace } from "@tabler/icons-react"
import Image from "next/image"
import { FC, useContext, useEffect, useState } from "react"
import profile from "react-syntax-highlighter/dist/esm/languages/hljs/profile"
import { SidebarItem } from "../all/sidebar-display-item"
import { AssistantRetrievalSelect } from "./assistant-retrieval-select"
import { AssistantToolSelect } from "./assistant-tool-select"
import { WithTooltip } from "@/components/ui/with-tooltip"
import { Button } from "@/components/ui/button"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faVolume } from "@fortawesome/pro-regular-svg-icons"

interface AssistantItemProps {
  assistant: Tables<"assistants">
}

export const AssistantItem: FC<AssistantItemProps> = ({ assistant }) => {
  const { selectedWorkspace, assistantImages } = useContext(ChatbotUIContext)

  const [name, setName] = useState(assistant.name)
  const [isTyping, setIsTyping] = useState(false)
  const [description, setDescription] = useState(assistant.description)
  const [assistantChatSettings, setAssistantChatSettings] = useState({
    model: assistant.model,
    prompt: assistant.prompt,
    temperature: assistant.temperature,
    contextLength: assistant.context_length,
    includeProfileContext: assistant.include_profile_context,
    includeWorkspaceInstructions: assistant.include_workspace_instructions,
    voice: assistant.voice
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imageLink, setImageLink] = useState("")

  const [isPlayingVoiceAudio, setIsPlayingVoiceAudio] = useState(false)
  const [currentPlayingVoiceAudio, setCurrentPlayingVoiceAudio] =
    useState<string>(assistant.voice)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  )

  const handleAudioButtonClick = (audio: string) => {
    if (
      audioElement &&
      isPlayingVoiceAudio &&
      currentPlayingVoiceAudio === audio
    ) {
      // If the same audio is already playing, pause it
      audioElement.pause()
      setIsPlayingVoiceAudio(false)
    } else {
      // If a different audio is selected or no audio is playing, play the new audio
      if (audioElement) {
        // Pause the currently playing audio if any
        audioElement.pause()
      }

      // Set up a new audio element for the selected audio
      const audioUrl = `https://cdn.openai.com/API/docs/audio/${audio}.wav`
      const audioEl = new Audio(audioUrl)
      audioEl.addEventListener("ended", () => handleAudioEnded(audio))
      setAudioElement(audioEl)
      audioEl.play()
      setIsPlayingVoiceAudio(true)
    }
    setCurrentPlayingVoiceAudio(audio)
  }

  const handleAudioEnded = (audio: string) => {
    // When audio ends, reset states
    setIsPlayingVoiceAudio(false)
    setCurrentPlayingVoiceAudio(audio)
  }

  useEffect(() => {
    const assistantImage =
      assistantImages.find(image => image.path === assistant.image_path)
        ?.base64 || ""
    setImageLink(assistantImage)
  }, [assistant, assistantImages])

  const handleFileSelect = (
    file: Tables<"files">,
    setSelectedAssistantFiles: React.Dispatch<
      React.SetStateAction<Tables<"files">[]>
    >
  ) => {
    setSelectedAssistantFiles(prevState => {
      const isFileAlreadySelected = prevState.find(
        selectedFile => selectedFile.id === file.id
      )

      if (isFileAlreadySelected) {
        return prevState.filter(selectedFile => selectedFile.id !== file.id)
      } else {
        return [...prevState, file]
      }
    })
  }

  const handleCollectionSelect = (
    collection: Tables<"collections">,
    setSelectedAssistantCollections: React.Dispatch<
      React.SetStateAction<Tables<"collections">[]>
    >
  ) => {
    setSelectedAssistantCollections(prevState => {
      const isCollectionAlreadySelected = prevState.find(
        selectedCollection => selectedCollection.id === collection.id
      )

      if (isCollectionAlreadySelected) {
        return prevState.filter(
          selectedCollection => selectedCollection.id !== collection.id
        )
      } else {
        return [...prevState, collection]
      }
    })
  }

  const handleToolSelect = (
    tool: Tables<"tools">,
    setSelectedAssistantTools: React.Dispatch<
      React.SetStateAction<Tables<"tools">[]>
    >
  ) => {
    setSelectedAssistantTools(prevState => {
      const isToolAlreadySelected = prevState.find(
        selectedTool => selectedTool.id === tool.id
      )

      if (isToolAlreadySelected) {
        return prevState.filter(selectedTool => selectedTool.id !== tool.id)
      } else {
        return [...prevState, tool]
      }
    })
  }

  if (!profile) return null
  if (!selectedWorkspace) return null

  return (
    <SidebarItem
      item={assistant}
      contentType="assistants"
      isTyping={isTyping}
      icon={
        imageLink ? (
          <Image
            style={{ width: "30px", height: "30px" }}
            className="rounded"
            src={imageLink}
            alt={assistant.name}
            width={30}
            height={30}
          />
        ) : (
          <IconRobotFace
            className="bg-primary text-secondary border-primary rounded border-[1px] p-1"
            size={30}
          />
        )
      }
      updateState={{
        image: selectedImage,
        user_id: assistant.user_id,
        name,
        description,
        include_profile_context: assistantChatSettings.includeProfileContext,
        include_workspace_instructions:
          assistantChatSettings.includeWorkspaceInstructions,
        context_length: assistantChatSettings.contextLength,
        model: assistantChatSettings.model,
        image_path: assistant.image_path,
        prompt: assistantChatSettings.prompt,
        temperature: assistantChatSettings.temperature,
        voice: currentPlayingVoiceAudio
      }}
      renderInputs={(renderState: {
        startingAssistantFiles: Tables<"files">[]
        setStartingAssistantFiles: React.Dispatch<
          React.SetStateAction<Tables<"files">[]>
        >
        selectedAssistantFiles: Tables<"files">[]
        setSelectedAssistantFiles: React.Dispatch<
          React.SetStateAction<Tables<"files">[]>
        >
        startingAssistantCollections: Tables<"collections">[]
        setStartingAssistantCollections: React.Dispatch<
          React.SetStateAction<Tables<"collections">[]>
        >
        selectedAssistantCollections: Tables<"collections">[]
        setSelectedAssistantCollections: React.Dispatch<
          React.SetStateAction<Tables<"collections">[]>
        >
        startingAssistantTools: Tables<"tools">[]
        setStartingAssistantTools: React.Dispatch<
          React.SetStateAction<Tables<"tools">[]>
        >
        selectedAssistantTools: Tables<"tools">[]
        setSelectedAssistantTools: React.Dispatch<
          React.SetStateAction<Tables<"tools">[]>
        >
      }) => (
        <>
          <div
            style={{ marginTop: 22 }}
            className="space-y-1 overflow-x-hidden"
          >
            <Label>Name</Label>

            <Input
              placeholder="Assistant name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={ASSISTANT_NAME_MAX}
            />
          </div>

          <div style={{ marginTop: 22 }} className="space-y-1 pt-2">
            <Label>Description</Label>

            <Input
              placeholder="Assistant description..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={ASSISTANT_DESCRIPTION_MAX}
            />
          </div>

          <div style={{ marginTop: 22 }} className="space-y-1">
            <Label>Image</Label>

            <ImagePicker
              src={imageLink}
              image={selectedImage}
              onSrcChange={setImageLink}
              onImageChange={setSelectedImage}
              width={60}
              height={60}
            />
          </div>

          <ChatSettingsForm
            chatSettings={assistantChatSettings as any}
            onChangeChatSettings={setAssistantChatSettings}
            useAdvancedDropdown={true}
          />

          <div className="space-y-1 pt-2">
            <Label>Files & Collections</Label>

            <AssistantRetrievalSelect
              selectedAssistantRetrievalItems={
                [
                  ...renderState.selectedAssistantFiles,
                  ...renderState.selectedAssistantCollections
                ].length === 0
                  ? [
                      ...renderState.startingAssistantFiles,
                      ...renderState.startingAssistantCollections
                    ]
                  : [
                      ...renderState.startingAssistantFiles.filter(
                        startingFile =>
                          ![
                            ...renderState.selectedAssistantFiles,
                            ...renderState.selectedAssistantCollections
                          ].some(
                            selectedFile => selectedFile.id === startingFile.id
                          )
                      ),
                      ...renderState.selectedAssistantFiles.filter(
                        selectedFile =>
                          !renderState.startingAssistantFiles.some(
                            startingFile => startingFile.id === selectedFile.id
                          )
                      ),
                      ...renderState.startingAssistantCollections.filter(
                        startingCollection =>
                          ![
                            ...renderState.selectedAssistantFiles,
                            ...renderState.selectedAssistantCollections
                          ].some(
                            selectedCollection =>
                              selectedCollection.id === startingCollection.id
                          )
                      ),
                      ...renderState.selectedAssistantCollections.filter(
                        selectedCollection =>
                          !renderState.startingAssistantCollections.some(
                            startingCollection =>
                              startingCollection.id === selectedCollection.id
                          )
                      )
                    ]
              }
              onAssistantRetrievalItemsSelect={item =>
                "type" in item
                  ? handleFileSelect(
                      item,
                      renderState.setSelectedAssistantFiles
                    )
                  : handleCollectionSelect(
                      item,
                      renderState.setSelectedAssistantCollections
                    )
              }
            />
          </div>

          <div className="space-y-1">
            <Label>Tools</Label>

            <AssistantToolSelect
              selectedAssistantTools={
                renderState.selectedAssistantTools.length === 0
                  ? renderState.startingAssistantTools
                  : [
                      ...renderState.startingAssistantTools.filter(
                        startingTool =>
                          !renderState.selectedAssistantTools.some(
                            selectedTool => selectedTool.id === startingTool.id
                          )
                      ),
                      ...renderState.selectedAssistantTools.filter(
                        selectedTool =>
                          !renderState.startingAssistantTools.some(
                            startingTool => startingTool.id === selectedTool.id
                          )
                      )
                    ]
              }
              onAssistantToolsSelect={tool =>
                handleToolSelect(tool, renderState.setSelectedAssistantTools)
              }
            />
          </div>

          <div className="space-y-1">
            <div style={{ marginTop: 22 }} className="flex flex-col">
              <div className="relative flex flex-row gap-2 py-1">
                <Label className="font-helvetica-now">Voice</Label>
                <WithTooltip
                  delayDuration={0}
                  display={
                    <div className="w-[400px] p-3">
                      Press the button to hear the voice.
                    </div>
                  }
                  trigger={
                    <IconInfoCircle
                      className="cursor-hover:opacity-50"
                      size={16}
                    />
                  }
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <div>
                  <Button
                    size="voice"
                    variant={
                      currentPlayingVoiceAudio === "alloy"
                        ? "voiceSelected"
                        : "voice"
                    }
                    onClick={() => handleAudioButtonClick("alloy")}
                  >
                    {isPlayingVoiceAudio &&
                      currentPlayingVoiceAudio === "alloy" && (
                        <FontAwesomeIcon
                          className="text-pixelspace-gray-20 hover:text-pixelspace-gray-3"
                          icon={faVolume}
                        />
                      )}
                    Alloy
                  </Button>
                </div>
                <div>
                  <Button
                    size="voice"
                    variant={
                      currentPlayingVoiceAudio === "echo"
                        ? "voiceSelected"
                        : "voice"
                    }
                    onClick={() => handleAudioButtonClick("echo")}
                  >
                    {isPlayingVoiceAudio &&
                      currentPlayingVoiceAudio === "echo" && (
                        <FontAwesomeIcon
                          className="text-pixelspace-gray-20 hover:text-pixelspace-gray-3"
                          icon={faVolume}
                        />
                      )}
                    Echo
                  </Button>
                </div>

                <div>
                  <Button
                    size="voice"
                    variant={
                      currentPlayingVoiceAudio === "fable"
                        ? "voiceSelected"
                        : "voice"
                    }
                    onClick={() => handleAudioButtonClick("fable")}
                  >
                    {isPlayingVoiceAudio &&
                      currentPlayingVoiceAudio === "fable" && (
                        <FontAwesomeIcon
                          className="text-pixelspace-gray-20 hover:text-pixelspace-gray-3"
                          icon={faVolume}
                        />
                      )}
                    Fable
                  </Button>
                </div>
                <div>
                  <Button
                    size="voice"
                    variant={
                      currentPlayingVoiceAudio === "onyx"
                        ? "voiceSelected"
                        : "voice"
                    }
                    onClick={() => handleAudioButtonClick("onyx")}
                  >
                    {isPlayingVoiceAudio &&
                      currentPlayingVoiceAudio === "onyx" && (
                        <FontAwesomeIcon
                          className="text-pixelspace-gray-20 hover:text-pixelspace-gray-3"
                          icon={faVolume}
                        />
                      )}
                    Onyx
                  </Button>
                </div>
                <div>
                  <Button
                    size="voice"
                    variant={
                      currentPlayingVoiceAudio === "shimmer"
                        ? "voiceSelected"
                        : "voice"
                    }
                    onClick={() => handleAudioButtonClick("shimmer")}
                  >
                    {isPlayingVoiceAudio &&
                      currentPlayingVoiceAudio === "shimmer" && (
                        <FontAwesomeIcon
                          className="text-pixelspace-gray-20 hover:text-pixelspace-gray-3"
                          icon={faVolume}
                        />
                      )}
                    Shimmer
                  </Button>
                </div>
                <div>
                  <Button
                    size="voice"
                    variant={
                      currentPlayingVoiceAudio === "nova"
                        ? "voiceSelected"
                        : "voice"
                    }
                    onClick={() => handleAudioButtonClick("nova")}
                  >
                    {isPlayingVoiceAudio &&
                      currentPlayingVoiceAudio === "nova" && (
                        <FontAwesomeIcon
                          className="text-pixelspace-gray-20 hover:text-pixelspace-gray-3"
                          icon={faVolume}
                        />
                      )}
                    Nova
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    />
  )
}
