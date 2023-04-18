import { useCallback } from 'react';

import { useFetch } from '@/hooks/useFetch';

import { Conversation } from '@/types/chat';
import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';

export interface StorageService {
  getConversations: (signal?: AbortSignal) => Promise<Conversation[]>;
  removeAllConversations: (signal?: AbortSignal) => Promise<void>;
  removeConversation: (id: string, signal?: AbortSignal) => Promise<void>;
  saveConversations: (
    Conversations: Conversation[],
    signal?: AbortSignal,
  ) => Promise<void>;
  saveSelectedConversation: (conversation: Conversation) => Promise<void>;
  updateSelectedConversation: (
    updatedConversation: Conversation,
    allConversations: Conversation[],
    signal?: AbortSignal,
  ) => Promise<{ single: Conversation; all: Conversation[] }>;
  getFolders: (signal?: AbortSignal) => Promise<FolderInterface[]>;
  saveFolders: (
    folders: FolderInterface[],
    signal?: AbortSignal,
  ) => Promise<void>;
  getPrompts: (signal?: AbortSignal) => Promise<Prompt[]>;
  savePrompts: (prompts: Prompt[], signal?: AbortSignal) => Promise<void>;
}

const useStorageService = (): StorageService => {
  const fetchService = useFetch();

  const getConversations = useCallback(
    (signal?: AbortSignal) => {
      return fetchService.get<Conversation[]>(`/api/conversations`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
    },
    [fetchService],
  );

  const saveConversations = useCallback(
    (conversations: Conversation[], signal?: AbortSignal): Promise<void> => {
      return fetchService.post(`/api/conversations`, {
        body: conversations,
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
    },
    [fetchService],
  );

  const removeAllConversations = useCallback(
    (signal?: AbortSignal): Promise<void> => {
      return fetchService.post(`/api/conversations-clear`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
    },
    [fetchService],
  );

  const removeConversation = useCallback(
    (id: string, signal?: AbortSignal): Promise<void> => {
      return fetchService.delete(`/api/conversations/${id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
    },
    [fetchService],
  );

  const saveSelectedConversation = async (
    conversation: Conversation,
    signal?: AbortController,
  ): Promise<void> => {
    localStorage.setItem('selectedConversation', JSON.stringify(conversation));
  };

  const updateSelectedConversation = async (
    updatedConversation: Conversation,
    allConversations: Conversation[],
    signal?: AbortSignal,
  ): Promise<{ single: Conversation; all: Conversation[] }> => {
    const updatedConversations = allConversations.map((c) => {
      if (c.id === updatedConversation.id) {
        return updatedConversation;
      }
      return c;
    });

    await saveSelectedConversation(updatedConversation);
    await saveConversations(updatedConversations);

    return {
      single: updatedConversation,
      all: updatedConversations,
    };
  };

  const getFolders = useCallback(
    (signal?: AbortSignal) => {
      return fetchService.get<FolderInterface[]>(`/api/folders`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
    },
    [fetchService],
  );

  const saveFolders = useCallback(
    (folders: FolderInterface[], signal?: AbortSignal): Promise<void> => {
      return fetchService.post(`/api/folders`, {
        body: folders,
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
    },
    [fetchService],
  );

  const getPrompts = useCallback(
    (signal?: AbortSignal) => {
      return fetchService.get<Prompt[]>(`/api/prompts`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
    },
    [fetchService],
  );

  const savePrompts = useCallback(
    (prompts: Prompt[], signal?: AbortSignal): Promise<void> => {
      return fetchService.post(`/api/prompts`, {
        body: prompts,
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });
    },
    [fetchService],
  );

  return {
    getConversations,
    saveConversations,
    removeConversation,
    removeAllConversations,
    saveSelectedConversation,
    updateSelectedConversation,
    getFolders,
    saveFolders,
    getPrompts,
    savePrompts,
  };
};

export default useStorageService;
