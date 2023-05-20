export interface HotkeySettings {
  newConversation: string;
  focusChatInput: string;
  deleteConversation: string;
  toggleChatBar: string;
  togglePromptBar: string;
}

export interface Settings {
  theme: 'light' | 'dark';
  hotkeys: HotkeySettings;
}
