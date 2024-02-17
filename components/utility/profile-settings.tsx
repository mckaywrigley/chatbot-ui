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
import { FC, useContext, useRef, useState } from "react"
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

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [profileImageSrc, setProfileImageSrc] = useState(
    profile?.image_url || ""
  )
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [useAzureOpenai, setUseAzureOpenai] = useState(profile.use_azure_openai)

  const handleSave = async (formData: FormData) => {
    let profileImageUrl = profile.image_url
    let profileImagePath = ""
    if (profileImageFile) {
      const { path, url } = await uploadProfileImage(profile, profileImageFile)
      profileImageUrl = url ?? profileImageUrl
      profileImagePath = path
    }

    const updatedProfile = await updateProfile(profile.id, {
      ...profile,
      display_name: formData.get("displayName") as string,
      username: formData.get("username") as string,
      profile_context: formData.get("profileInstructions") as string,
      image_url: formData.get("profileImageUrl") as string,
      image_path: formData.get("profileImagePath") as string,
      openai_api_key: formData.get("openaiAPIKey") as string,
      openai_organization_id: formData.get("openaiOrgID") as string,
      anthropic_api_key: formData.get("anthropicAPIKey") as string,
      google_gemini_api_key: formData.get("googleGeminiAPIKey") as string,
      mistral_api_key: formData.get("mistralAPIKey") as string,
      perplexity_api_key: formData.get("perplexityAPIKey") as string,
      use_azure_openai: formData.get("useAzureOpenai") === "true",
      azure_openai_api_key: formData.get("azureOpenaiAPIKey") as string,
      azure_openai_endpoint: formData.get("azureOpenaiEndpoint") as string,
      azure_openai_35_turbo_id: formData.get("azureOpenai35TurboID") as string,
      azure_openai_45_turbo_id: formData.get("azureOpenai45TurboID") as string,
      azure_openai_45_vision_id: formData.get(
        "azureOpenai45VisionID"
      ) as string,
      azure_openai_embeddings_id: formData.get("azureEmbeddingsID") as string,
      openrouter_api_key: formData.get("openrouterAPIKey") as string
    })

    const providers = [
      "openai",
      "google",
      "azure",
      "anthropic",
      "mistral",
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
      buttonRef.current?.click()
    }
  }

  return (
    <form action={async (formData: FormData) => await handleSave(formData)}>
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
                    name="displayName"
                    placeholder="Chat display name..."
                    value={profile.display_name}
                    maxLength={PROFILE_DISPLAY_NAME_MAX}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">
                    What would you like the AI to know about you to provide
                    better responses?
                  </Label>

                  <TextareaAutosize
                    value={profile.profile_context}
                    onValueChange={() => {}}
                    name="profileInstructions"
                    placeholder="Profile context... (optional)"
                    minRows={6}
                    maxRows={10}
                  />

                  <LimitDisplay
                    used={profile.profile_context.length}
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
                          name="azureOpenaiAPIKey"
                          placeholder="Azure OpenAI API Key"
                          type="password"
                          value={profile.azure_openai_api_key || ""}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {envKeyMap["openai"] ? (
                        <Label>OpenAI API key set by admin.</Label>
                      ) : (
                        <Input
                          name="openaiAPIKey"
                          placeholder="OpenAI API Key"
                          type="password"
                          value={profile.openai_api_key || ""}
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
                                name="azureOpenaiEndpoint"
                                placeholder="https://your-endpoint.openai.azure.com"
                                value={profile.azure_openai_endpoint || ""}
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
                                name="azureOpenai35TurboID"
                                placeholder="Azure GPT-3.5 Turbo Deployment Name"
                                value={profile.azure_openai_35_turbo_id || ""}
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
                                name="azureOpenai45TurboID"
                                placeholder="Azure GPT-4.5 Turbo Deployment Name"
                                value={profile.azure_openai_45_turbo_id || ""}
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
                              <Label>
                                Azure GPT-4.5 Vision Deployment Name
                              </Label>

                              <Input
                                name="azureOpenai45VisionID"
                                placeholder="Azure GPT-4.5 Vision Deployment Name"
                                value={profile.azure_openai_45_vision_id || ""}
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
                                name="azureEmbeddingsID"
                                placeholder="Azure Embeddings Deployment Name"
                                value={profile.azure_openai_embeddings_id || ""}
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
                              name="openaiOrgID"
                              placeholder="OpenAI Organization ID (optional)"
                              disabled={
                                !!process.env.NEXT_PUBLIC_OPENAI_ORGANIZATION_ID
                              }
                              type="password"
                              value={profile.openai_organization_id || ""}
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
                        name="anthropicAPIKey"
                        placeholder="Anthropic API Key"
                        type="password"
                        value={profile.anthropic_api_key || ""}
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
                        name="googleGeminiAPIKey"
                        placeholder="Google Gemini API Key"
                        type="password"
                        value={profile.google_gemini_api_key || ""}
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
                        name="mistralAPIKey"
                        placeholder="Mistral API Key"
                        type="password"
                        value={profile.mistral_api_key || ""}
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
                        name="perplexityAPIKey"
                        placeholder="Perplexity API Key"
                        type="password"
                        value={profile.perplexity_api_key || ""}
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
                        name="openrouterAPIKey"
                        placeholder="OpenRouter API Key"
                        type="password"
                        value={profile.openrouter_api_key || ""}
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

              <Button ref={buttonRef} type="submit">
                Save
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </form>
  )
}
