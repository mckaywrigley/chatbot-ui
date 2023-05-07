import { Conversation } from 'chatbot-ui-core/types/chat';

export interface ChatbarInitialState {
  searchTerm: string;
  filteredConversations: Conversation[];
}

export const initialState: ChatbarInitialState = {
  searchTerm: '',
  filteredConversations: [],
};
