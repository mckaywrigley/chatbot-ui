import { ChatbotUIContext } from "@/context/context"
import {
  PROFILE_CONTEXT_MAX,
  PROFILE_DISPLAY_NAME_MAX,
  PROFILE_USERNAME_MAX,
  PROFILE_USERNAME_MIN
} from "@/db/limits"
import { updateProfile } from "@/db/profile"
import { uploadProfileImage } from "@/db/storage/profile-images"
import { exportLocalStorageAsJSON } from "@/lib/export-old-data"
import { fetchOpenRouterModels } from "@/lib/models/fetch-models"
import { LLM_LIST_MAP } from "@/lib/models/llm/llm-list"
import { supabase } from "@/lib/supabase/browser-client"
import { cn } from "@/lib/utils"
import { OpenRouterLLM } from "@/types"
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconFileDownload,
  IconInfoCircle,
  IconLoader2,
  IconLogout,
  IconUser
} from "@tabler/icons-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { FC, useCallback, useContext, useRef, useState } from "react"
import { toast } from "sonner"
import { SIDEBAR_ICON_SIZE } from "../sidebar/sidebar-switcher"
import { Button } from "../ui/button"
import ImagePicker from "../ui/image-picker"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { LimitDisplay } from "../ui/limit-display"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "../ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { WithTooltip } from "../ui/with-tooltip"
import { ThemeSwitcher } from "./theme-switcher"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faVolume } from "@fortawesome/pro-regular-svg-icons"

interface ProfileSettingsProps {}

