import { Assistant } from "@/types/assistant";

export const saveAssistant = (assistant: Assistant) => {
  localStorage.setItem('selectedAssistant', JSON.stringify(assistant));
}