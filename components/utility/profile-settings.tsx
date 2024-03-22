"use client"

import { updateProfile } from "@/actions/profiles"
import { ChatbotUIContext } from "@/context/context"
import { PROFILE_CONTEXT_MAX, PROFILE_DISPLAY_NAME_MAX } from "@/db/limits"
import { uploadProfileImage } from "@/db/storage/profile-images"
import { Tables } from "@/supabase/types"
import { OpenRouterLLM } from "@/types"
import { exportLocalStorageAsJSON } from "@/utils/export-old-data"
import { fetchOpenRouterModels } from "@/utils/models/fetch-models"
import { LLM_LIST_MAP } from "@/utils/models/llm/llm-list"
import { cn } from "@/utils/utils"
import { IconFileDownload, IconUser } from "@tabler/icons-react"
import Image from "next/image"
import { FC, useContext, useState } from "react"
import { LogoutButton } from "../logout-button"
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
import { UsernameInput } from "../username-input"
import { ThemeSwitcher } from "./theme-switcher"

interface ProfileSettingsProps {
  profile: Tables<"profiles">
}

export const ProfileSettings: FC<ProfileSettingsProps> = ({ profile }) => {
  const {
    envKeyMap,
    setAvailableHostedModels,
    setAvailableOpenRouterModels,
    availableOpenRouterModels
  } = useContext(ChatbotUIContext)

  const [isOpen, setIsOpen] = useState(false)
  const [profileImageSrc, setProfileImageSrc] = useState(
    profile?.image_url || ""
  )
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [useAzureOpenai, setUseAzureOpenai] = useState(profile.use_azure_openai)
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [username, setUsername] = useState(profile.username)
  const [profileInstructions, setProfileInstructions] = useState(
    profile.profile_context
  )
  const [openaiAPIKey, setOpenaiAPIKey] = useState(profile.openai_api_key)
  const [openaiOrgID, setOpenaiOrgID] = useState(profile.openai_organization_id)
  const [anthropicAPIKey, setAnthropicAPIKey] = useState(
    profile.anthropic_api_key
  )
  const [googleGeminiAPIKey, setGoogleGeminiAPIKey] = useState(
    profile.google_gemini_api_key
  )
  const [mistralAPIKey, setMistralAPIKey] = useState(profile.mistral_api_key)
  const [groqAPIKey, setGroqAPIKey] = useState(profile.groq_api_key)
  const [perplexityAPIKey, setPerplexityAPIKey] = useState(
    profile.perplexity_api_key
  )
  const [azureOpenaiAPIKey, setAzureOpenaiAPIKey] = useState(
    profile.azure_openai_api_key
  )
  const [azureOpenaiEndpoint, setAzureOpenaiEndpoint] = useState(
    profile.azure_openai_endpoint
  )
  const [azureOpenai35TurboID, setAzureOpenai35TurboID] = useState(
    profile.azure_openai_35_turbo_id
  )
  const [azureOpenai45TurboID, setAzureOpenai45TurboID] = useState(
    profile.azure_openai_45_turbo_id
  )
  const [azureOpenai45VisionID, setAzureOpenai45VisionID] = useState(
    profile.azure_openai_45_vision_id
  )
  const [azureEmbeddingsID, setAzureEmbeddingsID] = useState(
    profile.azure_openai_embeddings_id
  )
  const [openrouterAPIKey, setOpenrouterAPIKey] = useState(
    profile.openrouter_api_key
  )

  const handleSave = async () => {
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
      username: username,
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
      openrouter_api_key: openrouterAPIKey
    })

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      handleSave()
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {profile.image_url ? (
          <Image
            className="mt-2 size-[34px] cursor-pointer rounded hover:opacity-50"
            src={profile.image_url + "?" + new Date().getTime()}
            height={34}
            width={34}
            alt={"Image"}
          />
        ) : (
          <Button size="icon" variant="ghost">
            <IconUser size={SIDEBAR_ICON_SIZE} />
          </Button>
        )}
      </SheetTrigger>

      <SheetContent
        className="flex flex-col justify-between"
        side="left"
        onKeyDown={handleKeyDown}
      >
        <div className="grow overflow-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between space-x-2">
              <div>User Settings</div>

              <LogoutButton />
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="profile">
            <TabsList className="mt-4 grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="keys">API Keys</TabsTrigger>
            </TabsList>

            <TabsContent className="mt-4 space-y-4" value="profile">
              <UsernameInput profile={profile} />

              <div className="space-y-1">
                <Label>Profile Image</Label>

                <ImagePicker
                  src={profileImageSrc}
                  image={profileImageFile}
                  height={50}
                  width={50}
                  onSrcChange={setProfileImageSrc}
                  onImageChange={setProfileImageFile}
                />
              </div>

              <div className="space-y-1">
                <Label>Chat Display Name</Label>

                <Input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Chat display name..."
                  maxLength={PROFILE_DISPLAY_NAME_MAX}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">
                  What would you like the AI to know about you to provide better
                  responses?
                </Label>

                <TextareaAutosize
                  value={profileInstructions}
                  onValueChange={value => setProfileInstructions(value)}
                  placeholder="Profile context... (optional)"
                  minRows={6}
                  maxRows={10}
                />

                <LimitDisplay
                  used={profileInstructions.length}
                  limit={PROFILE_CONTEXT_MAX}
                />
              </div>
            </TabsContent>

            <TabsContent className="mt-4 space-y-4" value="keys">
              <div className="mt-5 space-y-2">
                <Label className="flex items-center">
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
                        value={azureOpenaiAPIKey || ""}
                        onChange={e => setAzureOpenaiAPIKey(e.target.value)}
                        placeholder="Azure OpenAI API Key"
                        type="password"
                      />
                    )}
                  </>
                ) : (
                  <>
                    {envKeyMap["openai"] ? (
                      <Label>OpenAI API key set by admin.</Label>
                    ) : (
                      <Input
                        value={openaiAPIKey || ""}
                        onChange={e => setOpenaiAPIKey(e.target.value)}
                        placeholder="OpenAI API Key"
                        type="password"
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
                              value={azureOpenaiEndpoint || ""}
                              onChange={e =>
                                setAzureOpenaiEndpoint(e.target.value)
                              }
                              placeholder="https://your-endpoint.openai.azure.com"
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
                              value={azureOpenai35TurboID || ""}
                              onChange={e =>
                                setAzureOpenai35TurboID(e.target.value)
                              }
                              placeholder="Azure GPT-3.5 Turbo Deployment Name"
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
                              value={azureOpenai45TurboID || ""}
                              onChange={e =>
                                setAzureOpenai45TurboID(e.target.value)
                              }
                              placeholder="Azure GPT-4.5 Turbo Deployment Name"
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
                              value={azureOpenai45VisionID || ""}
                              onChange={e =>
                                setAzureOpenai45VisionID(e.target.value)
                              }
                              placeholder="Azure GPT-4.5 Vision Deployment Name"
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
                              value={azureEmbeddingsID || ""}
                              onChange={e =>
                                setAzureEmbeddingsID(e.target.value)
                              }
                              placeholder="Azure Embeddings Deployment Name"
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
                            value={openaiOrgID || ""}
                            onChange={e => setOpenaiOrgID(e.target.value)}
                            placeholder="OpenAI Organization ID (optional)"
                            disabled={
                              !!process.env.NEXT_PUBLIC_OPENAI_ORGANIZATION_ID
                            }
                            type="password"
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
                      value={anthropicAPIKey || ""}
                      onChange={e => setAnthropicAPIKey(e.target.value)}
                      placeholder="Anthropic API Key"
                      type="password"
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
                      value={googleGeminiAPIKey || ""}
                      onChange={e => setGoogleGeminiAPIKey(e.target.value)}
                      placeholder="Google Gemini API Key"
                      type="password"
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
                      value={mistralAPIKey || ""}
                      onChange={e => setMistralAPIKey(e.target.value)}
                      placeholder="Mistral API Key"
                      type="password"
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
                      value={groqAPIKey || ""}
                      onChange={e => setGroqAPIKey(e.target.value)}
                      placeholder="Groq API Key"
                      type="password"
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
                      value={perplexityAPIKey || ""}
                      onChange={e => setPerplexityAPIKey(e.target.value)}
                      placeholder="Perplexity API Key"
                      type="password"
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
                      value={openrouterAPIKey || ""}
                      onChange={e => setOpenrouterAPIKey(e.target.value)}
                      placeholder="OpenRouter API Key"
                      type="password"
                    />
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 flex items-center">
          <div className="flex items-center space-x-1">
            <ThemeSwitcher />

            <WithTooltip
              display={
                <div>
                  Download Chatbot UI 1.0 data as JSON. Import coming soon!
                </div>
              }
              trigger={
                <IconFileDownload
                  className="cursor-pointer hover:opacity-50"
                  size={32}
                  onClick={exportLocalStorageAsJSON}
                />
              }
            />
          </div>

          <div className="ml-auto space-x-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>

            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