export const ProfileSettings: FC<ProfileSettingsProps> = ({}) => {
  const {
    profile,
    setProfile,
    envKeyMap,
    setAvailableHostedModels,
    setAvailableOpenRouterModels,
    availableOpenRouterModels
  } = useContext(ChatbotUIContext)

  const router = useRouter()

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(false)

  const [displayName, setDisplayName] = useState(profile?.display_name || "")
  const [username, setUsername] = useState(profile?.username || "")
  const [usernameAvailable, setUsernameAvailable] = useState(true)
  const [loadingUsername, setLoadingUsername] = useState(false)
  const [profileImageSrc, setProfileImageSrc] = useState(
    profile?.image_url || ""
  )
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileInstructions, setProfileInstructions] = useState(
    profile?.profile_context || ""
  )

  const [useAzureOpenai, setUseAzureOpenai] = useState(
    profile?.use_azure_openai
  )
  const [openaiAPIKey, setOpenaiAPIKey] = useState(
    profile?.openai_api_key || ""
  )
  const [openaiOrgID, setOpenaiOrgID] = useState(
    profile?.openai_organization_id || ""
  )
  const [azureOpenaiAPIKey, setAzureOpenaiAPIKey] = useState(
    profile?.azure_openai_api_key || ""
  )
  const [azureOpenaiEndpoint, setAzureOpenaiEndpoint] = useState(
    profile?.azure_openai_endpoint || ""
  )
  const [azureOpenai35TurboID, setAzureOpenai35TurboID] = useState(
    profile?.azure_openai_35_turbo_id || ""
  )
  const [azureOpenai45TurboID, setAzureOpenai45TurboID] = useState(
    profile?.azure_openai_45_turbo_id || ""
  )
  const [azureOpenai45VisionID, setAzureOpenai45VisionID] = useState(
    profile?.azure_openai_45_vision_id || ""
  )
  const [azureEmbeddingsID, setAzureEmbeddingsID] = useState(
    profile?.azure_openai_embeddings_id || ""
  )
  const [anthropicAPIKey, setAnthropicAPIKey] = useState(
    profile?.anthropic_api_key || ""
  )
  const [googleGeminiAPIKey, setGoogleGeminiAPIKey] = useState(
    profile?.google_gemini_api_key || ""
  )
  const [mistralAPIKey, setMistralAPIKey] = useState(
    profile?.mistral_api_key || ""
  )
  const [groqAPIKey, setGroqAPIKey] = useState(profile?.groq_api_key || "")
  const [perplexityAPIKey, setPerplexityAPIKey] = useState(
    profile?.perplexity_api_key || ""
  )

  const [openrouterAPIKey, setOpenrouterAPIKey] = useState(
    profile?.openrouter_api_key || ""
  )

  const [isPlayingVoiceAudio, setIsPlayingVoiceAudio] = useState(false)
  const [currentPlayingVoiceAudio, setCurrentPlayingVoiceAudio] =
    useState<string>(profile?.voice || "")
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
    return
  }

  const handleSave = async () => {
    if (!profile) return

    if (audioElement && isPlayingVoiceAudio) {
      audioElement.pause()
      audioElement.currentTime = 0
      setIsPlayingVoiceAudio(false)
    }

    let profileImageUrl = profile.image_url
    let profileImagePath = ""

    if (profileImageFile) {
      const { path, url } = await uploadProfileImage(profile, profileImageFile)
      profileImageUrl = url ?? profileImageUrl
      profileImagePath = path
    }

    const updatedProfile = await updateProfile(profile.id, {
      ...profile,
      display_name: displayName,
      username,
      profile_context: profileInstructions,
      image_url: profileImageUrl,
      image_path: profileImagePath,
      openai_api_key: openaiAPIKey,
      openai_organization_id: openaiOrgID,
      anthropic_api_key: anthropicAPIKey,
      google_gemini_api_key: googleGeminiAPIKey,
      mistral_api_key: mistralAPIKey,
      groq_api_key: groqAPIKey,
      perplexity_api_key: perplexityAPIKey,
      use_azure_openai: useAzureOpenai,
      azure_openai_api_key: azureOpenaiAPIKey,
      azure_openai_endpoint: azureOpenaiEndpoint,
      azure_openai_35_turbo_id: azureOpenai35TurboID,
      azure_openai_45_turbo_id: azureOpenai45TurboID,
      azure_openai_45_vision_id: azureOpenai45VisionID,
      azure_openai_embeddings_id: azureEmbeddingsID,
      openrouter_api_key: openrouterAPIKey,
      voice: currentPlayingVoiceAudio
    })

    setProfile(updatedProfile)

    toast.success("Profile updated!")

    const providers = [
      "openai",
      "google",
      "azure",
      "anthropic",
      "mistral",
      "groq",
      "perplexity",
      "openrouter"
    ]

    providers.forEach(async provider => {
      let providerKey: keyof typeof profile

      if (provider === "google") {
        providerKey = "google_gemini_api_key"
      } else if (provider === "azure") {
        providerKey = "azure_openai_api_key"
      } else {
        providerKey = `${provider}_api_key` as keyof typeof profile
      }

      const models = LLM_LIST_MAP[provider]
      const envKeyActive = envKeyMap[provider]

      if (!envKeyActive) {
        const hasApiKey = !!updatedProfile[providerKey]

        if (provider === "openrouter") {
          if (hasApiKey && availableOpenRouterModels.length === 0) {
            const openrouterModels: OpenRouterLLM[] =
              await fetchOpenRouterModels()
            setAvailableOpenRouterModels(prev => {
              const newModels = openrouterModels.filter(
                model =>
                  !prev.some(prevModel => prevModel.modelId === model.modelId)
              )
              return [...prev, ...newModels]
            })
          } else {
            setAvailableOpenRouterModels([])
          }
        } else {
          if (hasApiKey && Array.isArray(models)) {
            setAvailableHostedModels(prev => {
              const newModels = models.filter(
                model =>
                  !prev.some(prevModel => prevModel.modelId === model.modelId)
              )
              return [...prev, ...newModels]
            })
          } else if (!hasApiKey && Array.isArray(models)) {
            setAvailableHostedModels(prev =>
              prev.filter(model => !models.includes(model))
            )
          }
        }
      }
    })

    setIsOpen(false)
  }

  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout | null

    return (...args: any[]) => {
      const later = () => {
        if (timeout) clearTimeout(timeout)
        func(...args)
      }

      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  const checkUsernameAvailability = useCallback(
    debounce(async (username: string) => {
      if (!username) return

      if (username.length < PROFILE_USERNAME_MIN) {
        setUsernameAvailable(false)
        return
      }

      if (username.length > PROFILE_USERNAME_MAX) {
        setUsernameAvailable(false)
        return
      }

      const usernameRegex = /^[a-zA-Z0-9_]+$/
      if (!usernameRegex.test(username)) {
        setUsernameAvailable(false)
        alert(
          "Username must be letters, numbers, or underscores only - no other characters or spacing allowed."
        )
        return
      }

      setLoadingUsername(true)

      const response = await fetch(`/api/username/available`, {
        method: "POST",
        body: JSON.stringify({ username })
      })

      const data = await response.json()
      const isAvailable = data.isAvailable

      setUsernameAvailable(isAvailable)

      if (username === profile?.username) {
        setUsernameAvailable(true)
      }

      setLoadingUsername(false)
    }, 500),
    []
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  if (!profile) return null

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {profile.image_url ? (
          <Image
            className="mt-2 size-[35px] cursor-pointer rounded-full hover:opacity-50"
            src={profile.image_url + "?" + new Date().getTime()}
            height={35}
            width={35}
            alt={"Image"}
          />
        ) : (
          <div
            role="button"
            className="mt-4 flex size-[34px] cursor-pointer items-center justify-center"
          >
            <i className="fa-regular fa-face-smile relative right-0 top-0"></i>
          </div>
        )}
      </SheetTrigger>

      <SheetContent
        className="flex w-full flex-col justify-between xl:w-[450px]"
        side="userSetting"
        onKeyDown={handleKeyDown}
      >
        <div className="grow overflow-auto">
          <SheetHeader className="flex flex-row justify-between pr-[22px]">
            <SheetTitle className="flex items-center justify-between space-x-2">
              <div className="font-helvetica-now">User Settings</div>
            </SheetTitle>
            <Button
              variant="ghost2"
              tabIndex={-1}
              className="font-helvetica-now text-xs font-normal"
              size="logout"
              onClick={handleSignOut}
            >
              <IconLogout className="mr-1 font-normal" size={16} />
              Logout
            </Button>
          </SheetHeader>

          <Tabs defaultValue="profile">
            <TabsList className="bg-pixelspace-gray-80 mt-[22px] grid w-[202px] grid-cols-2">
              <TabsTrigger
                className="data-[state=active]:bg-pixelspace-gray-60 ml-1 h-[36px]"
                value="profile"
              >
                Profile
              </TabsTrigger>
              <TabsTrigger
                disabled
                className="data-[state=active]:bg-pixelspace-gray-60 mr-1 h-[36px]"
                value="keys"
              >
                API Keys
              </TabsTrigger>
            </TabsList>

            <TabsContent className="mt-4 space-y-4" value="profile">
              <div style={{ marginTop: 22 }} className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Label className="font-helvetica-now">Username</Label>

                  <div className="text-xs">
                    {username !== profile.username ? (
                      usernameAvailable ? (
                        <div className="text-green-500">AVAILABLE</div>
                      ) : (
                        <div className="text-red-500">UNAVAILABLE</div>
                      )
                    ) : null}
                  </div>
                </div>

                <div className="relative">
                  <Input
                    className="pr-10"
                    placeholder="Username..."
                    value={username}
                    onChange={e => {
                      setUsername(e.target.value)
                      checkUsernameAvailability(e.target.value)
                    }}
                    minLength={PROFILE_USERNAME_MIN}
                    maxLength={PROFILE_USERNAME_MAX}
                  />

                  {username !== profile.username ? (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      {loadingUsername ? (
                        <IconLoader2 className="animate-spin" />
                      ) : usernameAvailable ? (
                        <IconCircleCheckFilled className="text-green-500" />
                      ) : (
                        <IconCircleXFilled className="text-red-500" />
                      )}
                    </div>
                  ) : null}
                </div>

                <LimitDisplay
                  used={username.length}
                  limit={PROFILE_USERNAME_MAX}
                />
              </div>

              <div style={{ marginTop: 22 }} className="space-y-1">
                <Label className="font-helvetica-now">Profile Image</Label>

                <ImagePicker
                  src={profileImageSrc}
                  image={profileImageFile}
                  height={50}
                  width={50}
                  onSrcChange={setProfileImageSrc}
                  onImageChange={setProfileImageFile}
                />
              </div>

              <div style={{ marginTop: 22 }} className="space-y-1">
                <Label className="font-helvetica-now">Chat Display Name</Label>

                <Input
                  placeholder="Chat display name..."
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={PROFILE_DISPLAY_NAME_MAX}
                />
              </div>

              <div style={{ marginTop: 22 }} className="space-y-1">
                <Label className="font-helvetica-now text-sm">
                  What would you like the AI to know about you to provide better
                  responses?
                </Label>

                <TextareaAutosize
                  className={`bg-pixelspace-gray-70 border-pixelspace-gray-50 focus:border-pixelspace-gray-40 text-pixelspace-gray-20 w-full border p-3`}
                  value={profileInstructions}
                  onValueChange={setProfileInstructions}
                  placeholder="Profile context"
                  minRows={3}
                  maxRows={10}
                />

                <LimitDisplay
                  used={profileInstructions.length}
                  limit={PROFILE_CONTEXT_MAX}
                />
              </div>

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
            </TabsContent>

            <TabsContent className="mt-4 space-y-4" value="keys">
              <div className="mt-5 space-y-2">
                <Label className="font-helvetica-now flex items-center">
                  {useAzureOpenai
                    ? envKeyMap["azure"]
                      ? ""
                      : "Azure OpenAI API Key"
                    : envKeyMap["openai"]
                      ? ""
                      : "OpenAI API Key"}

                  <Button
                    className={cn(
                      "h-[18px] w-[150px] text-[11px]",
                      (useAzureOpenai && !envKeyMap["azure"]) ||
                        (!useAzureOpenai && !envKeyMap["openai"])
                        ? "ml-3"
                        : "mb-3"
                    )}
                    onClick={() => setUseAzureOpenai(!useAzureOpenai)}
                  >
                    {useAzureOpenai
                      ? "Switch To Standard OpenAI"
                      : "Switch To Azure OpenAI"}
                  </Button>
                </Label>

                {useAzureOpenai ? (
                  <>
                    {envKeyMap["azure"] ? (
                      <Label>Azure OpenAI API key set by admin.</Label>
                    ) : (
                      <Input
                        placeholder="Azure OpenAI API Key"
                        type="password"
                        value={azureOpenaiAPIKey}
                        onChange={e => setAzureOpenaiAPIKey(e.target.value)}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {envKeyMap["openai"] ? (
                      <Label>OpenAI API key set by admin.</Label>
                    ) : (
                      <Input
                        placeholder="OpenAI API Key"
                        type="password"
                        value={openaiAPIKey}
                        onChange={e => setOpenaiAPIKey(e.target.value)}
                      />
                    )}
                  </>
                )}
              </div>

              <div className="ml-8 space-y-3">
                {useAzureOpenai ? (
                  <>
                    {
                      <div className="space-y-1">
                        {envKeyMap["azure_openai_endpoint"] ? (
                          <Label className="text-xs">
                            Azure endpoint set by admin.
                          </Label>
                        ) : (
                          <>
                            <Label>Azure Endpoint</Label>

                            <Input
                              placeholder="https://your-endpoint.openai.azure.com"
                              value={azureOpenaiEndpoint}
                              onChange={e =>
                                setAzureOpenaiEndpoint(e.target.value)
                              }
                            />
                          </>
                        )}
                      </div>
                    }

                    {
                      <div className="space-y-1">
                        {envKeyMap["azure_gpt_35_turbo_name"] ? (
                          <Label className="text-xs">
                            Azure GPT-3.5 Turbo deployment name set by admin.
                          </Label>
                        ) : (
                          <>
                            <Label>Azure GPT-3.5 Turbo Deployment Name</Label>

                            <Input
                              placeholder="Azure GPT-3.5 Turbo Deployment Name"
                              value={azureOpenai35TurboID}
                              onChange={e =>
                                setAzureOpenai35TurboID(e.target.value)
                              }
                            />
                          </>
                        )}
                      </div>
                    }

                    {
                      <div className="space-y-1">
                        {envKeyMap["azure_gpt_45_turbo_name"] ? (
                          <Label className="text-xs">
                            Azure GPT-4.5 Turbo deployment name set by admin.
                          </Label>
                        ) : (
                          <>
                            <Label>Azure GPT-4.5 Turbo Deployment Name</Label>

                            <Input
                              placeholder="Azure GPT-4.5 Turbo Deployment Name"
                              value={azureOpenai45TurboID}
                              onChange={e =>
                                setAzureOpenai45TurboID(e.target.value)
                              }
                            />
                          </>
                        )}
                      </div>
                    }

                    {
                      <div className="space-y-1">
                        {envKeyMap["azure_gpt_45_vision_name"] ? (
                          <Label className="text-xs">
                            Azure GPT-4.5 Vision deployment name set by admin.
                          </Label>
                        ) : (
                          <>
                            <Label>Azure GPT-4.5 Vision Deployment Name</Label>

                            <Input
                              placeholder="Azure GPT-4.5 Vision Deployment Name"
                              value={azureOpenai45VisionID}
                              onChange={e =>
                                setAzureOpenai45VisionID(e.target.value)
                              }
                            />
                          </>
                        )}
                      </div>
                    }

                    {
                      <div className="space-y-1">
                        {envKeyMap["azure_embeddings_name"] ? (
                          <Label className="text-xs">
                            Azure Embeddings deployment name set by admin.
                          </Label>
                        ) : (
                          <>
                            <Label>Azure Embeddings Deployment Name</Label>

                            <Input
                              placeholder="Azure Embeddings Deployment Name"
                              value={azureEmbeddingsID}
                              onChange={e =>
                                setAzureEmbeddingsID(e.target.value)
                              }
                            />
                          </>
                        )}
                      </div>
                    }
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      {envKeyMap["openai_organization_id"] ? (
                        <Label className="text-xs">
                          OpenAI Organization ID set by admin.
                        </Label>
                      ) : (
                        <>
                          <Label>OpenAI Organization ID</Label>

                          <Input
                            placeholder="OpenAI Organization ID (optional)"
                            disabled={
                              !!process.env.NEXT_PUBLIC_OPENAI_ORGANIZATION_ID
                            }
                            type="password"
                            value={openaiOrgID}
                            onChange={e => setOpenaiOrgID(e.target.value)}
                          />
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-1">
                {envKeyMap["anthropic"] ? (
                  <Label>Anthropic API key set by admin.</Label>
                ) : (
                  <>
                    <Label>Anthropic API Key</Label>
                    <Input
                      placeholder="Anthropic API Key"
                      type="password"
                      value={anthropicAPIKey}
                      onChange={e => setAnthropicAPIKey(e.target.value)}
                    />
                  </>
                )}
              </div>

              <div className="space-y-1">
                {envKeyMap["google"] ? (
                  <Label>Google Gemini API key set by admin.</Label>
                ) : (
                  <>
                    <Label>Google Gemini API Key</Label>
                    <Input
                      placeholder="Google Gemini API Key"
                      type="password"
                      value={googleGeminiAPIKey}
                      onChange={e => setGoogleGeminiAPIKey(e.target.value)}
                    />
                  </>
                )}
              </div>

              <div className="space-y-1">
                {envKeyMap["mistral"] ? (
                  <Label>Mistral API key set by admin.</Label>
                ) : (
                  <>
                    <Label>Mistral API Key</Label>
                    <Input
                      placeholder="Mistral API Key"
                      type="password"
                      value={mistralAPIKey}
                      onChange={e => setMistralAPIKey(e.target.value)}
                    />
                  </>
                )}
              </div>

              <div className="space-y-1">
                {envKeyMap["groq"] ? (
                  <Label>Groq API key set by admin.</Label>
                ) : (
                  <>
                    <Label>Groq API Key</Label>
                    <Input
                      placeholder="Groq API Key"
                      type="password"
                      value={groqAPIKey}
                      onChange={e => setGroqAPIKey(e.target.value)}
                    />
                  </>
                )}
              </div>

              <div className="space-y-1">
                {envKeyMap["perplexity"] ? (
                  <Label>Perplexity API key set by admin.</Label>
                ) : (
                  <>
                    <Label>Perplexity API Key</Label>
                    <Input
                      placeholder="Perplexity API Key"
                      type="password"
                      value={perplexityAPIKey}
                      onChange={e => setPerplexityAPIKey(e.target.value)}
                    />
                  </>
                )}
              </div>

              <div className="space-y-1">
                {envKeyMap["openrouter"] ? (
                  <Label>OpenRouter API key set by admin.</Label>
                ) : (
                  <>
                    <Label>OpenRouter API Key</Label>
                    <Input
                      placeholder="OpenRouter API Key"
                      type="password"
                      value={openrouterAPIKey}
                      onChange={e => setOpenrouterAPIKey(e.target.value)}
                    />
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 flex items-center">
          {/* <div className="flex items-center space-x-1">
            <WithTooltip
              display={
                <div>
                  Download Chatbot UI 1.0 data as JSON. Import coming soon!
                </div>
              }
              trigger={
                <i
                  style={{ fontSize: 32 }}
                  className="fa-light fa-file-arrow-down text-pixelspace-gray-20 hover:text-pixelspace-gray-10 "
                ></i>
              }
            />
          </div> */}

          <div className="ml-auto space-x-2">
            <Button
              size="cancelPrompt"
              variant="cancelPrompt"
              onClick={() => {
                if (audioElement && isPlayingVoiceAudio) {
                  audioElement.pause()
                  audioElement.currentTime = 0
                  setIsPlayingVoiceAudio(false)
                  setCurrentPlayingVoiceAudio(profile?.voice || "")
                }
                setIsOpen(false)
              }}
            >
              Cancel
            </Button>

            <Button
              size="savePrompt"
              variant="savePrompt"
              ref={buttonRef}
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
