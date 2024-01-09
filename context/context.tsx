import { Tables } from "@/supabase/types"
import { ChatFile, ChatMessage, ChatSettings, LLM, MessageImage } from "@/types"
import { AssistantImage } from "@/types/assistant-image"
import { Dispatch, SetStateAction, createContext } from "react"

interface ChatbotUIContext {
  // PROFILE STORE
  profile: Tables<"profiles"> | null
  setProfile: Dispatch<SetStateAction<Tables<"profiles"> | null>>

  // ITEMS STORE
  assistants: Tables<"assistants">[]
  collections: Tables<"collections">[]
  chats: Tables<"chats">[]
  files: Tables<"files">[]
  folders: Tables<"folders">[]
  presets: Tables<"presets">[]
  prompts: Tables<"prompts">[]
  workspaces: Tables<"workspaces">[]
  setAssistants: Dispatch<SetStateAction<Tables<"assistants">[]>>
  setCollections: Dispatch<SetStateAction<Tables<"collections">[]>>
  setChats: Dispatch<SetStateAction<Tables<"chats">[]>>
  setFiles: Dispatch<SetStateAction<Tables<"files">[]>>
  setFolders: Dispatch<SetStateAction<Tables<"folders">[]>>
  setPresets: Dispatch<SetStateAction<Tables<"presets">[]>>
  setPrompts: Dispatch<SetStateAction<Tables<"prompts">[]>>
  setWorkspaces: Dispatch<SetStateAction<Tables<"workspaces">[]>>

  // MODELS STORE
  availableLocalModels: LLM[]
  setAvailableLocalModels: Dispatch<SetStateAction<LLM[]>>

  // WORKSPACE STORE
  selectedWorkspace: Tables<"workspaces"> | null
  setSelectedWorkspace: Dispatch<SetStateAction<Tables<"workspaces"> | null>>

  // PRESET STORE
  selectedPreset: Tables<"presets"> | null
  setSelectedPreset: Dispatch<SetStateAction<Tables<"presets"> | null>>

  // ASSISTANT STORE
  selectedAssistant: Tables<"assistants"> | null
  assistantImages: AssistantImage[]
  setSelectedAssistant: Dispatch<SetStateAction<Tables<"assistants"> | null>>
  setAssistantImages: Dispatch<SetStateAction<AssistantImage[]>>

  // PASSIVE CHAT STORE
  userInput: string
  chatMessages: ChatMessage[]
  chatSettings: ChatSettings | null
  selectedChat: Tables<"chats"> | null
  chatFileItems: Tables<"file_items">[]
  setUserInput: Dispatch<SetStateAction<string>>
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setChatSettings: Dispatch<SetStateAction<ChatSettings>>
  setSelectedChat: Dispatch<SetStateAction<Tables<"chats"> | null>>
  setChatFileItems: Dispatch<SetStateAction<Tables<"file_items">[]>>

  // ACTIVE CHAT STORE
  abortController: AbortController | null
  firstTokenReceived: boolean
  isGenerating: boolean
  toolInUse: "none" | "retrieval"
  setAbortController: Dispatch<SetStateAction<AbortController | null>>
  setFirstTokenReceived: Dispatch<SetStateAction<boolean>>
  setIsGenerating: Dispatch<SetStateAction<boolean>>
  setToolInUse: Dispatch<SetStateAction<"none" | "retrieval">>

  // CHAT INPUT COMMAND STORE
  isPromptPickerOpen: boolean
  slashCommand: string
  isAtPickerOpen: boolean
  atCommand: string
  focusPrompt: boolean
  focusFile: boolean
  setIsPromptPickerOpen: Dispatch<SetStateAction<boolean>>
  setSlashCommand: Dispatch<SetStateAction<string>>
  setIsAtPickerOpen: Dispatch<SetStateAction<boolean>>
  setAtCommand: Dispatch<SetStateAction<string>>
  setFocusPrompt: Dispatch<SetStateAction<boolean>>
  setFocusFile: Dispatch<SetStateAction<boolean>>

  // ATTACHMENTS STORE
  chatFiles: ChatFile[]
  chatImages: MessageImage[]
  newMessageFiles: ChatFile[]
  newMessageImages: MessageImage[]
  showFilesDisplay: boolean
  setChatFiles: Dispatch<SetStateAction<ChatFile[]>>
  setChatImages: Dispatch<SetStateAction<MessageImage[]>>
  setNewMessageFiles: Dispatch<SetStateAction<ChatFile[]>>
  setNewMessageImages: Dispatch<SetStateAction<MessageImage[]>>
  setShowFilesDisplay: Dispatch<SetStateAction<boolean>>
}

export const ChatbotUIContext = createContext<ChatbotUIContext>({
  // PROFILE STORE
  profile: null,
  setProfile: () => {},

  // ITEMS STORE
  assistants: [],
  collections: [],
  chats: [],
  files: [],
  folders: [],
  presets: [],
  prompts: [],
  workspaces: [],
  setAssistants: () => {},
  setCollections: () => {},
  setChats: () => {},
  setFiles: () => {},
  setFolders: () => {},
  setPresets: () => {},
  setPrompts: () => {},
  setWorkspaces: () => {},

  // MODELS STORE
  availableLocalModels: [],
  setAvailableLocalModels: () => {},

  // WORKSPACE STORE
  selectedWorkspace: null,
  setSelectedWorkspace: () => {},

  // PRESET STORE
  selectedPreset: null,
  setSelectedPreset: () => {},

  // ASSISTANT STORE
  selectedAssistant: null,
  assistantImages: [],
  setSelectedAssistant: () => {},
  setAssistantImages: () => {},

  // PASSIVE CHAT STORE
  userInput: "",
  selectedChat: null,
  chatMessages: [],
  chatSettings: null,
  chatFileItems: [],
  setUserInput: () => {},
  setChatMessages: () => {},
  setChatSettings: () => {},
  setSelectedChat: () => {},
  setChatFileItems: () => {},

  // CHAT INPUT COMMAND STORE
  isPromptPickerOpen: false,
  slashCommand: "",
  isAtPickerOpen: false,
  atCommand: "",
  focusPrompt: false,
  focusFile: false,
  setIsPromptPickerOpen: () => {},
  setSlashCommand: () => {},
  setIsAtPickerOpen: () => {},
  setAtCommand: () => {},
  setFocusPrompt: () => {},
  setFocusFile: () => {},

  // ACTIVE CHAT STORE
  isGenerating: false,
  firstTokenReceived: false,
  abortController: null,
  toolInUse: "none",
  setIsGenerating: () => {},
  setFirstTokenReceived: () => {},
  setAbortController: () => {},
  setToolInUse: () => {},

  // ATTACHMENTS STORE
  chatFiles: [],
  chatImages: [],
  newMessageFiles: [],
  newMessageImages: [],
  showFilesDisplay: false,
  setChatFiles: () => {},
  setChatImages: () => {},
  setNewMessageFiles: () => {},
  setNewMessageImages: () => {},
  setShowFilesDisplay: () => {}
})
