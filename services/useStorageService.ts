import { useCallback } from 'react';

import { useFetch } from '@/hooks/useFetch';

import { Conversation } from '@/types/chat';
import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';

const useStorageService = () => {
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
    (conversations: Conversation[], signal?: AbortSignal) => {
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

  const saveSelectedConversation = async (conversation: Conversation) => {
    localStorage.setItem('selectedConversation', JSON.stringify(conversation));
  };

  const updateSelectedConversation = async (
    updatedConversation: Conversation,
    allConversations: Conversation[],
  ) => {
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
    (folders: FolderInterface[], signal?: AbortSignal) => {
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
    (prompts: Prompt[], signal?: AbortSignal) => {
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
    saveSelectedConversation,
    updateSelectedConversation,
    getFolders,
    saveFolders,
    getPrompts,
    savePrompts,
  };
};

export default useStorageService;
